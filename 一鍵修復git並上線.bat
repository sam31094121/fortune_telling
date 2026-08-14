@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji 24-step visual journey synced with sound: rays brighten and speed up per click, sparkles multiply, spin accelerates, milestone bursts every 6 steps and grand awakening at 24 (variable-reward stickiness)"
git push origin main > push-result.txt 2>&1
type push-result.txt
