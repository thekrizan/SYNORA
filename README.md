# SYNORA

Distributed task scheduler and worker system built for Hackathon Problem 03.

## Phase 1: local infrastructure and persistence

1. Copy the environment template: `cp .env.example .env`
2. Install Node dependencies: `npm install`
3. Start PostgreSQL and Redis: `npm run db:up`
4. Apply the schema: `npm run migrate`
5. Start the Task API: `npm start`

PostgreSQL runs on `localhost:5432`; Redis runs on `localhost:6379`.

## Task API

Create a task:

```sh
curl -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -d '{"type":"send-email","payload":{"to":"ada@example.com"},"max_attempts":3}'
```

Fetch it by the `id` returned from the create response:

```sh
curl http://localhost:3000/tasks/<task-id>
```

`type` and an object `payload` are required. `scheduled_for` accepts an ISO-8601 timestamp and `max_attempts` must be a positive integer.

## Redis ready queue

After PostgreSQL creates a task, the API enqueues its ID in the Redis list
`synora:tasks:ready`. The queue is FIFO (`LPUSH` on create and blocking
`BRPOP` on dequeue). If Redis is unavailable after the database insert, the
API returns `503` and logs the enqueue error; the task remains in PostgreSQL
but is not presented as successfully queued.

For a manual Redis queue smoke check, enqueue a known task ID and dequeue it:

```sh
npm run queue:smoke -- enqueue <task-id>
npm run queue:smoke -- dequeue
```

Workers, retries, scheduling, DLQs, failover handling, and the dashboard are
intentionally deferred to later phases.

## Worker

Start a worker in a second terminal after the infrastructure and migrations are
running:

```sh
npm run worker
```

The worker has a unique process ID and blocks on the ready queue. For each
queued task it loads the task from PostgreSQL, marks it `processing`, and runs
an explicitly supported handler. The `demo` handler completes with a
deterministic result derived from the task payload; the task is then marked
`completed` with `completed_at` set. Unsupported task types are marked
`failed` with the reason in `last_error`. The worker continues processing after
failures and exits cleanly on `SIGINT` or `SIGTERM`.
