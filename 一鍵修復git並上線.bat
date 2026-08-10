@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Tarot CTA upgrade: bigger buttons with breathing glow, friendly step guidance, icons"
git push origin main > push-result.txt 2>&1
type push-result.txt
