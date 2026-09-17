import { pool } from './db/pool.js';
import { enqueueDlqTaskId, enqueueTaskId } from './queue/task-queue.js';
import { retryAt } from './tasks/lifecycle.js';

const schedulerIntervalMs = Number(process.env.SCHEDULER_INTERVAL_MS) || 1_000;
const reaperIntervalMs = Number(process.env.REAPER_INTERVAL_MS) || 2_000;
const workerTimeoutSeconds = Number(process.env.WORKER_TIMEOUT_SECONDS) || 10;

async function enqueueDueTasks() {
  const { rows } = await pool.query(
    `UPDATE tasks
     SET status = 'queued', updated_at = now()
     WHERE id IN (
       SELECT id FROM tasks
       WHERE status = 'scheduled' AND scheduled_for <= now()
       ORDER BY scheduled_for ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 100
     )
     RETURNING id`,
  );

  for (const task of rows) {
    try {
      await enqueueTaskId(task.id);
      console.log(`[coordinator] Queued due task ${task.id}`);
    } catch (error) {
      // Make it eligible for the next scheduler pass rather than leaving a
      // database task marked queued with no Redis message.
      await pool.query(
        `UPDATE tasks SET status = 'scheduled', updated_at = now()
         WHERE id = $1 AND status = 'queued'`,
        [task.id],
      );
      console.error(`[coordinator] Could not enqueue due task ${task.id}:`, error);
    }
  }
}

async function reapWorkersAndTasks() {
  const client = await pool.connect();
  const dlqIds = [];
  try {
    await client.query('BEGIN');
    const offlineWorkers = await client.query(
      `UPDATE workers
       SET status = 'offline', updated_at = now()
       WHERE status = 'online'
         AND last_heartbeat_at < now() - ($1 * interval '1 second')
       RETURNING id`,
      [workerTimeoutSeconds],
    );

    for (const worker of offlineWorkers.rows) {
      console.warn(`[coordinator] Worker ${worker.id} is offline (heartbeat timeout)`);
    }

    const stranded = await client.query(
      `SELECT t.*
       FROM tasks t
       LEFT JOIN workers w ON w.id = t.assigned_worker_id
       WHERE t.status = 'processing'
         AND (t.lease_expires_at <= now() OR w.status = 'offline' OR w.id IS NULL)
       FOR UPDATE OF t SKIP LOCKED`,
    );

    for (const task of stranded.rows) {
      await client.query(
        `UPDATE task_executions
         SET status = 'abandoned', error = COALESCE(error, 'Worker lost or task lease expired'),
             finished_at = now()
         WHERE task_id = $1 AND attempt_number = $2 AND status = 'started'`,
        [task.id, task.attempts],
      );

      if (task.attempts >= task.max_attempts) {
        await client.query(
          `UPDATE tasks
           SET status = 'dlq', lease_expires_at = NULL,
               last_error = COALESCE(last_error, 'Worker lost or task lease expired'),
               updated_at = now()
           WHERE id = $1`,
          [task.id],
        );
        dlqIds.push(task.id);
        console.warn(`[coordinator] Task ${task.id} abandoned and moved to DLQ`);
      } else {
        const scheduledFor = retryAt(task.attempts);
        await client.query(
          `UPDATE tasks
           SET status = 'scheduled', lease_expires_at = NULL,
               scheduled_for = $2, last_error = 'Worker lost or task lease expired', updated_at = now()
           WHERE id = $1`,
          [task.id, scheduledFor],
        );
        console.warn(`[coordinator] Task ${task.id} abandoned; retry scheduled for ${scheduledFor.toISOString()}`);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  for (const taskId of dlqIds) {
    try {
      await enqueueDlqTaskId(taskId);
    } catch (error) {
      console.error(`[coordinator] Could not enqueue DLQ task ${taskId}:`, error);
    }
  }
}

function recurring(name, intervalMs, work) {
  let stopped = false;
  let running = false;
  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await work();
    } catch (error) {
      console.error(`[coordinator] ${name} error:`, error);
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

export function startCoordinator() {
  const stopScheduler = recurring('scheduler', schedulerIntervalMs, enqueueDueTasks);
  const stopReaper = recurring('reaper', reaperIntervalMs, reapWorkersAndTasks);
  console.log(`[coordinator] Scheduler ${schedulerIntervalMs}ms; reaper ${reaperIntervalMs}ms`);
  return () => {
    stopScheduler();
    stopReaper();
  };
}
