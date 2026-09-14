'use client';

/**
 * 合體全螢幕舞台：只播 EffectComposer 挑出的素材（前端不重算）。
 * 音效時序只吃 ritualAudioTimeline()；視覺分鏡對齊同一套 Ritual 節拍。
 * 禁止 DOM shake；ICE／PORTAL 空類由 composer 已跳過。
 */

import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import RageComboEffect from './RageComboEffect';
import styles from './FusionEffectStage.module.css';
import type { FusionPresentationPlan } from '@/lib/beast-game/fusion-presentation';
import {
  ritualAudioTimeline,
  shouldShowRageStage,
} from '@/lib/beast-game/fusion-presentation';
import type { BattleAsset, BattleAssetCategory } from '@/lib/beast-game/battle-assets';
import { createSoundPlayer } from '@/lib/beast-battle-fx';

type Props = {
  plan: FusionPresentationPlan | null;
  onDone?: () => void;
  caption?: string;
};

type BeatPhase = 'charge' | 'collision' | 'fusion' | 'rage' | 'finish' | 'fx';

/** 與 fusion-presentation ritualAudioTimeline 的 PHASE_SLOT_MS 對齊（視覺用，不另寫音效時序） */
const PHASE_SLOT: Record<Exclude<BeatPhase, 'fx'>, number> = {
  charge: 0,
  collision: 0.22,
  fusion: 0.42,
  rage: 0.58,
  finish: 0.78,
};

function phaseOf(category: BattleAssetCategory): BeatPhase {
  switch (category) {
    case 'CHARGE':
    case 'ORB':
    case 'CARD_AURA':
      return 'charge';
    case 'COLLISION':
      return 'collision';
    case 'FUSION':
    case 'ELEMENT':
    case 'FIRE':
    case 'WIND':
    case 'EARTH':
    case 'LIGHTNING':
    case 'VOID':
    case 'PARTICLE':
    case 'DEBRIS':
      return 'fusion';
    case 'RAGE':
    case 'ULTIMATE':
    case 'SHOCKWAVE':
    case 'FLASH':
      return 'rage';
    case 'FINISH':
    case 'BACKGROUND':
      return 'finish';
    default:
      return 'fx';
  }
}

function phaseLabel(phase: BeatPhase): string {
  switch (phase) {
    case 'charge': return '蓄力';
    case 'collision': return '碰撞';
    case 'fusion': return '合體';
    case 'rage': return '暴怒';
    case 'finish': return '終結';
    default: return '演出';
  }
}

function isVisualAsset(asset: BattleAsset): boolean {
  if (asset.category === 'AUDIO') return false;
  if (asset.category === 'SCREEN_SHAKE') return false;
  return true;
}

function isImageMedia(asset: BattleAsset): boolean {
  return asset.kind === 'MEDIA' && ['WEBP', 'PNG', 'JPG', 'SVG'].includes(asset.type);
}

const PHASE_FLOW: BeatPhase[] = ['charge', 'collision', 'fusion', 'rage', 'finish'];

const FusionEffectStage = memo(function FusionEffectStage({ plan, onDone, caption }: Props) {
  const [alive, setAlive] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);

  const visuals = useMemo(() => {
    if (!plan) return [] as BattleAsset[];
    const list = plan.assets.filter(isVisualAsset);
    const rank = (p: BeatPhase) => {
      const i = PHASE_FLOW.indexOf(p);
      return i < 0 ? 99 : i;
    };
    return [...list].sort((a, b) => {
      const pa = phaseOf(a.category);
      const pb = phaseOf(b.category);
      if (rank(pa) !== rank(pb)) return rank(pa) - rank(pb);
      if (a.intensity !== b.intensity) return a.intensity - b.intensity;
      return a.assetId.localeCompare(b.assetId);
    });
  }, [plan]);

  useEffect(() => {
    if (!plan) {
      setAlive(false);
      setBeatIndex(0);
      return;
    }
    setAlive(true);
    setBeatIndex(0);

    const player = createSoundPlayer();
    const timers: number[] = [];

    for (const beat of ritualAudioTimeline(plan)) {
      timers.push(window.setTimeout(() => {
        player.play(beat.path, beat.volume, 1);
      }, beat.at));
    }

    const byPhase = new Map<BeatPhase, number[]>();
    visuals.forEach((asset, index) => {
      const p = phaseOf(asset.category);
      const arr = byPhase.get(p) ?? [];
      arr.push(index);
      byPhase.set(p, arr);
    });

    for (const phase of PHASE_FLOW) {
      const indexes = byPhase.get(phase);
      if (!indexes || indexes.length === 0) continue;
      const base = Math.round(plan.stageMs * PHASE_SLOT[phase]);
      const span = Math.max(120, Math.round(plan.stageMs * 0.16));
      indexes.forEach((visualIndex, i) => {
        const at = Math.min(
          plan.stageMs - 40,
          base + (indexes.length === 1 ? 0 : Math.round((span * i) / Math.max(indexes.length - 1, 1))),
        );
        if (visualIndex === 0 && at === 0) return;
        timers.push(window.setTimeout(() => setBeatIndex(visualIndex), Math.max(0, at)));
      });
    }

    timers.push(window.setTimeout(() => {
      setAlive(false);
      onDone?.();
    }, plan.stageMs));

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      player.dispose();
    };
  }, [plan, onDone, visuals]);

  if (!plan || !alive) return null;

  const showRage = shouldShowRageStage(plan);
  const active = visuals[beatIndex] ?? visuals[0] ?? null;
  const phase = active ? phaseOf(active.category) : 'fx';

  const title =
    caption
    ?? (plan.tier === 'RAGE_ULTIMATE' ? '暴怒究極合體'
      : plan.tier === 'TRUE_FUSION' ? '真・合體'
      : plan.tier === 'DUAL_UNSEAL' ? '雙封印解除'
      : plan.tier === 'RESONANCE' ? '共鳴合體'
      : '封印合體');

  return (
    <div
      className={styles.stage}
      data-fusion-stage
      data-tier={plan.tier}
      data-phase={phase}
      data-beat={beatIndex}
      data-asset-ids={plan.assets.map((a) => a.assetId).join(',')}
      aria-hidden="true"
    >
      <div className={styles.backdrop} />
      <div className={styles.flash} data-intensity={active?.intensity ?? 3} />

      {showRage && (phase === 'rage' || phase === 'finish' || plan.tier === 'RAGE_ULTIMATE') && (
        <RageComboEffect active element={plan.element ?? 'SPACE'} />
      )}

      <div className={styles.storyboard} data-storyboard>
        {visuals.map((asset, index) => {
          const on = index === beatIndex;
          const p = phaseOf(asset.category);
          return (
            <div
              key={asset.assetId}
              className={styles.beat}
              data-on={on ? '1' : '0'}
              data-phase={p}
              data-kind={asset.kind}
              data-category={asset.category}
              data-evidence={asset.evidence ?? ''}
              data-intensity={asset.intensity}
              style={{ '--intensity': String(asset.intensity) } as CSSProperties}
            >
              {asset.kind === 'PRESET' && (
                <div
                  className={styles.presetLayer}
                  data-evidence={asset.evidence}
                  data-intensity={asset.intensity}
                />
              )}
              {isImageMedia(asset) && (
                <img className={styles.mediaLayer} src={asset.path} alt="" />
              )}
              <span className={styles.beatTag}>
                {phaseLabel(p)}・{asset.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.caption} data-fusion-caption>
        {title}
      </div>
      <div className={styles.meta} data-fusion-meta>
        {phaseLabel(phase)}
        {' · '}
        {beatIndex + 1}/{Math.max(visuals.length, 1)}
        {' · '}
        {plan.assets.length} 效・{Math.round(plan.stageMs / 100) / 10}s
      </div>

      <ol className={styles.timeline} data-fusion-timeline>
        {visuals.map((asset, index) => (
          <li
            key={`tl-${asset.assetId}`}
            data-on={index === beatIndex ? '1' : '0'}
            data-phase={phaseOf(asset.category)}
            data-intensity={asset.intensity}
          >
            <i />
            <span>{phaseLabel(phaseOf(asset.category))}</span>
          </li>
        ))}
      </ol>
    </div>
  );
});

export default FusionEffectStage;
