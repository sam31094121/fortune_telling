@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Tarot entry emblem redesign: pyramid-apex concept - truncated gold pyramid, floating glowing capstone, upward signal ripples from the apex; mobile-first sizes, transform/opacity-only animations, reduced-motion safe"
git push origin main > push-result.txt 2>&1
type push-result.txt
