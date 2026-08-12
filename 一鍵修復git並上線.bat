@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Hide birthplace card on ziwei form + move data-progress chip to 7th position + floating home bottom dock upgrade"
git push origin main > push-result.txt 2>&1
type push-result.txt
