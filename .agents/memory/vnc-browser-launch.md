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

**Jump Desktop** is separate: its scheme is `jump://?host=...&protocol=...&port=...`; with no `protocol` it defaults to **RDP**. Force `protocol=vnc&port=5900` since the hosts run a VNC server.
