@echo off
setlocal

cd /d "%~dp0"
set "URL=http://localhost:3000"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"

echo Checking localhost:3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($listener) { exit 0 } else { exit 1 }"

if errorlevel 1 (
  echo Starting the website server...
  start "Local Website Server" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; npm run dev"
) else (
  echo Website server is already running.
)

echo Waiting for the website to respond...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url = 'http://localhost:3000'; for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"

if errorlevel 1 (
  echo The website did not respond on http://localhost:3000.
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

echo Opening %URL% in Google Chrome...
start "" "%CHROME%" "%URL%"

endlocal
