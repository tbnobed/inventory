import { Router } from "express";
import { db, siteSubnetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireSession, requireAdmin } from "../middlewares/auth";
import { isValidCidr } from "../lib/subnet";
import { CreateSubnetBody } from "@workspace/api-zod";

const router = Router();

// GET /subnets — list subnet-to-site rules
router.get("/subnets", requireSession, async (req, res) => {
  try {
    const rows = await db.select().from(siteSubnetsTable);
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error listing subnets");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /subnets — create a subnet-to-site rule (admin)
router.post("/subnets", requireAdmin, async (req, res) => {
  try {
    const parsed = CreateSubnetBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    }

    const cidr = parsed.data.cidr.trim();
    const site = parsed.data.site.trim();

    if (!isValidCidr(cidr)) {
      return res.status(400).json({ error: "Invalid CIDR. Expected IPv4 form like 10.1.0.0/16" });
    }
    if (!site) {
      return res.status(400).json({ error: "Site is required" });
    }

    const [row] = await db
      .insert(siteSubnetsTable)
      .values({ cidr, site })
      .returning();

    return res.json(row);
  } catch (err) {
    req.log.error({ err }, "Error creating subnet");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /subnets/:id — delete a subnet-to-site rule (admin)
router.delete("/subnets/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const raw = Array.isArray(id) ? id[0] : id;
    const numId = Number(raw);
    if (!Number.isInteger(numId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const deleted = await db
      .delete(siteSubnetsTable)
      .where(eq(siteSubnetsTable.id, numId))
      .returning();

    if (!deleted[0]) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting subnet");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
