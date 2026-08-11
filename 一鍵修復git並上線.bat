@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Bazi Customer Frontend Rebuild V1: 3-level architecture (hero card / teacher accordion / full traditional table), four vertical pillar cards with day master emphasis, honest unknown-hour display, five element bars, DaYun timeline, annual luck collapse, evidence drawers, sticky 2-action bar - core untouched"
git push origin main > push-result.txt 2>&1
type push-result.txt
