'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ALLY_TEST_CARDS,
  ENEMY_TEST_CARDS,
  PLACEHOLDER_TEST_CONFIG,
  createBattle,
  getCardDef,
  step,
  type BattleAction,
  type BattleCardInstance,
  type BattlePhase,
  type BattleState,
} from '@/lib/card-battle-v1';

/** Snapshot so React sees new references after engine in-place mutation. */
function snapshot(state: BattleState): BattleState {
  return {
    ...state,
    allies: state.allies.map((c) => ({
      ...c,
      stats: { ...c.stats },
      skillIds: [...c.skillIds],
      forms: c.forms.map((f) => ({
        ...f,
        stats: { ...f.stats },
        skillIds: [...f.skillIds],
      })),
      skillPower: { ...c.skillPower },
    })),
    enemies: state.enemies.map((c) => ({
      ...c,
      stats: { ...c.stats },
      skillIds: [...c.skillIds],
      forms: c.forms.map((f) => ({
        ...f,
        stats: { ...f.stats },
        skillIds: [...f.skillIds],
      })),
      skillPower: { ...c.skillPower },
    })),
    log: [...state.log],
    pendingInject: state.pendingInject ? { ...state.pendingInject } : null,
    pendingSkill: state.pendingSkill ? { ...state.pendingSkill } : null,
    lastDamage: state.lastDamage ? { ...state.lastDamage } : null,
    lastTransform: state.lastTransform
      ? { ...state.lastTransform, skillIds: [...state.lastTransform.skillIds] }
      : null,
    rewards: state.rewards
      ? {
          ...state.rewards,
          grants: state.rewards.grants.map((g) => ({ ...g })),
        }
      : null,
    beastSlot: { ...state.beastSlot },
    config: {
      ...state.config,
      inject: { ...state.config.inject },
      transform: {
        ...state.config.transform,
        tierThresholds: [...state.config.transform.tierThresholds],
      },
      energy: { ...state.config.energy },
      team: { ...state.config.team },
      turn: { ...state.config.turn },
    },
  };
}

function startFreshBattle(): BattleState {
  const allyIds = ALLY_TEST_CARDS.map((c) => c.cardId);
  const enemyIds = ENEMY_TEST_CARDS.map((c) => c.cardId);
  let state = createBattle(allyIds, enemyIds, PLACEHOLDER_TEST_CONFIG);
  state = step(state, { type: 'start' });
  return snapshot(state);
}

function skillLabel(card: BattleCardInstance, skillId: string): string {
  const def = getCardDef(card.cardId);
  const found = def?.skillsCatalog.find((s) => s.id === skillId);
  return found?.nameZh ?? skillId;
}

function phaseLabel(phase: BattlePhase): string {
  const map: Record<BattlePhase, string> = {
    init: '初始化',
    player_action: '玩家行動',
    produce_energy: '產能',
    select_inject: '選擇注入',
    resolve_inject: '結算注入',
    check_transform: '檢查變身',
    resolve_skills: '結算技能',
    resolve_damage: '結算傷害',
    enemy_action: '敵方行動',
    resolve_status: '狀態重整',
    check_victory: '勝負判定',
    next_turn: '下一回合',
    ended: '結束',
  };
  return map[phase] ?? phase;
}

function outcomeLabel(outcome: BattleState['outcome']): string {
  if (outcome === 'victory') return '勝利';
  if (outcome === 'defeat') return '敗北';
  if (outcome === 'turn_cap') return '回合上限';
  if (outcome === 'draw') return '平手';
  return '—';
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CardTile({
  card,
  index,
  selected,
  onSelect,
  dimmed,
}: {
  card: BattleCardInstance;
  index: number;
  selected?: boolean;
  onSelect?: () => void;
  dimmed?: boolean;
}) {
  const dead = !card.alive || card.currentHp <= 0;
  const clickable = Boolean(onSelect) && !dead;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onSelect}
      className={[
        'w-full rounded-xl border px-2.5 py-2 text-left transition',
        'min-h-[44px]',
        selected
          ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
          : 'border-slate-700/80 bg-slate-900/70',
        dead || dimmed ? 'opacity-40' : '',
        clickable ? 'active:scale-[0.98]' : 'cursor-default',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-medium text-slate-100">
          {card.nameZh}
        </span>
        <span className="shrink-0 rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[11px] text-cyan-300">
          {card.element}
        </span>
      </div>
      <div className="mt-1.5">
        <HpBar current={card.currentHp} max={card.stats.hp} />
        <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
          <span>
            HP {card.currentHp}/{card.stats.hp}
          </span>
          <span>
            ATK {card.stats.atk} / DEF {card.stats.def}
          </span>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
        <span>槽{index}</span>
        <span>階{card.formTier}</span>
        <span className="truncate">{card.appearanceId}</span>
        {card.side === 'ally' && <span>注入{card.injectPoints}</span>}
      </div>
    </button>
  );
}

type UiStep = 'inject' | 'skill';

export function InjectBattleBoard() {
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [allySlot, setAllySlot] = useState(0);
  const [spend, setSpend] = useState(1);
  const [attackerIndex, setAttackerIndex] = useState(0);
  const [skillId, setSkillId] = useState<string>('');
  const [targetIndex, setTargetIndex] = useState(0);
  const [uiStep, setUiStep] = useState<UiStep>('inject');
  const [wantManualSkill, setWantManualSkill] = useState(false);

  const reset = useCallback(() => {
    const s = startFreshBattle();
    setBattle(s);
    const firstAlly = s.allies.findIndex((c) => c.alive);
    const firstEnemy = s.enemies.findIndex((c) => c.alive);
    setAllySlot(firstAlly >= 0 ? firstAlly : 0);
    setAttackerIndex(firstAlly >= 0 ? firstAlly : 0);
    setTargetIndex(firstEnemy >= 0 ? firstEnemy : 0);
    setSpend(1);
    setWantManualSkill(false);
    setUiStep('inject');
    const atk = s.allies[firstAlly >= 0 ? firstAlly : 0];
    setSkillId(atk?.skillIds[0] ?? '');
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  const maxSpend = useMemo(() => {
    if (!battle) return 1;
    const cap = battle.config.inject.maxEnergySpendPerInject;
    const byEnergy = Math.max(1, battle.energy);
    if (cap == null) return byEnergy;
    return Math.max(1, Math.min(byEnergy, cap));
  }, [battle]);

  useEffect(() => {
    if (spend > maxSpend) setSpend(maxSpend);
    if (spend < 1) setSpend(1);
  }, [maxSpend, spend]);

  useEffect(() => {
    if (!battle) return;
    const atk = battle.allies[attackerIndex];
    if (atk && atk.skillIds.length > 0 && !atk.skillIds.includes(skillId)) {
      setSkillId(atk.skillIds[0] ?? '');
    }
  }, [battle, attackerIndex, skillId]);

  const apply = useCallback((action: BattleAction) => {
    setBattle((prev) => {
      if (!prev || prev.phase === 'ended') return prev;
      return snapshot(step(prev, action));
    });
  }, []);

  const applyChain = useCallback((actions: BattleAction[]) => {
    setBattle((prev) => {
      if (!prev || prev.phase === 'ended') return prev;
      let s = prev;
      for (const a of actions) {
        if (s.phase === 'ended') break;
        s = step(s, a);
      }
      return snapshot(s);
    });
  }, []);

  const livingAllies = battle?.allies
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.alive && c.currentHp > 0) ?? [];
  const livingEnemies = battle?.enemies
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.alive && c.currentHp > 0) ?? [];

  const canInjectPhase =
    battle?.phase === 'player_action' || battle?.phase === 'select_inject';

  const needsAuto =
    battle != null &&
    battle.phase !== 'ended' &&
    battle.phase !== 'player_action' &&
    battle.phase !== 'select_inject';

  const onInject = () => {
    if (!battle || !canInjectPhase) return;
    const slot =
      livingAllies.find(({ i }) => i === allySlot)?.i ??
      livingAllies[0]?.i ??
      0;
    const spendClamped = Math.min(
      Math.max(1, spend),
      Math.min(
        battle.energy,
        battle.config.inject.maxEnergySpendPerInject ?? battle.energy,
      ),
    );
    if (spendClamped < 1 || battle.energy < 1) {
      // 能量不足時改為跳過
      onSkipInject();
      return;
    }
    const actions: BattleAction[] = [];
    if (wantManualSkill && battle.phase === 'player_action') {
      actions.push({
        type: 'choose_skill',
        attackerIndex,
        skillId: skillId || battle.allies[attackerIndex]?.skillIds[0] || 'sk_basic',
        targetIndex,
      });
    }
    actions.push({
      type: 'choose_inject',
      slotIndex: slot,
      spend: spendClamped,
    });
    applyChain(actions);
    setWantManualSkill(false);
    setUiStep('inject');
  };

  const onSkipInject = () => {
    if (!battle || !canInjectPhase) return;
    const skillAction: BattleAction | null =
      wantManualSkill && battle.phase === 'player_action'
        ? {
            type: 'choose_skill',
            attackerIndex,
            skillId:
              skillId ||
              battle.allies[attackerIndex]?.skillIds[0] ||
              'sk_basic',
            targetIndex,
          }
        : null;
    const actions: BattleAction[] = [];
    if (skillAction) {
      // choose_skill → select_inject, then skip once to finish the turn
      actions.push(skillAction, { type: 'skip_inject' });
    } else if (battle.phase === 'player_action') {
      // skip → select_inject; skip again to proceed
      actions.push({ type: 'skip_inject' }, { type: 'skip_inject' });
    } else {
      actions.push({ type: 'skip_inject' });
    }
    applyChain(actions);
    setWantManualSkill(false);
    setUiStep('inject');
  };

  const onAutoContinue = () => {
    apply({ type: 'auto_continue' });
  };

  const recentLog = battle?.log.slice(-6) ?? [];

  if (!battle) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] items-center justify-center text-slate-400">
        載入戰場…
      </div>
    );
  }

  const attacker = battle.allies[attackerIndex];

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[390px] flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-36">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold tracking-wide text-amber-300">
            注入變身・測試戰場
          </h1>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-cyan-300">
            T{battle.turn}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <span>
            相位 <span className="text-slate-200">{phaseLabel(battle.phase)}</span>
          </span>
          <span>
            能量 <span className="text-amber-300">{battle.energy}</span>
          </span>
          <span>
            結果 <span className="text-slate-200">{outcomeLabel(battle.outcome)}</span>
          </span>
        </div>
        {(battle.lastDamage || battle.lastTransform) && (
          <div className="mt-1 space-y-0.5 text-[10px] text-slate-500">
            {battle.lastDamage && (
              <p>
                傷害 {battle.lastDamage.amount}（{battle.lastDamage.skillId}）
              </p>
            )}
            {battle.lastTransform && (
              <p className="text-amber-400/90">
                變身 → 階{battle.lastTransform.newTier}{' '}
                {battle.lastTransform.appearanceId}
              </p>
            )}
          </div>
        )}
      </header>

      {/* Enemies */}
      <section className="px-3 pt-3">
        <h2 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-rose-300/80">
          敵方
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {battle.enemies.map((c, i) => (
            <CardTile
              key={c.instanceId}
              card={c}
              index={i}
              selected={canInjectPhase && wantManualSkill && targetIndex === i}
              onSelect={
                canInjectPhase && wantManualSkill
                  ? () => setTargetIndex(i)
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* Log */}
      <section className="mx-3 mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-2">
        <h2 className="mb-1 text-[11px] font-medium text-slate-500">戰報（最近 6）</h2>
        <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[10px] leading-relaxed text-slate-400">
          {recentLog.length === 0 && <li>—</li>}
          {recentLog.map((e, idx) => (
            <li key={`${e.turn}-${e.phase}-${idx}`}>
              <span className="text-slate-600">T{e.turn}</span> {e.message}
            </li>
          ))}
        </ul>
      </section>

      {/* Allies */}
      <section className="px-3 pt-3">
        <h2 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-cyan-300/80">
          友方
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {battle.allies.map((c, i) => (
            <CardTile
              key={c.instanceId}
              card={c}
              index={i}
              selected={
                canInjectPhase &&
                (uiStep === 'inject'
                  ? allySlot === i
                  : wantManualSkill && attackerIndex === i)
              }
              onSelect={
                canInjectPhase
                  ? () => {
                      if (wantManualSkill && uiStep === 'skill') {
                        setAttackerIndex(i);
                        setSkillId(c.skillIds[0] ?? '');
                      } else {
                        setAllySlot(i);
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* Ended overlay */}
      {battle.phase === 'ended' && (
        <div className="mx-3 mt-4 rounded-2xl border border-amber-500/40 bg-slate-900/90 p-4 text-center shadow-lg shadow-amber-900/20">
          <p className="text-lg font-semibold text-amber-300">
            {outcomeLabel(battle.outcome)}
          </p>
          <p className="mt-1 text-xs text-slate-400">回合 {battle.turn}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 min-h-[44px] w-full rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 px-4 text-sm font-semibold text-slate-950"
          >
            再戰
          </button>
        </div>
      )}

      {/* Sticky action bar */}
      {battle.phase !== 'ended' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="mx-auto max-w-[390px] px-3 py-2.5">
            {canInjectPhase && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    {battle.phase === 'select_inject'
                      ? '選擇注入目標與能量'
                      : '宣告本回合注入'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setWantManualSkill((v) => !v);
                      setUiStep((s) => (s === 'skill' ? 'inject' : 'skill'));
                    }}
                    className="min-h-[44px] rounded-lg px-2 text-[11px] text-cyan-400"
                  >
                    {wantManualSkill ? '技能：手動' : '技能：自動'}
                  </button>
                </div>

                {wantManualSkill && (
                  <div className="mb-2 space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <p className="text-[10px] text-slate-500">
                      點友方選攻擊者・點敵方選目標
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(attacker?.skillIds ?? []).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSkillId(id)}
                          className={[
                            'min-h-[44px] rounded-lg px-2.5 text-xs',
                            skillId === id
                              ? 'bg-amber-500/30 text-amber-200'
                              : 'bg-slate-800 text-slate-300',
                          ].join(' ')}
                        >
                          {attacker ? skillLabel(attacker, id) : id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2">
                  <span className="shrink-0 text-[11px] text-slate-500">消耗</span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {Array.from({ length: maxSpend }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSpend(n)}
                        className={[
                          'min-h-[44px] min-w-[44px] rounded-lg text-sm font-medium',
                          spend === n
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300',
                        ].join(' ')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onInject}
                    disabled={livingAllies.length === 0 || battle.energy < 1}
                    className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-sm font-semibold text-slate-950 disabled:opacity-40"
                  >
                    注入
                  </button>
                  <button
                    type="button"
                    onClick={onSkipInject}
                    className="min-h-[44px] flex-1 rounded-xl border border-slate-600 bg-slate-900 text-sm font-medium text-slate-200"
                  >
                    跳過注入
                  </button>
                </div>
              </>
            )}

            {(needsAuto || battle.phase === 'produce_energy') && (
              <button
                type="button"
                onClick={onAutoContinue}
                className="min-h-[44px] w-full rounded-xl bg-cyan-600/90 text-sm font-semibold text-white"
              >
                自動續行
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
