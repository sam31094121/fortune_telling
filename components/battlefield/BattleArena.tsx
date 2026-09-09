'use client';

import { memo, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { CardSlot, HandZone, type BattlefieldCardArt } from './GameBattlefield';
import { VitalBar } from './BattlePanel';
import { legalDestinations, type BattleState, type Destination } from '@/lib/beast-game/battlefield';
import { profile, type Match } from '@/lib/beast-game/interactive';
import { describeMatchup } from '@/lib/beast-element-guide';
import { ELEMENT_LABEL, type BeastElement } from '@/lib/beast-game/elements';
import { elementPercent } from '@/lib/beast-game/combat-guide';
import { BATTLE_VENUES } from '@/lib/beast-game/venues';
import styles from './BattleArena.module.css';
import { ELEMENT_FX, type BattleElement } from '@/lib/beast-battle-fx';

type FieldProps = { state: BattleState; cards: BattlefieldCardArt[] };

/** Both fighters stay above the controls. All displayed combat values come from Match. */
export default function BattleArena({ state, cards, match, onInspect }: {
  cards: BattlefieldCardArt[]; onInspect: (id: string, side: 'player' | 'opponent') => void;
} & ({ match: Match; state?: BattleState } | { match: Match | null; state: BattleState })) {
  const lookup = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards]);
  const mine = match ? lookup.get(match.player.team[match.player.active].cardId) : lookup.get(state?.player.active ?? '');
  const foe = match ? lookup.get(match.opponent.team[match.opponent.active].cardId) : lookup.get(state?.opponent.active ?? '');
  const matchup = mine && foe ? describeMatchup(mine.element as BeastElement, foe.element as BeastElement) : null;
  const finished = match?.status === 'FINISHED';
  const lastPlayerAction = match?.history?.at(-1)?.player;
  const playerFighter = match?.player.team[match.player.active];
  const playerStrike = Boolean(match && match.revision > 0 && playerFighter && (
    lastPlayerAction?.type === 'ATTACK'
    || (lastPlayerAction?.type === 'SKILL' && profile(playerFighter.cardId).effects.some(effect => effect.type === 'DAMAGE' && effect.target === 'ENEMY'))
  ));
  const strikeElement = playerFighter?.element as BattleElement | undefined;

  return (
    <section className={styles.arena} aria-label="戰鬥畫面" data-battle-visual data-battle-venue="cards">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.backdrop} src={BATTLE_VENUES.cards.image} alt="" aria-hidden="true" decoding="async" />
      <div className="sr-only">
        <strong>{finished ? '本場結束' : match ? `第 ${match.round} 回合` : '佈陣預覽'}</strong>
        <span>{BATTLE_VENUES.cards.name}・卡片戰鬥</span>
      </div>
      {playerStrike && strikeElement && <div key={`element-strike-${match?.revision}`} className={styles.elementStrike}
        data-element={strikeElement} style={{ '--element-strike': ELEMENT_FX[strikeElement].glow } as CSSProperties} aria-hidden="true">
        <span className={styles.strikeField} />
        <span className={styles.strikeTrace} data-trace="one" />
        <span className={styles.strikeReadout}><b>{ELEMENT_FX[strikeElement].label}元素攻擊</b><small>ENERGY LOCK・命中同步</small></span>
      </div>}
      <div className={styles.fighters}>
        {(['player', 'opponent'] as const).map(side => {
          const team = match?.[side];
          const fighter = team?.team[team.active];
          const card = side === 'player' ? mine : foe;
          const label = side === 'player' ? '你' : '對手';
          const lastAction = match?.history?.at(-1)?.[side];
          const performed = Boolean(card && match?.log.some(entry => entry.side === side && entry.cardId === card.id && entry.text.includes('：')));
          const rush = performed && (lastAction?.type === 'ATTACK' || (lastAction?.type === 'SKILL' && card && profile(card.id).effects.some(effect => effect.type === 'DAMAGE' && effect.target === 'ENEMY')));
          return (
            <div className={styles.fighter} key={side} data-fighter={side} aria-label={`${label}：${card?.name ?? '等待主戰'}`}>
              <div className={styles.artSpace} key={`${card?.id}-${match?.revision ?? 0}`} data-rush={Boolean(rush)} style={{ '--rush-direction': side === 'player' ? 1 : -1, '--trail-art': card ? `url("${card.thumbnail}")` : 'none' } as CSSProperties}>
                {rush && [0, 1, 2].map(index => <span key={index} className={styles.trail} aria-hidden="true" style={{ '--trail-index': index } as CSSProperties} />)}
                <button type="button" disabled={!card} aria-label={card ? `查看${card.name}的卡面與能力` : '等待主戰卡上場'} onClick={() => card && onInspect(card.id, side)}
                  className={`${styles.art} ${fighter?.defeated ? styles.defeated : ''}`}>
                  {card ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.thumbnail} alt={`${label}主戰：${card.name}`} width={256} height={384} decoding="async" draggable={false} />
                  ) : <span className={styles.empty}>主戰卡<br />等待上場</span>}
                </button>
                {fighter && team && (
                  <div className={styles.fighterVitals} aria-hidden="true">
                    <p className={styles.fighterName}><span>{label}</span><strong>{card?.name}</strong></p>
                    <VitalBar hp={fighter.hp} maxHp={fighter.maxHp} shield={fighter.shield} />
                  </div>
                )}
              </div>
              {fighter && team ? (
                <p className="sr-only">{ELEMENT_LABEL[fighter.element]}・氣 {team.energy}・{team.team.filter(f => !f.defeated).length}/{team.team.length} 存活</p>
              ) : <p className="sr-only">{card ? ELEMENT_LABEL[card.element as BeastElement] : '未選'}・上場 {(state?.[side].active ? 1 : 0) + (state?.[side].bench.filter(Boolean).length ?? 0)} 隻</p>}
            </div>
          );
        })}
      </div>
      <p className={styles.arenaNote} role="status" aria-live="polite" data-matchup={matchup?.kind}>
        {finished ? (match.winner === 'player' ? '你贏了' : match.winner === 'opponent' ? '對手獲勝' : '平手')
          : match?.player.team[match.player.active].defeated ? '主戰已倒下，請在下方換上後備'
          : match?.opponent.team[match.opponent.active].defeated ? '對手主戰已倒下，請點繼續讓後備上場'
          : matchup && mine && foe ? `${matchup.headline}・攻擊元素 ${elementPercent(mine.element as BeastElement, foe.element as BeastElement)}` : '先在下方選一張手牌，再點主戰格'}
      </p>
    </section>
  );
}

/** Tap-to-place controls share the same legal destinations as the original table. */
export const PreparationControls = memo(function PreparationControls({ state, cards, onSelect, onDestination, onInspect }: FieldProps & {
  onSelect: (id: string) => void; onDestination: (to: Destination) => void; onInspect: (id: string) => void;
}) {
  const lookup = useMemo(() => {
    const map = new Map(cards.map(card => [card.id, card]));
    return (id: string) => map.get(id);
  }, [cards]);
  const selected = state.selectedCardId;
  const placement = useRef<HTMLDivElement>(null);
  const inspectId = selected ?? state.player.active;
  const hasEmptyBench = state.player.bench.some(id => !id);
  const legal = useMemo(() => selected ? legalDestinations(state, 'PLAYER', selected) : [], [state, selected]);
  const destinations = useMemo<Destination[]>(() =>
    [{ zone: 'ACTIVE' }, ...state.player.bench.map((_, slotIndex) => ({ zone: 'BENCH' as const, slotIndex }))]
  , [state.player.bench]);
  useEffect(() => {
    if (!selected) return;
    const frame = requestAnimationFrame(() => {
      const target = placement.current;
      target?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      target?.querySelector<HTMLButtonElement>('[data-place-active]')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);

  return (
    <section className={styles.preparation} aria-label="選卡與放牌" tabIndex={-1} data-needs-main={!selected && !state.player.active}>
      <p className={styles.selectionHint} role="status" aria-live="polite">{
        selected
          ? `已選 ${lookup(selected)?.name}，請選擇調整位置`
          : !state.player.active
            ? '點一張手牌，直接放入主戰'
            : hasEmptyBench
              ? '點手牌，依序補入後備'
              : '陣容已滿；點已上場卡可調整位置'
      }</p>
      <div className={styles.handHeading}><strong>你的手牌・{state.player.hand.length}</strong><span className={styles.deckInfo}>牌庫 {state.player.deck.length}・棄牌 {state.player.discard.length}</span></div>
      <HandZone hand={state.player.hand} lookup={lookup} selectedCardId={selected} onCard={onSelect} showNames tapOnly />
      <div ref={placement} className={styles.placement}>
      {selected && <div className={styles.placeActions} data-guide-place={!state.player.active}>
        {legal.some(to => to.zone === 'ACTIVE') && <button type="button" data-place-active onClick={() => onDestination({ zone: 'ACTIVE' })}>{!state.player.active && <span className={styles.stepMarker} aria-hidden="true">②</span>}{state.player.active ? '換為主戰' : '放入主戰'}</button>}
        <button type="button" onClick={() => onInspect(selected)}>卡面與能力</button>
      </div>}
      <p className={styles.selectionHint}>{selected ? '點下方主戰或後備位置完成調整' : '目前陣容・點已上場的卡可調整'}</p>
      <div className={styles.destinations}>
        {destinations.map((to, idx) => {
          const id = to.zone === 'ACTIVE' ? state.player.active : to.zone === 'BENCH' ? state.player.bench[to.slotIndex] : null;
          const label = to.zone === 'ACTIVE' ? '主戰' : to.zone === 'BENCH' ? `後備 ${to.slotIndex + 1}` : '';
          const allowed = legal.some(d => d.zone === to.zone && (d.zone !== 'BENCH' || (to.zone === 'BENCH' && d.slotIndex === to.slotIndex)));
          return (
            <div className={styles.destination} key={`${to.zone}-${to.zone === 'BENCH' ? to.slotIndex : 'active'}`}>
              <span>{label}</span>
              <CardSlot card={id ? lookup(id) : undefined} selected={Boolean(id && id === selected)} legalTarget={allowed}
                label={`你的${label}：${id ? lookup(id)?.name : '空格'}${allowed ? '・可放牌' : id ? '・已放卡' : ''}`}
                onClick={() => { if (allowed) onDestination(to); else if (id) onSelect(id); }} />
              <small>{allowed ? '放入' : id ? '已上場' : '空位'}</small>
            </div>
          );
        })}
      </div>
      </div>
      {inspectId && !selected && <button type="button" className={styles.selectedInfo} onClick={() => onInspect(inspectId)}>查看{lookup(inspectId)?.name}的卡面與能力 →</button>}
    </section>
  );
});
