@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji realism lock: sphere body permanently uses first-face benchmark materials (ink-jade x moon-porcelain, physically constant); all 24 chime variations expressed only through surrounding light (halo, rays, rings, key light temperature) - real objects never change material, only the light does"
git push origin main > push-result.txt 2>&1
type push-result.txt
