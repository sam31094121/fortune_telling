@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock >push-result.txt 2>&1
del /f /q .git\index.lock >>push-result.txt 2>&1
git add -A >>push-result.txt 2>&1
git commit -m "Remove taiji card entirely from homepage per instruction; everything else untouched" >>push-result.txt 2>&1
git push origin main >>push-result.txt 2>&1
git log -1 --oneline >>push-result.txt 2>&1
echo BAT_DONE >>push-result.txt
