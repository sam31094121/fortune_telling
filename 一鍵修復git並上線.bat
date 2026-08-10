@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji center 24-yun sound engine: continuous sound journey per click, first longest, 24th shortest with easter egg arpeggio, compressor anti-clip, visual energy burst sync"
git push origin main > push-result.txt 2>&1
type push-result.txt
