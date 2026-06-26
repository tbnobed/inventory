<#
.SYNOPSIS
  OBTV Fleet Inventory reporter. Collects hardware specs from a Windows
  workstation and pushes them to the Fleet Inventory Dashboard ingest endpoint.

.DESCRIPTION
  Gathers CPU, RAM, GPU, disk, volume, NIC, BIOS and OS details via CIM/WMI and
  POSTs them as JSON to  <DashboardUrl>/api/report  using a bearer token.

  The dashboard auto-derives the machine's Site from its IP address (Site
  Mapping rules), so this script does not send a site by default.

.PARAMETER DashboardUrl
  Base URL of the dashboard, e.g. https://fleet.obtv.example.com
  (no trailing /api). Falls back to the FLEET_DASHBOARD_URL env var.

.PARAMETER IngestToken
  The shared ingest bearer token (matches the server's INGEST_TOKEN secret).
  Falls back to the FLEET_INGEST_TOKEN env var.

.EXAMPLE
  .\Report-FleetInventory.ps1 -DashboardUrl "https://fleet.obtv.example.com" -IngestToken "xxxx"

.EXAMPLE
  # Dry run: print the payload instead of sending it
  .\Report-FleetInventory.ps1 -DashboardUrl "https://x" -IngestToken "y" -WhatIf

.NOTES
  Install as a scheduled task (run from an elevated PowerShell prompt):

    $action  = New-ScheduledTaskAction -Execute "powershell.exe" `
      -Argument "-NoProfile -ExecutionPolicy Bypass -File `"C:\OBTV\Report-FleetInventory.ps1`" -DashboardUrl https://fleet.obtv.example.com -IngestToken YOUR_TOKEN"
    $trigger = New-ScheduledTaskTrigger -Daily -At 7am
    Register-ScheduledTask -TaskName "OBTV Fleet Inventory" -Action $action `
      -Trigger $trigger -RunLevel Highest -User "SYSTEM"

  Requires PowerShell 5.1+ (ships with Windows 10/11). Run as Administrator so
  serial numbers and full hardware details are readable.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$DashboardUrl = $env:FLEET_DASHBOARD_URL,
    [string]$IngestToken  = $env:FLEET_INGEST_TOKEN
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DashboardUrl)) {
    throw "DashboardUrl is required (pass -DashboardUrl or set FLEET_DASHBOARD_URL)."
}
if ([string]::IsNullOrWhiteSpace($IngestToken)) {
    throw "IngestToken is required (pass -IngestToken or set FLEET_INGEST_TOKEN)."
}
$DashboardUrl = $DashboardUrl.TrimEnd("/")

function Get-Cim($class) {
    try { Get-CimInstance -ClassName $class -ErrorAction Stop }
    catch { Write-Warning "Could not query $class : $($_.Exception.Message)"; $null }
}

# --- Identity --------------------------------------------------------------
$product = Get-Cim Win32_ComputerSystemProduct
$cs      = Get-Cim Win32_ComputerSystem
$bios    = Get-Cim Win32_BIOS
$board   = Get-Cim Win32_BaseBoard
$os      = Get-Cim Win32_OperatingSystem

# Stable per-machine id: hardware UUID, falling back to BIOS serial, then host.
$machineId = $null
if ($product -and $product.UUID -and $product.UUID -notmatch '^[0\-F]+$') { $machineId = $product.UUID }
elseif ($bios -and $bios.SerialNumber) { $machineId = $bios.SerialNumber.Trim() }
else { $machineId = $env:COMPUTERNAME }

# --- CPU / RAM -------------------------------------------------------------
$cpu = (Get-Cim Win32_Processor | Select-Object -First 1).Name
if ($cpu) { $cpu = ($cpu -replace '\s+', ' ').Trim() }

$memModules = @(Get-Cim Win32_PhysicalMemory)
$totalRamGb = $null
if ($memModules.Count -gt 0) {
    $bytes = ($memModules | Measure-Object -Property Capacity -Sum).Sum
    $totalRamGb = [int][math]::Round($bytes / 1GB)
}

# SMBIOS memory type code -> human label
$memTypeMap = @{ 20 = "DDR"; 21 = "DDR2"; 24 = "DDR3"; 26 = "DDR4"; 34 = "DDR5" }
$ramType = $null
$firstMem = $memModules | Select-Object -First 1
if ($firstMem) {
    $code = $firstMem.SMBIOSMemoryType
    if (-not $code) { $code = $firstMem.MemoryType }
    if ($memTypeMap.ContainsKey([int]$code)) { $ramType = $memTypeMap[[int]$code] }
}

$ramModules = $memModules | ForEach-Object {
    $sizeGb = [int][math]::Round($_.Capacity / 1GB)
    $slot   = if ($_.DeviceLocator) { $_.DeviceLocator } else { "?" }
    $speed  = if ($_.Speed) { " @ $($_.Speed)MHz" } else { "" }
    "$sizeGb GB$speed ($slot)"
}

$slotsTotal = (Get-Cim Win32_PhysicalMemoryArray | Select-Object -First 1).MemoryDevices
$ramSlots = if ($slotsTotal) { "$($memModules.Count) of $slotsTotal used" } else { "$($memModules.Count) used" }

# --- GPU -------------------------------------------------------------------
$gpus = @(Get-Cim Win32_VideoController | Where-Object { $_.Name })
$gpu1 = $gpus | Select-Object -First 1
$gpu2 = $gpus | Select-Object -Skip 1 -First 1

# --- Disks / Volumes -------------------------------------------------------
$disks = Get-Cim Win32_DiskDrive | ForEach-Object {
    $sizeGb = if ($_.Size) { [int][math]::Round($_.Size / 1GB) } else { 0 }
    $model  = if ($_.Model) { $_.Model.Trim() } else { "Disk" }
    "$model ($sizeGb GB)"
}

$volumes = Get-Cim Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | ForEach-Object {
    $sizeGb = if ($_.Size) { [int][math]::Round($_.Size / 1GB) } else { 0 }
    $freeGb = if ($_.FreeSpace) { [int][math]::Round($_.FreeSpace / 1GB) } else { 0 }
    "$($_.DeviceID) $freeGb GB free / $sizeGb GB"
}

# --- Network ---------------------------------------------------------------
$adapters = Get-Cim Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled }
$primaryIp = $null
foreach ($a in $adapters) {
    $ipv4 = @($a.IPAddress) | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' } | Select-Object -First 1
    if ($ipv4) {
        # Prefer an adapter that has a default gateway (the active uplink).
        if ($a.DefaultIPGateway) { $primaryIp = $ipv4; break }
        if (-not $primaryIp) { $primaryIp = $ipv4 }
    }
}

$nics = $adapters | ForEach-Object {
    $ipv4 = @($_.IPAddress) | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' } | Select-Object -First 1
    $mac  = if ($_.MACAddress) { $_.MACAddress } else { "?" }
    $desc = if ($_.Description) { $_.Description } else { "NIC" }
    "$desc [$mac]$(if ($ipv4) { " $ipv4" })"
}

# --- BIOS / OS strings -----------------------------------------------------
$biosStr = $null
if ($bios) {
    $ver  = $bios.SMBIOSBIOSVersion
    $date = if ($bios.ReleaseDate) { $bios.ReleaseDate.ToString("yyyy-MM-dd") } else { $null }
    $biosStr = if ($date) { "$ver ($date)" } else { $ver }
}
$boardStr = if ($board) { (("$($board.Manufacturer) $($board.Product)") -replace '\s+', ' ').Trim() } else { $null }
$osStr = if ($os) { "$($os.Caption) (build $($os.BuildNumber))" } else { $null }

# --- Assemble payload ------------------------------------------------------
function Join-List($items) {
    $clean = @($items | Where-Object { $_ })
    if ($clean.Count -eq 0) { return $null }
    return ($clean -join "; ")
}

$payload = [ordered]@{
    machine_id   = $machineId
    hostname     = $env:COMPUTERNAME
    manufacturer = if ($cs) { $cs.Manufacturer } else { $null }
    model        = if ($cs) { $cs.Model } else { $null }
    cpu          = $cpu
    total_ram_gb = $totalRamGb
    ram_type     = $ramType
    gpu1_model   = if ($gpu1) { $gpu1.Name } else { $null }
    os           = $osStr
    primary_ip   = $primaryIp
    data         = [ordered]@{
        Serial       = if ($bios) { $bios.SerialNumber } else { $null }
        Motherboard  = $boardStr
        BIOS         = $biosStr
        RAM_Slots    = $ramSlots
        RAM_Modules  = Join-List $ramModules
        GPU1_Driver  = if ($gpu1) { $gpu1.DriverVersion } else { $null }
        GPU2_Model   = if ($gpu2) { $gpu2.Name } else { $null }
        GPU2_Driver  = if ($gpu2) { $gpu2.DriverVersion } else { $null }
        Disks        = Join-List $disks
        Volumes      = Join-List $volumes
        NICs         = Join-List $nics
    }
}

$json = $payload | ConvertTo-Json -Depth 6

if ($WhatIfPreference) {
    Write-Host "Would POST to $DashboardUrl/api/report :`n"
    Write-Output $json
    return
}

$headers = @{
    "Authorization" = "Bearer $IngestToken"
    "Content-Type"  = "application/json"
}

try {
    $resp = Invoke-RestMethod -Method Post -Uri "$DashboardUrl/api/report" `
        -Headers $headers -Body $json -TimeoutSec 30
    Write-Host "Reported $($payload.hostname) ($($payload.machine_id)) -> $DashboardUrl OK"
    if ($resp) { $resp | ConvertTo-Json -Depth 4 | Write-Host }
}
catch {
    $status = $_.Exception.Response.StatusCode.value__
    throw "Ingest failed (HTTP $status): $($_.Exception.Message)"
}
