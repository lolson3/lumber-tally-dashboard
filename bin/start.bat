@echo off
setlocal

rem Always run from the repository root, including under Task Scheduler.
cd /d "%~dp0.." || exit /b 1

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
if "%~1"=="" goto start_production
if /i "%~1"=="-production" goto start_production_arg
if /i "%~1"=="--production" goto start_production_arg
if /i "%~1"=="-demo" goto start_demo
if /i "%~1"=="--demo" goto start_demo
if /i "%~1"=="-dev" goto start_dev
if /i "%~1"=="--dev" goto start_dev
echo ERROR: Unknown option "%~1". Use --demo, --dev, or --production.
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

:start_dev
if not "%~2"=="" (
  echo ERROR: Development mode does not accept additional arguments.
  exit /b 2
)
echo Starting Lumber Tally Dashboard with the Vite development server...
call npm start
exit /b %errorlevel%

:start_production_arg
if not "%~2"=="" (
  echo ERROR: Production mode does not accept additional arguments.
  exit /b 2
)

:start_production
set "NGINX_EXE="
for /f "delims=" %%I in ('where nginx 2^>nul') do if not defined NGINX_EXE set "NGINX_EXE=%%I"
if not defined NGINX_EXE (
  echo ERROR: nginx is required for native production mode.
  exit /b 1
)

echo Building the production dashboard...
call npm run build
if errorlevel 1 exit /b 1

if defined DASHBOARD_RUNTIME_DIR (
  set "RUNTIME_DIR=%DASHBOARD_RUNTIME_DIR%"
) else (
  set "RUNTIME_DIR=%CD%\.runtime\nginx"
)
if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%"
if errorlevel 1 exit /b 1
for %%I in ("%RUNTIME_DIR%") do set "RUNTIME_DIR=%%~fI"

if defined NGINX_MIME_TYPES goto validate_mime_types
for %%I in ("%NGINX_EXE%") do set "NGINX_INSTALL_DIR=%%~dpI"
if exist "%NGINX_INSTALL_DIR%conf\mime.types" set "NGINX_MIME_TYPES=%NGINX_INSTALL_DIR%conf\mime.types"
if not defined NGINX_MIME_TYPES if exist "C:\nginx\conf\mime.types" set "NGINX_MIME_TYPES=C:\nginx\conf\mime.types"

:validate_mime_types
if not defined NGINX_MIME_TYPES (
  echo ERROR: nginx mime.types was not found. Set NGINX_MIME_TYPES to its absolute path.
  exit /b 1
)
if not exist "%NGINX_MIME_TYPES%" (
  echo ERROR: NGINX_MIME_TYPES does not identify an existing file.
  exit /b 1
)
for %%I in ("%NGINX_MIME_TYPES%") do set "NGINX_MIME_TYPES=%%~fI"

set "DEMO_MODE=false"
if exist ".env" (
  node --env-file=".env" .\bin\prepare-native-runtime.mjs --project-root "%CD%" --runtime-dir "%RUNTIME_DIR%" --mime-types "%NGINX_MIME_TYPES%"
) else (
  node .\bin\prepare-native-runtime.mjs --project-root "%CD%" --runtime-dir "%RUNTIME_DIR%" --mime-types "%NGINX_MIME_TYPES%"
)
if errorlevel 1 exit /b 1

echo Validating nginx configuration...
"%NGINX_EXE%" -t -p "%RUNTIME_DIR%/" -c "%RUNTIME_DIR%\nginx.conf"
if errorlevel 1 exit /b 1

echo Starting Lumber Tally Dashboard with nginx...
"%NGINX_EXE%" -p "%RUNTIME_DIR%/" -c "%RUNTIME_DIR%\nginx.conf" -g "daemon off;"
exit /b %errorlevel%
