@echo off
setlocal enableextensions

REM ============================================================
REM  OBTV Fleet Inventory - VNC handler installer
REM
REM  Registers the vnc:// URL scheme on this workstation so the
REM  dashboard's "Connect via VNC" opens your VNC viewer. On Windows
REM  no common viewer registers vnc:// for browser links by default
REM  (RealVNC uses its own scheme + the .vnc file type, not vnc://),
REM  so this is needed once per PC regardless of which viewer you use.
REM
REM  Just double-click it. It self-elevates (you'll get one UAC
REM  prompt). It downloads a small validating launcher (vnc-launch.ps1)
REM  and points the handler at it via PowerShell -File, so the clicked
REM  URL is passed as a plain argument - never interpolated into a
REM  command line. The launcher rejects anything that is not a bare
REM  host/IP, so a malicious vnc://... link cannot run commands.
REM
REM  Every block below is a SINGLE physical line on purpose: a .bat
REM  with multi-line ( ) blocks fails to parse if its line endings
REM  get mangled in transit. Keep it that way.
REM ============================================================

set "DASHBOARD_URL=https://YOUR-DASHBOARD-URL"
REM Optional override: accept %1 ONLY if it is an http(s) URL. This guards against
REM Windows passing a stray token as %1 when the file name contains a space (e.g.
REM "vnc-handler (2).bat"), which would otherwise clobber DASHBOARD_URL.
set "ARG1=%~1"
if defined ARG1 if /i "%ARG1:~0,4%"=="http" set "DASHBOARD_URL=%ARG1%"
if "%DASHBOARD_URL:~-1%"=="/" set "DASHBOARD_URL=%DASHBOARD_URL:~0,-1%"
if "%DASHBOARD_URL%"=="https://YOUR-DASHBOARD-URL" (echo [ERROR] Dashboard URL is not set. Re-download this file from the dashboard. & pause & exit /b 1)

set "INSTALL_DIR=%ProgramData%\OBTV Fleet"
set "LAUNCHER=%INSTALL_DIR%\vnc-launch.ps1"
set "SCRIPT_URL=%DASHBOARD_URL%/api/agent/vnc-launch.ps1"

echo === OBTV Fleet Inventory - VNC handler installer ===
echo Dashboard: %DASHBOARD_URL%

REM ------- self-elevate to Administrator (HKCR needs admin) -------
REM Pass this script's own path via an env var, NOT interpolated into the
REM PowerShell -Command string, so a path containing quotes can't break out.
REM We do NOT forward DASHBOARD_URL: the served file already has it baked in, so
REM the elevated re-run reads the same value (no untrusted data on the command).
set "SELFBAT=%~f0"
net session >nul 2>&1
if not "%errorlevel%"=="0" (echo Requesting administrator rights... & powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:SELFBAT -Verb RunAs" & exit /b)

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Downloading launcher from %SCRIPT_URL% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SCRIPT_URL%' -OutFile '%LAUNCHER%' -UseBasicParsing"
if not exist "%LAUNCHER%" (echo [ERROR] Download failed. Check the dashboard URL and network connectivity. & pause & exit /b 1)

echo Registering the vnc:// handler ...
REM %%1 becomes a literal %1 in the registry value; Windows substitutes the
REM clicked URL there at launch time. -File passes it as a plain argument.
reg add "HKCR\vnc" /ve /d "URL:VNC Protocol" /f >nul
reg add "HKCR\vnc" /v "URL Protocol" /d "" /f >nul
reg add "HKCR\vnc\shell\open\command" /ve /d "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%LAUNCHER%\" \"%%1\"" /f >nul
if not "%errorlevel%"=="0" (echo [ERROR] Failed to register the vnc:// handler. & pause & exit /b 1)

echo.
echo === Done === vnc:// links now open your installed VNC viewer via:
echo   %LAUNCHER%
echo (If your viewer is installed in a non-standard location, edit that file.)
echo.
pause
endlocal
