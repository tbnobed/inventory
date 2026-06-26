---
name: vnc:// protocol handler must not interpolate untrusted machine data
description: Why the dashboard's remote-launch (vnc://, jump://) path validates and uses PowerShell -File instead of a self-contained .reg
---

# Protocol-handler launch must never interpolate machine data into a command line

The dashboard's right-click "Connect via VNC / Jump Desktop" builds a `vnc://` /
`jump://` URL from a machine's `hostname` / `primary_ip`. Those values come from
the ingest endpoint and are **unconstrained strings** (the report body is only
`z.string()`), so they are attacker-controllable / untrusted.

**The hole that was caught:** an early version shipped a self-contained Windows
`.reg` whose handler ran `powershell -Command "$u = '%1' ...; & tvnviewer $u"`.
Windows substitutes the clicked URL for `%1` **inside a single-quoted PowerShell
literal**. A single quote in the value breaks out of the literal → arbitrary local
PowerShell execution on the operator's workstation. A registered `vnc://` handler
is also **global**: any site or app on that machine can invoke `vnc://...`, not
just our dashboard, so frontend validation alone cannot protect it.

**The safe pattern (two independent layers):**
1. Handler side: register the scheme to `powershell -File vnc-launch.ps1 "%1"`.
   `-File` passes the URL as a plain `param()` argument (no string interpolation).
   The launcher strips the scheme and rejects anything that isn't a bare host/IP
   (`^[A-Za-z0-9._:\[\]-]+$`) before calling the viewer. Because the handler is
   global, this validation must live in the launcher itself, not just the caller.
   The launcher is shipped via a downloaded installer `.bat` (mirrors the existing
   agent installer: net-session admin check, `Invoke-WebRequest` the `.ps1` to
   `%ProgramData%\OBTV Fleet\`, then `reg add`). In a `.bat`, write the literal
   `%1` for the registry value as `%%1`.
2. Dashboard side (defense-in-depth): `buildLaunchUrl` returns `null` when any
   value substituted into the template fails the same host-safe check, so the menu
   item is disabled and a dangerous protocol URL is never even constructed.

**How to apply:** any time you launch an OS protocol handler from data that
originated outside your trust boundary, validate the host/path to a strict
allowlist of characters AND avoid command-line string interpolation (use `-File`
+ `param()`, or an equivalent arg-passing mechanism). Never reintroduce a `.reg`
that bakes `%1` into a quoted script literal.
