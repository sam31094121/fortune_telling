@echo off
REM 首頁防護啟動腳本 - 自動啟動 dev server + 首頁衛士
REM 確保首頁永遠不會消失

cd /d "%~dp0"

echo ╔════════════════════════════════════════════════════════════╗
echo ║           🛡️  首頁防護系統已啟動                          ║
echo ║                                                            ║
echo ║  - Dev Server: 運行中                                      ║
echo ║  - 首頁衛士: 24/7 監控中                                    ║
echo ║  - 自動恢復: 已啟用                                        ║
echo ║                                                            ║
echo ║  首頁地址: http://localhost:3000                          ║
echo ║  監控日誌: .guardian-log.txt                              ║
echo ║                                                            ║
echo ║  按 Ctrl+C 停止（不建議）                                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

npm run dev:safe

pause
