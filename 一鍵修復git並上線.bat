@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taichi card squared and centered with side margins + taichi enlarged 1.85 with all rings scaled + planets pushed out"
git push origin main > push-result.txt 2>&1
type push-result.txt
