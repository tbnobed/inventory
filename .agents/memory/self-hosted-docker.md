---
name: Self-hosted Docker deployment
description: How the app is packaged to run independent of Replit (single container serving API + SPA) and the non-obvious build/runtime constraints
---

# Self-hosted Docker deployment

The app can run fully independent of Replit via Docker (`Dockerfile`,
`docker-compose.yml`, `docker/postgres/initdb/`, `.env.example`). One **app**
container (Express serves `/api/*` **and** the built React SPA) + one **db**
container (Postgres with init SQL). Nginx Proxy Manager terminates TLS and
proxies one domain → the app port; we ship no nginx config of our own.

## Single-origin serving
- Express serves the SPA when `PUBLIC_DIR` is set: `express.static(PUBLIC_DIR)`
  plus a non-`/api` GET/HEAD fallback to `index.html`. Gated on `PUBLIC_DIR` so
  Replit (where the frontend deploys separately) is unaffected.
- Frontend is built with `BASE_PATH=/` so assets are root-relative (`/assets/...`).
- Cookies are env-driven: `COOKIE_SAMESITE` (default `none`) / `COOKIE_SECURE`
  (default `true`). Replit needs `None;Secure` (cross-site iframe); single-origin
  self-host uses `lax`. CORS allowlist also reads `ALLOWED_ORIGINS` (full origins).
- `SEED_SAMPLE_DATA=false` skips demo machines; admin is still seeded on first
  boot from `ADMIN_USER`/`ADMIN_PASSWORD`.

## Non-obvious constraints (cost real debugging)
- **The api-server esbuild bundle is fully self-contained.** The runtime image
  ships only `dist/` (no `node_modules`) and runs `node dist/index.mjs`. Verified
  by running it from an empty dir — it reaches "Server listening"; node_modules
  paths in stack traces are just sourcemap-resolved sources, not live requires.
- **Never set `NODE_ENV=production` before `pnpm install` in this monorepo.** Build
  tools (vite, esbuild, tsc) are `devDependencies`; a production-mode install
  prunes them and the build fails. Use `pnpm install --frozen-lockfile --prod=false`
  in the build stage and apply `NODE_ENV=production` inline per build command +
  on the runtime stage only.
- DB schema for a fresh volume comes from `docker/postgres/initdb/*.sql` (runs
  once on empty data dir), which must include the connect-pg-simple `session`
  table because the app runs `createTableIfMissing:false`. Keep that SQL in sync
  with `lib/db/src/schema/*.ts` (`db push` is interactive/unusable here).
