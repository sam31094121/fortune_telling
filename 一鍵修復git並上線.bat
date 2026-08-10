@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Five-planet visual upgrade: void breathing transparency + fire 2.8 emissive pulse + earth near-zero particles + interaction upgrade (hover tooltip, click pause-accelerate, R toggle)"
git push origin main > push-result.txt 2>&1
type push-result.txt
