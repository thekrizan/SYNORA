import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { dequeueTaskId } from '../queue/task-queue.js';
import { closeRedisConnection } from '../queue/redis.js';
import { executeTask } from './task-handler.js';

const workerId = randomUUID();
let shuttingDown = false;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function processTask(taskId) {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
  const task = rows[0];

  if (!task) {
    console.warn(`[worker ${workerId}] Ignoring missing task ${taskId}`);
    return;
  }

  const processing = await pool.query(
    `UPDATE tasks
     SET status = 'processing', updated_at = now()
     WHERE id = $1 AND status = 'queued'
     RETURNING *`,
    [taskId],
  );

  if (processing.rowCount === 0) {
    console.warn(`[worker ${workerId}] Ignoring task ${taskId}; status is ${task.status}`);
    return;
  }

  try {
    const result = await executeTask(processing.rows[0]);
    await pool.query(
      `UPDATE tasks
       SET status = 'completed', completed_at = now(), last_error = NULL, updated_at = now()
       WHERE id = $1`,
      [taskId],
    );
    console.log(`[worker ${workerId}] Completed task ${taskId}`, result);
  } catch (error) {
    const message = errorMessage(error);
    try {
      await pool.query(
        `UPDATE tasks
         SET status = 'failed', last_error = $2, updated_at = now()
         WHERE id = $1`,
        [taskId, message],
      );
      console.error(`[worker ${workerId}] Failed task ${taskId}: ${message}`);
    } catch (updateError) {
      console.error(
        `[worker ${workerId}] Could not mark task ${taskId} as failed: ${errorMessage(updateError)}`,
      );
    }
  }
}

async function run() {
  console.log(`[worker ${workerId}] Worker started`);

  while (!shuttingDown) {
    try {
      const taskId = await dequeueTaskId();
      if (taskId) {
        await processTask(taskId);
      }
    } catch (error) {
      if (!shuttingDown) {
        console.error(`[worker ${workerId}] Queue or task processing error: ${errorMessage(error)}`);
        await shutdown('queue error');
      }
    }
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker ${workerId}] Received ${signal}; shutting down`);

  await Promise.allSettled([closeRedisConnection(), pool.end()]);
  console.log(`[worker ${workerId}] Worker stopped`);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

run().catch(async (error) => {
  console.error(`[worker ${workerId}] Worker stopped unexpectedly: ${errorMessage(error)}`);
  await shutdown('fatal error');
  process.exitCode = 1;
});
