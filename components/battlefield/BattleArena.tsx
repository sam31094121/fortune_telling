'use client';

import { useCallback, useMemo } from 'react';
import { CardSlot, HandZone, type BattlefieldCardArt } from './GameBattlefield';
import { VitalBar } from './BattlePanel';
import { legalDestinations, type BattleState, type Destination } from '@/lib/beast-game/battlefield';
import type { Match } from '@/lib/beast-game/interactive';
import { describeMatchup } from '@/lib/beast-element-guide';
import { ELEMENT_LABEL, type BeastElement } from '@/lib/beast-game/elements';
import { combatGuideFor, elementPercent } from '@/lib/beast-game/combat-guide';
import { BATTLE_VENUES } from '@/lib/beast-game/venues';
import styles from './BattleArena.module.css';

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

  return (
    <section className={styles.arena} aria-label="戰鬥畫面" data-battle-visual data-battle-venue="cards">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.backdrop} src={BATTLE_VENUES.cards.image} alt="" aria-hidden="true" decoding="async" />
      <div className={styles.arenaHeading}>
        <strong>{finished ? '本場結束' : match ? `第 ${match.round} 回合` : '佈陣預覽'}</strong>
        <span>{BATTLE_VENUES.cards.name}・卡片戰鬥</span>
      </div>
      <div className={styles.fighters}>
        {(['player', 'opponent'] as const).map(side => {
          const team = match?.[side];
          const fighter = team?.team[team.active];
          const card = side === 'player' ? mine : foe;
          const guide = card ? combatGuideFor(card.id, fighter) : null;
          const label = side === 'player' ? '你' : '對手';
          return (
            <div className={styles.fighter} key={side} data-fighter={side}>
              <div className={styles.fighterHeading}>
                <p className={styles.fighterName}><span>{label}</span><strong>{card?.name ?? '等待主戰'}</strong></p>
                {guide && <p className={styles.fighterIdentity}><strong>{guide.elementLabel}系・{guide.role}型</strong><span>{guide.guardian}・{guide.form}</span></p>}
              </div>
              <div className={styles.artSpace}>
                <button type="button" disabled={!card} aria-label={card ? `查看${card.name}的能力與相剋` : '等待主戰卡上場'} onClick={() => card && onInspect(card.id, side)}
                  key={`${card?.id}-${match?.revision ?? 0}`} className={`${styles.art} ${fighter?.defeated ? styles.defeated : ''} ${match?.revision && match.log.some(entry => entry.side === side) ? styles.acted : ''}`}>
                  {card ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.thumbnail} alt={`${label}主戰：${card.name}`} draggable={false} />
                  ) : <span className={styles.empty}>主戰卡<br />等待上場</span>}
                  {card && <span className={styles.inspectLabel}>能力／相剋 ↗</span>}
                </button>
              </div>
              {fighter && team ? (
                <div className={styles.fighterVitals}>
                  <VitalBar hp={fighter.hp} maxHp={fighter.maxHp} shield={fighter.shield} />
                  <p>{ELEMENT_LABEL[fighter.element]}・氣 {team.energy}<span>{team.team.filter(f => !f.defeated).length}/{team.team.length} 存活</span></p>
                </div>
              ) : <p className={styles.previewStats}>{card ? ELEMENT_LABEL[card.element as BeastElement] : '未選'}・上場 {(state?.[side].active ? 1 : 0) + (state?.[side].bench.filter(Boolean).length ?? 0)} 隻</p>}
            </div>
          );
        })}
        <span className={styles.versus} aria-hidden="true">VS</span>
      </div>
      <p className={styles.arenaNote} role="status" data-matchup={matchup?.kind}>
        {finished ? (match.winner === 'player' ? '你贏了' : match.winner === 'opponent' ? '對手獲勝' : '平手')
          : match?.player.team[match.player.active].defeated ? '主戰已倒下，請在下方換上後備'
          : matchup && mine && foe ? `${matchup.headline}・攻擊元素 ${elementPercent(mine.element as BeastElement, foe.element as BeastElement)}` : '先在下方選一張手牌，再點主戰格'}
      </p>
    </section>
  );
}

/** Tap-to-place controls share the same legal destinations as the original table. */
export function PreparationControls({ state, cards, onSelect, onDestination, onInspect }: FieldProps & {
  onSelect: (id: string) => void; onDestination: (to: Destination) => void; onInspect: (id: string) => void;
}) {
  const lookup = useMemo(() => {
    const map = new Map(cards.map(card => [card.id, card]));
    return (id: string) => map.get(id);
  }, [cards]);
  const selected = state.selectedCardId;
  const inspectId = selected ?? state.player.active;
  const legal = useMemo(() => selected ? legalDestinations(state, 'PLAYER', selected) : [], [state, selected]);
  const destinations = useMemo<Destination[]>(() =>
    [{ zone: 'ACTIVE' }, ...state.player.bench.map((_, slotIndex) => ({ zone: 'BENCH' as const, slotIndex }))]
  , [state.player.bench]);

  return (
    <section className={styles.preparation} aria-label="選卡與放牌">
      <p className={styles.selectionHint} role="status">{selected ? `已選 ${lookup(selected)?.name}，點亮格放入` : `① 點手牌　② 點主戰或後備格（最多 5 隻後備）`}</p>
      <div className={styles.destinations}>
        {destinations.map((to, idx) => {
          const id = to.zone === 'ACTIVE' ? state.player.active : to.zone === 'BENCH' ? state.player.bench[to.slotIndex] : null;
          const label = to.zone === 'ACTIVE' ? '主戰' : to.zone === 'BENCH' ? `後備 ${to.slotIndex + 1}` : '';
          const allowed = legal.some(d => d.zone === to.zone && (d.zone !== 'BENCH' || (to.zone === 'BENCH' && d.slotIndex === to.slotIndex)));
          return (
            <div className={styles.destination} key={`${to.zone}-${to.zone === 'BENCH' ? to.slotIndex : 'active'}`}>
              <span>{label}</span>
              <CardSlot card={id ? lookup(id) : undefined} selected={Boolean(id && id === selected)} legalTarget={allowed}
                label={`你的${label}：${id ? lookup(id)?.name : '空格'}`}
                onClick={() => { if (allowed) onDestination(to); else if (id) onSelect(id); }} />
            </div>
          );
        })}
      </div>
      <div className={styles.handHeading}><strong>你的手牌・{state.player.hand.length}</strong><span>牌庫 {state.player.deck.length}・棄牌 {state.player.discard.length}</span></div>
      <HandZone hand={state.player.hand} lookup={lookup} selectedCardId={selected} onCard={onSelect} />
      {inspectId && <button type="button" className={styles.selectedInfo} onClick={() => onInspect(inspectId)}>查看{lookup(inspectId)?.name}的類型、能力與相剋 →</button>}
    </section>
  );
}
