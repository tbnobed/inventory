import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function splitSemicolon(val: string | undefined | null): string[] {
  if (!val) return [];
  return val.split(" ; ").map((s) => s.trim()).filter(Boolean);
}

// The second GPU has no dedicated column — it lives in the raw report blob.
export function gpu2FromData(data: unknown): string | null {
  if (data && typeof data === "object") {
    const v = (data as Record<string, unknown>)["GPU2_Model"];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

// Pick the GPU to show in list views: prefer the discrete card over the
// integrated one (Windows often enumerates the integrated GPU as GPU1).
const DISCRETE_GPU_RE = /RTX|GTX|Quadro|Radeon\s+(RX|Pro)|\bArc\b/i;

export function displayGpu(
  gpu1: string | undefined | null,
  gpu2: string | undefined | null
): string | null {
  const g1 = gpu1 || null;
  const g2 = gpu2 || null;
  if (g1 && DISCRETE_GPU_RE.test(g1)) return g1;
  if (g2 && DISCRETE_GPU_RE.test(g2)) return g2;
  return g1 ?? g2;
}
