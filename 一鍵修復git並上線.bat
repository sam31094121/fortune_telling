@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji clean-space ambient: sparse depth stars, one lone meteor every 14s, faint floor stage; halo/rays/veil reined for negative-space elegance + photoreal IBL/PBR/ACES base"
git push origin main > push-result.txt 2>&1
type push-result.txt
