import express from 'express';
import { pool } from './db/pool.js';
import { enqueueTaskId } from './queue/task-queue.js';

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
    const { rows } = await pool.query(
      `INSERT INTO tasks (type, payload, scheduled_for, max_attempts)
       VALUES ($1, $2, $3, COALESCE($4, 3))
       RETURNING *`,
      [req.body.type.trim(), req.body.payload, scheduledFor, maxAttempts],
    );

    try {
      await enqueueTaskId(rows[0].id);
    } catch (error) {
      console.error(`Failed to enqueue task ${rows[0].id}:`, error);
      return res.status(503).json({
        error: 'Task was created but could not be queued',
        task_id: rows[0].id,
      });
    }

    return res.status(201).json({ task: rows[0] });
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
    return res.json({ task: rows[0] });
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
