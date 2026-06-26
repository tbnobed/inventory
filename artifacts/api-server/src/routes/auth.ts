import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { LoginBody } from "@workspace/api-zod";
import { requireSession } from "../middlewares/auth";

const router = Router();

// POST /login
router.post("/login", async (req, res) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { username, password } = parsed.data;
    const rows = await db.select().from(usersTable).where(eq(usersTable.username, username));
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    return res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    req.log.error({ err }, "Error during login");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    return res.json({ ok: true });
  });
});

// GET /me
router.get("/me", requireSession, (req, res) => {
  return res.json({
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role,
  });
});

export default router;
