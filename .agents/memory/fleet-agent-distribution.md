---
name: Fleet reporter agent distribution
description: How the Windows workstation agent is hosted/served and how the installer handles the ingest secret
---

# Fleet workstation agent distribution

The `.ps1` reporter and `.bat` installer live in `artifacts/api-server/src/assets/`
and are served by the Express API as downloads at:
- `<dashboard>/api/agent/report.ps1`
- `<dashboard>/api/agent/install.bat`

The route sets `Content-Disposition: attachment`. The files are inlined into the
server bundle via an esbuild `text` loader (`.ps1`/`.bat`), with a `*.ps1`/`*.bat`
module declaration in `assets.d.ts` for TS.

**Why API server, not the frontend `public/` dir:** the web artifact deploys as a
static site with a `/* -> /index.html` SPA rewrite. Relying on static-file
precedence to dodge that rewrite is risky across dev/prod, and static hosting
can't set per-file `Content-Disposition`. The API server is a real server in both
dev and prod (no SPA fallback), so downloads are reliable and get proper headers.
**Symptom that drove this:** browsing directly to the old `/<file>.bat` static URL
returned the SPA's React 404 (stale-cache / rewrite shadowing), even though curl
got the file.

**Ingest token handling (installer):** the `.bat` does NOT pass the token as a
scheduled-task argument. It writes `FLEET_DASHBOARD_URL` / `FLEET_INGEST_TOKEN` as
machine-level env vars (`setx /M`); the `.ps1` reads those at runtime. This keeps
the secret out of the task command line (visible to local admins) and avoids
fragile inline PowerShell `-Command` string escaping of arbitrary token chars.
**How to apply:** if you change the agent's auth, keep the env-var indirection — do
not interpolate secrets into the `-Command`/`-Argument` strings, and do not enable
`setlocal enabledelayedexpansion` (it mangles `!` in tokens).
