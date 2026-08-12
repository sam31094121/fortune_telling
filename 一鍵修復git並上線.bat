@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Hide all MegaInputGuide cards sitewide at component source: single kill switch covers all 8 feature pages"
git push origin main > push-result.txt 2>&1
type push-result.txt
