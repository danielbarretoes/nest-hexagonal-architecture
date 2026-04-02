# Hexagonal IAM Template

Reusable NestJS IAM foundation built with a strict hexagonal style.

It currently includes:

- `users`, `organizations`, and `auth` as explicit IAM features
- `api-keys` as tenant-scoped machine credentials owned by a user membership
- `idempotency` as an opt-in HTTP safety layer for create-style endpoints
- `roles` as the RBAC foundation for IAM permissions
- `http_logs` as an explicit observability feature
- `usage-metering` as an aggregated API-key activity feature
- `webhooks` as a tenant-scoped outbound integration feature with durable delivery jobs
- `jobs` as a durable async execution foundation with PostgreSQL outbox, SQS, and a separate worker runtime
- strict `domain -> application -> infrastructure/presentation` boundaries
- RFC 7807 problem details with `traceId`
- Swagger / OpenAPI documentation
- TypeORM adapters, PostgreSQL migrations, and real e2e tests
- JWT auth with password hashing
- persisted RBAC roles and permissions seeded from the baseline migration
- soft delete + restore for `users` and `organizations`
- PostgreSQL RLS foundation for tenant-scoped `members`, `organization_invitations`, `http_logs`, and `api_keys`
- AsyncLocalStorage tenant context for request-scoped tenant propagation
- validated runtime configuration, health probes, graceful shutdown, and production HTTP hardening
- transactional email through a shared port with Amazon SES plus optional durable async dispatch through the outbox + SQS path
- structured JSON stdout logging with `traceId` correlation ready for ELK shippers

## Project Map

```text
src/
├── jobs.worker.ts
├── app.module.ts
├── app.setup.ts
├── common/                         # technical cross-cutting concerns only
│   ├── http/
│   ├── infrastructure/
│   ├── observability/
│   └── tenant/
├── config/                         # runtime/framework configuration
│   ├── auth/
│   └── database/
├── database/
│   └── migrations/
├── health/                         # liveness/readiness deployment endpoints
├── worker.module.ts                # standalone Nest application context for background jobs
├── modules/
│   ├── iam/
│   │   ├── iam-authorization-access.module.ts
│   │   ├── auth/
│   │   │   └── auth.module.ts
│   │   ├── api-keys/
│   │   │   └── api-keys-access.module.ts
│   │   ├── organizations/
│   │   │   └── organizations-access.module.ts
│   │   ├── roles/
│   │   ├── users/
│   │   │   └── users-access.module.ts
│   │   └── shared/                 # shared kernel inside IAM
│   ├── idempotency/
│   ├── jobs/
│   │   └── jobs-access.module.ts
│   ├── notifications/
│   │   └── email/
│   │       └── email-access.module.ts
│   ├── observability/
│   │   └── http-logs/
│   ├── usage-metering/
│   │   └── usage-metering-access.module.ts
│   └── webhooks/
│       └── webhooks-access.module.ts
└── shared/                         # global shared kernel
    ├── contracts/
    └── domain/
test/
├── api-keys.e2e-spec.ts
├── auth.e2e-spec.ts
├── email-verification.e2e-spec.ts
├── http-logs.e2e-spec.ts
├── members.e2e-spec.ts
├── organization-invitations.e2e-spec.ts
├── organizations.e2e-spec.ts
├── password-recovery.e2e-spec.ts
├── rls.e2e-spec.ts
├── sessions.e2e-spec.ts
├── tenant-authorization.e2e-spec.ts
├── users.e2e-spec.ts
└── support/
```

## How The Project Works

### Request flow

1. `JwtAuthGuard` protects JWT-only routes and `AccessAuthGuard` protects routes that also allow API keys
2. `PermissionGuard` resolves `@RequirePermissions(...)` metadata for tenant-scoped operations
3. `TenantInterceptor` validates the effective tenant and opens the async tenant context
4. Controller validates DTOs and calls a use case in `application`
5. Use cases orchestrate ports plus tenant policies for sensitive operations
6. Infrastructure adapters implement those ports with TypeORM, bcrypt, JWT, SQS, SES, etc.
7. Errors are translated to RFC 7807 in the global HTTP filter

### Layer responsibilities

`domain`

- entities
- value objects
- domain ports
- domain exceptions
- no Nest, no TypeORM, no Express

`application`

- use cases
- application port tokens
- orchestration only
- can depend on domain and shared contracts

`infrastructure`

- TypeORM entities
- repository adapters
- security adapters
- external implementation details

`presentation`

- controllers
- request DTOs
- guards
- HTTP transport concerns

## Shared vs Common

`src/shared`

- global shared kernel
- reusable across bounded contexts

`src/modules/iam/shared`

- shared kernel only inside IAM
- reusable between `auth`, `users`, and `organizations`

provider-only access modules

- `users-access.module.ts`, `organizations-access.module.ts`, and `iam-authorization-access.module.ts`
- expose minimal DI providers to other modules without exporting the full feature module
- keep Nest module dependencies thinner and more explicit
- solve Nest composition, not rich business orchestration between sibling features
- if a workflow needs multiple sibling features inside the same bounded context, prefer a context-level application service/facade over direct feature-internal imports

`src/common`

- technical cross-cutting concerns
- HTTP filters, tracing, tenant context, interceptors, database subscribers
- never business rules

### Current shared review

What already belongs in global `shared` and should stay there:

- pagination primitives
- generic pagination DTO contracts
- base domain exception
- shared authorization permission codes and contracts

What already belongs in `modules/iam/shared` and should stay there:

- IAM-specific domain exceptions
- password hasher contract reused by `auth` and `users`

What should not move to `shared` today:

- `UserResponseDto`, `OrganizationResponseDto`, `HttpLogResponseDto`
- feature-specific query DTOs
- `http_logs` repository filters
- transport-level authenticated request types

Why:

- response DTOs are feature API contracts, not reusable domain/kernel concepts
- authenticated request typing is technical HTTP plumbing, so it belongs in `common/http`
- feature-specific filters should stay close to the feature they serve

## Current IAM Design

### Users

- `POST /users/self-register` for standalone identity bootstrap
- tenant-scoped `POST /users` to create another user inside the current organization
- tenant-scoped `GET /users` and `GET /users/:id`
- tenant-scoped `PATCH /users/:id`, `DELETE /users/:id`, and `PATCH /users/:id/restore`

### Organizations

- `POST /organizations` creates a tenant and assigns the caller as `owner`
- `GET /organizations` lists organizations where the caller has membership
- tenant-scoped `GET /organizations/:id`
- tenant-scoped `PATCH /organizations/:id` for rename
- tenant-scoped `DELETE /organizations/:id` and `PATCH /organizations/:id/restore`

### Auth

- short-lived JWT access token
- opaque refresh token with rotation backed by `auth_sessions`
- `POST /auth/logout` and `POST /auth/logout-all` for refresh-session revocation
- password reset one-time tokens backed by `user_action_tokens`
- email verification one-time tokens backed by `user_action_tokens`
- reset and verification emails are dispatched through a transactional email port
- private reset and verification tokens are only exposed when `AUTH_EXPOSE_PRIVATE_TOKENS=true`
- rate limiting on auth endpoints
- bcrypt password hashing
- JWT guard
- API-key-aware access guard for tenant-scoped routes that should allow machine access

### API Keys

- tenant-scoped `POST /api-keys`, `GET /api-keys`, and `DELETE /api-keys/:id`
- API keys are owned by a real user and bound to a single organization
- the raw secret is returned only once at creation time and only the hash is persisted
- each key carries scopes that must be a subset of the owner's current membership permissions
- keys expire by default and can be revoked without deleting historical auditability
- machine callers can authenticate with `x-api-key` or `Authorization: ApiKey <token>`
- authorization remains membership-aware because API key auth still resolves the owner user plus tenant membership before `PermissionGuard`

### Idempotency

- `@Idempotent()` opt-in endpoints require an `Idempotency-Key` header
- successful create-style responses can be replayed safely without re-executing the use case
- failed executions release the pending key so callers can retry instead of caching error responses
- current idempotent endpoints cover self-register, tenant user creation, organizations, members, invitations, API keys, password reset request, email verification request, and webhook endpoint creation

### Memberships

- link user to organization
- tenant-scoped membership linked to a persisted role
- tenant-scoped `GET /members`, `POST /members`, `PATCH /members/:id/role`, `DELETE /members/:id`
- last-owner protection prevents removing or demoting the final `owner`
- role permissions resolved through the RBAC seed tables
- PostgreSQL RLS on `members`

### Invitations

- tenant-scoped `POST /organization-invitations` to invite an email into the current organization
- authenticated `POST /organization-invitations/accept` to accept an invite after self-registration/login
- invitations carry the target organization and role to assign on acceptance
- invitation delivery goes through the same transactional email port and uses the configured public app URL
- PostgreSQL RLS on tenant-managed invitation access plus invitation-id scoped acceptance lookup

### Roles

- persisted `roles`, `permissions`, and `role_permissions`
- seeded default roles: `owner`, `admin`, `manager`, `member`, `guest`
- permission-based authorization such as `observability.http_logs.read`

### HTTP Logs

- captures success and error requests
- stores request body, query, params, response, error message, error trace, duration, traceId
- stores `userId` and `organizationId` when available
- supports lookup by `id`, `traceId`, and paginated filtering by `createdFrom`, `createdTo`, and `statusFamily`
- read access is tenant-scoped and reinforced by PostgreSQL RLS plus fail-closed repository access

### Usage Metering

- `src/modules/usage-metering` aggregates API key traffic into hourly counters
- metering is written off the HTTP request lifecycle through a dedicated interceptor instead of leaking into controllers
- current read endpoint is tenant-scoped `GET /usage-metrics/api-keys`
- metering is optional and can stay enabled locally without external providers because it persists to PostgreSQL only

### Webhooks

- tenant-scoped `POST /webhooks`, `GET /webhooks`, and `DELETE /webhooks/:id`
- endpoint secrets are revealed once, then stored encrypted at rest
- outbound deliveries are persisted as durable outbox jobs and executed by the worker runtime
- webhook payloads are signed with timestamped HMAC headers for downstream verification
- delivery distinguishes retryable transport failures from non-retryable client errors and uses execution receipts for idempotent completion

### Audit Logs

- separate `audit_logs` table for administrative actions
- records membership changes, invitation lifecycle, and session revocation events
- complements `http_logs` instead of mixing business auditability with request observability

### Transactional Email

- `src/shared/domain/ports/transactional-email.port.ts` defines the outbound email contract known by the core
- `src/modules/notifications/email` provides the technical adapter layer and Nest wiring for email delivery
- Amazon SES is the production adapter and a no-op adapter keeps local/test environments stable when `EMAIL_ENABLED=false`
- email delivery can run in direct/synchronous mode or persist to the durable outbox when `JOBS_EMAIL_DELIVERY_MODE=async`
- current templates cover password reset, email verification, organization invitation, and self-register welcome
- public URLs are composed from `APP_PUBLIC_URL` plus the configured path variables instead of being hard-coded inside use cases
- the API can boot without SES credentials or connectivity while `EMAIL_ENABLED=false`; outbound email becomes a no-op until you opt in

### Async Jobs

- `src/shared/domain/ports/async-job-dispatcher.port.ts` defines the outbound async job contract
- `src/modules/jobs` persists async work to `job_outbox` inside the business transaction and relays it to SQS from a separate worker
- `src/jobs.worker.ts` boots a separate Nest application context so workers stay isolated from the HTTP process
- the outbox relay claims pending jobs with `FOR UPDATE SKIP LOCKED`, applies capped exponential backoff, and marks exhausted jobs as `dead`
- stale `claimed` rows older than `JOBS_OUTBOX_CLAIM_TIMEOUT_MS` are reclaimed automatically so relay crashes do not strand work forever
- the SQS worker validates payloads, distinguishes retryable vs non-retryable failures, and records execution receipts for idempotent handlers
- the current async payload is transactional email, but the envelope, outbox, and handler registry are ready for more job types
- delivery semantics are intentionally `at-least-once`; idempotent handlers reduce duplicate side effects after success
- the SQS worker uses long polling, configurable batch size, visibility timeout, and delete-on-success semantics
- the API can boot without SQS while `JOBS_ENABLED=false`; when jobs are enabled the template requires a valid queue URL, but not a live SQS connection at bootstrap time
- manual dead-job replay is available through `npm run start:jobs:replay -- --limit 100` or `npm run start:jobs:replay -- --ids <uuid,uuid>`
- outbox retention cleanup is available as an opt-in worker capability through `JOBS_OUTBOX_CLEANUP_ENABLED=true`

## Runtime Baseline

- runtime configuration is validated through `src/config/env/app-config.ts`
- startup fails fast on invalid combinations such as `DB_SYNC=true` in production, `DB_POOL_MIN > DB_POOL_MAX`, or short JWT secrets
- `API_KEY_SECRET`, `API_KEY_DEFAULT_TTL_DAYS`, and `API_KEY_USAGE_WRITE_INTERVAL_MS` define the API key security baseline
- `USAGE_METERING_ENABLED` enables aggregated PostgreSQL-backed API key usage counters
- `JOBS_ENABLED`, `JOBS_PROVIDER`, `JOBS_SQS_*`, `JOBS_OUTBOX_*`, `JOBS_OUTBOX_CLAIM_TIMEOUT_MS`, and `JOBS_EMAIL_DELIVERY_MODE` define the async job runtime contract
- `LOG_LEVEL`, `LOG_JSON`, and `LOG_SERVICE_NAME` define the external logging baseline
- `EMAIL_ENABLED`, `EMAIL_SES_REGION`, `EMAIL_FROM_*`, `EMAIL_BRAND_NAME`, `APP_PUBLIC_URL`, and the email path variables define the outbound email contract
- `WEBHOOKS_ENABLED`, `WEBHOOKS_TIMEOUT_MS`, and `WEBHOOKS_SECRET_ENCRYPTION_KEY` define the outbound webhook baseline
- `HELMET_ENABLED`, `CORS_ENABLED`, `CORS_ORIGINS`, and `HTTP_BODY_LIMIT` define the HTTP hardening contract
- `DB_SSL_ENABLED` and `DB_SSL_REJECT_UNAUTHORIZED` control explicit PostgreSQL TLS behavior instead of hard-coded defaults
- successful and failed HTTP requests emit structured JSON lines to stdout/stderr with `traceId`, `userId`, and `organizationId` when available

## Health And Shutdown

- liveness probe: `GET /api/health/live`
- readiness probe: `GET /api/health/ready`
- probes are version-neutral so deployment tooling does not need API version churn
- readiness performs a minimal `SELECT 1` against PostgreSQL
- bootstrap enables shutdown hooks and drains pending `http_logs` writes before process exit
- `src/health` intentionally lives at the root because probes are deployment adapters, not business modules

## Database Workflow

Detailed guide:

- [Database Workflow](./docs/database-workflow.md)
- [Jobs Operations](./docs/jobs-operations.md)

Commands:

- `npm run db:migrate`
- `npm run db:migrate:revert`
- `npm run db:migrate:show`

Key rules:

- prefer migrations over `synchronize`
- the repository currently keeps a single baseline migration instead of a historical migration chain
- `DB_MIGRATIONS_RUN=true` lets runtime bootstrap from migrations
- e2e tests rebuild schema from migrations
- RLS currently applies to `members`, `organization_invitations`, `http_logs`, and `api_keys`
- the baseline migration also seeds RBAC roles and permissions used by tenant authorization

### Environment files

- `.env` is the default runtime configuration for local development and normal app startup
- `.env.test` is loaded only when `NODE_ENV=test`
- runtime config is validated centrally before auth, Swagger, DB, and HTTP bootstrap consume it
- `.env` must not contain test database credentials
- `.env.test` is the only place for test database credentials
- e2e tests use `.env.test`, so they should never need to rewrite the normal development database settings
- the bootstrap log prints the active environment and database name to make this visible at startup
- if Nest starts but no tables exist, run `npm run db:migrate`
- simple entity properties rely on `SnakeNamingStrategy`, so explicit column `name` mappings should only be used when they add real value

### Cloning Or Resetting The Database

For a fresh clone or a full local reset:

1. create the database
2. run `npm run db:migrate`
3. start the app

This template intentionally uses a single baseline migration for the current schema, so you do not need an old migration history to bootstrap the project.

If you had an older local database created from pre-squash migrations, reset that database and run the baseline migration again.

## Swagger

- Swagger UI is available at `/docs` when `SWAGGER_ENABLED=true`
- default behavior is enabled outside production
- `.env` enables Swagger for local development
- `.env.test` disables Swagger for e2e to keep the test surface minimal
- the API uses Nest native URI versioning, so current endpoints are exposed under `/api/v1/...`

## Worker Runtime

- `npm run start:worker` boots the background worker against the current environment
- `npm run start:worker:dev` watches the worker entrypoint during local development
- `npm run start:worker:prod` runs the compiled worker from `dist/jobs.worker.js`
- `npm run start:jobs:replay -- --limit 100` requeues the oldest dead outbox rows back to `pending`
- `npm run start:jobs:replay -- --ids <uuid,uuid>` requeues a specific dead outbox subset after an operator review
- keep the HTTP API and the worker as separate processes in production so queue pressure does not affect request latency

### Optional Providers

- the template does not require SQS or SES to start locally
- with `EMAIL_ENABLED=false`, transactional email resolves to a no-op adapter
- with `JOBS_ENABLED=false`, async dispatch resolves to a no-op adapter and both outbox relay / SQS polling workers stay disabled
- `JOBS_EMAIL_DELIVERY_MODE=async` is the opt-in point where the API begins to persist durable outbox jobs and therefore requires `JOBS_ENABLED=true`
- enabling `JOBS_ENABLED=true` requires a syntactically valid `JOBS_SQS_QUEUE_URL`, but the app does not probe SQS during bootstrap
- enabling `EMAIL_ENABLED=true` requires valid email config, but the app does not probe SES during bootstrap

## Quality Gates

Run all of these before considering work complete:

- `npm run lint:check`
- `npm run build`
- `npm run test:arch`
- `npm test -- --runInBand`
- `npm run test:e2e -- --runInBand`

Or run the full local contract in one command:

- `npm run test:all`

`npm test -- --runInBand` enforces the repository coverage threshold, and now includes focused specs for transactional email templates, the SES adapter boundary, IAM use cases that trigger outbound mail, and the HTTP logging JSON contract. GitHub Actions publishes the same contract plus a coverage summary directly in the job summary for pushes and pull requests.

## Operational Retention

- `http_logs` are operational telemetry and should be treated as short-retention data; recommended baseline: 14 days
- `audit_logs` are administrative evidence and should be retained longer; recommended baseline: 365 days
- the template does not auto-delete either table at runtime
- production deployments should archive or purge them with an explicit scheduled job owned by operations, not by request-path code

## Production Readiness Verdict

Current state:

- strong candidate as a hexagonal SaaS API template for teams that want tenant-aware IAM, RBAC, PostgreSQL RLS, API keys, async jobs, and enforceable architectural boundaries from day one
- much closer to production than a teaching-only sample because it now includes CI, runtime config validation, SES-ready email delivery, a durable PostgreSQL outbox with SQS relay, idempotent request handling, tenant webhooks, usage metering, ELK-ready stdout JSON logging, health probes, graceful shutdown, coverage gates, and operational retention guidance
- suitable as a base template for internal platforms or early-stage SaaS backends that will keep evolving with project-specific adapters

What is already strong:

- strict `domain -> application -> infrastructure/presentation` direction with architecture tests
- tenant-scoped request validation plus PostgreSQL RLS on the critical current tables
- usable auth lifecycle with short-lived JWTs, opaque refresh sessions, logout/logout-all, reset, verification, and rate limiting
- tenant-scoped API keys with one-time reveal, hashing, expiration, revocation, and permission-scoped machine access
- separation between request observability (`http_logs`) and administrative auditability (`audit_logs`)
- transactional side effects can now commit business data plus durable async intent in one PostgreSQL transaction
- decoupled outbound email through a shared port plus direct delivery and outbox-backed async delivery adapters
- opt-in request idempotency for critical write endpoints
- tenant-scoped webhooks with encrypted secrets, durable delivery, and signed callbacks
- built-in PostgreSQL-backed usage metering for API-key traffic
- a clean worker entrypoint, outbox relay, dead-job replay command, retention cleanup worker, and SQS queue adapter that give the template a standard foundation for background execution
- ELK-friendly structured request logging without coupling the core to Logstash or vendor SDKs
- reproducible local and CI quality gates with PostgreSQL-backed e2e coverage

What is still intentionally left to downstream products:

- operational queue policies such as managed DLQ provisioning and queue-provider-specific alerting / dashboards
- broader observability stacks such as OpenTelemetry, metrics exporters, or vendor-specific tracing
- stronger per-project retention/compliance automation beyond the documented baseline
- SaaS-specific modules such as billing, feature flags, customer-facing plans, and invoicing

## Adding A New Feature

When adding a new IAM feature such as `invitations`, `sessions`, or `api-keys`, follow this order:

1. Create the feature folder under `src/modules/iam/<feature>`
2. Model the domain first:
   - entities
   - value objects
   - domain ports
   - domain exceptions if needed
3. Add use cases in `application/use-cases`
4. Add DI tokens in `application/ports`
5. Implement adapters in `infrastructure`
6. Expose endpoints in `presentation`
7. Register everything in `<feature>.module.ts`
8. Add migration if schema changes
9. Add unit tests and e2e coverage

If the new feature is not business-domain specific, do not force it into IAM.

Examples:

- `sessions` likely belongs in IAM
- `roles` already belongs in IAM as the baseline RBAC feature
- `http_logs` belongs in `observability`
- technical request/response helpers likely belong in `common`

Do not:

- import Nest or TypeORM in domain
- put tokens inside `*.module.ts`
- put business rules in `common`
- import a full feature module only to reuse a single provider; prefer a provider-only access module
- use access modules for DI wiring, not as a substitute for a context-level orchestration layer when workflows start crossing multiple sibling features
- create empty folders “for the future”
- bypass ports by importing adapters directly into use cases

## Adding A New Use Case To An Existing Feature

Checklist:

1. Decide if the rule belongs in domain or application orchestration
2. If persistence is needed, extend the domain port first
3. Update the infrastructure adapter implementing that port
4. Add the use case
5. Add or extend DTO/controller if exposed by HTTP
6. Add tests at the right level:
   - domain test for business rule
   - use case test if orchestration is non-trivial
   - e2e test if HTTP contract changes

## Multi-Tenancy Rules

- tenant context comes from request lifecycle
- the effective tenant is validated against real membership before request-scoped tenant context is opened
- `members` uses PostgreSQL RLS with `app.current_organization_id`
- API keys bind the effective tenant automatically, while JWT callers still provide `x-organization-id` on tenant-scoped routes
- repository code sets tenant context before tenant-scoped member queries
- tenant-scoped HTTP routes use `@RequirePermissions(...)` plus the shared `PermissionGuard`
- sensitive application flows add tenant policies on top of guards, instead of encoding all rules in HTTP
- `http_logs` read endpoints require an authenticated user plus `x-organization-id`
- `http_logs` reads are restricted by the `observability.http_logs.read` permission
- if you add a new tenant-scoped table, extend migrations and repository code with the same pattern

## Error Handling Rules

Use domain exceptions in domain/application, not Nest HTTP exceptions.

Why:

- domain stays transport-agnostic
- HTTP is only one delivery mechanism
- the global filter maps business exceptions to RFC 7807 responses

So this is correct:

- `throw new UserAlreadyExistsException(email)`

And this is not correct inside domain/application:

- `throw new ConflictException(...)`

## Recommended Next Evolutions

If you want to push this template further:

- add richer value objects such as `Email` and `OrganizationName`
- add more tenant-scoped tables with RLS
- harden authorization policies per feature as more bounded contexts appear
- add richer webhook event families, richer email branding, and stronger external observability beyond the stdout JSON baseline

### Outbox Retention Guidance

- keep `JOBS_OUTBOX_CLEANUP_ENABLED=false` until you have decided the real queue retention and DLQ replay window for your environment
- when you enable cleanup, make `JOBS_OUTBOX_RETENTION_PUBLISHED_HOURS` and `JOBS_OUTBOX_RETENTION_COMPLETED_HOURS` longer than the maximum time a duplicate message could still be replayed
- deleting a `completed` row also deletes its execution receipts, so aggressive retention can weaken duplicate suppression if a queue message resurfaces later

Not part of the base template by default:

- custom role management workflows beyond the seeded baseline
- audit/business event logs
- OpenTelemetry or external observability stacks

Treat these as opt-in evolutions once the base template stays small, teachable, and stable.

## Architecture Verdict

Current assessment:

- the project still follows a strict hexagonal style overall
- the separation between `common`, global `shared`, bounded-context `shared`, and feature folders is coherent
- the main reusable technical contract that was duplicated, authenticated request typing, now lives in `common/http`
- the project now also includes an architecture test suite in `test/hexagonal-architecture.spec.ts` to complement ESLint

Residual caveat:

- the ESLint rule is still heuristic, but it is now backed by an explicit architecture test suite
