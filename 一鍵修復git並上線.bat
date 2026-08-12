@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Tarot hero title supersized: 6xl-8xl centered gradient headline with strong glow, refined eyebrow and star divider"
git push origin main > push-result.txt 2>&1
type push-result.txt
