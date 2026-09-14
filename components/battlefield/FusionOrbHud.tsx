'use client';

/**
 * 封印寶珠 × 暴怒合體｜手機 HUD
 * 右下暴怒核心 + 五珠外圈 + 底部雙卡相生提示 + 長按儀式。
 * 動畫只用 transform/opacity，結束必清 timer。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import styles from './FusionOrbHud.module.css';
import {
  FUSION_TIER_LABEL,
  type FusionCard,
} from '@/lib/beast-game/fusion';
import {
  beginFusionRitual,
  buildFusionHudModel,
  castUltimate,
  createFusionSession,
  gainOrbs,
  gainRage,
  setFusionPair,
  tickFusionCooldown,
  type FusionSession,
} from '@/lib/beast-game/fusion-session';
import { planFusionPresentation, type FusionPresentationPlan } from '@/lib/beast-game/fusion-presentation';
import FusionEffectStage from './FusionEffectStage';

type Props = {
  cardA: FusionCard | null;
  cardB: FusionCard | null;
  bothAlive?: boolean;
  controlled?: boolean;
  bossSealActive?: boolean;
  /** 外部可注入珠／怒（例如關卡掉落）；未給則 HUD 內建演示計量 */
  orbs?: number;
  rage?: number;
  onFusionActive?: (session: FusionSession) => void;
  onUltimate?: (skillId: string, session: FusionSession) => void;
  /** 珠數變動時通知外層；戰場右側的五顆連珠跟這裡同一份數字。 */
  onOrbsChange?: (orbs: number) => void;
};

export default function FusionOrbHud({
  cardA,
  cardB,
  bothAlive = true,
  controlled = false,
  bossSealActive = false,
  orbs,
  rage,
  onFusionActive,
  onUltimate,
  onOrbsChange,
}: Props) {
  const [session, setSession] = useState<FusionSession>(() => createFusionSession());
  const holdTimer = useRef<number | null>(null);
  const holdStarted = useRef(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [ceremonyNote, setCeremonyNote] = useState('');
  const [presentation, setPresentation] = useState<FusionPresentationPlan | null>(null);
  const raf = useRef<number | null>(null);

  // sync pair + optional external meters
  useEffect(() => {
    setSession((prev) => {
      let next = setFusionPair(prev, cardA, cardB, { bothAlive, controlled, bossSealActive });
      if (typeof orbs === 'number') next = { ...next, orbs };
      if (typeof rage === 'number') next = { ...next, rage };
      return next;
    });
  }, [cardA, cardB, bothAlive, controlled, bossSealActive, orbs, rage]);

  useEffect(() => { onOrbsChange?.(session.orbs); }, [session.orbs, onOrbsChange]);

  const model = useMemo(() => buildFusionHudModel(session), [session]);

  const clearHold = useCallback(() => {
    if (holdTimer.current != null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setHoldProgress(0);
  }, []);

  useEffect(() => () => clearHold(), [clearHold]);

  const startHold = () => {
    if (!model.canLongPress || model.longPressMs <= 0) return;
    clearHold();
    holdStarted.current = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - holdStarted.current) / model.longPressMs);
      setHoldProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    holdTimer.current = window.setTimeout(() => {
      clearHold();
      const skip = session.ceremonySkipsUnlocked;
      setCeremonyNote(skip ? '略過儀式・直接合體' : session.orbs >= 5 ? '五珠升起・太極反轉' : session.orbs >= 3 ? '第三封印解除・真・合體' : '雙珠相吸・合體核心成形');
      setSession((prev) => {
        const next = beginFusionRitual(prev, skip);
        const plan = planFusionPresentation(next);
        if (plan) setPresentation(plan);
        onFusionActive?.(next);
        return next;
      });
    }, model.longPressMs);
  };

  const demoGain = () => {
    setSession((prev) => gainRage(gainOrbs(prev, 1), 20));
  };

  return (
    <section className={styles.hud} aria-label="封印寶珠與暴怒合體" data-fusion-hud data-tier={model.evaluation?.tier ?? 'NONE'} data-rage-stage={model.evaluation?.rageStage ?? 'CALM'}>
      <div className={styles.pairRow} role="group" aria-label="合體候選">
        <div className={styles.cardChip} data-empty={!cardA}>
          <strong>{cardA?.name ?? '主戰'}</strong>
          <span>{cardA?.element ?? '—'}</span>
        </div>
        <div className={`${styles.link} ${model.energyLine ? styles.linkOn : styles.linkOff}`} aria-hidden="true" />
        <div className={styles.cardChip} data-empty={!cardB}>
          <strong>{cardB?.name ?? '後備'}</strong>
          <span>{cardB?.element ?? '—'}</span>
        </div>
      </div>

      <p className={styles.status} role="status">
        {model.incompatible ? '無法合體：缺少相生或羈絆' : model.energyLine ? `共鳴成立・${model.tierLabel}` : model.tierLabel}
      </p>
      {model.blockers.length > 0 && !model.incompatible && (
        <p className={styles.blockers}>{model.blockers.join('・')}</p>
      )}

      <div className={styles.coreWrap}>
        {/* 五顆連珠已移到戰場右欄最右側，這裡不重複顯示。 */}
        {false && (
          <div className={styles.orbRing} aria-label={`封印寶珠 ${session.orbs} / 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={styles.orb} data-lit={i < session.orbs ? '1' : '0'} style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        )}
        <div className={styles.rageCore} data-stage={model.evaluation?.rageStage ?? 'CALM'} aria-label={`暴怒 ${session.rage}%`}>
          <b>{session.rage}</b>
          <small>RAGE</small>
        </div>
      </div>

      <button
        type="button"
        className={styles.fusionBtn}
        disabled={!model.canLongPress}
        aria-label={model.actionLabel}
        data-hold={holdProgress > 0 ? '1' : '0'}
        style={{ ['--hold']: String(holdProgress) } as CSSProperties}
        onPointerDown={(e) => { e.preventDefault(); startHold(); }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
      >
        <span className={styles.holdFill} style={{ transform: `scaleX(${holdProgress})` }} />
        <strong>{model.actionLabel}</strong>
        {model.longPressMs > 0 && <small>長按 {(model.longPressMs / 1000).toFixed(1)} 秒</small>}
      </button>

      {model.ultimates.length > 0 && (
        <div className={styles.ultimates} role="group" aria-label="合體絕招">
          {model.ultimates.map((u) => (
            <button
              key={u.id}
              type="button"
              className={styles.ultBtn}
              disabled={session.state !== 'ULTIMATE_READY' && session.state !== 'FUSION_ACTIVE' && session.state !== 'ULTIMATE_CASTING'}
              onClick={() => {
                setSession((prev) => {
                  let next = prev;
                  if (prev.state === 'FUSION_ACTIVE') {
                    // allow climb to ultimate ready via begin path already set
                    next = { ...prev, state: 'ULTIMATE_READY' as const };
                  }
                  next = castUltimate(next, u.id);
                  const plan = planFusionPresentation(next);
                  if (plan) setPresentation(plan);
                  onUltimate?.(u.id, next);
                  return tickFusionCooldown(next);
                });
                setCeremonyNote(`${u.label}・施放`);
              }}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}

      {ceremonyNote && <p className={styles.ceremony} role="status">{ceremonyNote}</p>}

      {/* 工程師預覽：無外部計量時可手動累珠，方便本機驗相生門檻 */}
      {orbs == null && (
        <button type="button" className={styles.demo} onClick={demoGain}>
          試加 1 珠＋20 暴怒（僅預覽）
        </button>
      )}
      <FusionEffectStage plan={presentation} onDone={() => setPresentation(null)} />
    </section>
  );
}
