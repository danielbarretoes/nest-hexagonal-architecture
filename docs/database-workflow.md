# Database Workflow

This document explains how database configuration, migrations, and test databases work in this project.

## Overview

This template does not create tables automatically on normal startup.

That is intentional.

The project is designed to use:

- migrations for schema changes
- `.env` for normal local runtime
- `.env.test` for e2e tests
- Nest native URI versioning for HTTP routes
- a single baseline migration for clean project bootstrap

This keeps the development database and test database clearly separated.

## Environment Files

### `.env`

Used by normal app startup.

Typical values:

- `NODE_ENV=development`
- `DB_DATABASE=hexagonal_db`
- `SWAGGER_ENABLED=true`

### `.env.test`

Used only when `NODE_ENV=test`.

Typical values:

- `NODE_ENV=test`
- `DB_DATABASE=hexagonal_test_db`
- `SWAGGER_ENABLED=false`

Best practice in this template:

- keep development credentials only in `.env`
- keep test credentials only in `.env.test`
- do not duplicate `TEST_DB_*` variables inside `.env`

## How Environment Loading Works

Environment loading is centralized in [load-env.ts](/Users/danielbarreto/Desktop/Code/hexagonal/src/config/env/load-env.ts).

Rules:

- normal runtime loads `.env`
- test runtime loads `.env` first and then `.env.test` with override
- e2e tests never need to mutate the normal development database settings

The application bootstrap logs the selected environment and database name on startup.

Example:

```text
Environment: development, database: hexagonal_db
```

Current route shape:

```text
/api/v1/...
```

This comes from:

- `setGlobalPrefix('api')`
- `enableVersioning({ type: VersioningType.URI })`

## Naming Strategy And Column Names

This project uses `SnakeNamingStrategy`.

That means simple camelCase properties are automatically mapped to snake_case columns.

Examples:

- `passwordHash` -> `password_hash`
- `firstName` -> `first_name`
- `deletedAt` -> `deleted_at`

Because of that, most columns do not need an explicit `name` option in the entity decorator.

That is why entities such as [user.entity.ts](/Users/danielbarreto/Desktop/Code/hexagonal/src/modules/iam/users/infrastructure/persistence/typeorm/entities/user.entity.ts) and [organization.entity.ts](/Users/danielbarreto/Desktop/Code/hexagonal/src/modules/iam/organizations/infrastructure/persistence/typeorm/entities/organization.entity.ts) intentionally keep property names simple and let the naming strategy do the mapping.

### When explicit names are still useful

You should still use explicit names when:

- the table name itself must be fixed, such as `users` or `organizations`
- a relation must bind to a specific existing FK property
- the database uses a legacy or non-standard column name
- you need a name different from the default generated one

For example, [member.entity.ts](/Users/danielbarreto/Desktop/Code/hexagonal/src/modules/iam/organizations/infrastructure/persistence/typeorm/entities/member.entity.ts) keeps explicit `@JoinColumn({ name: 'user_id' })` and `@JoinColumn({ name: 'organization_id' })` so the relation uses the already-declared FK columns instead of generating a different join column.

## Why Tables Are Not Created On Startup

By default:

- `DB_SYNC=false`
- `DB_MIGRATIONS_RUN=false`

That means:

- Nest starts normally
- TypeORM connects normally
- but no tables are created automatically

This is the desired behavior for a serious template, because schema changes should come from migrations, not runtime synchronization.

## Normal Development Flow

### 1. Ensure the database exists

The project expects the normal local database to exist already.

Example:

```sql
CREATE DATABASE hexagonal_db;
```

### 2. Run migrations manually

```bash
npm run db:migrate
```

This creates or updates the schema in the normal development database defined in `.env`.

### 3. Start the application

```bash
npm run start:dev
```

At startup, check the bootstrap log to confirm the database in use.

## E2E Test Flow

E2E tests use the test database, not the normal development database.

They use:

- `.env.test`
- `hexagonal_test_db`
- schema rebuild from migrations before tests

Run:

```bash
npm run test:e2e -- --runInBand
```

The e2e suite:

- loads test environment values
- rebuilds the schema from migrations
- runs real HTTP tests against PostgreSQL

You do not normally need to migrate the test database manually.

## Migration Commands

### Run pending migrations

```bash
npm run db:migrate
```

### Show migration status

```bash
npm run db:migrate:show
```

### Revert the last migration

```bash
npm run db:migrate:revert
```

Use revert carefully, especially if the database already contains important data.

## Current Migration Strategy

This repository intentionally keeps a single baseline migration:

- [1742934000000-baseline-schema.ts](/Users/danielbarreto/Desktop/Code/hexagonal/src/database/migrations/1742934000000-baseline-schema.ts)

Why:

- a fresh clone should be simple to bootstrap
- a template repository should not carry a long migration history unless that history teaches something important
- the current migration represents the full schema as it exists today

That means the previous incremental migration chain was intentionally squashed into one baseline file.

## What To Do When You Clone The Project

If you clone the repository and start from scratch:

1. create the local database if it does not exist
2. run:

```bash
npm run db:migrate
```

3. start the app:

```bash
npm run start:dev
```

You do not need old historical migrations for that flow. The baseline migration creates the current schema directly.

## What To Do If You Want To Reset Migrations Locally

If your local database is disposable and you want a clean reset, the safest workflow is:

1. drop the local database
2. recreate it
3. run `npm run db:migrate`

Example:

```sql
DROP DATABASE IF EXISTS hexagonal_db;
CREATE DATABASE hexagonal_db;
```

Then:

```bash
npm run db:migrate
```

This is cleaner than trying to manually edit the `migrations` table.

## Important Note About Existing Databases

If you already ran the old migration chain on an existing local database before this squash:

- the schema is probably already correct
- but the recorded migration names in the `migrations` table will not match the new single baseline migration

For a template repository, the recommended solution is:

- reset the local development database
- rerun the new baseline migration

Do not try to keep both the old migration history and the squashed baseline in the same repository state.

## When To Use `DB_MIGRATIONS_RUN=true`

If you set:

```env
DB_MIGRATIONS_RUN=true
```

then the app will execute pending migrations automatically on startup.

This can be convenient in some environments, but the recommended default for local development is still manual migration execution:

1. run migrations yourself
2. then start the app

That keeps schema changes explicit and predictable.

## When Not To Use `DB_SYNC`

Avoid enabling:

```env
DB_SYNC=true
```

except for very temporary local spikes.

Reason:

- `synchronize` is not a migration strategy
- it can drift from the intended schema lifecycle
- it hides database evolution decisions that should be captured in versioned migrations

## Typical Daily Workflow

### If you just pulled new changes

```bash
npm run db:migrate
npm run start:dev
```

### If you changed the schema in code

1. create or update the migration file
2. run:

```bash
npm run db:migrate
```

3. run checks:

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

For this template, keep this rule:

- if the repo is still pre-release and acting as a base template, it is acceptable to periodically squash migrations back into a single baseline
- once real projects are built on top of this template, those downstream projects should keep normal forward-only migration history

### If Nest starts but tables do not exist

That usually means one of these is true:

- the database exists, but migrations were not run yet
- you started the app with `DB_MIGRATIONS_RUN=false`
- `DB_SYNC=false`, so schema auto-creation is disabled on purpose

Fix:

```bash
npm run db:migrate
```

Then restart the app.

## RLS And Tenant-Scoped Data

The current RLS-enabled tenant-scoped table is `members`.

Important:

- migrations create the required policies
- authenticated requests validate the effective tenant before request-scoped tenant context is opened
- repository code sets the required tenant context for tenant-scoped operations
- repository code sets the local DB role used by the policy
- e2e tests verify that RLS works against the real PostgreSQL test database

For `http_logs` read endpoints:

- the API requires authentication
- the caller must provide `x-organization-id`
- the caller must have a privileged membership in that tenant
- queries are filtered by the validated effective tenant, not by the raw header alone

If you add a new tenant-scoped table later, you must extend:

- the migration
- the policy definitions
- the repository transaction/session setup
- the test coverage

## Troubleshooting

### The app is using the wrong database

Check the startup log.

Normal startup should show:

```text
Environment: development, database: hexagonal_db
```

E2E tests should use:

```text
Environment: test, database: hexagonal_test_db
```

### E2E logs show `ERROR`, but tests pass

That is expected in this project today.

Some e2e cases intentionally verify `400`, `401`, and `404` responses.

The `HttpLogsMiddleware` logs those as errors, but the suite is still passing because the behavior is expected and asserted.

## Recommended Team Rule

For this template, the safest convention is:

- local runtime: `.env` + `npm run db:migrate`
- e2e: `.env.test` + `npm run test:e2e -- --runInBand`
- production: controlled migration execution during deployment
