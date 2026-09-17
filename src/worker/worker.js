import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { pool } from '../db/pool.js';
import { dequeueTaskId, enqueueDlqTaskId } from '../queue/task-queue.js';
import { closeRedisConnection } from '../queue/redis.js';
import { errorMessage, retryAt } from '../tasks/lifecycle.js';
import { executeTask } from './task-handler.js';

const workerId = process.env.WORKER_ID || randomUUID();
const workerName = process.env.WORKER_NAME || `${os.hostname()}-${process.pid}`;
const heartbeatIntervalMs = Number(process.env.HEARTBEAT_INTERVAL_MS) || 3_000;
const leaseSeconds = Number(process.env.TASK_LEASE_SECONDS) || 15;
let shuttingDown = false;
let heartbeatTimer;

async function registerWorker() {
  await pool.query(
    `INSERT INTO workers (id, name, status, last_heartbeat_at, started_at, updated_at)
     VALUES ($1, $2, 'online', now(), now(), now())
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, status = 'online', last_heartbeat_at = now(),
           started_at = now(), updated_at = now()`,
    [workerId, workerName],
  );
  console.log(`[worker ${workerId}] Registered as ${workerName}`);
}

async function heartbeat() {
  try {
    const result = await pool.query(
      `UPDATE workers SET status = 'online', last_heartbeat_at = now(), updated_at = now()
       WHERE id = $1`,
      [workerId],
    );
    if (result.rowCount === 0) await registerWorker();
  } catch (error) {
    console.error(`[worker ${workerId}] Heartbeat failed: ${errorMessage(error)}`);
  }
}

async function claimTask(taskId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claimed = await client.query(
      `UPDATE tasks
       SET status = 'processing', assigned_worker_id = $2,
           lease_expires_at = now() + ($3 * interval '1 second'),
           attempts = attempts + 1, updated_at = now()
       WHERE id = $1 AND status = 'queued' AND (scheduled_for IS NULL OR scheduled_for <= now())
       RETURNING *`,
      [taskId, workerId, leaseSeconds],
    );
    if (claimed.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const task = claimed.rows[0];
    await client.query(
      `INSERT INTO task_executions (task_id, worker_id, attempt_number, status)
       VALUES ($1, $2, $3, 'started')`,
      [task.id, workerId, task.attempts],
    );
    await client.query('COMMIT');
    return task;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function completeTask(task) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const completed = await client.query(
      `UPDATE tasks SET status = 'completed', completed_at = now(), lease_expires_at = NULL,
       last_error = NULL, updated_at = now()
       WHERE id = $1 AND status = 'processing' AND assigned_worker_id = $2 RETURNING id`,
      [task.id, workerId],
    );
    if (completed.rowCount) {
      await client.query(
        `UPDATE task_executions SET status = 'succeeded', finished_at = now()
         WHERE task_id = $1 AND attempt_number = $2 AND status = 'started'`,
        [task.id, task.attempts],
      );
    }
    await client.query('COMMIT');
    return completed.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function failTask(task, message) {
  const client = await pool.connect();
  let movedToDlq = false;
  try {
    await client.query('BEGIN');
    const active = await client.query(
      `SELECT * FROM tasks WHERE id = $1 AND status = 'processing' AND assigned_worker_id = $2 FOR UPDATE`,
      [task.id, workerId],
    );
    if (!active.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    const current = active.rows[0];
    await client.query(
      `UPDATE task_executions SET status = 'failed', error = $3, finished_at = now()
       WHERE task_id = $1 AND attempt_number = $2 AND status = 'started'`,
      [task.id, current.attempts, message],
    );
    if (current.attempts >= current.max_attempts) {
      await client.query(
        `UPDATE tasks SET status = 'dlq', lease_expires_at = NULL, last_error = $2, updated_at = now()
         WHERE id = $1`,
        [task.id, message],
      );
      movedToDlq = true;
    } else {
      await client.query(
        `UPDATE tasks SET status = 'scheduled', scheduled_for = $2, lease_expires_at = NULL,
         last_error = $3, updated_at = now() WHERE id = $1`,
        [task.id, retryAt(current.attempts), message],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return movedToDlq;
}

async function processTask(taskId) {
  const task = await claimTask(taskId);
  if (!task) return;
  console.log(`[worker ${workerId}] Started task ${task.id}, attempt ${task.attempts}`);
  try {
    const result = await executeTask(task);
    if (await completeTask(task)) console.log(`[worker ${workerId}] Completed task ${task.id}`, result);
    else console.warn(`[worker ${workerId}] Task ${task.id} was reassigned before completion`);
  } catch (error) {
    const message = errorMessage(error);
    try {
      const movedToDlq = await failTask(task, message);
      console.error(`[worker ${workerId}] Failed task ${task.id}: ${message}${movedToDlq ? ' (DLQ)' : ' (retry scheduled)'}`);
      if (movedToDlq) await enqueueDlqTaskId(task.id);
    } catch (updateError) {
      console.error(`[worker ${workerId}] Could not record failure for ${task.id}: ${errorMessage(updateError)}`);
    }
  }
}

async function run() {
  await registerWorker();
  heartbeatTimer = setInterval(() => void heartbeat(), heartbeatIntervalMs);
  console.log(`[worker ${workerId}] Worker started`);
  while (!shuttingDown) {
    try {
      const taskId = await dequeueTaskId();
      if (taskId) await processTask(taskId);
    } catch (error) {
      if (!shuttingDown) {
        console.error(`[worker ${workerId}] Queue or task processing error: ${errorMessage(error)}`);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(heartbeatTimer);
  console.log(`[worker ${workerId}] Received ${signal}; shutting down`);
  await Promise.allSettled([
    pool.query(`UPDATE workers SET status = 'offline', updated_at = now() WHERE id = $1`, [workerId]),
    closeRedisConnection(),
  ]);
  await pool.end();
  console.log(`[worker ${workerId}] Worker stopped`);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

run().catch(async (error) => {
  console.error(`[worker ${workerId}] Worker stopped unexpectedly: ${errorMessage(error)}`);
  await shutdown('fatal error');
  process.exitCode = 1;
});
