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

**Jump Desktop** is separate (its own protocol stack, not VNC). The `jump://` scheme has two fundamentally different addressing modes that look similar but behave oppositely:
- `jump://?host=X` → a **direct, ad-hoc** connection to address X. For machines managed by Jump Desktop Connect this **just opens the app and never connects** — there is no direct route to negotiate. This was the persistent "opens the app but not the client" bug; switching host=IP→host=hostname did NOT fix it because the mode itself is wrong.
- `jump://?name=X` → selects the **saved computer** whose display name is X and connects using that computer's own configured protocol (Fluid, for Connect machines). **This is the correct mode for Connect-managed fleets.**

So for Connect/Fluid fleets use `jump://?name={hostname}` and pass **no `protocol=`** (the saved computer already knows it's Fluid; forcing a protocol on a named connection can break it). The `name` must match the computer's **exact saved display name** in the Jump Desktop account — usually the hostname, but Connect may append a suffix like " (Fluid)", in which case the template must include it. Mnemonic for this shop: **Jump = saved name (not host=); VNC = IP**.

**CRLF is mandatory for served Windows scripts:** repo stores `.bat`/`.ps1` with LF. A Windows `.bat` with LF-only endings **silently does nothing** when double-clicked (cmd.exe can't parse it — "doesn't even load PowerShell"). The download route must normalize the body to CRLF (`\r?\n` → `\r\n`) before sending. This was the real reason the VNC handler installer appeared dead.

**Installer filename gotcha:** a `.bat` double-clicked under a name with a space (e.g. `vnc-handler (2).bat` from a re-download) passes the post-space token as `%1`. Any unconditional `set VAR=%~1` override then gets clobbered (DASHBOARD_URL became `(2).bat`). Guard arg overrides to accept only values that start with `http`.
