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
REM  Control flow uses plain "if ... goto LABEL" statements (no inline
REM  parenthesised blocks and no %VAR:~..% substring math) so the file
REM  parses identically on every Windows build/locale.
REM ============================================================

set "DASHBOARD_URL=https://YOUR-DASHBOARD-URL"
if "%DASHBOARD_URL%"=="https://YOUR-DASHBOARD-URL" goto nourl

set "INSTALL_DIR=%ProgramData%\OBTV Fleet"
set "LAUNCHER=%INSTALL_DIR%\vnc-launch.ps1"
set "SCRIPT_URL=%DASHBOARD_URL%/api/agent/vnc-launch.ps1"

echo === OBTV Fleet Inventory - VNC handler installer ===
echo Dashboard: %DASHBOARD_URL%

REM ------- self-elevate to Administrator (HKCR needs admin) -------
REM Pass this script's own path via an env var, NOT interpolated into the
REM PowerShell -Command string, so a path containing quotes can't break out.
set "SELFBAT=%~f0"
net session >nul 2>&1
if not "%errorlevel%"=="0" goto elevate

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Downloading launcher from %SCRIPT_URL% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SCRIPT_URL%' -OutFile '%LAUNCHER%' -UseBasicParsing"
if not exist "%LAUNCHER%" goto dlfail

echo Registering the vnc:// handler ...
REM %%1 becomes a literal %1 in the registry value; Windows substitutes the
REM clicked URL there at launch time. -File passes it as a plain argument.
reg add "HKCR\vnc" /ve /d "URL:VNC Protocol" /f >nul
reg add "HKCR\vnc" /v "URL Protocol" /d "" /f >nul
reg add "HKCR\vnc\shell\open\command" /ve /d "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%LAUNCHER%\" \"%%1\"" /f >nul
if not "%errorlevel%"=="0" goto regfail

echo.
echo === Done === vnc:// links now open your installed VNC viewer via:
echo   %LAUNCHER%
echo (If your viewer is installed in a non-standard location, edit that file.)
echo.
pause
goto end

:elevate
echo Requesting administrator rights...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:SELFBAT -Verb RunAs"
goto end

:nourl
echo [ERROR] Dashboard URL is not set. Re-download this file from the dashboard.
pause
goto end

:dlfail
echo [ERROR] Download failed. Check the dashboard URL and network connectivity.
pause
goto end

:regfail
echo [ERROR] Failed to register the vnc:// handler.
pause
goto end

:end
endlocal
