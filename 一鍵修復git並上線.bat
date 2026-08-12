@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Ceremony auto-flow: certified items reveal one-by-one with numbered pass badges and live counter, then auto-open chart after 1.4s (no manual click), view button kept as fallback + golden start button"
git push origin main > push-result.txt 2>&1
type push-result.txt
