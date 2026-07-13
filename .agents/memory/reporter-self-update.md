---
name: Reporter self-update + DB column rollout
description: How the Windows PowerShell reporter auto-updates itself and how schema additions reach already-deployed prod DBs.
---

# Reporter self-update

The reporter `.ps1` carries a `$ScriptVersion` integer constant. On each run (unless `-NoSelfUpdate`) it downloads the dashboard-served copy at `/api/agent/report.ps1`, regex-parses the remote `$ScriptVersion`, and if higher overwrites itself on disk and re-launches with `-NoSelfUpdate` (the flag prevents an update loop).

**To ship a new reporter fleet-wide:** bump `$ScriptVersion` and redeploy the dashboard. Every workstation picks it up within one scheduled cycle.

**Why this works safely:**
- A `.ps1` can be overwritten while running — PowerShell reads the whole script into memory at start, so rewriting the file on disk doesn't affect the live process.
- Self-update failures are deliberately non-fatal: the script logs and continues with the currently-running version, so a dashboard outage never stops reporting.

**Bootstrap gap:** a reporter that predates the self-update feature has no self-update block, so it will NOT upgrade itself. Those workstations must re-run the installer once. Only versions that already have the self-update block roll forward automatically.

# Schema additions and already-deployed prod DBs

The app now runs idempotent startup migrations on every boot (`artifacts/api-server/src/lib/migrate.ts` — CREATE/ALTER ... IF NOT EXISTS, fatal on failure). Fresh and existing DBs both converge automatically, so a Docker rebuild is a complete deploy; the old `docker/postgres/initdb/` init SQL was removed as a second source of truth.

**How to apply:** every schema change goes in two places — `lib/db/src/schema/*.ts` AND `migrate.ts` (new columns in both the baseline CREATE TABLE and an incremental ALTER). Dev DB still needs the DDL applied via executeSql (`pnpm db push` is unusable: interactive TTY prompt) — or just restart the API server, which now runs the migrations.
