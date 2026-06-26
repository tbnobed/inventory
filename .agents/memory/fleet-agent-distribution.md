---
name: Fleet reporter agent distribution
description: How the Windows workstation agent is hosted and how the installer handles the ingest secret
---

# Fleet workstation agent distribution

The `.ps1` reporter and `.bat` installer live in `artifacts/fleet-dashboard/public/`
so they are served as static downloads at `<dashboard>/Report-FleetInventory.ps1`
and `<dashboard>/install-fleet-reporter.bat`.

**Why public/, not an /api route:** the api-server is bundled by esbuild to a single
ESM file, so runtime `fs` reads of a sibling script path are fragile. Vite's static
`public/` dir serves the raw files reliably and survives the SPA `/* -> /index.html`
rewrite (existing files are served before the fallback — same as robots.txt).

**Ingest token handling (installer):** the `.bat` does NOT pass the token as a
scheduled-task argument. It writes `FLEET_DASHBOARD_URL` / `FLEET_INGEST_TOKEN` as
machine-level env vars (`setx /M`); the `.ps1` reads those at runtime. This keeps the
secret out of the task command line (visible to local admins) and avoids fragile
inline PowerShell `-Command` string escaping of arbitrary token characters.
**How to apply:** if you change the agent's auth, keep the env-var indirection — do
not interpolate secrets into the `-Command`/`-Argument` strings, and do not turn on
`setlocal enabledelayedexpansion` (it mangles `!` in tokens).
