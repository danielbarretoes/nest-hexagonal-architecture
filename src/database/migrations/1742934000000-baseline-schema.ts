import { MigrationInterface, QueryRunner } from 'typeorm';

const MEMBERSHIP_ROLE_CHECK = "'owner', 'admin', 'manager', 'member', 'guest'";
const APP_RUNTIME_ROLE = 'hexagonal_app_runtime';
const TENANT_SETTING = "nullif(current_setting('app.current_organization_id', true), '')::uuid";

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
      CREATE TABLE "members" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "role" character varying(32) NOT NULL,
        "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_members_user_organization" UNIQUE ("user_id", "organization_id"),
        CONSTRAINT "chk_members_role" CHECK ("role" IN (${MEMBERSHIP_ROLE_CHECK})),
        CONSTRAINT "fk_members_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_members_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
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

    await queryRunner.query(
      `CREATE INDEX "idx_members_organization" ON "members" ("organization_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_members_user" ON "members" ("user_id")`);
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
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "users", "organizations", "members", "http_logs" TO ${APP_RUNTIME_ROLE}`,
    );
    await queryRunner.query(`GRANT ${APP_RUNTIME_ROLE} TO CURRENT_USER`);

    await queryRunner.query(`ALTER TABLE "members" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "members" FORCE ROW LEVEL SECURITY`);

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_delete" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_update" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_insert" ON "members"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "members_tenant_select" ON "members"`);
    await queryRunner.query(`ALTER TABLE "members" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`REVOKE ${APP_RUNTIME_ROLE} FROM CURRENT_USER`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_trace_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_status_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_http_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_members_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_members_organization"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "http_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP ROLE IF EXISTS ${APP_RUNTIME_ROLE}`);
  }
}
