@echo off
setlocal

cd /d "%~dp0"
set "URL=http://localhost:8888"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"

echo Checking TianSu website on localhost:8888...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = Get-NetTCPConnection -LocalPort 8888 -State Listen -ErrorAction SilentlyContinue; if ($listener) { exit 0 } else { exit 1 }"

if errorlevel 1 (
  echo Starting the website server...
  start "Local Website Server" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; npm run dev"
) else (
  echo Website server is already running.
)

echo Waiting for the website port to be ready...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(45); do { $listener = Get-NetTCPConnection -LocalPort 8888 -State Listen -ErrorAction SilentlyContinue; if ($listener) { exit 0 }; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); exit 1"

if errorlevel 1 (
  echo The TianSu website server did not open its fixed port 8888.
  echo Please check the server window for errors.
  pause
  exit /b 1
)

if not exist "%CHROME%" (
  echo Google Chrome was not found at:
  echo %CHROME%
  echo Please install Google Chrome or update this file with the correct chrome.exe path.
  pause
  exit /b 1
)

echo Opening %URL% in a new Google Chrome window...
start "" "%CHROME%" --new-window --start-maximized "%URL%"

endlocal
