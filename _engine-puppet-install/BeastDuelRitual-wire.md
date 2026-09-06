# BeastDuelRitual.tsx — Engine Puppet 接入說明

## 變更摘要

1. `import BeastLayeredPuppet, { probePuppetManifest } from './BeastLayeredPuppet'`
2. 新增 state：`chargePuppetPoolId: string | null`（hooks 緊接既有 `chargeVideoSrc`，**勿打亂 hook 順序**）
3. 衝鋒 effect：先 probe puppet；有則設 `chargePuppetPoolId` 並可清空／降權 video；無則維持 `chargeVideoFor`
4. JSX：在 charge video 之上（或取代）渲染 `<BeastLayeredPuppet poolId={...} playing />`；puppet 失敗時 video 仍在

## 建議 diff（概念）

```tsx
import BeastLayeredPuppet, { probePuppetManifest } from './BeastLayeredPuppet';

// state（與 chargeVideoSrc 同區）
const [chargePuppetPoolId, setChargePuppetPoolId] = useState<string | null>(null);

// 取代／擴充原 pairClash → charge 的 effect：
useEffect(() => {
  if (pairClash == null || !opponent) {
    setChargeSkillLabel(null);
    setChargeVideoSrc(null);
    setChargePuppetPoolId(null);
    return;
  }
  const id = player[pairClash]?.id;
  const skills = id ? skillCacheRef.current[id] : undefined;
  setChargeSkillLabel(skills?.charge.name ?? '本體衝鋒');
  if (!id) return;

  let cancelled = false;
  void (async () => {
    const hasPuppet = await probePuppetManifest(id);
    if (cancelled) return;
    if (hasPuppet) {
      setChargePuppetPoolId(id);
      // 引擎優先；video 當 fallback（puppet 404 時元件回 null）
      setChargeVideoSrc(chargeVideoFor(id).webm);
    } else {
      setChargePuppetPoolId(null);
      setChargeVideoSrc(chargeVideoFor(id).webm);
    }
  })();
  return () => { cancelled = true; };
}, [pairClash, player, opponent]);
```

## JSX（center 區塊內，skill label 之後）

```tsx
{chargePuppetPoolId ? (
  <BeastLayeredPuppet
    key={'puppet-' + chargePuppetPoolId + String(pairClash)}
    poolId={chargePuppetPoolId}
    playing={pairClash !== null}
  />
) : null}
{/* video：puppet 未就緒或 404 時可見；puppet 成功時可蓋在下面或隱藏 */}
{/* video 始終備援（有 puppet 時 opacity:0）；puppet 404 回 null 時仍可見 */}
{chargeVideoSrc ? (
  <video ... src={chargeVideoSrc} style={{..., opacity: chargePuppetPoolId ? 0 : 1}} />
) : null}
```

完整已改檔見：`patch-notes/BeastDuelRitual.patched.tsx`（可直接覆蓋 MSI 上的元件，覆蓋前請 diff）。
