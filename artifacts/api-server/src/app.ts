import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/session";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Strict CORS allowlist. The dashboard and API are served same-origin behind
// the Replit proxy, so no third-party origin needs credentialed access. A
// permissive `origin: true` with `credentials: true` would let a malicious site
// read authenticated responses (e.g. the token-templated installer) using the
// admin's cookie, so we only reflect known Replit domains. Requests with no
// Origin header (curl, the PowerShell agent) are allowed — they rely on the
// bearer token, not cookies, and browsers never enforce CORS on same-origin.
// Replit preview domains arrive bare (no scheme) and are normalised to https.
// Self-hosted deployments pass full origins (with scheme) via ALLOWED_ORIGINS,
// comma-separated — needed only if the dashboard and API are ever split across
// origins; for the default single-origin Docker setup no entries are required.
const allowedOrigins = new Set([
  ...(process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => `https://${d}`),
  ...(process.env.REPLIT_DEV_DOMAIN
    ? [`https://${process.env.REPLIT_DEV_DOMAIN}`]
    : []),
  ...(process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean),
]);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.has(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use("/api", router);

// In self-hosted/Docker production the same server also serves the built React
// SPA so the dashboard and API share one origin and one port behind the reverse
// proxy (Nginx Proxy Manager). Enabled by pointing PUBLIC_DIR at the frontend
// build output. On Replit the frontend is served separately, so PUBLIC_DIR is
// unset there and this block is inert.
const publicDir = process.env.PUBLIC_DIR;
if (publicDir) {
  app.use(express.static(publicDir));
  // SPA fallback: any non-API GET/HEAD returns index.html so client-side
  // routing (wouter) survives hard refresh and deep links.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

export default app;
