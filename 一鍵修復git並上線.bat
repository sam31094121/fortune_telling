@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock >push-result.txt 2>&1
del /f /q .git\index.lock >>push-result.txt 2>&1
git add -A >>push-result.txt 2>&1
git commit -m "TaijiV7 WebGL: Three.js tech taichi (drag rotate, energy rings, 600 glow particles, circuit texture, crystals, neon eyes) HIGH-only with SVG fallback" >>push-result.txt 2>&1
git push origin main >>push-result.txt 2>&1
git log -1 --oneline >>push-result.txt 2>&1
echo BAT_DONE >>push-result.txt
