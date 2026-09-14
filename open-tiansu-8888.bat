@echo off
setlocal

cd /d "%~dp0"
set "URL=http://localhost:8888"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
:: 取得右側螢幕寬度，若失敗預設 1920
for /f %%W in ('powershell -NoProfile -Command "(Get-DisplayResolution).Width"') do set "SCREEN_WIDTH=%%W"
if not defined SCREEN_WIDTH set "SCREEN_WIDTH=1920"
:: Edge 備援路徑
set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

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
  if exist "%EDGE%" (
    echo Chrome not found, using Edge as fallback.
    set "BROWSER=%EDGE%"
  ) else (
    echo Neither Chrome nor Edge found. Please install a browser.
    exit /b 1
  )
) else (
  set "BROWSER=%CHROME%"
)


echo Opening %URL% in a new browser window on the right monitor...
start "" "%BROWSER%" --new-window --start-maximized --window-position=%SCREEN_WIDTH%,0 "%URL%"

endlocal
