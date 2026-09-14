'use client';

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { rageFusionGuide } from '@/lib/beast-game/rage-guide';
import { planTierPresentation } from '@/lib/beast-game/fusion-presentation';
import FusionEffectStage from './FusionEffectStage';
import { getProductOrbFromBrand } from '@/lib/five-element-orb-map';
import { DEMON_MATERIAL, ORB_MATERIAL } from '@/components/bazi/customer/elementOrbPalette';
import { SharedElementSealPaper } from '@/components/bazi/customer/SharedElementSealPaper';
import { CardSlot, HandZone, type BattlefieldCardArt } from './GameBattlefield';
import { VitalBar } from './BattlePanel';
import { legalDestinations, type BattleState, type Destination } from '@/lib/beast-game/battlefield';
import { legalActions, profile, RAGE_TIERS, type Action, type Match } from '@/lib/beast-game/interactive';
import { describeMatchup } from '@/lib/beast-element-guide';
import { ELEMENTS, ELEMENT_LABEL, elementMultiplier, type BeastElement } from '@/lib/beast-game/elements';
import { elementPercent } from '@/lib/beast-game/combat-guide';
import { BATTLE_VENUES } from '@/lib/beast-game/venues';
import { COMBAT_BEAT_MS } from '@/lib/beast-game/combat-presentation';
import styles from './BattleArena.module.css';
import { ELEMENT_FX, type BattleElement } from '@/lib/beast-battle-fx';
import { performedAction, isDamagingAction } from '@/lib/beast-game/combat-presentation';
import { combatChanges } from '@/lib/beast-game/combat-feedback';
import ElementMatchupGuide from './ElementMatchupGuide';
import MatchupSummary from './MatchupSummary';
import PhotonParticleEffect from './PhotonParticleEffect';
import RageComboEffect from './RageComboEffect';
import TeamRosterPanel from './TeamRosterPanel';

type FieldProps = { state: BattleState; cards: BattlefieldCardArt[] };
/** Both fighters stay above the controls. All displayed combat values come from Match. */
export default function BattleArena({ state, cards, match, onInspect, onSwap, onSkill, playing = false }: {
  playing?: boolean; cards: BattlefieldCardArt[]; onInspect: (id: string, side: 'player' | 'opponent') => void;
  quietNote?: boolean;
  onAttack?: (() => void) | null;
  onSwap?: ((action: Action) => void) | null;
  onSkill?: ((action: Action) => void) | null;
} & ({ match: Match; state?: BattleState } | { match: Match | null; state: BattleState })) {
  const lookup = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards]);
  const mine = match ? lookup.get(match.player.team[match.player.active].cardId) : lookup.get(state?.player.active ?? '');
  const foe = match ? lookup.get(match.opponent.team[match.opponent.active].cardId) : lookup.get(state?.opponent.active ?? '');
  const matchup = mine && foe ? describeMatchup(mine.element as BeastElement, foe.element as BeastElement) : null;
  const finished = match?.status === 'FINISHED' && !playing;
  const playerFighter = match?.player.team[match.player.active];
  const playerStrike = Boolean(match && match.revision > 0 && isDamagingAction(match, 'player'));
  const strikeElement = playerFighter?.element as BattleElement | undefined;
  const playerAction = match ? performedAction(match, 'player') : null;
  const guide = match ? rageFusionGuide(match, 'player') : null;
  const [guideOpen, setGuideOpen] = useState(false);
  const rageEntry = match?.log.find(entry => entry.side === 'player' && entry.action === 'RAGE');
  const castTier = rageEntry?.fusionTier && rageEntry.fusionTier !== 'NONE' ? RAGE_TIERS.find(tier => tier.tier === rageEntry.fusionTier) : undefined;
  const ultimatePlan = useMemo(() => (playing && playerAction === 'RAGE' && castTier && playerFighter
    ? planTierPresentation({ tier: castTier.tier, element: playerFighter.element as BeastElement, cardIds: [playerFighter.cardId] })
    : null), [playing, playerAction, castTier, playerFighter]);

  return (
    <section className={styles.arena} aria-label="戰鬥畫面" data-battle-visual data-playback={playing ? 'acting' : 'ready'} data-battle-revision={match?.revision} data-battle-venue="cards">
      <RageComboEffect
        active={playing && playerAction === 'RAGE' && !castTier}
        element={strikeElement}
        key={`rage-${match?.revision}`}
      />
      {ultimatePlan && <FusionEffectStage key={`ultimate-${match?.revision}`} plan={ultimatePlan} caption={castTier?.skillName} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.backdrop} src={BATTLE_VENUES.cards.image} alt="" aria-hidden="true" decoding="async" />
      <div className="sr-only">
        <strong>{finished ? '本場結束' : match ? `第 ${match.round} 回合` : '佈陣預覽'}</strong>
        <span>{BATTLE_VENUES.cards.name}・卡片戰鬥</span>
      </div>
      {playerStrike && strikeElement && <div key={`element-strike-${match?.revision}`} className={styles.elementStrike}
        data-element={strikeElement} data-skill={String(playerAction === 'SKILL')} style={{ '--element-strike': ELEMENT_FX[strikeElement].glow, '--action-delay': `${Math.max(0, match?.log.findIndex(entry => entry.side === 'player' && entry.text.includes('：')) ?? 0) * COMBAT_BEAT_MS}ms` } as CSSProperties} aria-hidden="true">
        <span className={styles.strikeField} />
        <span className={styles.strikeTrace} data-trace="one" />
        <span className={styles.strikeReadout}><b>{playerAction === 'RAGE' ? '暴怒合體' : `${ELEMENT_FX[strikeElement].label}元素攻擊`}</b></span>
      </div>}
      {/* 左手邊：對手隊伍 */}
      {match && (
        <div className={styles.rosterLeft}>
          <TeamRosterPanel
            team={match.opponent.team.map(f => ({
              id: f.cardId,
              name: f.name,
              hp: f.hp,
              maxHp: f.maxHp,
              defeated: f.defeated,
              element: f.element,
              canRage: false,
            }))}
            side="opponent"
            activeCardId={match.opponent.team[match.opponent.active]?.cardId}
          />
        </div>
      )}

      <div className={styles.fighters}>
        {(['player', 'opponent'] as const).map(side => {
          const team = match?.[side];
          const fighter = team?.team[team.active];
          const card = side === 'player' ? mine : foe;
          const label = side === 'player' ? '你' : '易經';
          const change = match && fighter ? combatChanges(match, side, fighter.cardId) : '';
          const action = match ? performedAction(match, side) : null;
          const performed = action === 'ATTACK' || action === 'SKILL' || action === 'RAGE';
          const rush = Boolean(match && isDamagingAction(match, side));
          const actionOrder = match?.log.findIndex(entry => entry.side === side && entry.cardId === card?.id) ?? -1;
          const hitOrder = match?.log.findIndex(entry => entry.changes?.some(change => change.side === side && change.cardId === card?.id && (change.hpAfter < change.hpBefore || change.shieldAfter < change.shieldBefore))) ?? -1;
          const attacker = side === 'player' ? foe : mine;
          const multiplier = card && attacker ? elementMultiplier(attacker.element as BeastElement, card.element as BeastElement) : 1;
          return (
            <div className={styles.fighter} key={side} data-fighter={side} aria-label={`${label}：${card?.name ?? '等待主戰'}`}>
              <div className={styles.artSpace} key={`${card?.id}-${match?.revision ?? 0}`} data-rush={Boolean(rush)} data-hit={hitOrder >= 0} data-skill={action === 'SKILL'} data-action={action ?? 'NONE'} data-impact={multiplier > 1 ? 'strong' : multiplier < 1 ? 'resisted' : 'normal'}
                style={{ '--strike-x': side === 'player' ? '18px' : '-18px', '--strike-y': side === 'player' ? '-26px' : '26px', '--action-delay': `${Math.max(0, actionOrder) * COMBAT_BEAT_MS}ms`, '--hit-delay': `${Math.max(0, hitOrder) * COMBAT_BEAT_MS + 200}ms`, '--element-strike': card ? ELEMENT_FX[card.element as BattleElement]?.glow : undefined } as CSSProperties}>
                <PhotonParticleEffect
                  active={performed && rush}
                  element={card?.element}
                  intensity={action === 'RAGE' ? 'heavy' : action === 'SKILL' ? 'medium' : 'light'}
                  isSkill={action === 'SKILL' || action === 'RAGE'}
                />
                <button type="button" disabled={!card || playing} aria-label={card ? `查看${card.name}的卡面與能力` : '等待主戰卡上場'} onClick={() => { if (card) onInspect(card.id, side); }}
                  className={`${styles.art} ${fighter?.defeated ? styles.defeated : ''}`}>
                  {card ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.thumbnail} alt={card.name} width={256} height={384} decoding="async" draggable={false} />
                  ) : <span className={styles.empty}>{side === 'player' ? '◎' : '☯'}</span>}
                </button>
                {action && <span className={styles.actionCue} role="status" aria-label={action === 'RAGE' ? '暴怒合體' : action === 'SKILL' ? '技能' : action === 'ATTACK' ? '攻擊' : action === 'SKIP' ? '受控' : action === 'REPLACEMENT' ? '接替' : '換卡'}>{action === 'RAGE' ? '🔥' : action === 'SKILL' ? '✦' : action === 'ATTACK' ? '⚔' : action === 'SKIP' ? '⊘' : action === 'REPLACEMENT' ? '⇄' : '⇌'}</span>}
              </div>
              {fighter && match && team && (() => {
                const hpPct = Math.max(0, Math.min(100, (fighter.hp / Math.max(1, fighter.maxHp)) * 100));
                const isCritical = hpPct <= 30 && fighter.hp > 0;
                return (
                  <div className={styles.arenaVital}>
                    <strong className={styles.liveName}>{card?.name}・{ELEMENT_LABEL[fighter.element]}</strong>
                    <div className={`${styles.arenaHpBar}${isCritical ? ` ${styles.critical}` : ''}`}>
                      <span style={{ width: `${hpPct}%` }} />
                    </div>
                    <span className={styles.arenaEnergy}>生命 {fighter.hp}/{fighter.maxHp}・氣 {team.energy}</span>
                    <span className={styles.vitalChanges}>
                      {fighter.shield > 0 && <span className={styles.liveChange}>護盾 {fighter.shield}</span>}
                      {change && <span className={styles.liveChange} data-combat-change>{change}</span>}
                    </span>
                  </div>
                );
              })()}
              {fighter && team ? (
                <p className="sr-only">{ELEMENT_LABEL[fighter.element]}・氣 {team.energy}・{team.team.filter(f => !f.defeated).length}/{team.team.length} 存活</p>
              ) : <p className="sr-only">{card ? ELEMENT_LABEL[card.element as BeastElement] : '未選'}・上場 {(state?.[side].active ? 1 : 0) + (state?.[side].bench.filter(Boolean).length ?? 0)} 隻</p>}
            </div>
          );
        })}
      </div>

      {/* 右手邊：玩家隊伍 */}
      {match && (
        <div className={styles.rosterRight}>
          <TeamRosterPanel
            team={match.player.team.map(f => ({
              id: f.cardId,
              name: f.name,
              hp: f.hp,
              maxHp: f.maxHp,
              defeated: f.defeated,
              element: f.element,
              canRage: match.status === 'PLAYING' && !guide?.used && guide?.partnerCardId === f.cardId,
            }))}
            side="player"
            activeCardId={match.player.team[match.player.active]?.cardId}
          />
        </div>
      )}

      {/* 右欄底部：相生相剋、合體進度、暴怒條與五顆帶符咒魔珠；數字全部來自戰鬥引擎。 */}
      {match && guide && (() => {
        const unsealed = guide.orbs;
        return (
          <div className={styles.orbColumn}>
            {mine && foe && (
              <MatchupSummary
                playerElement={mine.element as BeastElement}
                opponentElement={foe.element as BeastElement}
              />
            )}
            <button type="button" className={styles.fusionProgress} aria-expanded={guideOpen} data-fusion-progress
              aria-label={`暴怒合體教學：${guide.headline}`} onClick={() => setGuideOpen(open => !open)}>
              <span className={styles.fusionLights} aria-hidden="true">
                {guide.steps.map(step => <i key={step.key} data-done={step.done} />)}
              </span>
              <span className={styles.fusionProgressText}>{guide.used ? '已合體' : guide.current.skillName}</span>
              <small>怒 {guide.rage}</small>
            </button>
            <div className={styles.orbRow}>
            <span className={styles.rageMeter} role="meter" aria-label={`暴怒 ${guide.rage}/100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={guide.rage}>
              <span style={{ height: `${guide.rage}%` }} />
            </span>
            <div className={styles.orbChain} role="img" aria-label={`魔珠 ${unsealed}/${ELEMENTS.length} 已解封`} data-seal-orbs={unsealed}>
              {ELEMENTS.map((orbElement, index) => {
                const open = index < unsealed;
                const productElement = getProductOrbFromBrand(orbElement.toLowerCase() as 'space' | 'air' | 'water' | 'fire' | 'earth');
                return (
                  <span key={orbElement} className={styles.orbSlot} data-unsealed={open} data-orb={orbElement}
                    title={open ? `${productElement}寶珠` : '魔珠・封印中'}>
                    <span className={`treasure-reveal-stage ${open ? '' : 'treasure-reveal-stage--sealed'} ${styles.orbStage}`}>
                      <span className={`water-treasure-orb water-treasure-orb--${productElement} ${open ? 'water-treasure-orb--released' : 'water-treasure-orb--sealed'}`}
                        style={{ '--orb-body': (open ? ORB_MATERIAL : DEMON_MATERIAL)[productElement].color, '--orb-glow': (open ? ORB_MATERIAL : DEMON_MATERIAL)[productElement].emissive } as CSSProperties}>
                        {!open && <span className="water-treasure-seal-aura" />}
                        {!open && <SharedElementSealPaper />}
                        <span className={styles.orbBody} data-open={open} />
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
            </div>
          </div>
        );
      })()}

      {match && guide && guideOpen && (
        <div className={styles.rageGuidePanel} role="dialog" aria-label="暴怒合體怎麼用" data-rage-guide>
          <div className={styles.rageGuideHead}>
            <strong>暴怒合體怎麼用</strong>
            <button type="button" onClick={() => setGuideOpen(false)} aria-label="關閉教學">✕</button>
          </div>
          <p className={styles.rageGuideHeadline}>{guide.headline}</p>
          <ol className={styles.rageGuideSteps}>
            {guide.steps.map((step, index) => (
              <li key={step.key} data-done={step.done}>
                <span className={styles.rageStepMark} aria-hidden="true">{step.done ? '✓' : index + 1}</span>
                <span><b>{step.label}</b><em>{step.value}</em><small>{step.hint}</small></span>
              </li>
            ))}
          </ol>
          <ul className={styles.rageLadder} aria-label="合體等級">
            {guide.ladder.map(row => (
              <li key={row.tier} data-current={row.current} data-reached={row.reached}>
                <b>{row.skillName}</b>
                <span>{row.orbs ? `${row.orbs} 顆寶珠・暴怒 ${row.rage}` : '有相生卡即可'}</span>
                <em>攻+{row.bonus}{row.breaksShield ? '・破盾' : ''}</em>
              </li>
            ))}
          </ul>
        </div>
      )}
      {match?.status === 'PLAYING' && (onSwap !== undefined || onSkill !== undefined) && (() => {
        const acts = legalActions(match, 'player');
        const switches = onSwap !== undefined ? acts.filter((a): a is Extract<Action, { type: 'SWITCH' }> => a.type === 'SWITCH') : [];
        const skillAct = acts.find(a => a.type === 'SKILL');
        const activeFighter = match.player.team[match.player.active];
        const skillProf = profile(activeFighter.cardId);
        const showSkill = onSkill !== undefined;
        const showSwap = onSwap !== undefined && switches.length > 0;
        if (!showSkill && !showSwap) return null;
        return (
          <div className={styles.sideSwap} aria-label="左側換卡與技能">
            {showSwap && <p className={styles.sideSwapLabel} role="note">換卡</p>}
            {showSkill && (
              <button type="button" className={styles.sideSkillBtn}
                disabled={playing || !onSkill || !skillAct}
                aria-label={`技能 ${skillProf.skillName}`}
                onClick={() => { if (onSkill && skillAct) onSkill(skillAct); }}>
                <span aria-hidden="true">✦</span>
                <span>{activeFighter.cooldown > 0 ? `冷${activeFighter.cooldown}` : `⚡${skillProf.cost}`}</span>
              </button>
            )}
            {showSwap && switches.map(action => {
              const fighter = match.player.team[action.index];
              const art = cards.find(c => c.id === fighter.cardId);
              return (
                <button key={fighter.instanceId} type="button"
                  className={styles.swapCard} disabled={playing}
                  aria-label={`換卡上場：${fighter.name}`}
                  onClick={() => { if (onSwap) onSwap(action); }}>
                  <em className={styles.swapTag} aria-hidden="true">換</em>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {art && <img src={art.thumbnail} alt="" draggable={false} />}
                  <span>{fighter.name}</span>
                  <small>{fighter.hp}/{fighter.maxHp}</small>
                </button>
              );
            })}
          </div>
        );
      })()}
      <p className="sr-only" role="status" aria-live="polite" data-matchup={matchup?.kind}>
        {playing ? '▶' : finished ? (match.winner === 'player' ? '◎' : match.winner === 'opponent' ? '✕' : '＝')
          : match?.player.team[match.player.active].defeated ? '⬇'
          : match?.opponent.team[match.opponent.active].defeated ? '▶'
          : matchup?.kind === 'ADVANTAGE' ? `▲ ${elementPercent(mine!.element as BeastElement, foe!.element as BeastElement)}`
          : matchup?.kind === 'DISADVANTAGE' ? `▼ ${elementPercent(mine!.element as BeastElement, foe!.element as BeastElement)}`
          : matchup && mine && foe ? `◉ ${elementPercent(mine.element as BeastElement, foe.element as BeastElement)}` : '◉'}
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
