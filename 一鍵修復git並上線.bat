@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock >push-result.txt 2>&1
del /f /q .git\index.lock >>push-result.txt 2>&1
git add -A >>push-result.txt 2>&1
git commit -m "Top shell card: full three-layer 3D taichi system (taichi-liangyi-sixiang-bagua + five element planets + space energy field)" >>push-result.txt 2>&1
git push origin main >>push-result.txt 2>&1
git log -1 --oneline >>push-result.txt 2>&1
echo BAT_DONE >>push-result.txt
