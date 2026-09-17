# SYNORA

Distributed task scheduler and worker system built for Hackathon Problem 03.

## Phase 1: local infrastructure and persistence

1. Copy the environment template: `cp .env.example .env`
2. Install Node dependencies: `npm install`
3. Start PostgreSQL and Redis: `npm run db:up`
4. Apply the schema: `npm run migrate`

PostgreSQL runs on `localhost:5432`; Redis runs on `localhost:6379`.

Phase 1 creates the durable task, worker, execution-history, and migration tables. Queue processing, API routes, workers, and the dashboard are intentionally deferred to later phases.
