@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Taiji premium look: ink-jade x moon-porcelain totem with gold rim, cinematic 3-point lighting, gilded trigram glyphs, gold orbit rings and gold UI (de-cartoonized, taiji card only)"
git push origin main > push-result.txt 2>&1
type push-result.txt
