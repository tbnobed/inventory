@echo off
setlocal

REM ============================================================
REM  OBTV Fleet Inventory - workstation agent installer
REM
REM  Downloads Report-FleetInventory.ps1 from the dashboard and
REM  registers a scheduled task that reports specs every 2 hours + at boot.
REM  The script self-updates on each run, so future reporter changes roll out
REM  automatically once the dashboard is redeployed (no need to re-run this).
REM
REM  The dashboard URL and ingest token are stored as machine-level
REM  environment variables (FLEET_DASHBOARD_URL / FLEET_INGEST_TOKEN)
REM  so the token is NOT written into the scheduled task command line.
REM
REM  Edit the two values below, then right-click this file and
REM  choose "Run as administrator". You can also pass them as args:
REM     install-fleet-reporter.bat https://dashboard-url INGEST_TOKEN
REM ============================================================

set "DASHBOARD_URL=https://YOUR-DASHBOARD-URL"
set "INGEST_TOKEN=YOUR_INGEST_TOKEN"

REM ------- optional command-line overrides -------
if not "%~1"=="" set "DASHBOARD_URL=%~1"
if not "%~2"=="" set "INGEST_TOKEN=%~2"

REM strip a trailing slash from the URL if present
if "%DASHBOARD_URL:~-1%"=="/" set "DASHBOARD_URL=%DASHBOARD_URL:~0,-1%"

set "INSTALL_DIR=C:\OBTV"
set "SCRIPT_PATH=%INSTALL_DIR%\Report-FleetInventory.ps1"
set "SCRIPT_URL=%DASHBOARD_URL%/api/agent/report.ps1"
set "TASK_NAME=OBTV Fleet Inventory"

echo.
echo === OBTV Fleet Inventory agent installer ===
echo Dashboard: %DASHBOARD_URL%
echo.

if "%DASHBOARD_URL%"=="https://YOUR-DASHBOARD-URL" (
  echo [ERROR] DASHBOARD_URL is not set. Edit this file or pass it as the 1st argument.
  pause
  exit /b 1
)
if "%INGEST_TOKEN%"=="YOUR_INGEST_TOKEN" (
  echo [ERROR] INGEST_TOKEN is not set. Edit this file or pass it as the 2nd argument.
  pause
  exit /b 1
)

REM ------- require administrator -------
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] This installer must be run as Administrator.
  echo Right-click install-fleet-reporter.bat and choose "Run as administrator".
  pause
  exit /b 1
)

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Downloading reporter from %SCRIPT_URL% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SCRIPT_URL%' -OutFile '%SCRIPT_PATH%' -UseBasicParsing"
if %errorlevel% neq 0 (
  echo [ERROR] Download failed. Check the dashboard URL and network connectivity.
  pause
  exit /b 1
)

echo Storing configuration (machine-level environment variables) ...
REM Persist for the scheduled task (read by the .ps1 at runtime). Quoting the
REM whole name=value keeps spaces/special characters intact.
setx /M FLEET_DASHBOARD_URL "%DASHBOARD_URL%" >nul
if %errorlevel% neq 0 (
  echo [ERROR] Failed to store FLEET_DASHBOARD_URL.
  pause
  exit /b 1
)
setx /M FLEET_INGEST_TOKEN "%INGEST_TOKEN%" >nul
if %errorlevel% neq 0 (
  echo [ERROR] Failed to store FLEET_INGEST_TOKEN.
  pause
  exit /b 1
)
REM Make them available to the immediate run below (this session only).
set "FLEET_DASHBOARD_URL=%DASHBOARD_URL%"
set "FLEET_INGEST_TOKEN=%INGEST_TOKEN%"

echo Registering scheduled task "%TASK_NAME%" ...
REM The task action carries NO secret: the .ps1 reads the env vars set above.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File \"%SCRIPT_PATH%\"'; $t1 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration ([TimeSpan]::MaxValue); $t2 = New-ScheduledTaskTrigger -AtStartup; $p = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest; Register-ScheduledTask -TaskName '%TASK_NAME%' -Action $a -Trigger $t1,$t2 -Principal $p -Force | Out-Null"
if %errorlevel% neq 0 (
  echo [ERROR] Failed to register the scheduled task.
  pause
  exit /b 1
)

echo Sending an initial report now ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%"
if %errorlevel% neq 0 (
  echo [WARN] The scheduled task was installed, but the initial report failed.
  echo Check the dashboard URL and ingest token, then run the task manually.
  pause
  exit /b 1
)

echo.
echo === Done ===
echo Script installed at: %SCRIPT_PATH%
echo Scheduled task "%TASK_NAME%" runs every 2 hours and at startup (SYSTEM).
echo The reporter self-updates from the dashboard on each run.
echo.
pause
endlocal
