import { Router } from "express";
import { db, machinesTable, siteSubnetsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { computeFlags } from "../lib/flags";
import { siteForIp } from "../lib/subnet";
import { requireSession, requireAdmin, requireIngestToken } from "../middlewares/auth";
import { ReportMachineBody, UpdateMachineSiteBody } from "@workspace/api-zod";

const router = Router();

function machineWithFlags(m: typeof machinesTable.$inferSelect) {
  return { ...m, flags: computeFlags(m) };
}

// GET /machines
router.get("/machines", requireSession, async (req, res) => {
  try {
    const { search, site, flagged } = req.query as {
      search?: string;
      site?: string;
      flagged?: string;
    };

    let rows = await db.select().from(machinesTable);

    if (site) {
      rows = rows.filter((m) => m.site === site);
    }

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((m) =>
        [m.hostname, m.primary_ip, m.cpu, m.gpu1_model, m.model, m.os]
          .some((v) => v?.toLowerCase().includes(q))
      );
    }

    const withFlags = rows.map(machineWithFlags);

    if (flagged === "true") {
      return res.json(withFlags.filter((m) => m.flags.length > 0));
    }

    return res.json(withFlags);
  } catch (err) {
    req.log.error({ err }, "Error listing machines");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /machines/:machine_id
router.get("/machines/:machine_id", requireSession, async (req, res) => {
  try {
    const { machine_id } = req.params;
    const id = Array.isArray(machine_id) ? machine_id[0] : machine_id;
    const rows = await db.select().from(machinesTable).where(eq(machinesTable.machine_id, id));
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    return res.json(machineWithFlags(rows[0]));
  } catch (err) {
    req.log.error({ err }, "Error getting machine");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /machines/:machine_id
router.delete("/machines/:machine_id", requireAdmin, async (req, res) => {
  try {
    const { machine_id } = req.params;
    const id = Array.isArray(machine_id) ? machine_id[0] : machine_id;
    const deleted = await db.delete(machinesTable).where(eq(machinesTable.machine_id, id)).returning();
    if (!deleted[0]) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting machine");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /machines/:machine_id — update site (admin)
router.patch("/machines/:machine_id", requireAdmin, async (req, res) => {
  try {
    const { machine_id } = req.params;
    const id = Array.isArray(machine_id) ? machine_id[0] : machine_id;

    const parsed = UpdateMachineSiteBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    }

    const site = parsed.data.site?.trim() || null;

    const [row] = await db
      .update(machinesTable)
      .set({ site })
      .where(eq(machinesTable.machine_id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(machineWithFlags(row));
  } catch (err) {
    req.log.error({ err }, "Error updating machine site");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /report — ingest endpoint protected by bearer token
router.post("/report", requireIngestToken, async (req, res) => {
  try {
    const parsed = ReportMachineBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    }

    const payload = parsed.data;
    const now = new Date();

    // Derive the site from subnet rules using the reported IP. An explicit
    // (non-blank) site in the payload takes precedence over the subnet lookup.
    // Empty/whitespace-only site is normalized to null so "blank means fill"
    // semantics hold (an empty string would otherwise be sticky via COALESCE).
    const rules = await db.select().from(siteSubnetsTable);
    const explicitSite = payload.site?.trim() || null;
    const derivedSite = explicitSite ?? siteForIp(payload.primary_ip, rules);

    const [row] = await db
      .insert(machinesTable)
      .values({
        machine_id: payload.machine_id,
        hostname: payload.hostname,
        logged_in_user: payload.logged_in_user ?? null,
        site: derivedSite,
        last_seen: now,
        manufacturer: payload.manufacturer ?? null,
        model: payload.model ?? null,
        cpu: payload.cpu ?? null,
        total_ram_gb: payload.total_ram_gb ?? null,
        ram_type: payload.ram_type ?? null,
        gpu1_model: payload.gpu1_model ?? null,
        os: payload.os ?? null,
        primary_ip: payload.primary_ip ?? null,
        data: payload.data ?? null,
      })
      .onConflictDoUpdate({
        target: machinesTable.machine_id,
        set: {
          hostname: payload.hostname,
          logged_in_user: payload.logged_in_user ?? null,
          // Dashboard wins: keep an existing site (set by an admin or a
          // previous report); only fill it in when it is currently blank.
          site: sql`COALESCE(${machinesTable.site}, ${derivedSite})`,
          last_seen: now,
          manufacturer: payload.manufacturer ?? null,
          model: payload.model ?? null,
          cpu: payload.cpu ?? null,
          total_ram_gb: payload.total_ram_gb ?? null,
          ram_type: payload.ram_type ?? null,
          gpu1_model: payload.gpu1_model ?? null,
          os: payload.os ?? null,
          primary_ip: payload.primary_ip ?? null,
          data: payload.data ?? null,
        },
      })
      .returning();

    return res.json(machineWithFlags(row));
  } catch (err) {
    req.log.error({ err }, "Error reporting machine");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /stats
router.get("/stats", requireSession, async (req, res) => {
  try {
    const rows = await db.select().from(machinesTable);
    const withFlags = rows.map(machineWithFlags);
    const flagged = withFlags.filter((m) => m.flags.length > 0);
    const dangerCount = withFlags.filter((m) => m.flags.some((f) => f.severity === "danger")).length;
    const warnCount = withFlags.filter((m) => m.flags.some((f) => f.severity === "warn")).length;
    const sites = new Set(rows.map((m) => m.site).filter(Boolean));

    return res.json({
      total_machines: rows.length,
      flagged_machines: flagged.length,
      site_count: sites.size,
      danger_count: dangerCount,
      warn_count: warnCount,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting stats");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /sites
router.get("/sites", requireSession, async (req, res) => {
  try {
    const rows = await db.select({ site: machinesTable.site }).from(machinesTable);
    const sites = [...new Set(rows.map((r) => r.site).filter(Boolean))] as string[];
    return res.json(sites.sort());
  } catch (err) {
    req.log.error({ err }, "Error listing sites");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /export.csv
router.get("/export.csv", requireSession, async (req, res) => {
  try {
    const rows = await db.select().from(machinesTable);

    const headers = [
      "machine_id", "hostname", "logged_in_user", "site", "last_seen",
      "manufacturer", "model", "cpu", "total_ram_gb",
      "ram_type", "gpu1_model", "os", "primary_ip", "flags"
    ];

    const escape = (v: unknown) => {
      let s = v == null ? "" : String(v);
      // Neutralize CSV formula injection: spreadsheet apps execute cells that
      // begin with = + - @ (and TAB/CR). logged_in_user, hostname, etc. come
      // from untrusted ingest, so prefix a single quote to force text.
      if (/^[=+\-@\t\r]/.test(s)) {
        s = `'${s}`;
      }
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvRows = rows.map((m) => {
      const flags = computeFlags(m).map((f) => f.label).join("; ");
      return [
        m.machine_id, m.hostname, m.logged_in_user, m.site, m.last_seen?.toISOString(),
        m.manufacturer, m.model, m.cpu, m.total_ram_gb,
        m.ram_type, m.gpu1_model, m.os, m.primary_ip, flags
      ].map(escape).join(",");
    });

    const csv = [headers.join(","), ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="fleet-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Error exporting CSV");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
