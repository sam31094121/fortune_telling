# 僅降太極殼光線／霧氣噪訊；不改 home-first-screen-stack 順序與舞台尺寸
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\DRAGON\Desktop\命理'
$globals = Join-Path $root 'app\globals.css'
$verify = Join-Path $root '_stickiness-verify'
$marker = '/* ===== taiji shell quiet 2026-09-23d — rays/fog only; no height/order ===== */'

$block = @"

$marker
@media (max-width: 900px), (pointer: coarse) {
  .home-first-screen-stack .home-top-brand-stage .modal-evolution-rays,
  .home-top-brand-stage .modal-evolution-rays {
    opacity: 0.16 !important;
  }
  .home-first-screen-stack .home-top-brand-stage .modal-evolution-rays .modal-energy-ray:nth-child(n+3),
  .home-top-brand-stage .modal-evolution-rays .modal-energy-ray:nth-child(n+3) {
    display: none !important;
  }
  .home-first-screen-stack .home-top-brand-stage .taiji-celestial-mist,
  .home-first-screen-stack .home-top-brand-stage .taiji-celestial-wisp,
  .home-first-screen-stack .home-top-brand-stage .taiji-gold-waves,
  .home-top-brand-stage .taiji-celestial-mist,
  .home-top-brand-stage .taiji-celestial-wisp,
  .home-top-brand-stage .taiji-gold-waves {
    opacity: 0.14 !important;
  }
  .home-first-screen-stack .home-top-brand-stage .taiji-celestial-wisp--three,
  .home-top-brand-stage .taiji-celestial-wisp--three {
    display: none !important;
  }
  .home-first-screen-stack .home-top-brand-stage .taiji-gold-waves .taiji-gold-wave:nth-child(n+2),
  .home-top-brand-stage .taiji-gold-waves .taiji-gold-wave:nth-child(n+2) {
    display: none !important;
  }
  .home-first-screen-stack .home-top-brand-stage .unified-taiji-shell::before,
  .home-first-screen-stack .home-top-brand-stage .unified-taiji-shell::after,
  .home-top-brand-stage .unified-taiji-shell::before,
  .home-top-brand-stage .unified-taiji-shell::after {
    opacity: 0.2 !important;
  }
}
"@

if (-not (Test-Path $globals)) { throw "missing $globals" }
$raw = Get-Content -LiteralPath $globals -Raw -Encoding UTF8
if ($raw -like "*$marker*") {
  Write-Output "SKIP already applied"
} else {
  Set-Content -LiteralPath $globals -Value ($raw.TrimEnd() + "`r`n" + $block) -Encoding UTF8 -NoNewline
  Write-Output "APPLIED $globals"
}

New-Item -ItemType Directory -Force -Path $verify | Out-Null
$shotJs = Join-Path $env:TEMP 'shot-shell-quiet.mjs'
@'
import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2800);
const shot = `${out}/11-taiji-shell-quiet.png`;
await page.screenshot({ path: shot, fullPage: false });
const rayOp = await page.locator('.home-top-brand-stage .modal-evolution-rays').first().evaluate(el => getComputedStyle(el).opacity).catch(() => null);
const mistOp = await page.locator('.home-top-brand-stage .taiji-celestial-mist').first().evaluate(el => getComputedStyle(el).opacity).catch(() => null);
const startBox = await page.locator('[data-quest-action="start"]').first().boundingBox().catch(() => null);
console.log(JSON.stringify({ shot, rayOp, mistOp, startBox, startInView: startBox ? (startBox.y + startBox.height) <= 820 : false }));
await browser.close();
'@ | Set-Content -LiteralPath $shotJs -Encoding UTF8

Push-Location $root
try {
  node $shotJs $verify
} finally {
  Pop-Location
}
Write-Output "SHOT=$verify\11-taiji-shell-quiet.png"
