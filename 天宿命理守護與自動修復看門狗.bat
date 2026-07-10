@echo off
title ☯️ 天宿命理守護與自動修復看門狗 (System Daemon Watchdog) ☯️
color 0A

echo =======================================================
echo         ☯️ TAIJI SYSTEM DAEMON WATCHDOG ENGINE ☯️       
echo        天宿命理系統 - 全天候常駐守護與自愈恢復服務       
echo =======================================================
echo.
echo [STATUS] 正在啟動天宿 Watchdog 背景看門狗監控線程...
echo [INFO] 每隔 5 秒將自動掃描 localhost:3000 端口與螢幕渲染狀態...
echo.

:MONITOR_LOOP
:: 透過 PowerShell 靜默測試 Port 3000 是否正常響應
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 2 -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

if %errorlevel% equ 0 (
    echo [%time%] [OK] 天宿系統運作正常，螢幕無異常，持續監控中...
) else (
    echo [%time%] [WARN] 偵測到天宿系統異常或伺服器卡死！啟動自動維修計畫...
    
    :: 1. 強制殺死可能殘留卡死的 Node 進程
    echo [%time%] 正在強制釋放卡死端口與 Node 資源...
    taskkill /f /im node.exe >nul 2>&1
    
    :: 2. 背景重啟 Next.js 服務
    echo [%time%] 正在啟動天宿修復編譯 (npm run dev)...
    start "" /B npm run dev
    
    :: 3. 倒數等待編譯 Ready
    echo [%time%] 量子編譯中，等待 4 秒...
    timeout /t 4 /nobreak >nul
    
    :: 4. 多重相容性防線強行重新開啟網頁
    echo [%time%] 正在自動強行拉起瀏覽器，修復螢幕顯示...
    start "" "chrome.exe" "http://localhost:3000" 2>nul
    if %errorlevel% neq 0 (
        start "" "msedge.exe" "http://localhost:3000" 2>nul
        if %errorlevel% neq 0 (
            explorer "http://localhost:3000"
        )
      )
    echo [%time%] [SUCCESS] 自動恢復成功！網頁已重新開啟，繼續守護監控...
)

:: 每 5 秒掃描一次
timeout /t 5 /nobreak >nul
goto MONITOR_LOOP
