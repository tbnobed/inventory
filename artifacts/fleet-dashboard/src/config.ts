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
// VNC: `vnc://{ip}` is the IANA-standard scheme (RFC 7869), but on WINDOWS no
// common viewer registers it for browser links by default — TightVNC/UltraVNC/
// TigerVNC register nothing, and RealVNC registers its own
// `com.realvnc.vncviewer.connect://` scheme plus the `.vnc` file type, NOT
// `vnc://`. So a `vnc://` click does nothing until the one-time installer from
// /api/agent/vnc-handler.bat is run (as admin) on the workstation; it maps
// vnc:// to whichever viewer is installed (RealVNC included). We standardise on
// vnc:// rather than a viewer-specific scheme so one link works for every viewer.
//
// Jump Desktop: its scheme is `jump://?<params>`. CRUCIAL distinction —
//   `jump://?host=X`  → a DIRECT, ad-hoc connection to address X. For machines
//                       managed by Jump Desktop Connect this just opens the app
//                       and never connects (there is no direct route to set up).
//   `jump://?name=X`  → selects the SAVED computer whose display name is X and
//                       connects using that computer's configured protocol
//                       (Fluid, for Connect machines).
// These machines are registered in the Jump Desktop account by Connect, so we
// must address them by their saved NAME, not by host. The saved name matches the
// workstation hostname here, so the default is `jump://?name={hostname}`. We do
// NOT pass `protocol=` — the saved computer already knows it is Fluid; forcing a
// protocol on a named connection can break it. If your Jump Desktop list shows
// the computer with a suffix (e.g. "PLEX-REMEDIT2 (Fluid)"), override
// VITE_JUMP_URL_TEMPLATE so `name=` matches that exact display name.
//
// VNC is the opposite: a standalone VNC viewer connects to the host's VNC
// server by IP, so the VNC template uses `{ip}`.
export const VNC_URL_TEMPLATE =
  import.meta.env.VITE_VNC_URL_TEMPLATE?.trim() || "vnc://{ip}";
export const JUMP_URL_TEMPLATE =
  import.meta.env.VITE_JUMP_URL_TEMPLATE?.trim() ||
  "jump://?name={hostname}";

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
