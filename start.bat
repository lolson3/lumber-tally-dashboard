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

set "INSTALL_DEPS=false"
if not exist "node_modules\.package-lock.json" set "INSTALL_DEPS=true"
if exist "node_modules\.package-lock.json" (
  powershell -NoProfile -Command "if ((Get-Item -LiteralPath 'package-lock.json').LastWriteTimeUtc -gt (Get-Item -LiteralPath 'node_modules\.package-lock.json').LastWriteTimeUtc) { exit 0 } else { exit 1 }"
  if not errorlevel 1 set "INSTALL_DEPS=true"
)

if "%INSTALL_DEPS%"=="true" (
  echo Installing dashboard dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)

if /i "%DEMO_MODE%"=="true" goto start_demo_env
if "%DEMO_MODE%"=="1" goto start_demo_env
if /i "%DEMO_MODE%"=="yes" goto start_demo_env
if /i "%DEMO_MODE%"=="false" goto parse_args
if "%DEMO_MODE%"=="0" goto parse_args
if /i "%DEMO_MODE%"=="no" goto parse_args
if not "%DEMO_MODE%"=="" (
  echo ERROR: DEMO_MODE must be true or false.
  exit /b 2
)
:parse_args
if "%~1"=="" goto start_normal
if /i "%~1"=="-demo" goto start_demo
if /i "%~1"=="--demo" goto start_demo
echo ERROR: Unknown option "%~1". Use -demo to run with fake data.
exit /b 2

:start_demo_env
if not "%~1"=="" (
  echo ERROR: DEMO_MODE=true does not accept launcher arguments.
  exit /b 2
)
goto run_demo

:start_demo
if not "%~2"=="" (
  echo ERROR: -demo does not accept additional arguments.
  exit /b 2
)
:run_demo
echo Preparing deterministic demo data...
echo Starting Lumber Tally Dashboard in DEMO mode...
call npm start -- --mode demo
exit /b %errorlevel%

:start_normal
echo Starting Lumber Tally Dashboard...
call npm start
exit /b %errorlevel%
