@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock >push-result.txt 2>&1
del /f /q .git\index.lock >>push-result.txt 2>&1
git add -A >>push-result.txt 2>&1
git commit -m "TaijiV7 3D: natural sway keyframes + pointer parallax tilt + tech color totem (ice-platinum x deep-space-blue, cyan tech rim)" >>push-result.txt 2>&1
git push origin main >>push-result.txt 2>&1
git log -1 --oneline >>push-result.txt 2>&1
echo BAT_DONE >>push-result.txt
