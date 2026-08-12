@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Debug endpoint: accept romanized hourBranch (zi/chou/...) mapped to Chinese branches so it no longer falls back to PARTIAL mode"
git push origin main > push-result.txt 2>&1
type push-result.txt
