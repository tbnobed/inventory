import { pool } from "@workspace/db";
import { logger } from "./logger";

// ===========================================================================
// Startup schema migrations — the single source of truth for the DB schema.
//
// Runs on every boot, before the server starts listening. Every statement is
// idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), so re-running is a
// no-op. This is what makes `docker compose up -d --build` a complete deploy:
// a fresh database gets the full schema, and an existing database gets any
// new tables/columns added automatically — no manual SQL ever.
//
// Keep in sync with lib/db/src/schema/*.ts. When you add a column to the
// Drizzle schema, add a matching `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
// here (and include it in the CREATE TABLE too, for fresh databases).
// ===========================================================================

const MIGRATIONS: string[] = [
  // --- Baseline tables (fresh database) ------------------------------------

  // Hardware fleet (one row per workstation, keyed by hardware UUID).
  `CREATE TABLE IF NOT EXISTS "machines" (
    "machine_id"     text PRIMARY KEY,
    "hostname"       text NOT NULL,
    "logged_in_user" text,
    "site"           text,
    "last_seen"      timestamptz NOT NULL DEFAULT now(),
    "manufacturer"   text,
    "model"          text,
    "cpu"            text,
    "total_ram_gb"   integer,
    "ram_type"       text,
    "gpu1_model"     text,
    "os"             text,
    "primary_ip"     text,
    "notes"          text,
    "data"           jsonb
  )`,
  `CREATE INDEX IF NOT EXISTS "machines_hostname_idx" ON "machines" ("hostname")`,
  `CREATE INDEX IF NOT EXISTS "machines_site_idx" ON "machines" ("site")`,

  // Dashboard users (admin / viewer roles).
  `CREATE TABLE IF NOT EXISTS "users" (
    "id"            serial PRIMARY KEY,
    "username"      text NOT NULL UNIQUE,
    "password_hash" text NOT NULL,
    "role"          text NOT NULL DEFAULT 'viewer'
  )`,

  // Subnet -> site CIDR rules used to derive a machine's site on ingest.
  `CREATE TABLE IF NOT EXISTS "site_subnets" (
    "id"         serial PRIMARY KEY,
    "cidr"       text NOT NULL,
    "site"       text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,

  // express-session store (connect-pg-simple). The app runs with
  // createTableIfMissing:false, so this table must exist before requests.
  `CREATE TABLE IF NOT EXISTS "session" (
    "sid"    varchar NOT NULL,
    "sess"   json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`,

  // --- Incremental changes (existing databases) -----------------------------
  // Columns added after the initial release. Redundant on fresh databases
  // (already in the CREATE TABLE above) but required to upgrade databases
  // created before each column existed.
  `ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "logged_in_user" text`,
  `ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "notes" text`,
];

export async function runMigrations() {
  const started = Date.now();
  for (const sql of MIGRATIONS) {
    await pool.query(sql);
  }
  logger.info(
    { statements: MIGRATIONS.length, ms: Date.now() - started },
    "Database schema migrations applied"
  );
}
