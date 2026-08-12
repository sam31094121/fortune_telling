@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Fix stale bazi daily-record replay: require TraditionalBaziCore >= 1.1.0 engine stamp on restore, auto-clear legacy records with clear zh-TW notice (was mojibake)"
git push origin main > push-result.txt 2>&1
type push-result.txt
