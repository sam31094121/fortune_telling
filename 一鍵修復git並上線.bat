@echo off
cd /d "%~dp0"
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add -A
git commit -m "Traditional Bazi Core V1: deterministic engine (LiChun year boundary, JieQi month, WuHuDun WuShuDun cross-validated), hidden stem dictionary, TenGodEngine, interactions, DaYun via lunar-typescript, PARTIAL_BAZI for unknown hour, 62 golden tests PASS, shadow compare in bazi API, debug route"
git push origin main > push-result.txt 2>&1
type push-result.txt
