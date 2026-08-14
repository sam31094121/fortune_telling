@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji stage as true 3D sphere: equirect yin-yang wrap facing camera, specular ball shading, additive gold radiance sprite, graceful sway (no more flat disk)"
git push origin main > push-result.txt 2>&1
type push-result.txt
