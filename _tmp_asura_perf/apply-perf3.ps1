$ErrorActionPreference='Stop'
Set-Location 'C:\Users\DRAGON\Desktop\命理'
$enc=New-Object Text.UTF8Encoding($false)
$P='lib\ghost-asura-particles.ts'; $C='app\ghost-asura\GhostAsuraPageClient.tsx'
$expect=@{ $P='B8C0E05822AFCC579FCD2FC817D2CD87AD5A3CE886A84703D2099D3A45812514'; $C='A988AFF3D0001646504A2752CB699D47645CB43111CE7B1B849FB6E973215BEF' }
foreach($f in $P,$C){ $h=(Get-FileHash $f).Hash; if($h -ne $expect[$f]){ throw "HASH CHANGED $f $h" } }
$ts=Get-Date -Format 'yyyyMMdd-HHmmss'
$bk="_backup-20261108-asura-perf2\$ts"; if(Test-Path $bk){throw "backup exists"}; New-Item -ItemType Directory -Path $bk | Out-Null
foreach($f in $P,$C){ Copy-Item $f (Join-Path $bk ((Split-Path $f -Leaf)+'.bak')) }
function Rep([string]$t,[string]$old,[string]$new){ $n=([regex]::Matches($t,[regex]::Escape($old))).Count; if($n -ne 1){throw "match count $n for: $old"}; return $t.Replace($old,$new) }
$nl="`n"
# ---- particles
$t=[IO.File]::ReadAllText("$PWD\$P",$enc); $crlf=$t.Contains("`r`n"); $t=$t.Replace("`r`n","`n")
$t=Rep $t "  public createCardEnergyFlow(cardElement: HTMLElement): void {$nl    const rect = cardElement.getBoundingClientRect();$nl    const parentRect = this.canvas.parentElement?.getBoundingClientRect();" "  /** 容器（canvas 父層）目前的幾何；供呼叫端一次批次讀取，避免在計時器裡逐次強制同步排版。 */$nl  public getContainerRect(): DOMRect | undefined {$nl    return this.canvas.parentElement?.getBoundingClientRect();$nl  }$nl$nl  public createCardEnergyFlow(cardElement: HTMLElement, precomputed?: { rect: DOMRect; parentRect: DOMRect }): void {$nl    const rect = precomputed?.rect ?? cardElement.getBoundingClientRect();$nl    const parentRect = precomputed?.parentRect ?? this.canvas.parentElement?.getBoundingClientRect();"
$t=Rep $t "  public createImpressionGlow(element: HTMLElement, index: number): void {$nl    const rect = element.getBoundingClientRect();$nl    const parentRect = this.canvas.parentElement?.getBoundingClientRect();" "  public createImpressionGlow(element: HTMLElement, index: number, precomputed?: { rect: DOMRect; parentRect: DOMRect }): void {$nl    const rect = precomputed?.rect ?? element.getBoundingClientRect();$nl    const parentRect = precomputed?.parentRect ?? this.canvas.parentElement?.getBoundingClientRect();"
if($crlf){$t=$t.Replace("`n","`r`n")}; [IO.File]::WriteAllText("$PWD\$P.perf3tmp",$t,$enc)
# ---- client
$u=[IO.File]::ReadAllText("$PWD\$C",$enc); $crlf2=$u.Contains("`r`n"); $u=$u.Replace("`r`n","`n")
$u=Rep $u "    const particleSystem = getParticleSystem();$nl    if (particleSystem) {$nl      particleSystem.createCardEnergyFlow(cardElement);$nl    }" "    const particleSystem = getParticleSystem();$nl    // 效能：開卡當下一次批次讀取幾何（卡片、容器、各印記），計時器內不再呼叫 getBoundingClientRect，$nl    // 避免每個印記各觸發一次整頁強制同步樣式／排版。粒子數量、時序、效果不變。$nl    const containerRect = particleSystem?.getContainerRect();$nl    const cardRect = particleSystem ? cardElement.getBoundingClientRect() : undefined;$nl    const glowIdsForGeometry = reading?.glowIds ?? [];$nl    const glowGeometry = new Map<string, { element: HTMLElement; rect: DOMRect }>();$nl    if (particleSystem && containerRect && glowIdsForGeometry.length > 0) {$nl      const items = Array.from(cardElement.querySelectorAll<HTMLElement>('[data-asura-id]'));$nl      glowIdsForGeometry.forEach((id) => {$nl        const element = items.find((item) => item.getAttribute('data-asura-id') === id);$nl        if (element && !glowGeometry.has(id)) glowGeometry.set(id, { element, rect: element.getBoundingClientRect() });$nl      });$nl    }$nl    if (particleSystem) {$nl      particleSystem.createCardEnergyFlow($nl        cardElement,$nl        cardRect && containerRect ? { rect: cardRect, parentRect: containerRect } : undefined,$nl      );$nl    }"
$u=Rep $u "        const itemElement = Array.from(cardElement.querySelectorAll<HTMLElement>('[data-asura-id]'))$nl          .find((element) => element.getAttribute('data-asura-id') === id);$nl        if (itemElement && particleSystem) {$nl          particleSystem.createImpressionGlow(itemElement as HTMLElement, index);$nl        }" "        const cached = glowGeometry.get(id);$nl        if (cached && particleSystem && containerRect) {$nl          particleSystem.createImpressionGlow(cached.element, index, { rect: cached.rect, parentRect: containerRect });$nl          return;$nl        }$nl        const itemElement = Array.from(cardElement.querySelectorAll<HTMLElement>('[data-asura-id]'))$nl          .find((element) => element.getAttribute('data-asura-id') === id);$nl        if (itemElement && particleSystem) {$nl          particleSystem.createImpressionGlow(itemElement as HTMLElement, index);$nl        }"
if($crlf2){$u=$u.Replace("`n","`r`n")}; [IO.File]::WriteAllText("$PWD\$C.perf3tmp",$u,$enc)
# prewrite recheck then swap
foreach($f in $P,$C){ $h=(Get-FileHash $f).Hash; if($h -ne $expect[$f]){ Remove-Item "$f.perf3tmp"; throw "HASH CHANGED before write $f" } }
foreach($f in $P,$C){ Move-Item -Force "$f.perf3tmp" $f }
"backup=$bk"
foreach($f in $P,$C){ "{0} before={1} after={2}" -f $f,$expect[$f],(Get-FileHash $f).Hash }
Get-ChildItem $bk | % { "{0} {1}" -f $_.Name,(Get-FileHash $_.FullName).Hash }
