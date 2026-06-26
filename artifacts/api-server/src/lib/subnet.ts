import type { SiteSubnet } from "@workspace/db";

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) | octet;
  }
  return n >>> 0;
}

export function isValidCidr(cidr: string): boolean {
  const [base, bitsStr, ...rest] = cidr.trim().split("/");
  if (rest.length > 0 || bitsStr === undefined) return false;
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  return ipToInt(base) !== null;
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.trim().split("/");
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/**
 * Resolve a site name for an IP using the subnet rules.
 * Rules are evaluated most-specific-first (largest prefix length wins) so a
 * narrow rule (e.g. /24) takes precedence over a broad one (e.g. /16).
 * Returns null when no rule matches.
 */
export function siteForIp(ip: string | null | undefined, rules: SiteSubnet[]): string | null {
  if (!ip) return null;
  const sorted = [...rules].sort((a, b) => {
    const aBits = Number(a.cidr.split("/")[1] ?? 0);
    const bBits = Number(b.cidr.split("/")[1] ?? 0);
    if (bBits !== aBits) return bBits - aBits;
    // Deterministic tie-break for equal-prefix rules (e.g. duplicate CIDRs):
    // lowest id wins so the result never depends on DB row order.
    return a.id - b.id;
  });
  for (const rule of sorted) {
    if (ipInCidr(ip, rule.cidr)) return rule.site;
  }
  return null;
}
