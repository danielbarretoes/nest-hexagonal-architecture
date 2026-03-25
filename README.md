# Hexagonal IAM Template

Reusable NestJS IAM foundation built with a strict hexagonal style.

It currently includes:

- `users`, `organizations`, and `auth` as explicit IAM features
- `http_logs` as an explicit observability feature
- strict `domain -> application -> infrastructure/presentation` boundaries
- RFC 7807 problem details with `traceId`
- Swagger / OpenAPI documentation
- TypeORM adapters, PostgreSQL migrations, and real e2e tests
- JWT auth with password hashing
- soft delete + restore for `users` and `organizations`
- PostgreSQL RLS foundation for tenant-scoped `members`
- AsyncLocalStorage tenant context for request-scoped tenant propagation

## Project Map

```text
src/
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
├── modules/
│   ├── iam/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── users/
│   │   └── shared/                 # shared kernel inside IAM
│   └── observability/
│       └── http-logs/
└── shared/                         # global shared kernel
    ├── contracts/
    └── domain/
test/
├── app.e2e-spec.ts
├── rls.e2e-spec.ts
└── support/
```

## How The Project Works

### Request flow

1. HTTP request enters Nest controller in `presentation`
2. Controller validates DTO and calls a use case in `application`
3. Use case orchestrates business behavior using ports
4. Infrastructure adapters implement those ports with TypeORM, bcrypt, JWT, etc.
5. Domain objects stay framework-free
6. Errors are translated to RFC 7807 in the global HTTP filter

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

`src/common`

- technical cross-cutting concerns
- HTTP filters, tracing, tenant context, interceptors, database subscribers
- never business rules

### Current shared review

What already belongs in global `shared` and should stay there:

- pagination primitives
- generic pagination DTO contracts
- base domain exception

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

- registration
- login
- paginated listing
- get by id
- soft delete
- restore

### Organizations

- create
- get by id
- paginated listing
- soft delete
- restore

### Auth

- JWT access token
- bcrypt password hashing
- JWT guard

### Memberships

- link user to organization
- tenant-scoped role value object
- PostgreSQL RLS on `members`

### HTTP Logs

- captures success and error requests
- stores request body, query, params, response, error message, error trace, duration, traceId
- stores `userId` and `organizationId` when available
- supports lookup by `id`, `traceId`, and paginated filtering by `createdFrom`, `createdTo`, and `statusFamily`

## Database Workflow

Detailed guide:

- [Database Workflow](/Users/danielbarreto/Desktop/Code/hexagonal/docs/database-workflow.md)

Commands:

- `npm run db:migrate`
- `npm run db:migrate:revert`
- `npm run db:migrate:show`

Key rules:

- prefer migrations over `synchronize`
- the repository currently keeps a single baseline migration instead of a historical migration chain
- `DB_MIGRATIONS_RUN=true` lets runtime bootstrap from migrations
- e2e tests rebuild schema from migrations
- RLS currently applies to `members`, which is the tenant-scoped table in the current model

### Environment files

- `.env` is the default runtime configuration for local development and normal app startup
- `.env.test` is loaded only when `NODE_ENV=test`
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

## Quality Gates

Run all of these before considering work complete:

- `npm run lint`
- `npm run build`
- `npm test -- --runInBand`
- `npm run test:e2e -- --runInBand`

## Adding A New Feature

When adding a new IAM feature such as `roles`, `invitations`, or `sessions`, follow this order:

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
- `http_logs` belongs in `observability`
- technical request/response helpers likely belong in `common`

Do not:

- import Nest or TypeORM in domain
- put tokens inside `*.module.ts`
- put business rules in `common`
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
- repository code sets tenant context before tenant-scoped member queries
- `http_logs` read endpoints require an authenticated user plus `x-organization-id`
- `http_logs` reads are restricted to privileged tenant members (`owner`, `admin`, `manager`)
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
- add refresh tokens / sessions
- add more tenant-scoped tables with RLS
- harden authorization policies per feature as more bounded contexts appear

## Architecture Verdict

Current assessment:

- the project still follows a strict hexagonal style overall
- the separation between `common`, global `shared`, bounded-context `shared`, and feature folders is coherent
- the main reusable technical contract that was duplicated, authenticated request typing, now lives in `common/http`
- the project now also includes an architecture test suite in `test/hexagonal-architecture.spec.ts` to complement ESLint

Residual caveat:

- the ESLint rule is still heuristic, but it is now backed by an explicit architecture test suite
