@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Back-to-draw button: large high-contrast breathing CTA, full-width on mobile, duplicated at bottom of 78-card review with friendly guide text"
git push origin main > push-result.txt 2>&1
type push-result.txt
