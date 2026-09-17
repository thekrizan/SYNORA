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

Queue processing, workers, and the dashboard are intentionally deferred to later phases.
