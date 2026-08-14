@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji full-gold palette: five-tier statistical gold system (standard D4AF37, radiant FFD700, champagne F7E7CE, honey E8B923, deep B8860B) across sphere, glow, rings, sparkles, glyphs and lighting"
git push origin main > push-result.txt 2>&1
type push-result.txt
