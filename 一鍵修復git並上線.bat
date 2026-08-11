@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Move form progress summary card below submit button: missing fields visible right where user clicks start"
git push origin main > push-result.txt 2>&1
type push-result.txt
