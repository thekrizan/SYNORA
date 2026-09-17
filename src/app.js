import express from 'express';
import { pool } from './db/pool.js';
import { enqueueTaskId, removeDlqTaskId } from './queue/task-queue.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateCreateTask(body) {
  const errors = [];

  if (typeof body?.type !== 'string' || body.type.trim() === '') {
    errors.push('type must be a non-empty string');
  }

  if (body?.payload === null || typeof body?.payload !== 'object' || Array.isArray(body.payload)) {
    errors.push('payload must be an object');
  }

  let scheduledFor = null;
  if (body?.scheduled_for !== undefined) {
    if (typeof body.scheduled_for !== 'string' || Number.isNaN(Date.parse(body.scheduled_for))) {
      errors.push('scheduled_for must be a valid ISO-8601 timestamp');
    } else {
      scheduledFor = new Date(body.scheduled_for).toISOString();
    }
  }

  let maxAttempts = null;
  if (body?.max_attempts !== undefined) {
    if (!Number.isSafeInteger(body.max_attempts) || body.max_attempts <= 0) {
      errors.push('max_attempts must be a positive integer');
    } else {
      maxAttempts = body.max_attempts;
    }
  }

  return { errors, scheduledFor, maxAttempts };
}

export const app = express();

app.use(express.json());

app.post('/tasks', async (req, res, next) => {
  const { errors, scheduledFor, maxAttempts } = validateCreateTask(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  try {
    const isDelayed = scheduledFor && new Date(scheduledFor) > new Date();
    const { rows } = await pool.query(
      `INSERT INTO tasks (type, payload, status, scheduled_for, max_attempts)
       VALUES ($1, $2, $3, $4, COALESCE($5, 3))
       RETURNING *`,
      [req.body.type.trim(), req.body.payload, isDelayed ? 'scheduled' : 'queued', scheduledFor, maxAttempts],
    );

    if (!isDelayed) {
      try {
        await enqueueTaskId(rows[0].id);
      } catch (error) {
        console.error(`Failed to enqueue task ${rows[0].id}:`, error);
        return res.status(503).json({
          error: 'Task was created but could not be queued',
          task_id: rows[0].id,
        });
      }
    }

    return res.status(201).json({ task: rows[0] });
  } catch (error) {
    return next(error);
  }
});

app.get('/tasks', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100`,
    );
    return res.json({ tasks: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/tasks/:id', async (req, res, next) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ error: 'Task ID must be a valid UUID' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const executions = await pool.query(
      `SELECT * FROM task_executions WHERE task_id = $1 ORDER BY attempt_number ASC`,
      [req.params.id],
    );
    return res.json({ task: rows[0], executions: executions.rows });
  } catch (error) {
    return next(error);
  }
});

app.post('/tasks/:id/reprocess', async (req, res, next) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ error: 'Task ID must be a valid UUID' });
  }
  try {
    const result = await pool.query(
      `UPDATE tasks
       SET status = 'queued', max_attempts = max_attempts + 3, assigned_worker_id = NULL,
           lease_expires_at = NULL, scheduled_for = NULL, completed_at = NULL,
           last_error = NULL, updated_at = now()
       WHERE id = $1 AND status = 'dlq'
       RETURNING *`,
      [req.params.id],
    );
    if (!result.rowCount) return res.status(409).json({ error: 'Only DLQ tasks can be reprocessed' });
    try {
      await Promise.all([enqueueTaskId(req.params.id), removeDlqTaskId(req.params.id)]);
    } catch (error) {
      console.error(`Failed to enqueue reprocessed task ${req.params.id}:`, error);
      return res.status(503).json({ error: 'Task reprocessed in PostgreSQL but could not be queued' });
    }
    return res.json({ task: result.rows[0], retry_rule: 'attempt count is retained and max_attempts increases by 3; execution history is retained' });
  } catch (error) {
    return next(error);
  }
});

app.get('/workers', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM workers ORDER BY started_at DESC');
    return res.json({ workers: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/stats', async (req, res, next) => {
  try {
    const [tasks, workers] = await Promise.all([
      pool.query(`SELECT status, count(*)::int AS count FROM tasks GROUP BY status`),
      pool.query(`SELECT status, count(*)::int AS count FROM workers GROUP BY status`),
    ]);
    const taskCounts = Object.fromEntries(tasks.rows.map((row) => [row.status, row.count]));
    const workerCounts = Object.fromEntries(workers.rows.map((row) => [row.status, row.count]));
    return res.json({
      queued: taskCounts.queued || 0,
      scheduled: taskCounts.scheduled || 0,
      processing: taskCounts.processing || 0,
      completed: taskCounts.completed || 0,
      failed: taskCounts.failed || 0,
      dlq: taskCounts.dlq || 0,
      workers_online: workerCounts.online || 0,
      workers_offline: workerCounts.offline || 0,
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
});
