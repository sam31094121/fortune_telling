/**
 * 《易經》對手智能讀取層
 *
 * 正式檔：docs/技能戰鬥檔案/易經/易經.json
 * 新人導讀：docs/技能戰鬥檔案/易經/新人檔案.md
 *
 * 給 interactive.ts 的 chooseAI／暴怒判斷用——只提供政策門檻，不改傷害公式。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { FusionDifficulty } from './fusion';

export type IchingDifficulty = FusionDifficulty;

export interface IchingRagePolicy {
  selfHpBelow?: number;
  enemyHpBelow?: number;
  orbsAtLeast?: number;
  enemyPressureOrbsAtLeast?: number;
  softSelfHpBelow?: number;
  softOrbsAtLeast?: number;
  preferDualUnseal?: boolean;
  note?: string;
}

export interface IchingLevelPolicy {
  label: string;
  chooseAI: string;
  description?: string;
  skillBias?: unknown;
  rage: IchingRagePolicy;
  switch?: {
    whenDisadvantaged?: boolean;
    reserveHpAbove?: number;
    minRevisionsBetweenSwitches?: number;
  };
  bossCounters?: boolean;
}

export interface IchingArchive {
  id: string;
  name: string;
  title: string;
  version: string;
  updatedAt: string;
  bigDataSummary: unknown;
  intelligencePolicies: Record<IchingDifficulty, IchingLevelPolicy>;
  rageFairness: unknown;
  difficultyDefaults: unknown;
}

const ARCHIVE_SEGMENTS = ['docs', '技能戰鬥檔案', '易經', '易經.json'] as const;

/** 檔案讀不到時的嵌入後備（與正式 JSON 的暴怒門檻對齊）。 */
const FALLBACK_POLICIES: Record<IchingDifficulty, IchingLevelPolicy> = {
  EASY: {
    label: '簡單',
    chooseAI: 'basicChoice',
    rage: { selfHpBelow: 0.55, enemyHpBelow: 0.55, orbsAtLeast: 2 },
  },
  NORMAL: {
    label: '中等層（免費三卡預設）',
    chooseAI: 'tacticalChoice',
    rage: { orbsAtLeast: 2, selfHpBelow: 0.4, enemyHpBelow: 0.35, enemyPressureOrbsAtLeast: 1, preferDualUnseal: true },
    switch: { whenDisadvantaged: true, reserveHpAbove: 0.6, minRevisionsBetweenSwitches: 4 },
  },
  HARD: {
    label: '困難',
    chooseAI: 'lookaheadChoice',
    rage: { orbsAtLeast: 2, selfHpBelow: 0.45, enemyHpBelow: 0.3, softSelfHpBelow: 0.55, softOrbsAtLeast: 1, preferDualUnseal: true },
    bossCounters: true,
  },
};

let cached: IchingArchive | null = null;

function archivePath(cwd = process.cwd()): string {
  return path.join(cwd, ...ARCHIVE_SEGMENTS);
}

export function loadIchingArchive(cwd = process.cwd()): IchingArchive {
  if (cached) return cached;
  try {
    cached = JSON.parse(readFileSync(archivePath(cwd), 'utf8')) as IchingArchive;
    return cached;
  } catch {
    cached = {
      id: 'iching',
      name: '易經',
      title: '易經對手智能正式檔（嵌入後備）',
      version: '1.0.0-fallback',
      updatedAt: '2026-09-15T21:55:00+08:00',
      bigDataSummary: null,
      intelligencePolicies: FALLBACK_POLICIES,
      rageFairness: { sameRulesAsPlayer: true, noDamageFormulaChange: true },
      difficultyDefaults: { turnsStartOmitted: 'NORMAL', freeThreeCardEntry: 'NORMAL' },
    };
    return cached;
  }
}

/** 讀取某一級智能政策（政策來自《易經》檔）。 */
export function getIchingPolicy(level: IchingDifficulty = 'NORMAL'): IchingLevelPolicy {
  const archive = loadIchingArchive();
  return archive.intelligencePolicies[level] ?? FALLBACK_POLICIES[level];
}

/**
 * UI／入口 → interactive difficulty。
 * 免費三卡（UI「簡單」）→ NORMAL（業主：變聰明基線）。
 */
export function difficultyFromMode(mode?: string | null): IchingDifficulty {
  const key = (mode ?? '').toLowerCase();
  if (key === 'hard' || key === '困難' || key === 'HARD') return 'HARD';
  if (key === 'easy' || key === '簡單' || key === 'EASY') return 'NORMAL';
  if (key === 'medium' || key === 'normal' || key === '中等' || key === 'NORMAL') return 'NORMAL';
  return 'NORMAL';
}

/** turns START 缺省難度（舊客戶端未傳時全面變聰明）。 */
export const TURNS_START_DEFAULT_DIFFICULTY: IchingDifficulty = 'NORMAL';

export interface RageDecisionInput {
  selfHpRatio: number;
  enemyHpRatio: number;
  orbs: number;
  dualUnsealReady?: boolean;
}

/** 依《易經》檔暴怒門檻判斷是否該放 RAGE（雙方規則對稱；不改傷害）。 */
export function shouldRageByPolicy(level: IchingDifficulty, input: RageDecisionInput): boolean {
  const rage = getIchingPolicy(level).rage;
  const orbs = input.orbs ?? 0;
  if (rage.orbsAtLeast != null && orbs >= rage.orbsAtLeast) return true;
  if (rage.selfHpBelow != null && input.selfHpRatio < rage.selfHpBelow) return true;
  if (rage.enemyHpBelow != null && input.enemyHpRatio < rage.enemyHpBelow) {
    const need = rage.enemyPressureOrbsAtLeast;
    if (need == null || orbs >= need) return true;
  }
  if (rage.softSelfHpBelow != null && rage.softOrbsAtLeast != null
    && input.selfHpRatio < rage.softSelfHpBelow && orbs >= rage.softOrbsAtLeast) return true;
  if (rage.preferDualUnseal && input.dualUnsealReady) return true;
  return false;
}

export function ichingArchivePath(): string {
  return archivePath();
}
