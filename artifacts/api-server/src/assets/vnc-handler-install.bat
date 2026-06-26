@echo off
setlocal

REM ============================================================
REM  OBTV Fleet Inventory - VNC handler installer (TightVNC)
REM
REM  Registers the vnc:// URL scheme on this workstation so the
REM  dashboard's "Connect via VNC" opens TightVNC Viewer.
REM
REM  It downloads a small validating launcher (vnc-launch.ps1) and
REM  points the handler at it via PowerShell -File, so the clicked
REM  URL is passed as a plain argument - never interpolated into a
REM  command line. The launcher rejects anything that is not a bare
REM  host/IP, so a malicious vnc://... link cannot run commands.
REM
REM  Right-click this file and choose "Run as administrator".
REM  Optional: pass the dashboard URL as the first argument:
REM     vnc-handler-install.bat https://dashboard-url
REM ============================================================

set "DASHBOARD_URL=https://YOUR-DASHBOARD-URL"

REM ------- optional command-line override -------
if not "%~1"=="" set "DASHBOARD_URL=%~1"

REM strip a trailing slash from the URL if present
if "%DASHBOARD_URL:~-1%"=="/" set "DASHBOARD_URL=%DASHBOARD_URL:~0,-1%"

set "INSTALL_DIR=%ProgramData%\OBTV Fleet"
set "LAUNCHER=%INSTALL_DIR%\vnc-launch.ps1"
set "SCRIPT_URL=%DASHBOARD_URL%/api/agent/vnc-launch.ps1"

echo.
echo === OBTV Fleet Inventory - VNC handler installer ===
echo Dashboard: %DASHBOARD_URL%
echo.

if "%DASHBOARD_URL%"=="https://YOUR-DASHBOARD-URL" (
  echo [ERROR] DASHBOARD_URL is not set. Edit this file or pass it as the 1st argument.
  pause
  exit /b 1
)

REM ------- require administrator -------
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] This installer must be run as Administrator.
  echo Right-click vnc-handler-install.bat and choose "Run as administrator".
  pause
  exit /b 1
)

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Downloading launcher from %SCRIPT_URL% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SCRIPT_URL%' -OutFile '%LAUNCHER%' -UseBasicParsing"
if %errorlevel% neq 0 (
  echo [ERROR] Download failed. Check the dashboard URL and network connectivity.
  pause
  exit /b 1
)

echo Registering the vnc:// handler ...
REM %%1 becomes a literal %1 in the registry value; Windows substitutes the
REM clicked URL there at launch time. -File passes it as a plain argument.
reg add "HKCR\vnc" /ve /d "URL:VNC Protocol" /f >nul
reg add "HKCR\vnc" /v "URL Protocol" /d "" /f >nul
reg add "HKCR\vnc\shell\open\command" /ve /d "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%LAUNCHER%\" \"%%1\"" /f >nul
if %errorlevel% neq 0 (
  echo [ERROR] Failed to register the vnc:// handler.
  pause
  exit /b 1
)

echo.
echo === Done ===
echo vnc:// links now open TightVNC Viewer via:
echo   %LAUNCHER%
echo (If TightVNC is installed in a non-standard location, edit that file.)
echo.
pause
endlocal
