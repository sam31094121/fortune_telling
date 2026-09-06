# Install-EngineLayeredPuppet.ps1
# 將 Engine Layered Puppet 安裝到太極命理專案（預設 MSI 桌面路徑）
# 用法：
#   powershell -ExecutionPolicy Bypass -File .\Install-EngineLayeredPuppet.ps1
#   powershell -ExecutionPolicy Bypass -File .\Install-EngineLayeredPuppet.ps1 -ProjectRoot "D:\path\to\命理"

param(
  [string]$ProjectRoot = "C:\Users\DRAGON\Desktop\命理",
  [string]$PackRoot = ""
)

$ErrorActionPreference = "Stop"

if (-not $PackRoot) {
  # 腳本位於 pack\scripts\ 時，pack 根目錄為上上層
  $PackRoot = Split-Path -Parent $PSScriptRoot
  if (-not (Test-Path (Join-Path $PackRoot "beast-puppets-a01.tar"))) {
    $PackRoot = $PSScriptRoot
  }
}

Write-Host "== Engine Layered Puppet Install ==" -ForegroundColor Cyan
Write-Host "PackRoot   : $PackRoot"
Write-Host "ProjectRoot: $ProjectRoot"

if (-not (Test-Path $ProjectRoot)) {
  throw "ProjectRoot not found: $ProjectRoot"
}

$puppetsDir = Join-Path $ProjectRoot "public\beast-game\puppets"
$stageDir   = Join-Path $ProjectRoot "public\beast-game\stage\default"
$compDir    = Join-Path $ProjectRoot "components"
$docsDir    = Join-Path $ProjectRoot "docs"

New-Item -ItemType Directory -Force -Path $puppetsDir | Out-Null
New-Item -ItemType Directory -Force -Path $stageDir   | Out-Null
New-Item -ItemType Directory -Force -Path $compDir    | Out-Null
New-Item -ItemType Directory -Force -Path $docsDir    | Out-Null

# --- A) Extract / copy puppet layers ---
$tarPath = Join-Path $PackRoot "beast-puppets-a01.tar"
$preExtracted = Join-Path $PackRoot "public\beast-game\puppets\beast_a01"
$altExtracted = Join-Path $PackRoot "beast_a01"

if (Test-Path $tarPath) {
  Write-Host "Extracting $tarPath -> $puppetsDir"
  # tar.exe 在 Win10+ 內建；-xf 會保留 beast_a01/ 前綴
  & tar -xf $tarPath -C $puppetsDir
  if ($LASTEXITCODE -ne 0) { throw "tar extract failed ($LASTEXITCODE)" }
} elseif (Test-Path $preExtracted) {
  Write-Host "Copying pre-extracted layers from $preExtracted"
  $dest = Join-Path $puppetsDir "beast_a01"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -Force -Recurse (Join-Path $preExtracted "*") $dest
} elseif (Test-Path $altExtracted) {
  Write-Host "Copying alt layers from $altExtracted"
  $dest = Join-Path $puppetsDir "beast_a01"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -Force -Recurse (Join-Path $altExtracted "*") $dest
} else {
  throw "Missing beast-puppets-a01.tar and pre-extracted beast_a01/"
}

# Confirm manifest paths
$manifestPath = Join-Path $puppetsDir "beast_a01\manifest.json"
if (-not (Test-Path $manifestPath)) { throw "manifest.json missing after install" }
$manifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json
Write-Host ("Manifest poolId={0} layers={1}" -f $manifest.poolId, ($manifest.layers -join ","))

# Stage bg
$stageSrc = Join-Path $PackRoot "public\beast-game\stage\default\circus_arena.jpg"
if (Test-Path $stageSrc) {
  Copy-Item -Force $stageSrc (Join-Path $stageDir "circus_arena.jpg")
  Write-Host "Stage: circus_arena.jpg copied"
} else {
  Write-Warning "Stage image missing in pack — skip (ensure public/beast-game/stage/default/circus_arena.jpg exists)"
}

# --- B/C) Components ---
$files = @(
  @{ Src = "components\BeastLayeredPuppet.tsx"; Dst = "components\BeastLayeredPuppet.tsx" },
  @{ Src = "components\BeastLayeredPuppet.module.css"; Dst = "components\BeastLayeredPuppet.module.css" },
  @{ Src = "docs\ENGINE-LAYERED-PUPPET.md"; Dst = "docs\ENGINE-LAYERED-PUPPET.md" }
)
foreach ($f in $files) {
  $from = Join-Path $PackRoot $f.Src
  $to   = Join-Path $ProjectRoot $f.Dst
  if (-not (Test-Path $from)) { throw "Missing pack file: $($f.Src)" }
  Copy-Item -Force $from $to
  Write-Host "Copied $($f.Dst)"
}

# Ritual: prefer patched full file
$patched = Join-Path $PackRoot "patch-notes\BeastDuelRitual.patched.tsx"
$ritualDst = Join-Path $ProjectRoot "components\BeastDuelRitual.tsx"
if (Test-Path $patched) {
  # backup once
  $bak = "$ritualDst.bak-before-engine-puppet"
  if ((Test-Path $ritualDst) -and -not (Test-Path $bak)) {
    Copy-Item -Force $ritualDst $bak
    Write-Host "Backup: $bak"
  }
  Copy-Item -Force $patched $ritualDst
  Write-Host "Wired BeastDuelRitual.tsx from patched copy"
} else {
  Write-Warning "No patched ritual — see patch-notes/BeastDuelRitual-wire.md"
}

Write-Host ""
Write-Host "DONE. Trigger in UI: 三戰兩勝 → 揭牌交鋒 → 玩家牌為 beast_a01 時顯示分層傀儡。" -ForegroundColor Green
Write-Host "Optional typecheck: npx tsc --noEmit"
