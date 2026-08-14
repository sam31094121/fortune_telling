@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji 24 themes unified to first-gold benchmark: generated gold-temperature journey (amber-champagne breathing, moon-silver breaths at 8 and 16, constant ink/porcelain materials) + soft moon-halo radiance (wide faint rays with ambient wash, long gentle glow falloff)"
git push origin main > push-result.txt 2>&1
type push-result.txt
