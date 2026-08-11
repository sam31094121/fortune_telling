@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Self profile autofill: selecting Self auto-fills previously saved own birth data across UnifiedBirthForm pages, saved on self-submit, cleared to blank when switching to friend mode + hide tarot data-split notice + codex pipeline work"
git push origin main > push-result.txt 2>&1
type push-result.txt
