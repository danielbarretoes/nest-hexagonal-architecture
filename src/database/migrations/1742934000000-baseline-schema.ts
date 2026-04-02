import { MigrationInterface, QueryRunner } from 'typeorm';

const APP_RUNTIME_ROLE = 'hexagonal_app_runtime';
const TENANT_SETTING = "nullif(current_setting('app.current_organization_id', true), '')::uuid";
const INVITATION_SETTING = "nullif(current_setting('app.current_invitation_id', true), '')::uuid";
const API_KEY_SETTING = "nullif(current_setting('app.current_api_key_id', true), '')::uuid";
const DEFAULT_PERMISSIONS = [
  ['0f8fad5b-d9cb-469f-a165-708677289501', 'iam.users.read', 'Read IAM users'],
  ['0f8fad5b-d9cb-469f-a165-708677289502', 'iam.users.write', 'Create or update IAM users'],
  ['0f8fad5b-d9cb-469f-a165-708677289503', 'iam.organizations.read', 'Read organizations'],
  [
    '0f8fad5b-d9cb-469f-a165-708677289504',
    'iam.organizations.write',
    'Create or update organizations',
  ],
  ['0f8fad5b-d9cb-469f-a165-708677289505', 'iam.members.read', 'Read organization memberships'],
  ['0f8fad5b-d9cb-469f-a165-708677289506', 'iam.members.write', 'Manage organization memberships'],
  ['0f8fad5b-d9cb-469f-a165-708677289507', 'iam.api_keys.read', 'Read tenant API keys'],
  ['0f8fad5b-d9cb-469f-a165-708677289508', 'iam.api_keys.write', 'Manage tenant API keys'],
  ['0f8fad5b-d9cb-469f-a165-708677289509', 'observability.http_logs.read', 'Read tenant HTTP logs'],
  [
    '0f8fad5b-d9cb-469f-a165-708677289510',
    'webhooks.endpoints.read',
    'Read tenant webhook endpoints',
  ],
  [
    '0f8fad5b-d9cb-469f-a165-708677289511',
    'webhooks.endpoints.write',
    'Manage tenant webhook endpoints',
  ],
  [
    '0f8fad5b-d9cb-469f-a165-708677289512',
    'observability.usage_metrics.read',
    'Read tenant usage metrics',
  ],
] as const;
const DEFAULT_ROLES = [
  ['7c9e6679-7425-40de-944b-e07fc1f90a11', 'owner', 'Owner'],
  ['7c9e6679-7425-40de-944b-e07fc1f90a12', 'admin', 'Admin'],
  ['7c9e6679-7425-40de-944b-e07fc1f90a13', 'manager', 'Manager'],
  ['7c9e6679-7425-40de-944b-e07fc1f90a14', 'member', 'Member'],
  ['7c9e6679-7425-40de-944b-e07fc1f90a15', 'guest', 'Guest'],
] as const;
const ROLE_PERMISSION_CODES: Record<string, readonly string[]> = {
  owner: DEFAULT_PERMISSIONS.map(([, code]) => code),
  admin: DEFAULT_PERMISSIONS.map(([, code]) => code),
  manager: [
    'iam.users.read',
    'iam.organizations.read',
    'iam.members.read',
    'iam.api_keys.read',
    'iam.api_keys.write',
    'webhooks.endpoints.read',
    'webhooks.endpoints.write',
    'observability.http_logs.read',
    'observability.usage_metrics.read',
  ],
  member: ['iam.organizations.read', 'iam.api_keys.read', 'iam.api_keys.write'],
  guest: [],
};

export class BaselineSchema1742934000000 implements MigrationInterface {
  name = 'BaselineSchema1742934000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "first_name" character varying NOT NULL,
        "last_name" character varying NOT NULL,
        "email_verified_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "pk_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "pk_organizations_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL,
        "code" character varying(64) NOT NULL,
        "name" character varying(128) NOT NULL,
        "is_system" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_roles_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL,
        "code" character varying(128) NOT NULL,
        "description" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_permissions_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_permissions_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "fk_role_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_permissions_permission_id" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "owner_user_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "key_prefix" character varying(64) NOT NULL,
        "secret_hash" character varying(128) NOT NULL,
        "scopes" jsonb NOT NULL,
        "expires_at" TIMESTAMPTZ,
        "last_used_at" TIMESTAMPTZ,
        "last_used_ip" character varying(64),
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_api_keys_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_api_keys_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_api_keys_owner_user_id" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "idempotency_requests" (
        "id" uuid NOT NULL,
        "idempotency_key" character varying(255) NOT NULL,
        "scope_key" character varying(255) NOT NULL,
        "method" character varying(12) NOT NULL,
        "route_key" character varying(255) NOT NULL,
        "request_hash" character varying(128) NOT NULL,
        "status" character varying(24) NOT NULL,
        "response_status_code" integer,
        "response_body" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_idempotency_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_idempotency_requests_scope_key" UNIQUE ("scope_key", "idempotency_key", "method", "route_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "members" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_members_user_organization" UNIQUE ("user_id", "organization_id"),
        CONSTRAINT "fk_members_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_members_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_members_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "http_logs" (
        "id" uuid NOT NULL,
        "method" character varying(16) NOT NULL,
        "path" character varying(512) NOT NULL,
        "status_code" integer NOT NULL,
        "request_body" jsonb,
        "query_params" jsonb,
        "route_params" jsonb,
        "response_body" jsonb,
        "error_message" text,
        "error_trace" text,
        "duration_ms" integer NOT NULL,
        "user_id" uuid,
        "organization_id" uuid,
        "trace_id" character varying(128),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_http_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "refresh_token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_auth_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_auth_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_action_tokens" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "purpose" character varying(64) NOT NULL,
        "token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "consumed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_action_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_user_action_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "organization_invitations" (
        "id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "role_id" uuid NOT NULL,
        "token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "accepted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_organization_invitations_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_organization_invitations_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_organization_invitations_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "usage_counters" (
        "id" uuid NOT NULL,
        "metric_key" character varying(64) NOT NULL,
        "bucket_start" TIMESTAMPTZ NOT NULL,
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "api_key_id" uuid NOT NULL,
        "route_key" character varying(255) NOT NULL,
        "status_code" integer NOT NULL,
        "count" integer NOT NULL,
        "last_seen_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "pk_usage_counters_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_usage_counters_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_usage_counters_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_usage_counters_api_key_id" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "webhook_endpoints" (
        "id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "url" character varying(2048) NOT NULL,
        "events" text[] NOT NULL,
        "secret_ciphertext" text NOT NULL,
        "last_delivery_at" TIMESTAMPTZ,
        "last_failure_at" TIMESTAMPTZ,
        "last_failure_status_code" integer,
        "last_failure_message" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_webhook_endpoints_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_webhook_endpoints_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_webhook_endpoints_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL,
        "action" character varying(128) NOT NULL,
        "actor_user_id" uuid,
        "organization_id" uuid,
        "resource_type" character varying(64) NOT NULL,
        "resource_id" character varying(128),
        "payload" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "job_outbox" (
        "id" uuid NOT NULL,
        "job_type" character varying(128) NOT NULL,
        "payload" jsonb NOT NULL,
        "trace_id" character varying(128),
        "status" character varying(32) NOT NULL,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "published_at" TIMESTAMPTZ,
        "last_error" text,
        "group_key" character varying(128) NOT NULL,
        "deduplication_key" character varying(255) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_job_outbox_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "job_execution_receipts" (
        "job_id" uuid NOT NULL,
        "handler" character varying(128) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_job_execution_receipts" PRIMARY KEY ("job_id", "handler"),
        CONSTRAINT "fk_job_execution_receipts_job_id" FOREIGN KEY ("job_id") REFERENCES "job_outbox"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_members_organization" ON "members" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_api_keys_owner_organization_created_at" ON "api_keys" ("owner_user_id", "organization_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_api_keys_organization" ON "api_keys" ("organization_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_api_keys_revoked_at" ON "api_keys" ("revoked_at")`);
    await queryRunner.query(
      `CREATE INDEX "idx_idempotency_requests_created_at" ON "idempotency_requests" ("created_at")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_members_user" ON "members" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_members_role" ON "members" ("role_id")`);
    await queryRunner.query(`CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at")`);
    await queryRunner.query(
      `CREATE INDEX "idx_organizations_deleted_at" ON "organizations" ("deleted_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_http_logs_created_at" ON "http_logs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_http_logs_status_code" ON "http_logs" ("status_code")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_http_logs_user_id" ON "http_logs" ("user_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_http_logs_organization_id" ON "http_logs" ("organization_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_http_logs_trace_id" ON "http_logs" ("trace_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_user_id" ON "auth_sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_organization_created_at" ON "audit_logs" ("organization_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_usage_counters_metric_bucket" ON "usage_counters" ("metric_key", "bucket_start", "organization_id", "api_key_id", "route_key", "status_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_usage_counters_organization_bucket" ON "usage_counters" ("organization_id", "bucket_start")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_endpoints_organization_created_at" ON "webhook_endpoints" ("organization_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_job_outbox_status_next_attempt_at" ON "job_outbox" ("status", "next_attempt_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_job_outbox_status_updated_at" ON "job_outbox" ("status", "updated_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_job_outbox_published_at" ON "job_outbox" ("published_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_action_tokens_user_purpose" ON "user_action_tokens" ("user_id", "purpose")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organization_invitations_lookup" ON "organization_invitations" ("organization_id", "email")`,
    );

    for (const [id, code, description] of DEFAULT_PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO "permissions" ("id", "code", "description")
          VALUES ($1, $2, $3)
        `,
        [id, code, description],
      );
    }

    for (const [id, code, name] of DEFAULT_ROLES) {
      await queryRunner.query(
        `
          INSERT INTO "roles" ("id", "code", "name", "is_system")
          VALUES ($1, $2, $3, true)
        `,
        [id, code, name],
      );
    }

    const permissionIdByCode = new Map<string, string>(
      DEFAULT_PERMISSIONS.map(([id, code]) => [code, id]),
    );
    const roleIdByCode = new Map<string, string>(DEFAULT_ROLES.map(([id, code]) => [code, id]));

    for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSION_CODES)) {
      const roleId = roleIdByCode.get(roleCode);

      if (!roleId) {
        continue;
      }

      for (const permissionCode of permissionCodes) {
        const permissionId = permissionIdByCode.get(permissionCode);

        if (!permissionId) {
          continue;
        }

        await queryRunner.query(
          `
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            VALUES ($1, $2)
          `,
          [roleId, permissionId],
        );
      }
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_RUNTIME_ROLE}') THEN
          CREATE ROLE ${APP_RUNTIME_ROLE} NOLOGIN;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO ${APP_RUNTIME_ROLE}`);
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "users", "organizations", "api_keys", "idempotency_requests", "members", "http_logs", "auth_sessions", "user_action_tokens", "organization_invitations", "usage_counters", "webhook_endpoints", "audit_logs", "job_outbox", "job_execution_receipts" TO ${APP_RUNTIME_ROLE}`,
    );
    await queryRunner.query(
      `GRANT SELECT ON TABLE "roles", "permissions", "role_permissions" TO ${APP_RUNTIME_ROLE}`,
    );
    await queryRunner.query(`GRANT ${APP_RUNTIME_ROLE} TO CURRENT_USER`);

    await queryRunner.query(`ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "members" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "members" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "http_logs" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "http_logs" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "organization_invitations" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "organization_invitations" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "usage_counters" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "usage_counters" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "webhook_endpoints" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "webhook_endpoints" FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      CREATE POLICY "api_keys_tenant_select" ON "api_keys"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING (
        "organization_id" = ${TENANT_SETTING}
        OR "id" = ${API_KEY_SETTING}
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "api_keys_tenant_insert" ON "api_keys"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "api_keys_tenant_update" ON "api_keys"
      FOR UPDATE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "api_keys_tenant_delete" ON "api_keys"
      FOR DELETE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "members_tenant_select" ON "members"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "members_tenant_insert" ON "members"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "members_tenant_update" ON "members"
      FOR UPDATE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "members_tenant_delete" ON "members"
      FOR DELETE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "http_logs_tenant_select" ON "http_logs"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "http_logs_insert_all" ON "http_logs"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK (
        "organization_id" IS NULL
        OR "organization_id" = ${TENANT_SETTING}
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "organization_invitations_tenant_select" ON "organization_invitations"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING (
        "organization_id" = ${TENANT_SETTING}
        OR "id" = ${INVITATION_SETTING}
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "organization_invitations_tenant_insert" ON "organization_invitations"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "organization_invitations_tenant_update" ON "organization_invitations"
      FOR UPDATE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "organization_invitations_tenant_delete" ON "organization_invitations"
      FOR DELETE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "usage_counters_tenant_select" ON "usage_counters"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "usage_counters_tenant_insert" ON "usage_counters"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "usage_counters_tenant_update" ON "usage_counters"
      FOR UPDATE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "usage_counters_tenant_delete" ON "usage_counters"
      FOR DELETE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "webhook_endpoints_tenant_select" ON "webhook_endpoints"
      FOR SELECT
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "webhook_endpoints_tenant_insert" ON "webhook_endpoints"
      FOR INSERT
      TO ${APP_RUNTIME_ROLE}
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "webhook_endpoints_tenant_update" ON "webhook_endpoints"
      FOR UPDATE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
      WITH CHECK ("organization_id" = ${TENANT_SETTING})
    `);

    await queryRunner.query(`
      CREATE POLICY "webhook_endpoints_tenant_delete" ON "webhook_endpoints"
      FOR DELETE
      TO ${APP_RUNTIME_ROLE}
      USING ("organization_id" = ${TENANT_SETTING})
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS "webhook_endpoints_tenant_delete" ON "webhook_endpoints"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "webhook_endpoints_tenant_update" ON "webhook_endpoints"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "webhook_endpoints_tenant_insert" ON "webhook_endpoints"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "webhook_endpoints_tenant_select" ON "webhook_endpoints"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "usage_counters_tenant_delete" ON "usage_counters"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "usage_counters_tenant_update" ON "usage_counters"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "usage_counters_tenant_insert" ON "usage_counters"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "usage_counters_tenant_select" ON "usage_counters"`,
    );
    await queryRunner.query(`DROP POLICY IF EXISTS "api_keys_tenant_delete" ON "api_keys"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "api_keys_tenant_update" ON "api_keys"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "api_keys_tenant_insert" ON "api_keys"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "api_keys_tenant_select" ON "api_keys"`);
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_invitations_tenant_delete" ON "organization_invitations"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_invitations_tenant_update" ON "organization_invitations"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_invitations_tenant_insert" ON "organization_invitations"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "organization_invitations_tenant_select" ON "organization_invitations"`,
    );
    await queryRunner.query(`DROP POLICY IF EXISTS "http_logs_insert_all" ON "http_logs"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "http_logs_tenant_select" ON "http_logs"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_delete" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_update" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_insert" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_select" ON "members"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "organization_invitations" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "http_logs" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "members" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "webhook_endpoints" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "usage_counters" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`REVOKE ${APP_RUNTIME_ROLE} FROM CURRENT_USER`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_webhook_endpoints_organization_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usage_counters_organization_bucket"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_usage_counters_metric_bucket"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_idempotency_requests_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_api_keys_revoked_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_api_keys_organization"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_api_keys_owner_organization_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_trace_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_status_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_job_outbox_published_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_job_outbox_status_updated_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_job_outbox_status_next_attempt_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_auth_sessions_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_organization_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_action_tokens_user_purpose"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organization_invitations_lookup"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_members_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_members_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_members_organization"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_endpoints"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "usage_counters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_execution_receipts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_outbox"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_action_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "http_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP ROLE IF EXISTS ${APP_RUNTIME_ROLE}`);
  }
}
