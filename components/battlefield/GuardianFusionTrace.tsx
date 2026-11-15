'use client';
/**
 * 寶石捷連線・四象合體特效（純視覺）。
 * 本尊與一起出手的本象星宿之間拉出星宿連線，本尊卡內下段（招牌技能字下方、血條上方）短暫浮出一枚「白虎合體」印；印的大小依卡寬自動縮放，連彈出放大的那一格也不超出卡框、不壓到棋盤；1.4 秒後自動消失。
 * 不攔截點擊（pointer-events: none），不改任何數值；判定見 lib/beast-game/match3/guardian-fusion.ts。
 * 食物鏈 5A（2026-11-15）：本尊已有永久加成時，合體印多顯示「已合體 +N」（N＝伺服端凍結進本局的加成），只顯示、傷害不變；「已合體 +N」排在印內第二行（手機上字才夠大），整枚印跟著依卡寬縮放、不出卡框。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { guardianSealPlacement, GUARDIAN_SEAL_Y, type GuardianFusion } from '@/lib/beast-game/match3/guardian-fusion';
import styles from './GuardianFusionTrace.module.css';

interface Point { x: number; y: number; w: number; h: number }
interface Drawn { fusion: GuardianFusion; core: Point; members: Point[] }

export default function GuardianFusionTrace({ fx, root, colorOf, label, bonusOf }: {
  fx: { key: number; fusions: GuardianFusion[] } | null;
  root: RefObject<HTMLElement | null>;
  colorOf: (f: GuardianFusion) => string;
  label: (f: GuardianFusion) => string;
  bonusOf?: (id: string) => number | undefined;
}) {
  const [drawn, setDrawn] = useState<Drawn[]>([]);
  const [fits, setFits] = useState<Record<string, { fit: number; dy: number }>>({});
  const seals = useRef(new Map<string, HTMLElement>());
  useLayoutEffect(() => {
    const host = root.current;
    if (!fx || !host) { setDrawn([]); return; }
    const box = host.getBoundingClientRect();
    const at = (id: string): Point | null => {
      const el = host.querySelector<HTMLElement>(`[data-testid="match3-ally"][data-id="${CSS.escape(id)}"]`);
      const r = el?.getBoundingClientRect();
      return r && r.width > 0 ? { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top, w: r.width, h: r.height } : null;
    };
    setDrawn(fx.fusions.flatMap(fusion => {
      const core = at(fusion.coreId);
      const members = fusion.memberIds.map(at).filter((p): p is Point => !!p);
      return core ? [{ fusion, core, members }] : [];
    }));
  }, [fx, root]);
  // 量到印的實際尺寸後才決定縮放（在第一次繪製前完成），保證 0%→22% 彈出的每一格都不出卡框。
  useLayoutEffect(() => {
    const next: Record<string, { fit: number; dy: number }> = {};
    for (const d of drawn) { const el = seals.current.get(d.fusion.key); if (el) next[d.fusion.key] = guardianSealPlacement(d.core, { w: el.offsetWidth, h: el.offsetHeight }, el.dataset.hasBonus === 'true'); }
    setFits(cur => JSON.stringify(cur) === JSON.stringify(next) ? cur : next);
  }, [drawn]);
  if (!fx || !drawn.length) return null;
  return <div className={styles.layer} data-testid="match3-guardian-fusion" data-key={fx.key} data-guardians={drawn.map(d => d.fusion.key).join(',')} role="status">
    {drawn.map(({ fusion, core, members }) => <div key={fusion.key} className={styles.group} style={{ ['--gf' as string]: colorOf(fusion) }} data-guardian={fusion.key} data-core={fusion.coreId} data-members={fusion.memberIds.join(',')}>
      <span className={styles.srOnly}>{label(fusion)}</span>
      <svg className={styles.trace} aria-hidden="true">
        {members.map((m, i) => <g key={i}>
          <path d={`M ${m.x} ${m.y - m.h * 0.18} Q ${(m.x + core.x) / 2} ${Math.min(m.y, core.y) - Math.max(18, Math.abs(m.x - core.x) * 0.22)} ${core.x} ${core.y - core.h * 0.18}`} pathLength="1" style={{ ['--i' as string]: i }} />
          <circle cx={m.x} cy={m.y - m.h * 0.18} r="3.2" style={{ ['--i' as string]: i }} />
        </g>)}
      </svg>
      <span className={styles.seal} aria-hidden="true" data-seal-fit={fits[fusion.key]?.fit ?? ''} data-has-bonus={(bonusOf?.(fusion.coreId) ?? 0) > 0 ? 'true' : undefined} ref={el => { if (el) seals.current.set(fusion.key, el); else seals.current.delete(fusion.key); }} style={{ left: core.x, top: core.y + (fits[fusion.key]?.dy ?? core.h * GUARDIAN_SEAL_Y), ['--gfit' as string]: fits[fusion.key]?.fit ?? 1, visibility: fits[fusion.key] === undefined ? 'hidden' : undefined }}><b>{fusion.short}</b><i>合體</i>{(bonusOf?.(fusion.coreId) ?? 0) > 0 && <em data-fusion-bonus={bonusOf!(fusion.coreId)}><span>已合體</span> +{bonusOf!(fusion.coreId)}</em>}</span>
    </div>)}
  </div>;
}
