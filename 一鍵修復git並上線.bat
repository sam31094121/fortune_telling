@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Bazi header centered with symmetric gold lead lines, title changed to AI + Bazi with gold plus separator"
git push origin main > push-result.txt 2>&1
type push-result.txt
