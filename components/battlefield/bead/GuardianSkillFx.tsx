'use client';
/** 四象魔法珠演出：純視覺（transform／opacity 動畫），不改卡圖、不改全站卡片樣式表。點一下或按 Esc／Enter／空白略過；減少動態偏好時只顯示橫幅。
 *  節奏（約 1.4 秒）：0–150ms 屬性閃光 → 120–520ms 神獸落地＋衝擊波 → 300–700ms 技能名蓋章 → 650ms 加成數字跳出 → 1150ms 淡出。 */
import { useEffect } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { GUARDIAN_FX_MS, type GuardianActivation } from '@/lib/beast-game/match3/guardian-magic';
import s from './GuardianSkillFx.module.css';

const ORB_LABEL: Record<string, string> = { AIR: '風', SPACE: '空', WATER: '水', FIRE: '火', EARTH: '地' };
const SPARKS = Array.from({ length: 10 }, (_, i) => i);

export function GuardianSkillFx({ act, bonus, onDone }: { act: GuardianActivation; bonus: number; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, GUARDIAN_FX_MS);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') onDone(); };
    window.addEventListener('keydown', key);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', key); };
  }, [act, onDone]);
  const card = playableCards().find((c) => c.id === act.guardian.id);
  const g = act.guardian;
  return (
    <div className={s.layer} data-el={g.element} data-testid="guardian-fx" data-guardian={g.id} role="status" aria-live="assertive"
      onPointerDown={(e) => { e.stopPropagation(); onDone(); }} title="點一下略過">
      <div className={s.flash} aria-hidden="true" />
      <div className={s.glow} aria-hidden="true" />
      <span className={s.glyph} aria-hidden="true">{ORB_LABEL[g.element]}</span>
      <div className={s.ring} aria-hidden="true" />
      <div className={`${s.ring} ${s.ring2}`} aria-hidden="true" />
      <div className={s.sparks} aria-hidden="true">{SPARKS.map((i) => <i key={i} style={{ ['--a' as string]: `${i * 36}deg` }} />)}</div>
      {card && <img className={s.beast} src={card.art.front} alt="" draggable={false} />}
      <div className={s.banner}>
        <span className={s.sub}>{ORB_LABEL[act.orbElement]}魔法珠・四象覺醒{act.orbElement === 'EARTH' ? '（地珠隨機）' : ''}</span>
        <strong className={s.name}><span className={s.gname}>{g.name}</span>「{g.skillName}」</strong>
        <span className={s.dmg}>{bonus > 0 ? <>四象加成 <b>+{bonus}</b></> : '四象加成'}</span>
      </div>
      <button type="button" className={s.skip} data-testid="guardian-fx-skip" onClick={onDone}>略過 ›</button>
    </div>
  );
}

/** 拖曳預告：路徑 ≥4 且經過魔法珠、隊上有可發動的四象時，盤面邊緣出現屬性光暈與小字（不擋操作）。 */
export function GuardianCharge({ element, name }: { element: string; name: string }) {
  return (
    <div className={s.charge} data-el={element} data-testid="guardian-charge" aria-hidden="true">
      <span className={s.chargeTag}>{name}・共鳴中</span>
    </div>
  );
}