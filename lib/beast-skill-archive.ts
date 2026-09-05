/**
 * 《技能戰鬥檔案》讀取層｜太極命理・三戰兩勝專用
 *
 * 業主定調：戰鬥功能與神獸卡片戰鬥功能，技能一律列入《技能戰鬥檔案》。
 * 本檔只負責「演出技能」資料（本體衝鋒／命中衝擊／隨時戰鬥），
 * 不發明數值效果——數值仍走 cards/skills + Effect Engine 的 13 種 EffectType。
 *
 * 規格第十二條：動畫不得決定戰鬥結果。這裡讀到的只有素材路徑與時長。
 */

export const SKILL_ARCHIVE_INDEX = '/skill-battle-archive/index.json' as const;

export const PRESENTATION_SKILL_IDS = [
  'skill_charge',
  'skill_hit',
  'skill_ready_battle',
] as const;

export type PresentationSkillId = (typeof PRESENTATION_SKILL_IDS)[number];

export interface PresentationSkill {
  skillId: PresentationSkillId | string;
  name: string;
  enabled: boolean;
  durationMs?: number;
  body?: string;
  clip?: string;
  /** 衝鋒影片（webm 優先）。只有實際備好影片的卡才有這兩欄。 */
  video?: string;
  videoMp4?: string;
}

export interface CardBattleSkills {
  poolId: string;
  displayName?: string;
  lineage?: string;
  workIndex?: string;
  skills: PresentationSkill[];
}

export interface SkillArchiveIndex {
  title: string;
  version: string;
  count: number;
  product?: {
    brand?: string;
    battleMode?: { id?: string; name?: string };
  };
  cards: Array<{
    poolId: string;
    name: string;
    skillNames?: string[];
    battleReady?: boolean;
    body?: string;
    skillsPath?: string;
  }>;
}

/** 戰鬥本體（技能檔對應立繪）。有檔才回路徑；沒有就讓 caller 退回 spirit 去背圖。 */
export function skillBodyArtFor(cardId: string): string {
  return `/beast-game/skill-bodies/${cardId}.webp`;
}

/**
 * 本體衝鋒影片的慣例路徑。
 *
 * 只給路徑，不保證檔案存在——六十張裡目前只有少數幾張備好影片。
 * **呼叫端必須先確認技能檔案真的宣告了 video 才掛上去**：
 * 沒影片卻硬掛，<video> 會 404 成一塊黑底方塊，
 * 蓋掉底下的三維對撞——那比不放影片更糟。
 */
export function chargeVideoFor(cardId: string): { webm: string; mp4: string } {
  const base = `/skill-battle-archive/cards/${cardId}/clips/charge-battle`;
  return { webm: `${base}.webm`, mp4: `${base}.mp4` };
}

/** 單卡演出技能路徑（可 fetch）。 */
export function cardSkillsUrl(poolId: string): string {
  return `/skill-battle-archive/cards/${poolId}/skills.json`;
}

/**
 * 瀏覽器端載入單卡《技能戰鬥檔案》。
 * 失敗回 null——儀式照常走既有 spirit／音效，不擋戰鬥。
 */
export async function loadCardBattleSkills(
  poolId: string,
): Promise<CardBattleSkills | null> {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(cardSkillsUrl(poolId), { cache: 'force-cache' });
    if (!res.ok) return null;
    return (await res.json()) as CardBattleSkills;
  } catch {
    return null;
  }
}

/** 載入總表（組陣台／審查用）。 */
export async function loadSkillArchiveIndex(): Promise<SkillArchiveIndex | null> {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(SKILL_ARCHIVE_INDEX, { cache: 'force-cache' });
    if (!res.ok) return null;
    return (await res.json()) as SkillArchiveIndex;
  } catch {
    return null;
  }
}

/** 由技能清單取出衝鋒／命中／隨時戰鬥（缺則給預設名稱，不擋流程）。 */
export function presentationSkillsFor(
  skills: PresentationSkill[] | null | undefined,
): {
  charge: PresentationSkill;
  hit: PresentationSkill;
  ready: PresentationSkill;
} {
  const list = skills ?? [];
  const find = (id: PresentationSkillId, fallbackName: string, ms: number): PresentationSkill =>
    list.find((s) => s.skillId === id) ?? {
      skillId: id,
      name: fallbackName,
      enabled: true,
      durationMs: ms,
    };
  return {
    charge: find('skill_charge', '本體衝鋒', 1600),
    hit: find('skill_hit', '命中衝擊', 400),
    ready: find('skill_ready_battle', '隨時戰鬥', 0),
  };
}
