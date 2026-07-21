@echo off
title ☯️ 天宿命理人格解碼系統 一鍵啟動艙 ☯️
color 0B

echo =======================================================
echo           ☯️ TAICHI CYBER DECISION TERMINAL ☯️          
echo          天宿命理人格解碼系統 - 自動計畫性啟動         
echo =======================================================
echo.

:: 檢查 Node 環境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] 檢測到系統未安裝 Node.js，請先安裝以執行 Next.js 服務。
    pause
    exit /b
)

:: 檢測依賴
if not exist "node_modules\" (
    echo [INFO] 正在安裝天宿系統依賴組件，請稍候...
    call npm install
)

echo [INFO] 正在啟動天宿 Next.js 伺服器 (npm run dev)...
start "" /B npm run dev

echo [INFO] 正在進行量子矩陣對齊與編譯，請稍候 3 秒...
timeout /t 3 /nobreak >nul

echo [INFO] 正在為您自動開啟天宿命理解碼系統網頁 (多重相容性防線)...
start "" "chrome.exe" "http://localhost:8888" 2>nul
if %errorlevel% neq 0 (
    start "" "msedge.exe" "http://localhost:8888" 2>nul
    if %errorlevel% neq 0 (
        explorer "http://localhost:8888"
    )
)

echo.
echo =======================================================
echo  🎉 網頁已成功開啟！
echo  ☯️ 連點解碼艙太極圖騰 3/6/12/24 次可激發大悲咒彩蛋
echo  💻 請勿關閉此視窗，關閉將會終止本地伺服器運行
echo =======================================================
echo.

:: 保持日誌輸出
npm run dev
