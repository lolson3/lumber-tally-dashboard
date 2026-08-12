@echo off
setlocal

rem Always run from the dashboard directory, including under Task Scheduler.
cd /d "%~dp0" || exit /b 1

where node >nul 2>&1 || (
  echo ERROR: Node.js is not installed or is not available in PATH.
  exit /b 1
)

where npm >nul 2>&1 || (
  echo ERROR: npm is not installed or is not available in PATH.
  exit /b 1
)

if not exist "node_modules\.package-lock.json" (
  echo Installing dashboard dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)

echo Starting Lumber Tally Dashboard...
call npm start
exit /b %errorlevel%
