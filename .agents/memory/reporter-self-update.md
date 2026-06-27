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

`docker/postgres/initdb/*.sql` only runs on a **fresh** Postgres volume. The app does not run migrations against existing DBs. So any new column must be applied by hand to a live prod DB, e.g. `ALTER TABLE machines ADD COLUMN IF NOT EXISTS <col> <type>;`, in addition to updating `initdb/*.sql` (for fresh installs) and `lib/db/src/schema/*.ts`.

**Why:** `pnpm db push` is unusable in this environment (interactive TTY prompt, no non-interactive flag), and the self-hosted prod runs its own Postgres with no migration runner.
