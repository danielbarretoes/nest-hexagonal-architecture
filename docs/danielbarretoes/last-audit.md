# Updated Project Audit

State reviewed after cross-checking the documentation, the real `src` structure, and recent changes.

---

## Executive Verdict

The project **does work as a solid base for a hexagonal backend API template**. The layer separation is coherent, the documentation is didactic, and the code already demonstrates several useful patterns without falling into unnecessary enterprise complexity.

Current directional score:

- Hexagonal compliance: `9/10` because the layered structure and port boundaries are well maintained
- Template quality: `8.5/10` because it is highly reusable, with a few composition decisions still worth watching
- Practical security: `8/10` because JWT and log sanitization are reasonably well handled
- Maintainability: `8.5/10` because the repo is clear, the documentation is good, and the conventions are stable
- Balanced scalability: `7.5/10` because the base is strong, but several improvements should remain optional

---

## Strongest Areas

- Clear and repeatable `domain -> application -> infrastructure/presentation` separation
- Domain ports and DI tokens are cleanly separated
- `src/shared`, `src/modules/iam/shared`, and `src/common` have understandable semantics
- Multi-tenancy with RLS and `AsyncLocalStorage` is already integrated
- Documentation is sufficient for another developer to understand the repository map
- The architecture suite reinforces import discipline

---

## Active Findings

### High Priority

#### 1. Nest composition should remain didactic

The main template risk is no longer in the domain layers, but in **how modules are wired together**. Importing full modules just to obtain a provider teaches an overly broad pattern for something that should stay minimal and explicit.

Current state:

- This risk has already been reduced by introducing small access modules (`users-access.module.ts`, `organizations-access.module.ts`)
- This rule should remain documented and preserved in future features

#### 2. The previous audit mixed real debt with already resolved issues

Two earlier findings are now outdated:

- JWT no longer parses `.env` manually as it once did
- `http-logs` already sanitizes payloads and stack traces before persisting them

That made the earlier document leave a worse impression than the actual state of the project.

### Medium Priority

#### 3. Architecture rules still need to be hardened outside `src/modules`

The architecture test used to review only `src/modules`. For a stronger template it is also worth guarding:

- that `src/shared` does not depend on features or `src/common`
- that `src/common` does not start absorbing business logic or bounded-context coupling

#### 4. `User.passwordHash` is still exposed on the domain entity

It is not an immediate leak because output DTOs do not expose it, but it is still a domain API that is more permissive than ideal for an exemplary template.

#### 5. Validation of the runtime RLS role can still be improved

The members repository still uses `DB_RLS_RUNTIME_ROLE` with a fallback. It works as a baseline, but startup validation would make the template more robust for teams cloning the project without deep PostgreSQL/RLS knowledge.

### Low Priority

#### 6. `rehydrate()` normalizes already persisted data again

It is not a clear bug today, but it is a decision that should stay consistent with `create()` and the database.

#### 7. There is no Unit of Work or Domain Events layer

This **is not a gap in the base template**. It only becomes real debt when the project grows and a single operation touches multiple aggregates or integrations.

---

## Closed Or Partially Resolved Findings

These points should no longer be treated as primary debt:

- `AuthModule -> UsersModule` as a broad dependency: mitigated with smaller access modules
- `TenantModule` / `HttpLogsModule` importing full features just to reuse providers: mitigated with the same pattern
- JWT read from manual `.env` parsing: no longer applies in that form
- HTTP logs without sanitization: no longer applies in that form
- tenant authorization and `http-logs` based only on hardcoded roles: no longer applies; there is now a persisted RBAC base with permissions

---

## Notes Evaluation (`notes.md`)

### What still makes sense

- Asking for an exemplary project rather than one that is merely “correct”
- Moving persisted `roles` and per-module permissions into the IAM core to improve extensibility
- Considering business audit logging and more advanced observability as later growth areas

### What should not be done yet in the base template

#### Removing `modules/iam/shared`

This does not seem like a good idea. Today that folder makes sense as an internal IAM shared kernel:

- business exceptions reused across features
- a password hasher contract shared by `auth` and `users`

Removing it would make the model less explicit, not cleaner.

#### Keeping the new RBAC contained and didactic

Now that the template already includes `roles`, `permissions`, and `role_permissions`, the recommendation is no longer “postpone it” but rather “keep it contained”.

Recommendation:

- keep a simple seeded baseline (`owner`, `admin`, `manager`, `member`, `guest`)
- avoid adding advanced role-management UI/API immediately if it does not improve clarity in the template

#### Adding OpenTelemetry/ELK/Grafana to the core

That should be an optional maturity layer, not a requirement of the base template.

---

## Real Priority Recommendations

### Priority 1

- Maintain and document the fine-grained access-module pattern so the template does not teach overly broad Nest couplings
- Keep the guide to the boundaries between `common`, global `shared`, and `iam/shared`
- Make sure the audit/documentation reflects the real state of the code

### Priority 2

- Strengthen the architecture test for `src/common` and `src/shared`
- Evaluate hardening `passwordHash` on the `User` entity
- Evaluate explicit validation of the runtime RLS role at startup

### Priority 3

- Harden the startup path and documentation of the new RBAC base
- Leave business audit logs, domain events, and OpenTelemetry as a later growth phase

---

## Conclusion

If the goal is a **balanced hexagonal backend API template**, this repository is on a very good path. The right next step is not to “add more architecture”, but to:

1. refine composition and guardrails
2. keep the documentation honest
3. resist the temptation to make the template too enterprise too early

Last review: 2026-04-01
