# Hexagonal Guide

This document explains how this repository applies hexagonal architecture in practice.

## 1. What Hexagonal Means Here

The core idea is simple:

- business rules live in `domain`
- use cases live in `application`
- frameworks and databases live in `infrastructure`
- HTTP lives in `presentation`

Dependencies must point inward.

That means:

- `presentation` can use `application`
- `infrastructure` can use `domain`
- `application` can use `domain`
- `domain` must not know Nest, TypeORM, Express, or PostgreSQL

## 2. Bounded Contexts And Features

This template currently has two bounded contexts:

- `iam`
- `observability`

Inside IAM, these are the current features:

- `auth`
- `users`
- `organizations`

Inside observability, the current feature is:

- `http-logs`

And this is the IAM shared kernel:

- `src/modules/iam/shared`

This matters because `iam/shared` is not a fake feature. It exists only for concepts genuinely reused by multiple IAM features.

Examples:

- IAM business exceptions
- password hasher contract shared by auth and user lifecycle

## 3. Folder Semantics

### `src/common`

Technical cross-cutting concerns.

Examples:

- HTTP filters
- tracing
- tenant context
- interceptors
- database subscribers

Never put business rules here.

### `src/shared`

Global shared kernel across bounded contexts.

Examples:

- generic pagination primitives
- generic domain exception base class
- generic HTTP contracts

### `src/modules/iam/shared`

Shared kernel inside IAM only.

Examples:

- IAM-specific exceptions
- IAM-specific technical contracts

There is no `src/modules/observability/shared` yet because the current observability scope has only one feature.

## 4. Current Feature Shape

A feature should normally look like this:

```text
<feature>/
├── application/
│   ├── ports/
│   └── use-cases/
├── domain/
│   ├── entities/
│   ├── ports/
│   └── value-objects/
├── infrastructure/
│   └── persistence/
│       └── typeorm/
│           ├── entities/
│           ├── mappers/
│           └── repositories/
├── presentation/
│   ├── controllers/
│   └── dto/
└── <feature>.module.ts
```

Create folders only when they are needed.

## 5. What Goes In Each Layer

### Domain

Allowed:

- entities
- value objects
- invariants
- domain ports
- domain exceptions

Forbidden:

- `@Injectable()`
- `@Entity()`
- `Repository`
- `Request`
- `Response`
- `ConflictException`

### Application

Allowed:

- use case orchestration
- calling ports
- coordinating domain objects
- deciding which business exception to throw

Forbidden:

- SQL
- TypeORM repository access directly
- HTTP response formatting

### Infrastructure

Allowed:

- ORM entities
- repository adapters
- JWT and bcrypt adapters
- persistence transactions
- tenant/RLS database plumbing

### Presentation

Allowed:

- controllers
- DTO validation
- guards
- translating HTTP input to use case commands

Forbidden:

- business rules that should live in domain or application

## 6. Ports And Adapters

This template uses two kinds of ports:

- domain ports
- application port tokens

### Domain ports

These define the behavior the core needs.

Examples:

- user repository port
- organization repository port
- member repository port
- password hasher port
- JWT token port

### Application port tokens

These are DI tokens used by Nest to wire adapters.

Rule:

- tokens must not live in `*.module.ts`

## 7. Why Domain Exceptions Instead Of Nest Exceptions

Inside domain and application, throw business exceptions.

Example:

- `UserAlreadyExistsException`
- `OrganizationNotFoundException`
- `InvalidCredentialsException`

Do not throw:

- `ConflictException`
- `NotFoundException`
- `UnauthorizedException`

inside core business logic.

Why:

- Nest exceptions are HTTP concerns
- domain/application should stay reusable outside HTTP
- the HTTP layer already maps domain exceptions to RFC 7807 responses

## 8. Request Lifecycle In This Project

For a typical request:

1. tracing middleware adds `x-trace-id`
2. controller validates DTO
3. JWT guard authenticates request
4. tenant interceptor validates the effective tenant against real membership and then opens request context
5. use case runs
6. repository adapter talks to PostgreSQL
7. exceptions become Problem Details JSON
8. HTTP logs are persisted for both success and error responses

The public API path shape currently comes from Nest native URI versioning:

- global prefix: `api`
- versioning type: `URI`
- current version: `v1`

That means controllers define `path` and `version`, and Nest exposes routes like:

- `/api/v1/users`
- `/api/v1/auth/login`
- `/api/v1/http-logs`

## 9. Multi-Tenancy And RLS

The current tenant-scoped table is `members`.

How it works:

- PostgreSQL migration enables RLS on `members`
- policies depend on `app.current_organization_id`
- request lifecycle validates the effective tenant before it is stored in request context
- repository code opens a transaction
- repository code sets local DB role and session setting
- the database enforces tenant filtering

For observability reads:

- `http_logs` read endpoints require authentication
- the caller must send `x-organization-id`
- the caller must be a privileged member of that tenant (`owner`, `admin`, or `manager`)
- repository filtering for `http_logs` uses the validated effective tenant from request context, not the raw header value

Important:

- RLS is not “magic everywhere”
- if you add another tenant-scoped table, you must add:
  - schema changes
  - policies
  - repository transaction/session setup
  - tests

## 10. Soft Delete Pattern

Current aggregates using soft delete:

- `users`
- `organizations`

Pattern:

- domain entity exposes `softDelete()` and `restore()`
- TypeORM entity uses `DeleteDateColumn`
- repository uses `softDelete()` and `restore()`

## 11. Database And Migration Workflow

Hexagonal architecture does not remove the need for disciplined database lifecycle management.

In this template:

- normal runtime uses `.env`
- e2e tests use `.env.test`
- schema creation and evolution should happen through migrations

If you need the operational flow, see:

- [Database Workflow](/Users/danielbarreto/Desktop/Code/hexagonal/docs/database-workflow.md)
- API exposes delete/restore endpoints when relevant

If you add soft delete to another aggregate, keep that same pattern.

## 12. Shared Review

Current review of what belongs where:

Keep in global `shared`:

- generic pagination contracts
- generic pagination domain primitive
- base domain exception

Keep in `modules/iam/shared`:

- IAM exceptions
- IAM password hashing contract

Keep in `common`, not `shared`:

- authenticated request/user payload typing
- trace and tenant request lifecycle utilities
- RFC 7807 HTTP mapping

Do not move feature response DTOs into shared unless they become genuinely cross-context contracts.

Examples that should stay feature-local:

- `UserResponseDto`
- `OrganizationResponseDto`
- `HttpLogResponseDto`

## 13. Strictness Verdict

Current verdict:

- yes, the project still maintains a strict hexagonal direction overall
- domain remains free of Nest and TypeORM
- application still orchestrates through ports
- infrastructure still holds ORM adapters and technical implementations
- presentation still owns HTTP controllers, DTOs, guards, and middleware concerns
- the project now includes an architecture test suite that checks key dependency rules beyond the ESLint heuristic

Known nuance:

- the ESLint rule is an enforcement aid, not a proof system
- cross-feature technical sharing is intentionally narrow and currently limited to shared kernel, common technical concerns, guards, and port contracts

## 14. Adding A New Feature

Use this order.

### Step 1. Create the feature folder

Example:

```text
src/modules/iam/invitations/
```

### Step 2. Model the domain

Start with:

- entity
- value objects if needed
- repository port
- exceptions

### Step 3. Add use cases

Typical first use cases:

- create
- get by id
- paginate
- delete / restore if lifecycle requires it

### Step 4. Implement adapters

Add:

- TypeORM entity
- mapper
- repository adapter

### Step 5. Expose HTTP

Add:

- request DTOs
- controller methods
- guards if needed

### Step 6. Register module wiring

In `<feature>.module.ts`:

- `TypeOrmModule.forFeature(...)`
- providers
- controllers
- exports only when needed

### Step 7. Add migrations

If schema changes, update the migration story.

Do not rely on `synchronize` as the primary path.

### Step 8. Add tests

Minimum expectation:

- domain test for invariants
- config/use-case test where risk is non-trivial
- e2e test if public API changes

## 12. Adding A New Table

Before adding a table, answer:

1. Is it an aggregate root or a child entity?
2. Is it tenant-scoped?
3. Does it need soft delete?
4. Does it require unique constraints?
5. Does it require RLS?

Then implement:

- TypeORM entity
- migration
- indexes
- foreign keys
- delete strategy
- tests

## 13. Practical Rules For Contributors

- prefer adding code where the concept already belongs instead of inventing new shared folders
- keep modules thin and compositional
- keep domain immutable where practical
- do not let controllers call TypeORM directly
- do not let repositories return ORM entities to use cases
- map persistence entities to domain entities explicitly
- avoid empty folders

## 14. How To Know You Broke Hexagonal

You probably broke the architecture if:

- a domain file imports Nest or TypeORM
- a use case imports a repository adapter directly
- a controller contains business branching
- a business exception becomes a Nest HTTP exception inside core logic
- a module file becomes the only place where tokens/contracts exist
- `common` starts collecting business concepts

## 15. Current Quality Gates

Run:

- `npm run lint`
- `npm run build`
- `npm test -- --runInBand`
- `npm run test:e2e -- --runInBand`

If schema behavior matters, also verify migrations and RLS behavior through the existing PostgreSQL-backed e2e suite.
