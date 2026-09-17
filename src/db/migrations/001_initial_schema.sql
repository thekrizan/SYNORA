CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE task_status AS ENUM (
  'scheduled',
  'queued',
  'processing',
  'completed',
  'failed',
  'dlq'
);

CREATE TYPE worker_status AS ENUM ('online', 'offline');

CREATE TYPE execution_status AS ENUM ('started', 'succeeded', 'failed', 'abandoned');

CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status worker_status NOT NULL DEFAULT 'offline',
  last_heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status task_status NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  assigned_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  lease_expires_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (attempts <= max_attempts)
);

CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  status execution_status NOT NULL DEFAULT 'started',
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  UNIQUE (task_id, attempt_number)
);

CREATE INDEX idx_tasks_dispatch ON tasks (status, scheduled_for, created_at);
CREATE INDEX idx_tasks_lease ON tasks (status, lease_expires_at)
  WHERE status = 'processing';
CREATE INDEX idx_tasks_worker ON tasks (assigned_worker_id)
  WHERE assigned_worker_id IS NOT NULL;
CREATE INDEX idx_workers_heartbeat ON workers (status, last_heartbeat_at);
CREATE INDEX idx_executions_task ON task_executions (task_id, started_at DESC);

