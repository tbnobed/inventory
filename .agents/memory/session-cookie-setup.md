---
name: Session cookie setup
description: How to configure express-session + connect-pg-simple correctly behind the Replit HTTPS proxy
---

## Rule
- Set `app.set("trust proxy", 1)` in Express so it reads `X-Forwarded-Proto` and respects HTTPS.
- Set `cookie: { secure: true, sameSite: "none" }` so cookies survive the Replit proxy (HTTPS cross-site requests).
- Set `createTableIfMissing: false` — esbuild bundles the server into `dist/index.mjs`; `connect-pg-simple` then can't find `table.sql` via relative path. Pre-create the session table manually instead.

**Why:** Replit's reverse proxy terminates TLS; app sees HTTP internally but the browser accesses it via HTTPS. `SameSite=Lax` + `secure: false` causes cookies to be rejected by modern browsers in this configuration. The `ENOENT` on `table.sql` silently breaks session persistence.

**How to apply:** Any new deployment or DB migration must create the session table first. Schema (from connect-pg-simple docs):
```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```
