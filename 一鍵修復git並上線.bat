@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Bazi header typography redesign: Chinese-first eyebrow with gold lead line, gradient serif H1 enlarged, accent-bar subtitle + enlarged home buttons sitewide"
git push origin main > push-result.txt 2>&1
type push-result.txt
