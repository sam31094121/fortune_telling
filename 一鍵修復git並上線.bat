@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Five Element Orbit Card V1: independent SVG card beside tarot (tarot frozen, +5 lines wrapper only), fixed nodes with generating ring + controlling pentagram, one-shot draw animation, backend-only data binding with honest dash for missing, project-owned SVG assets with license manifest + TraditionalBaziCore V1.1.0 + bazi frontend V2/V3"
git push origin main > push-result.txt 2>&1
type push-result.txt
