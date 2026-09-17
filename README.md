# SYNORA

Distributed task scheduler and worker system built for Hackathon Problem 03.

## Run the complete system

```sh
cp .env.example .env
npm install
npm run db:up
npm run migrate
```

In separate terminals, start the API/coordinator and two named workers:

```sh
npm start
npm run worker:demo-a
npm run worker:demo-b
```

The API is at `http://localhost:3000`. PostgreSQL and Redis use the defaults in
`.env.example`. The API process runs the lightweight scheduler (one-second
poll) and failure reaper (two-second poll); no extra service is required.

Create a task:

```sh
curl -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -d '{"type":"demo","payload":{"message":"hello"}}'
```

Supported safe task types are `demo`, `slow-demo` (about seven seconds), and
`fail-demo` (intentionally fails). `scheduled_for` accepts an ISO-8601 time;
future tasks remain `scheduled` until due.

Useful dashboard endpoints:

```sh
curl http://localhost:3000/workers
curl http://localhost:3000/tasks
curl http://localhost:3000/tasks/<task-id>
curl http://localhost:3000/stats
curl -X POST http://localhost:3000/tasks/<task-id>/reprocess
```

`GET /tasks/:id` includes the task's execution history. Reprocessing is allowed
only from `dlq`; it keeps the attempt count, adds three to `max_attempts`,
clears current assignment/error, and retains all historical execution rows.

## Lifecycle notes

- Redis ready queue: `synora:tasks:ready` (FIFO via `LPUSH` + `BRPOP`).
- Redis DLQ: `synora:tasks:dlq`.
- Workers register in PostgreSQL, heartbeat every three seconds, and mark
  themselves offline during graceful shutdown.
- A claim atomically changes a queued task to `processing`, assigns its worker,
  sets a 15-second lease, increments attempts, and creates an execution row.
- Failures retry after roughly 5, 10, then 20 seconds. On the final allowed
  attempt the task becomes `dlq` and its ID is pushed to the Redis DLQ.
- The coordinator marks workers offline after 10 seconds without a heartbeat.
  Processing work with an expired lease or offline owner is recorded as
  `abandoned` and retried (or moved to DLQ). This deliberately provides
  at-least-once, not exactly-once, delivery.

## Judge Demo

1. Start infrastructure, API, and both workers using the commands above.
2. Submit a `slow-demo` task and observe its `processing` task record and first
   execution through `GET /tasks/<id>`.
3. Kill the terminal running `demo-worker-a` while it owns the task.
4. After the heartbeat timeout, use `GET /workers` to show it offline.
5. The reaper records attempt one as `abandoned`, schedules a retry, and
   `demo-worker-b` completes the later attempt.
6. Submit `fail-demo` with `"max_attempts": 3`; show its retry scheduling and
   eventual `dlq` status with `GET /tasks/<id>` and `GET /stats`.
7. `POST /tasks/<id>/reprocess` to send that DLQ task back through the queue.

For a manual ready-queue check:

```sh
npm run queue:smoke -- enqueue <task-id>
npm run queue:smoke -- dequeue
```
