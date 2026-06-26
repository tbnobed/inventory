// Organisation name shown in the header wordmark and on the login screen.
// Override at build time with VITE_ORG_NAME (baked in by Vite — change it in
// .env and rebuild the image to take effect). Falls back to the OBTV default.
export const ORG_NAME =
  import.meta.env.VITE_ORG_NAME?.trim() || "OBTV Edit Systems";

// Remote-connection launch templates used by the row right-click menu. The
// placeholders {ip} and {hostname} are substituted with the machine's values.
// These trigger an OS protocol handler (the browser hands off to the installed
// desktop app). Override at build time with the matching env var and rebuild.
//
// VNC: `vnc://{ip}` is the IANA-standard scheme (RFC 7869). RealVNC Viewer
// registers it automatically on install; TightVNC / UltraVNC / TigerVNC do NOT —
// on those machines run the one-time installer from /api/agent/vnc-handler.bat
// (as admin), which registers vnc:// to whichever viewer is installed.
//
// Jump Desktop: its scheme is `jump://?host=...&protocol=...&port=...`. We force
// `protocol=vnc&port=5900` because the hosts run a VNC server — without an
// explicit protocol Jump Desktop defaults to RDP.
export const VNC_URL_TEMPLATE =
  import.meta.env.VITE_VNC_URL_TEMPLATE?.trim() || "vnc://{ip}";
export const JUMP_URL_TEMPLATE =
  import.meta.env.VITE_JUMP_URL_TEMPLATE?.trim() ||
  "jump://?host={ip}&protocol=vnc&port=5900";

// Host-safe characters only: letters, digits, dot, hyphen, underscore, colon
// (port / IPv6) and square brackets (IPv6 literal). Used to refuse launching a
// protocol URL built from untrusted machine data (hostname/IP come from ingest).
const SAFE_HOST = /^[A-Za-z0-9._:\[\]-]+$/;

export function isSafeHost(value: string): boolean {
  return SAFE_HOST.test(value);
}

// Build a launch URL, or null if any value substituted into the template fails
// host validation (so the caller can disable the action instead of launching
// something dangerous).
export function buildLaunchUrl(
  template: string,
  ip: string,
  hostname: string,
): string | null {
  if (template.includes("{ip}") && !isSafeHost(ip)) return null;
  if (template.includes("{hostname}") && !isSafeHost(hostname)) return null;
  return template.replace(/\{ip\}/g, ip).replace(/\{hostname\}/g, hostname);
}

// Trigger an OS protocol handler (e.g. vnc://10.0.0.5) without navigating the
// page away — a transient hidden anchor avoids popup blockers and keeps the SPA
// mounted, unlike window.open / location.href.
export function launchRemote(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
