import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";

const PgSession = connectPgSimple(session);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

// Cookie policy is environment-driven so the same build works in two contexts:
//  - Replit preview runs inside a cross-site iframe → needs SameSite=None; Secure
//    (the defaults below preserve that behaviour).
//  - Self-hosted/Docker serves the dashboard and API from one origin behind a
//    reverse proxy → set COOKIE_SAMESITE=lax (more robust, no cross-site needed).
// SameSite=None is only valid on Secure cookies, so secure defaults to true and
// should only be disabled (COOKIE_SECURE=false) for non-TLS local testing.
const sameSite = (process.env.COOKIE_SAMESITE ?? "none") as
  | "lax"
  | "strict"
  | "none";
const secure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : true;

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite,
  },
});

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}
