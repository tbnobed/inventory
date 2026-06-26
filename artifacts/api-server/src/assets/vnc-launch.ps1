# OBTV Fleet Inventory - VNC launcher.
#
# Invoked by the vnc:// URL handler (registered by vnc-handler-install.bat).
# On Windows no common viewer registers vnc:// for browser links by default
# (TightVNC/UltraVNC/TigerVNC register nothing; RealVNC uses its own scheme),
# so this launcher is what makes a vnc:// click open the installed viewer.
# It receives the FULL clicked URL as a single argument (via
# PowerShell -File, so it is never interpolated into a command line), strips the
# scheme, validates the remainder as a bare host[:port], finds whichever VNC
# viewer is installed, and launches it. Anything that is not a plain host/IP is
# rejected - that is what prevents a malicious vnc://... URL from injecting
# commands.
param([string]$Url)

$ErrorActionPreference = 'Stop'

# Strip the scheme and any trailing slashes the browser may append.
$target = $Url -replace '^vnc://', '' -replace '/+$', ''

# Allow only host-safe characters: letters, digits, dot, hyphen, underscore,
# colon (port / IPv6) and square brackets (IPv6 literal). Reject everything else.
if ($target -notmatch '^[A-Za-z0-9._:\[\]-]+$') {
  exit 1
}

# Defense-in-depth: a leading hyphen would be parsed as a viewer option, so a
# host like "-foo" (from untrusted ingest data) must never reach the viewer.
if ($target.StartsWith('-')) {
  exit 1
}

# Search common install locations for any supported VNC viewer, in both
# Program Files roots. First one found wins.
$relPaths = @(
  'RealVNC\VNC Viewer\vncviewer.exe',
  'TightVNC\tvnviewer.exe',
  'uvnc bvba\UltraVNC\vncviewer.exe',
  'UltraVNC\vncviewer.exe',
  'TigerVNC\vncviewer.exe'
)
$roots = @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ }

$viewer = $null
foreach ($root in $roots) {
  foreach ($rel in $relPaths) {
    $candidate = Join-Path $root $rel
    if (Test-Path $candidate) { $viewer = $candidate; break }
  }
  if ($viewer) { break }
}

if (-not $viewer) {
  # Dependency-free notification so the click isn't silently ignored.
  (New-Object -ComObject WScript.Shell).Popup(
    "No supported VNC viewer was found on this PC. Install RealVNC, TightVNC, UltraVNC, or TigerVNC, then try again.",
    0, "OBTV Fleet Inventory", 0) | Out-Null
  exit 1
}

# $target is a single, validated token; PowerShell passes it as one argument.
& $viewer $target
