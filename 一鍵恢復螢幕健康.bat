@echo off
cd /d "%~dp0"
echo [1/3] Stop dev server on 8888...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8888" ^| findstr "LISTENING"') do taskkill /f /pid %%a
timeout /t 2 /nobreak >nul
echo [2/3] Clear .next cache...
rmdir /s /q .next
echo [3/3] Start dev server...
start "dev-8888" cmd /c "npm run dev"
echo Done. Wait about 1 minute, then open http://localhost:8888
pause
