@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "TaijiSystem V2 per owner spec: R3F dual independent-spin yin-yang spheres, 4-stage evolution, perf-tuned, wired to 24-step sound; swap in taiji card only + match star-reading upgrade + prior hides"
git push origin main > push-result.txt 2>&1
type push-result.txt
