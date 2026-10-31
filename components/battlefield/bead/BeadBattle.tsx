'use client';
/** 寶珠戰鬥入口：先自選五張正式卡，再進三消戰場（選好的五張就是盤面下方的出戰卡列）。 */
import { useMemo, useState } from 'react';
import { BeastCardFace } from '../BeastCardTile';
import Match3Board from '../Match3Board';
import BeadFx from '@/components/motion/BeadFx';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import { getSkill } from '@/cards/skills';
import { MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL } from '@/lib/beast-game/match3';
import { TEAM_SIZE } from '@/lib/beast-game/match3/config';
import bp from './BeadPolish.module.css';
import pk from './TeamPicker.module.css';

/** 直接顯示卡檔登錄技能；此入口沒有圖鑑 Provider。 */
function pickerFace(c: ReturnType<typeof playableCards>[number]) {
  const skill = getSkill(c.skills[0]);
  return { id: c.id, name: c.name, thumbnail: c.art.thumbnail, element: c.element, skillName: skill?.name, description: skill?.description };
}

export default function BeadBattle() {
  const pool = useMemo(() => playableCards().filter((c) => CARD_FACE_STATS[c.id]), []);
  const [picked, setPicked] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  if (started) {
    return (
      <div className={`${bp.lux} ${pk.stage}`}>
        <Match3Board teamIds={picked} />
        <BeadFx />
        <button type="button" className={pk.back} onClick={() => setStarted(false)}>重新選卡</button>
      </div>
    );
  }
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= TEAM_SIZE ? p : [...p, id]));
  const byId = new Map(pool.map((c) => [c.id, c]));
  return (
    <section className={`${bp.lux} ${pk.wrap}`} data-testid="team-picker" aria-label="自選五張出戰卡">
      <header className={pk.head}>
        <h1 className={pk.title}>寶珠戰鬥</h1>
        <p className={pk.sub}>自選 {TEAM_SIZE} 張卡，消哪色珠就由該屬性的卡出手。已選 <b>{picked.length}</b> / {TEAM_SIZE}</p>
      </header>
      {MATCH3_ORB_ELEMENTS.map((el) => {
        const cards = pool.filter((c) => c.element === el);
        if (!cards.length) return null;
        return (
          <div key={el} className={pk.group}>
            <h2 className={pk.groupTitle} data-el={el}>{MATCH3_ORB_LABEL[el]}<span>{cards.length}</span></h2>
            <div className={pk.grid}>
              {cards.map((c) => {
                const on = picked.includes(c.id);
                return (
                  <button key={c.id} type="button" data-testid="pick-card" data-el={el} aria-pressed={on} className={`${pk.card} ${on ? pk.on : ''}`}
                    disabled={!on && picked.length >= TEAM_SIZE} onClick={() => toggle(c.id)} aria-label={`${c.name}，${MATCH3_ORB_LABEL[el]}屬性${on ? '，已選' : ''}`}>
                    <BeastCardFace card={pickerFace(c)} />
                    {on && <span className={pk.order}>{picked.indexOf(c.id) + 1}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className={pk.dock} data-testid="picked-row">
        <div className={pk.slots}>
          {Array.from({ length: TEAM_SIZE }, (_, i) => {
            const c = picked[i] ? byId.get(picked[i]) : null;
            return (
              <button key={i} type="button" className={pk.slot} disabled={!c} onClick={() => c && toggle(c.id)} aria-label={c ? `移除${c.name}` : `第 ${i + 1} 格空位`}>
                {c ? <BeastCardFace card={pickerFace(c)} /> : <span className={pk.empty}>{i + 1}</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className={pk.start} data-testid="start-battle" disabled={picked.length !== TEAM_SIZE} onClick={() => setStarted(true)}>
          {picked.length === TEAM_SIZE ? '開始戰鬥' : `再選 ${TEAM_SIZE - picked.length} 張`}
        </button>
      </div>
    </section>
  );
}
