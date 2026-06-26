-- ===========================================================================
-- Fleet Inventory Dashboard — initial database schema.
--
-- The official postgres image runs every *.sql in /docker-entrypoint-initdb.d
-- exactly once, on the FIRST start with an empty data directory. This file
-- creates all application tables plus the express-session store table.
--
-- The admin account is NOT created here (it needs a bcrypt hash) — the API
-- server seeds it on first boot from ADMIN_USER / ADMIN_PASSWORD.
--
-- Keep this in sync with lib/db/src/schema/*.ts.
-- ===========================================================================

-- Hardware fleet (one row per workstation, keyed by hardware UUID).
CREATE TABLE IF NOT EXISTS "machines" (
  "machine_id"   text PRIMARY KEY,
  "hostname"     text NOT NULL,
  "site"         text,
  "last_seen"    timestamptz NOT NULL DEFAULT now(),
  "manufacturer" text,
  "model"        text,
  "cpu"          text,
  "total_ram_gb" integer,
  "ram_type"     text,
  "gpu1_model"   text,
  "os"           text,
  "primary_ip"   text,
  "data"         jsonb
);
CREATE INDEX IF NOT EXISTS "machines_hostname_idx" ON "machines" ("hostname");
CREATE INDEX IF NOT EXISTS "machines_site_idx" ON "machines" ("site");

-- Dashboard users (admin / viewer roles).
CREATE TABLE IF NOT EXISTS "users" (
  "id"            serial PRIMARY KEY,
  "username"      text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role"          text NOT NULL DEFAULT 'viewer'
);

-- Subnet -> site CIDR rules used to derive a machine's site on ingest.
CREATE TABLE IF NOT EXISTS "site_subnets" (
  "id"         serial PRIMARY KEY,
  "cidr"       text NOT NULL,
  "site"       text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- express-session store (connect-pg-simple). The app runs with
-- createTableIfMissing:false, so this table must exist up front.
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    varchar NOT NULL,
  "sess"   json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
