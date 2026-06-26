import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { CreateUserBody, UpdateUserPasswordBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /users
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
    }).from(usersTable);
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error listing users");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /users
router.post("/users", requireAdmin, async (req, res) => {
  try {
    const parsed = CreateUserBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    }

    const { username, password, role } = parsed.data;
    const hash = await bcrypt.hash(password, 12);

    const [user] = await db.insert(usersTable).values({
      username,
      password_hash: hash,
      role: role as "admin" | "viewer",
    }).returning({ id: usersTable.id, username: usersTable.username, role: usersTable.role });

    return res.status(201).json(user);
  } catch (err) {
    req.log.error({ err }, "Error creating user");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /users/:user_id
router.delete("/users/:user_id", requireAdmin, async (req, res) => {
  try {
    const rawId = Array.isArray(req.params.user_id) ? req.params.user_id[0] : req.params.user_id;
    const userId = parseInt(rawId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

    // Prevent deleting yourself
    if (userId === req.session.userId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const deleted = await db.delete(usersTable).where(eq(usersTable.id, userId)).returning();
    if (!deleted[0]) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting user");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /users/:user_id — reset password
router.patch("/users/:user_id", requireAdmin, async (req, res) => {
  try {
    const rawId2 = Array.isArray(req.params.user_id) ? req.params.user_id[0] : req.params.user_id;
    const userId = parseInt(rawId2, 10);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

    const parsed = UpdateUserPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const hash = await bcrypt.hash(parsed.data.password, 12);
    const [user] = await db.update(usersTable)
      .set({ password_hash: hash })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, username: usersTable.username, role: usersTable.role });

    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json(user);
  } catch (err) {
    req.log.error({ err }, "Error resetting password");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
