/**
 * 暴怒合體教學（後端計算，前端照印）
 *
 * 三步驟：相生卡 → 解封魔珠 → 暴怒值。全部讀戰鬥引擎的真實狀態，
 * 不另立規則、不預測勝負。
 */

import { ELEMENTS, ELEMENT_GENERATES, ELEMENT_LABEL, elementGenerates, type BeastElement } from './elements';
import { MAX_ORBS, MAX_RAGE } from './fusion';
import {
  RAGE_TIERS,
  rageMaterialFor,
  rageTierInfo,
  rageUnavailableReason,
  type Match,
  type RageTierInfo,
  type Side,
} from './interactive';

export interface RageGuideStep {
  key: 'PAIR' | 'ORBS' | 'RAGE';
  label: string;
  done: boolean;
  value: string;
  hint: string;
}

export interface RageGuide {
  used: boolean;
  canCast: boolean;
  current: RageTierInfo;
  next: RageTierInfo | null;
  orbs: number;
  rage: number;
  partnerName: string | null;
  partnerCardId: string | null;
  headline: string;
  steps: RageGuideStep[];
  ladder: Array<RageTierInfo & { reached: boolean; current: boolean }>;
}

export function rageFusionGuide(match: Match, side: Side = 'player'): RageGuide {
  const team = match[side];
  const active = team.team[team.active];
  const orbs = Math.max(0, Math.min(MAX_ORBS, team.orbs ?? 0));
  const rage = Math.max(0, Math.min(MAX_RAGE, team.rage ?? 0));
  const partner = rageMaterialFor(match, side);
  const reason = rageUnavailableReason(match, side);
  const used = team.rageAvailable === 0;
  const current = rageTierInfo(match, side);
  const index = RAGE_TIERS.findIndex((tier) => tier.tier === current.tier);
  const next = RAGE_TIERS[index + 1] ?? null;
  const activeLabel = ELEMENT_LABEL[active.element as BeastElement];

  let pairHint: string;
  if (partner) {
    pairHint = `${partner.name}（${ELEMENT_LABEL[partner.element as BeastElement]}）生主戰${active.name}（${activeLabel}）`;
  } else {
    const alternate = team.team.find((fighter, i) => i !== team.active && !fighter.defeated && fighter.hp > 0
      && team.team.some((reserve, j) => j !== i && !reserve.defeated && reserve.hp > 0
        && elementGenerates(reserve.element as BeastElement, fighter.element as BeastElement)));
    const needed = ELEMENTS.find((element) => ELEMENT_GENERATES[element] === active.element);
    pairHint = alternate
      ? `換上${alternate.name}當主戰，隊伍裡就有相生後備`
      : `後備要有一張「${needed ? ELEMENT_LABEL[needed] : ''}」元素卡來生主戰（${activeLabel}）`;
  }

  const orbTarget = next?.orbs ?? MAX_ORBS;
  const rageTarget = next?.rage ?? MAX_RAGE;
  const steps: RageGuideStep[] = [
    { key: 'PAIR', label: '相生卡', done: Boolean(partner), value: partner ? '已成立' : '未成立', hint: pairHint },
    { key: 'ORBS', label: '解封魔珠', done: orbs >= orbTarget, value: `${orbs}/${MAX_ORBS}`, hint: '有相生後備時，主戰出招打中對手，解封 1 顆魔珠' },
    { key: 'RAGE', label: '暴怒值', done: rage >= rageTarget, value: `${rage}/${MAX_RAGE}`, hint: '受到傷害會累積暴怒，每失去 2 點生命或護盾加 1' },
  ];

  let headline: string;
  if (match.status !== 'PLAYING') headline = '戰鬥已結束';
  else if (used) headline = '本場暴怒合體已使用';
  else if (!partner) headline = '先湊齊相生卡，才能暴怒合體';
  else if (reason) headline = reason;
  else if (next) {
    const missing = [
      next.orbs > orbs ? `解封 ${next.orbs - orbs} 顆魔珠` : null,
      next.rage > rage ? `暴怒到 ${next.rage}` : null,
    ].filter(Boolean).join('、');
    headline = `現在可放「${current.skillName}」；再${missing}，升級為「${next.skillName}」`;
  } else headline = `已達究極：「${current.skillName}」隨時可放`;

  return {
    used,
    canCast: reason === null,
    current,
    next,
    orbs,
    rage,
    partnerName: partner?.name ?? null,
    partnerCardId: partner?.cardId ?? null,
    headline,
    steps,
    ladder: RAGE_TIERS.map((tier, i) => ({ ...tier, reached: i <= index, current: i === index })),
  };
}
