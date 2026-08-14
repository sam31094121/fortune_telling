@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji 24-tone legato upgrade: gliding breath drone bridges every click, portamento attacks, overlapping tails, and a 4-part surprise finale (riser, deep gong, crystal cascade, starlight chord) + 3D taiji sphere with radiance"
git push origin main > push-result.txt 2>&1
type push-result.txt
