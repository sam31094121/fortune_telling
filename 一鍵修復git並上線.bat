@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji photoreal upgrade: procedural studio IBL (Lightformer softbox/strip/rim/fill, baked once), clearcoat PBR physical materials on all spheres (lacquered porcelain and obsidian), ACES filmic tone mapping, emissive reined in, veil softened"
git push origin main > push-result.txt 2>&1
type push-result.txt
