@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Five Element Orbit V2 merged upgrade: SVG sheng-ke track layer (generating ring + controlling pentagram, one-shot draw) under clickable data nodes, active element lights related relation lines and dims others, gold day-master core glow, depth shadows, legend, drilldown sheet notes lit paths"
git push origin main > push-result.txt 2>&1
type push-result.txt
