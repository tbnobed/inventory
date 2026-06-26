@echo off
setlocal

REM ============================================================
REM  OBTV Fleet Inventory - VNC handler installer
REM
REM  Registers the vnc:// URL scheme on this workstation so the
REM  dashboard's "Connect via VNC" opens your VNC viewer. On Windows
REM  no common viewer registers vnc:// for browser links by default
REM  (RealVNC uses its own scheme + the .vnc file type, not vnc://),
REM  so this is needed once per PC regardless of which viewer you use.
REM
REM  It downloads a small validating launcher (vnc-launch.ps1) that
REM  finds whichever supported viewer is installed, and points the
REM  handler at it via PowerShell -File, so the clicked URL is passed
REM  as a plain argument - never interpolated into a command line. The
REM  launcher rejects anything that is not a bare host/IP, so a
REM  malicious vnc://... link cannot run commands.
REM
REM  Right-click this file and choose "Run as administrator".
REM  Optional: pass the dashboard URL as the first argument:
REM     vnc-handler-install.bat https://dashboard-url
REM ============================================================

set "DASHBOARD_URL=https://YOUR-DASHBOARD-URL"

REM ------- optional command-line override -------
REM Only accept an http(s) URL. This guards against Windows passing a stray
REM token as %1 when the .bat is double-clicked under a name containing a space
REM (e.g. "vnc-handler (2).bat" would otherwise set DASHBOARD_URL to "(2).bat").
set "ARG1=%~1"
if defined ARG1 if /i "%ARG1:~0,4%"=="http" set "DASHBOARD_URL=%ARG1%"

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
echo vnc:// links now open your installed VNC viewer via:
echo   %LAUNCHER%
echo (If your viewer is installed in a non-standard location, edit that file.)
echo.
pause
endlocal
