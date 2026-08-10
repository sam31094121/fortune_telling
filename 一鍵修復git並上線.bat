@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock >push-result.txt 2>&1
del /f /q .git\index.lock >>push-result.txt 2>&1
git add -A >>push-result.txt 2>&1
git commit -m "TaijiV7 upgrade: element signals + ritual + RESULT_READY + LOW keeps interaction" >>push-result.txt 2>&1
git push origin main >>push-result.txt 2>&1
git log -1 --oneline >>push-result.txt 2>&1
echo BAT_DONE >>push-result.txt
