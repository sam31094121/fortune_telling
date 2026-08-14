@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji 24-face evolution: 24 full color themes (one per chime) re-skin sphere, rays, halo, rings and key light per click; ray/ring spin flips at 8 and 16; golden-angle ring tilts; 24-tick progress ring, combo orbit, completion halo, click pulse (variable-reward stickiness maxed)"
git push origin main > push-result.txt 2>&1
type push-result.txt
