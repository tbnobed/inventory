# OBTV Fleet Inventory - VNC launcher for TightVNC Viewer.
#
# Invoked by the vnc:// URL handler (registered by vnc-handler-install.bat).
# Receives the FULL clicked URL as a single argument (via PowerShell -File, so
# it is never interpolated into a command line). It strips the scheme, validates
# the remainder as a bare host[:port], and only then launches the viewer.
# Anything that is not a plain host/IP is rejected - this is what prevents a
# malicious vnc://... URL from injecting commands.
param([string]$Url)

$ErrorActionPreference = 'Stop'

# Strip the scheme and any trailing slashes the browser may append.
$target = $Url -replace '^vnc://', '' -replace '/+$', ''

# Allow only host-safe characters: letters, digits, dot, hyphen, underscore,
# colon (port / IPv6) and square brackets (IPv6 literal). Reject everything else.
if ($target -notmatch '^[A-Za-z0-9._:\[\]-]+$') {
  exit 1
}

$candidates = @(
  (Join-Path $env:ProgramFiles 'TightVNC\tvnviewer.exe')
)
if (${env:ProgramFiles(x86)}) {
  $candidates += (Join-Path ${env:ProgramFiles(x86)} 'TightVNC\tvnviewer.exe')
}

$viewer = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $viewer) {
  exit 1
}

# $target is a single, validated token; PowerShell passes it as one argument.
& $viewer $target
