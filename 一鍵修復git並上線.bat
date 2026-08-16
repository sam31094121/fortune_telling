@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Mobile smoothness pass: device-tier canvas quality (dpr/env/shadow), phone-halved taiji texture (1024x512), lighter mobile drop-shadows, haptic tick on chimes, touch-drag polish; all 8 cards scanned clean"
git push origin main > push-result.txt 2>&1
type push-result.txt
