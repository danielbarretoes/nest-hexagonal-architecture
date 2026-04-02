# Jobs Operations Guide

This template can run without external providers by default:

- keep `JOBS_ENABLED=false` to disable SQS-backed async delivery
- keep `EMAIL_ENABLED=false` to disable SES-backed email delivery
- the API still boots and all optional provider boundaries resolve to no-op adapters

## Worker startup

- `npm run start:worker`
- `npm run start:worker:dev`

At startup, the worker now performs a readiness check against PostgreSQL and logs the current outbox counts before entering the polling loop.

The relay also reclaims stale `claimed` rows automatically when they stay unmodified longer than `JOBS_OUTBOX_CLAIM_TIMEOUT_MS`, which prevents stranded jobs after a relay crash or abrupt shutdown.

## Inspect the outbox

- `npm run start:jobs:inspect`
- `npm run start:jobs:inspect -- --dead-limit 20`

This prints current counts by outbox status and a sample of dead jobs for operator review.

## Doctor check

- `npm run start:jobs:doctor`

This is the fastest way to verify that the worker runtime can talk to PostgreSQL and to see the current outbox snapshot without starting the long-running worker loop.

## Replay dead jobs

- `npm run start:jobs:replay -- --limit 100`
- `npm run start:jobs:replay -- --ids <uuid,uuid>`
- `npm run start:jobs:replay -- --limit 100 --dry-run`

Use `--dry-run` first in production to confirm which `dead` jobs would be requeued.

## Cleanup terminal outbox rows

- `npm run start:jobs:cleanup`
- `npm run start:jobs:cleanup -- --dry-run`

Automatic cleanup is disabled by default and is controlled by:

- `JOBS_OUTBOX_CLEANUP_ENABLED`
- `JOBS_OUTBOX_CLEANUP_BATCH_SIZE`
- `JOBS_OUTBOX_CLEANUP_INTERVAL_MS`
- `JOBS_OUTBOX_RETENTION_PUBLISHED_HOURS`
- `JOBS_OUTBOX_RETENTION_COMPLETED_HOURS`
- `JOBS_OUTBOX_RETENTION_DEAD_HOURS`

## Retention safety

- keep cleanup disabled until you have decided your real DLQ replay window
- deleting `completed` jobs also deletes their execution receipts through cascade
- if receipts disappear too early, late duplicate deliveries can trigger the side effect again
- choose retention windows that are longer than your queue retention plus any operator replay delay
