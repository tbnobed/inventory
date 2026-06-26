# Fleet Inventory Dashboard

A self-hosted hardware fleet inventory dashboard for OBTV Edit Systems — Windows workstations push hardware specs via REST API; IT staff view, filter, and flag machines in a dark ops-console web dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/fleet-dashboard run dev` — run the frontend (port 19295, preview at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild shared libs (run after editing `lib/*`)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`, `INGEST_TOKEN`

## Self-hosted deployment (Docker)

Runs fully independent of Replit. Files: `Dockerfile`, `docker-compose.yml`, `docker/postgres/initdb/01-schema.sql`, `.env.example`, `.dockerignore`.

- **One app container serves both API and SPA.** Express serves `/api/*` and the built React SPA (static + non-`/api` fallback to `index.html`) when `PUBLIC_DIR` is set. A single domain in Nginx Proxy Manager proxies everything; we ship no nginx config of our own.
- **Deploy:** `cp .env.example .env` (fill secrets), then `docker compose up -d --build`. Point NPM at `http://<host>:${APP_PORT}` (default 8080) with TLS.
- **DB schema:** created once from `docker/postgres/initdb/*.sql` on a fresh Postgres volume (must include the `session` table — `createTableIfMissing:false`). Keep in sync with `lib/db/src/schema/*.ts`.
- **Admin:** seeded by the app on first boot from `ADMIN_USER`/`ADMIN_PASSWORD`. `SEED_SAMPLE_DATA=false` keeps the fleet empty (no demo machines).
- **Env knobs added for self-hosting:** `PUBLIC_DIR` (enable SPA serving), `COOKIE_SAMESITE`/`COOKIE_SECURE` (default `none`/`true` to preserve Replit; Docker sets `lax`/`true`), `ALLOWED_ORIGINS` (extra CORS origins), `SEED_SAMPLE_DATA`.
- **Build notes:** runtime image ships only the api-server `dist/` (the esbuild bundle is self-contained — no `node_modules`) plus the frontend `dist/public`. Do **not** set `NODE_ENV=production` before `pnpm install` in the build stage — it prunes the devDependencies (vite/esbuild/tsc) the build needs.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session + connect-pg-simple + bcryptjs
- DB: PostgreSQL + Drizzle ORM (tables: `machines`, `users`, `session`, `site_subnets`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/`)
- Frontend: React + Vite + Tailwind v4 + wouter routing + @tanstack/react-query
- Build: esbuild (ESM bundle)

## Where things live

- `lib/api-spec/` — OpenAPI spec (source of truth for all routes)
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas
- `lib/db/src/schema.ts` — Drizzle ORM schema (machines, users tables)
- `artifacts/api-server/src/` — Express API server
  - `src/routes/` — route handlers
  - `src/lib/flags.ts` — upgrade flag logic (DDR3=danger, Win10=danger, etc.)
  - `src/lib/session.ts` — express-session config
  - `src/lib/seed.ts` — admin user + 5 sample machines seeded on first boot
- `artifacts/api-server/src/assets/Report-FleetInventory.ps1` — Windows PowerShell agent installed on workstations; collects hardware specs via CIM/WMI and POSTs to `/api/report` with the ingest bearer token. Served (with `Content-Disposition: attachment`) at `<dashboard>/api/agent/report.ps1`. Install/scheduling instructions are in the script's comment header.
- `artifacts/api-server/src/assets/install-fleet-reporter.bat` — one-click installer (run as Administrator). Downloads the `.ps1` from `/api/agent/report.ps1` and registers the `OBTV Fleet Inventory` scheduled task (daily 7am + at startup, SYSTEM). Dashboard URL + ingest token are set at the top of the file or passed as args. Served at `<dashboard>/api/agent/install.bat`.
- `artifacts/api-server/src/assets/vnc-launch.ps1` — validating launcher for the `vnc://` URL scheme. Receives the clicked URL as a single argument (via PowerShell `-File`), strips the scheme, rejects anything that isn't a bare host/IP (`^[A-Za-z0-9._:\[\]-]+$`), then launches whichever VNC viewer is installed (searches RealVNC/TightVNC/UltraVNC/TigerVNC in both Program Files roots; shows a WScript popup if none found). Served at `<dashboard>/api/agent/vnc-launch.ps1`.
- `artifacts/api-server/src/assets/vnc-handler-install.bat` — one-time installer (run as Administrator) that registers the `vnc://` scheme. **Required on Windows for every viewer**: TightVNC/UltraVNC/TigerVNC register nothing, and RealVNC registers its own `com.realvnc.vncviewer.connect://` scheme plus the `.vnc` file type — *not* `vnc://`. Downloads `vnc-launch.ps1` to `%ProgramData%\OBTV Fleet\` and points `HKCR\vnc\shell\open\command` at it via `powershell -File "...vnc-launch.ps1" "%1"`. Dashboard URL is templated at download time from the request origin. Served at `<dashboard>/api/agent/vnc-handler.bat`.
- `artifacts/fleet-dashboard/src/` — React frontend
  - `src/pages/login.tsx` — login page
  - `src/pages/dashboard.tsx` — main fleet table (search, filter, sort, CSV export)
  - `src/pages/users.tsx` — admin user management
  - `src/components/TopBar.tsx` — site header with nav and logout
  - `src/components/DetailDrawer.tsx` — slide-in machine detail panel
  - `src/index.css` — NOC palette theme (JetBrains Mono, bg #0b0e14, teal #36d0c4)

## Architecture decisions

- **Session cookies**: `SameSite=None; Secure` required — app runs behind Replit's HTTPS proxy; `trust proxy: 1` set on Express so cookies work correctly.
- **`createTableIfMissing: false`**: `connect-pg-simple` cannot find `table.sql` when bundled by esbuild. Session table is pre-created via migration instead.
- **customFetch credentials**: `credentials: "include"` is set in `lib/api-client-react/src/custom-fetch.ts` so session cookies are sent on all API requests.
- **Auth routing**: `AuthGate` in `App.tsx` drives routing based on React Query's `/api/me` result — no imperative navigation; logout sets `me` to `null` directly via `setQueryData`.
- **Ingest endpoint**: `POST /api/report` uses `Authorization: Bearer <INGEST_TOKEN>` (not session) so Windows scripts can push specs without a UI login.
- **Strict CORS allowlist**: `app.ts` allows only `https://` origins from `REPLIT_DOMAINS` + `REPLIT_DEV_DOMAIN` (requests with no Origin — curl, the PowerShell agent — are allowed; they use bearer auth). Never use `origin: true` with `credentials: true`: the session cookie is `SameSite=None` and `/api/agent/install.bat` embeds the ingest token for admins, so a reflected origin would let any site exfiltrate it via the admin's browser. Dashboard + API are same-origin behind the proxy, so no third party needs credentialed cross-origin access.
- **Installer templated at download time**: `GET /api/agent/install.bat` fills `DASHBOARD_URL` from the request origin for everyone and injects the real `INGEST_TOKEN` **only** for an authenticated admin session (the dashboard `<a download>` sends the cookie). The route replaces only the `set "VAR=..."` assignment lines (first match) so the `if "%VAR%"=="PLACEHOLDER"` not-set guards still fire; injected values are rejected if not batch-safe.
- **Site derivation ("Dashboard wins")**: on ingest, a machine's `site` is auto-filled from `site_subnets` CIDR rules matched against `primary_ip` (most-specific prefix wins, ties broken by lowest rule id). Upsert uses `COALESCE(machines.site, derivedSite)` so an existing/admin-set site is never overwritten — derivation only fills a blank. An explicit non-blank `site` in the report payload takes precedence over the subnet lookup; empty/whitespace site is normalized to `null` before COALESCE.
- **`vnc://` handler must never interpolate machine data into a command line**: `hostname`/`primary_ip` come from ingest (unconstrained strings), so they are untrusted. The registry handler invokes `powershell -File vnc-launch.ps1 "%1"` — `-File` passes the clicked URL as a plain argument (no string interpolation), and `vnc-launch.ps1` rejects anything that isn't a bare host/IP before launching. A registered `vnc://` handler is global (any site/app on the workstation can invoke it), so the launcher must validate independently. Defense-in-depth: the dashboard's `buildLaunchUrl` returns `null` (disabling the menu item) when the IP/hostname isn't host-safe, so it never builds a dangerous protocol URL. Never go back to a self-contained `.reg` that embeds `%1` inside a quoted PowerShell literal — that is a local code-execution hole.

## Product

- **Login**: session-cookie auth; admin and viewer roles
- **Dashboard**: sortable table of all fleet machines, search by hostname/IP/CPU/GPU/OS, filter by site or flagged status, 30s auto-refresh, stat strip (total/flagged/danger/warn/sites)
- **Detail drawer**: click any row to see full hardware specs (CPU, RAM modules, disks, volumes, NICs, GPU drivers, BIOS)
- **Flags**: automatic upgrade flags — DDR3=danger, DDR4=warn, <64GB RAM=warn, non-RTX40/50/60/PRO/A GPU=warn, Win10=danger, stale >14d=danger
- **Export**: CSV download of entire fleet via `/api/export.csv`
- **User management**: admin-only — add/delete users, reset passwords
- **Site editing**: admin can edit a machine's site inline in the detail drawer (`PATCH /api/machines/{id}`); blanking it lets the next report re-derive a site.
- **Site Mapping**: admin-only page (nav link in TopBar) to manage subnet→site CIDR rules (`GET/POST /api/subnets`, `DELETE /api/subnets/{id}`); these drive ingest site derivation.
- **Row context menu**: right-click a dashboard row (`RowContextMenu.tsx`) for Connect via VNC / Jump Desktop (OS protocol handlers, URLs from configurable `VITE_VNC_URL_TEMPLATE` / `VITE_JUMP_URL_TEMPLATE`, defaults `vnc://{ip}` and `jump://?name={hostname}`), copy IP/hostname, open details, and a "set up vnc:// handler" link to the installer. Two independent paths: (1) **Jump Desktop** — the machines are managed by Jump Desktop Connect (saved computers in the account). Address them by **saved name** with `jump://?name={hostname}`, which connects to that saved computer over its configured Fluid protocol. Do **not** use `jump://?host=...` — that attempts a *direct ad-hoc* connection and just opens the app without connecting (this was the "opens app but doesn't connect" bug). No `protocol=` param on a named connection (the saved computer already knows it is Fluid; forcing one can break it). If a computer's Jump Desktop display name differs from its hostname, override the template so `name=` matches exactly. (2) **VNC** — for staff using a standalone VNC viewer against the host's VNC server. On Windows **no common viewer registers `vnc://` for browser links by default** (TightVNC/UltraVNC/TigerVNC register nothing; RealVNC registers its own `com.realvnc.vncviewer.connect://` scheme + the `.vnc` file type, not `vnc://`), so the one-time installer is required once per workstation regardless of viewer — it maps `vnc://` to whichever viewer is installed. We standardise on `vnc://` instead of a viewer-specific scheme so one link works everywhere.
- **Ingest**: `POST /api/report` with bearer token for Windows PowerShell reporters

## Gotchas

- **Always run `pnpm run typecheck:libs` after editing anything in `lib/*`** before checking leaf artifacts — stale `.d.ts` files will cause false TS errors.
- The `session` table must exist in PostgreSQL before starting the API server (already created in dev DB). Run the SQL in `connect-pg-simple`'s `table.sql` against any new DB.
- esbuild bundles `api-server` to ESM (`dist/index.mjs`) with a CJS compatibility banner — do not switch to CJS output.
- `req.params` in Express 5 can return `string | string[]`; always normalize with `Array.isArray` before using in Drizzle `eq()`.
- Zod schema names generated by Orval: `ReportMachineBody`, `LoginBody`, `CreateUserBody`, `UpdateUserPasswordBody`, `CreateSubnetBody`, `UpdateMachineSiteBody` (not `UserInput`).
- **`pnpm db push` fails in this environment** — it blocks on an interactive TTY prompt (column rename detection) and has no usable non-interactive flag here. Apply DDL directly via SQL instead (e.g. the database skill's `executeSql`), then keep `lib/db/src/schema/*` in sync.
- **Testing the session-cookie API with `curl` over `localhost:80` (plain http) fails with 401** — the session cookie is `Secure`, so curl won't send it over http. Test cookie-auth routes in the browser (HTTPS proxy). Bearer-token routes like `/api/report` work fine from curl/node.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
