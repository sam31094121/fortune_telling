@echo off
cd /d "%~dp0"
del /f .git\HEAD.lock 2>nul
del /f .git\index.lock 2>nul
git add -A
git commit -m "ziwei-core: single engine entry (timeIndex 0-12 late-zi, lunar byLunar, surroundedPalaces API) + debug route + 13 regression fixtures + lunar cross-check"
git push origin main
pause
