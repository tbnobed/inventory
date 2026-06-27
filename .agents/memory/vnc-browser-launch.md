---
name: VNC browser launch on Windows
description: Why "Connect via VNC" (vnc://) from a browser does nothing on Windows and how this project makes it work.
---

# Launching a VNC viewer from a browser on Windows

A browser can only hand a `vnc://` link to a desktop app if a `vnc://` **URL protocol handler** is registered in the Windows registry. On Windows, **no common VNC viewer registers `vnc://` for browser links by default**:

- TightVNC / UltraVNC / TigerVNC — register nothing.
- RealVNC Viewer — registers its **own** scheme `com.realvnc.vncviewer.connect://` (host:port only, no extra params) **and** the `.vnc` *file type* ("Connection Shortcut"). It does **not** register `vnc://`. (The `.vnc` file association seen in Windows "Default apps" is a file type, not the URL protocol — easy to confuse.)

`vnc://` is the IANA standard (RFC 7869) and works on macOS / Android, but not Windows desktop out of the box.

**This project's approach:** standardise the dashboard link on `vnc://{ip}` (one link for every viewer) and ship a one-time per-PC installer (`/api/agent/vnc-handler.bat`) that registers `vnc://` → a validating launcher (`vnc-launch.ps1`) which finds whichever viewer is installed (RealVNC/TightVNC/UltraVNC/TigerVNC) and launches it. The installer is required on **every** Windows workstation, including RealVNC ones.

**Why not a viewer-specific scheme:** staff use assorted viewers; picking `com.realvnc.vncviewer.connect://` would break everyone not on RealVNC. One standard scheme + a universal mapper is the only consistent option.

**Jump Desktop** is separate (its own protocol stack, not VNC). Per Jump's official docs (support.jumpdesktop.com article 216423723), the `jump://?<params>` scheme has exactly these relevant params:
- `host` — **REQUIRED.** IP or hostname of the target.
- `protocol` — optional, one of `rdp` | `fluid` | `vnc`; **defaults to `rdp` if omitted.**
- There is **NO `name=` parameter.** Using `name=` (or any unknown param) means `host` is absent, so Jump has no target and opens an **empty Windows RDP session prompting for 127.0.0.1**. That was the regression symptom.

So for Connect/Fluid fleets the template is **`jump://?host={ip}&protocol=fluid`** — pass `protocol=fluid` (without it Jump defaults to RDP), and address the host by **IP, not hostname**: Jump's official troubleshooting says an unresolvable hostname makes the app open but never connect on a LAN; the IP fixes it. Mnemonic for this shop: **Jump = host={ip}&protocol=fluid; VNC = IP**.

**Fluid caveat (if IP template still only opens the app):** a bare `host+protocol=fluid` is a *direct* connection. For guaranteed cloudless Fluid, Jump Desktop Connect's Fluid settings has a **"Copy Launch URL"** button that emits a per-machine URL **including the host's SSL certificate fingerprint** — that link can't be templated from IP alone. Fallbacks: store each machine's Copy-Launch URL, or switch to RDP (`jump://?host={ip}`, only host needed) if RDP is enabled.

**The real Windows-desktop blocker (why no template can ever work):** Jump's documented `jump://?host=...&protocol=...` scheme is **iOS/Android-only** (the official article literally scopes itself to "Android and iOS"). On the **Windows desktop** client the OS launches the app via the registered handler but the client **ignores the ad-hoc params** and lands on its home computer-list. Desktop connects to a **saved connection** identified by a per-connection **GUID**, stored as a local `.jump` JSON file: a "Create Shortcut…" target is `%LOCALAPPDATA%\Jump Desktop\Client\Servers\Computer - <name> (<owner>) - <GUID>.jump`. So there is **no way to launch a specific machine from inventory data (IP/hostname) alone** — it requires a per-machine artifact: the exported `.jump` file (served as a download) or the per-machine Copy-Launch URL. Because of this, the **Jump menu item is currently disabled in the UI** (removed from RowContextMenu); VNC is the supported path. The `JUMP_URL_TEMPLATE`/`buildLaunchUrl` config helpers are retained for re-enabling.
**Rule:** confirm a URL scheme's *platform scope* (mobile vs desktop) in the vendor doc — a scheme that "works" can be documented only for the platform you're not on.

**Rule:** confirm third-party URL-scheme params against the vendor's official doc, not a search-result summary (a search snippet here gave the wrong param name).

**CRLF is mandatory for served Windows scripts:** repo stores `.bat`/`.ps1` with LF. A Windows `.bat` with LF-only endings **silently does nothing** when double-clicked (cmd.exe can't parse it — "doesn't even load PowerShell"). The download route must normalize the body to CRLF (`\r?\n` → `\r\n`) before sending. This was the real reason the VNC handler installer appeared dead.

**Installer filename gotcha:** a `.bat` double-clicked under a name with a space (e.g. `vnc-handler (2).bat` from a re-download) passes the post-space token as `%1`. Any unconditional `set VAR=%~1` override then gets clobbered (DASHBOARD_URL became `(2).bat`). Guard arg overrides to accept only values that start with `http`.
