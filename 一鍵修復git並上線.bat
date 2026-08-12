@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Lock customer-reported regression: 1974-07-02 pre-xiaoshu month pillar must be GengWu not XinWei, with post-boundary control case (golden tests 81/81)"
git push origin main > push-result.txt 2>&1
type push-result.txt
