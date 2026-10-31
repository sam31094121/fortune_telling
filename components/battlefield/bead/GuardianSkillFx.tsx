'use client';
/** 四象魔法珠演出：純視覺（CSS 動畫），不改卡圖、不改全站卡片樣式表。點一下或按 Esc 略過；減少動態偏好時只顯示橫幅。 */
import { useEffect } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { GUARDIAN_FX_MS, type GuardianActivation } from '@/lib/beast-game/match3/guardian-magic';
import s from './GuardianSkillFx.module.css';

const ORB_LABEL: Record<string, string> = { AIR: '風', SPACE: '空', WATER: '水', FIRE: '火', EARTH: '地' };

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
      <div className={s.glow} aria-hidden="true" />
      {card && <img className={s.beast} src={card.art.front} alt="" draggable={false} />}
      <div className={s.banner}>
        <span className={s.sub}>{ORB_LABEL[act.orbElement]}魔法珠・四象覺醒{act.orbElement === 'EARTH' ? '（地珠隨機）' : ''}</span>
        <strong className={s.name}>{g.name}・{g.skillName}</strong>
        <span className={s.dmg}>{bonus > 0 ? `四象加成 +${bonus}` : '四象加成'}</span>
      </div>
      <button type="button" className={s.skip} data-testid="guardian-fx-skip" onClick={onDone}>略過 ›</button>
    </div>
  );
}