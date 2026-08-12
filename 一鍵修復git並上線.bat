@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Fix bazi hour-branch UX on mobile: auto-scroll to shichen panel on expand, selected confirmation banner, bigger 88px tap targets + real tarot shuffle overlay + remove tarot hero subtitle"
git push origin main > push-result.txt 2>&1
type push-result.txt
