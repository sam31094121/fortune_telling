@echo off
title 天宿命理 8888 自動掃描守護器
color 0A

cd /d "%~dp0"

echo =======================================================
echo       天宿命理 8888 自動掃描守護器
echo =======================================================
echo.
echo [INFO] 每 15 秒輪流掃描 /、/music、/match、/insight
echo [INFO] 連續失敗 3 次會自動釋放 8888、清理 .next/cache、重啟服務
echo [INFO] 日誌位置: .guardian-log.txt
echo.

node scripts\homepage-guardian.js

pause
