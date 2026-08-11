@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Bazi Real Calculation Ceremony V1: progress items bound to actual backend result fields, honest UNAVAILABLE for features core lacks, SKIPPED for unknown hour, Final Gate before customer frontend, gate-failed screen, no timers no fake checkmarks - core untouched"
git push origin main > push-result.txt 2>&1
type push-result.txt
