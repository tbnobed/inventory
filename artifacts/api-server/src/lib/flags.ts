import type { Machine } from "@workspace/db";

export interface MachineFlag {
  label: string;
  severity: "danger" | "warn" | "ok";
}

/** Extract the second GPU model from the raw report blob (no dedicated column). */
export function gpu2FromData(data: unknown): string | null {
  if (data && typeof data === "object") {
    const v = (data as Record<string, unknown>)["GPU2_Model"];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

// ─── Upgrade thresholds — tune here ──────────────────────────────────────────
const STALE_DAYS = 14;
const LOW_RAM_GB = 64;
const MODERN_GPU_PATTERNS = ["RTX 40", "RTX 50", "RTX 60", "RTX PRO", "RTX A"];
// ─────────────────────────────────────────────────────────────────────────────

export function computeFlags(machine: Machine): MachineFlag[] {
  const flags: MachineFlag[] = [];

  // RAM type checks
  if (machine.ram_type) {
    if (machine.ram_type.toUpperCase().startsWith("DDR3")) {
      flags.push({ label: "DDR3 (old platform)", severity: "danger" });
    } else if (machine.ram_type.toUpperCase() === "DDR4") {
      flags.push({ label: "DDR4", severity: "warn" });
    }
  }

  // Low RAM
  if (machine.total_ram_gb !== null && machine.total_ram_gb !== undefined && machine.total_ram_gb < LOW_RAM_GB) {
    flags.push({ label: `Low RAM (${machine.total_ram_gb}GB)`, severity: "warn" });
  }

  // GPU upgrade candidate — consider every reported GPU, not just GPU1:
  // Windows often enumerates the integrated GPU first, so the discrete card
  // can land in GPU2 (stored in the data blob). Machine is modern if ANY
  // GPU matches.
  const gpus = [machine.gpu1_model, gpu2FromData(machine.data)].filter(
    (g): g is string => g != null && g !== ""
  );
  if (gpus.length > 0) {
    const isModern = gpus.some((g) =>
      MODERN_GPU_PATTERNS.some((p) => g.includes(p))
    );
    if (!isModern) {
      flags.push({ label: "GPU upgrade candidate", severity: "warn" });
    }
  }

  // Windows 10 EOL
  if (machine.os && machine.os.includes("Windows 10")) {
    flags.push({ label: "Windows 10 (EOL Oct 2025)", severity: "danger" });
  }

  // Stale (last_seen > 14 days)
  if (machine.last_seen) {
    const lastSeen = machine.last_seen instanceof Date
      ? machine.last_seen
      : new Date(machine.last_seen);

    // Coerce naive to UTC before subtracting
    const nowUtc = Date.now();
    const lastSeenMs = lastSeen.getTime();
    const diffDays = (nowUtc - lastSeenMs) / (1000 * 60 * 60 * 24);

    if (diffDays > STALE_DAYS) {
      flags.push({ label: `Stale (${Math.floor(diffDays)}d)`, severity: "danger" });
    }
  }

  return flags;
}
