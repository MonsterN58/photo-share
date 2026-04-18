@echo off
setlocal
cd /d "%~dp0"

if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help
if /i "%~1"=="/?" goto :help

where powershell >nul 2>nul
if errorlevel 1 (
  echo [start-dev] PowerShell was not found. Install PowerShell or run scripts\start-dev.ps1 manually.
  exit /b 1
)

echo [start-dev] Launching PhotoShare dev server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-dev.ps1" %*
set "exit_code=%errorlevel%"

if not "%exit_code%"=="0" (
  echo.
  echo [start-dev] Dev startup failed with exit code %exit_code%.
)

endlocal & exit /b %exit_code%

:help
echo PhotoShare dev startup wrapper
echo.
echo Usage:
echo   start-dev.cmd [port] [-SkipInstall]
echo.
echo Examples:
echo   start-dev.cmd
echo   start-dev.cmd 3001
echo   start-dev.cmd -Port 3001
echo   start-dev.cmd -SkipInstall
endlocal & exit /b 0
