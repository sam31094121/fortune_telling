@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji light-tech suite: rotating god-rays burst, breathing core halo, golden-hour sweeping key light, bokeh orbs (humanity-favorite light phenomena, additive blended, perf-safe)"
git push origin main > push-result.txt 2>&1
type push-result.txt
