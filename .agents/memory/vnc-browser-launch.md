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

**Jump Desktop** is separate: its scheme is `jump://?host=...&protocol=...`. With no `protocol` it defaults to **RDP**. This shop's machines are managed by **Jump Desktop Connect, which connects over Fluid**, so use `protocol=fluid` (no port — Fluid negotiates its own; direct on 35384+, else relay). `protocol=vnc` is rejected by Jump Desktop Connect with "VNC is not supported — use Fluid". Standard cloud Fluid doesn't accept a raw IP, but Jump Desktop Connect's direct/cloudless mode does (their sessions already show "Connection: Direct, Fluid 2.0"). Do NOT assume Jump Desktop == VNC: it is its own protocol stack.

**Installer filename gotcha:** a `.bat` double-clicked under a name with a space (e.g. `vnc-handler (2).bat` from a re-download) passes the post-space token as `%1`. Any unconditional `set VAR=%~1` override then gets clobbered (DASHBOARD_URL became `(2).bat`). Guard arg overrides to accept only values that start with `http`.
