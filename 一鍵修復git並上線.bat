@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji true 360-degree continuous rotation restored (planet-like axis tilt, no scale pumping) + cinematic realism batch (breathing camera, extra env strips, sheen/iridescence, hi-res shadows) + outer rings hidden"
git push origin main > push-result.txt 2>&1
type push-result.txt
