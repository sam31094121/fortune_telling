@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji stability pass: incremental spin integration (no phase jump on any of the 24 chimes), smooth totem scale/depth transitions, eased tilt on stage change, calmed orbit sway + cinematic upgrade batch (dual-layer energy field, bagua antique-gold beads, touch-drag, mobile sizing, tarot CTA, music title)"
git push origin main > push-result.txt 2>&1
type push-result.txt
