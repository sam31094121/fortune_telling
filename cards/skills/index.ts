/**
 * 神獸卡遊戲｜技能登錄中心（Skill Registry）
 * ============================================================================
 *
 * 規格第九條：技能不得寫死在 UI，未來新增技能只新增資料，不要修改 Battle Engine。
 *
 * 所以這裡只有資料。每個技能就是「什麼時候觸發 → 結算哪些效果」，
 * 而效果種類全部來自 Effect Engine 的 EffectType，不自己發明。
 */

import type { EffectSpec } from '../../lib/beast-game/effects';

/** 觸發時機。新增時機要同時在 Turn Engine 加對應的呼叫點。 */
export const SKILL_TRIGGERS = [
  'ON_ATTACK',
  'ON_SUMMON',
  'ON_TURN_START',
  'ON_TURN_END',
  'ON_DAMAGED',
  'PASSIVE',
] as const;
export type SkillTrigger = (typeof SKILL_TRIGGERS)[number];

export type SkillTargeting = 'ENEMY' | 'SELF' | 'ALLY';

export interface SkillDefinition {
  id: string;
  name: string;
  trigger: SkillTrigger;
  targeting: SkillTargeting;
  effects: EffectSpec[];
  /** 每場戰鬥可用次數；省略代表不限。用來擋「同一招無限放」。 */
  usesPerBattle?: number;
  description: string;
  version: string;
}

export const SKILLS: SkillDefinition[] = [
  {
    id: 'skill_001',
    name: '龍息',
    trigger: 'ON_ATTACK',
    targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 20 }],
    description: '攻擊時附加一道龍息，額外造成傷害。',
    version: '1.0.0',
  },
  {
    id: 'skill_002',
    name: '角衝',
    trigger: 'ON_ATTACK',
    targeting: 'ENEMY',
    effects: [
      { type: 'DAMAGE', value: 10 },
      { type: 'DEBUFF_DEFENSE', value: 10, duration: 2 },
    ],
    usesPerBattle: 3,
    description: '以角破陣，傷害之外再削弱對手防禦兩回合。',
    version: '1.0.0',
  },
  {
    id: 'skill_003',
    name: '金鱗護體',
    trigger: 'ON_SUMMON',
    targeting: 'SELF',
    effects: [{ type: 'SHIELD', value: 25 }],
    description: '登場時展開金鱗，獲得護盾。',
    version: '1.0.0',
  },
  {
    id: 'skill_004',
    name: '土遁',
    trigger: 'ON_DAMAGED',
    targeting: 'SELF',
    effects: [{ type: 'BUFF_DEFENSE', value: 15, duration: 2 }],
    usesPerBattle: 2,
    description: '受創後遁入土中，兩回合內防禦提升。',
    version: '1.0.0',
  },
  {
    id: 'skill_005',
    name: '日耀',
    trigger: 'ON_TURN_START',
    targeting: 'SELF',
    effects: [{ type: 'ELEMENT_BOOST', value: 15, duration: 1, element: 'FIRE' }],
    description: '回合開始時聚日之力，本回合火屬性傷害提升。',
    version: '1.0.0',
  },
  {
    id: 'skill_006',
    name: '月華',
    trigger: 'ON_TURN_END',
    targeting: 'SELF',
    effects: [{ type: 'HEAL', value: 12 }],
    description: '回合結束時承月華，回復少量生命。',
    version: '1.0.0',
  },
  {
    id: 'skill_007',
    name: '水幕',
    trigger: 'ON_SUMMON',
    targeting: 'SELF',
    effects: [{ type: 'SHIELD', value: 15 }, { type: 'BUFF_SPEED', value: 10, duration: 3 }],
    description: '登場時張開水幕，同時護體與提速。',
    version: '1.0.0',
  },
  {
    id: 'skill_008',
    name: '雷震',
    trigger: 'ON_ATTACK',
    targeting: 'ENEMY',
    effects: [{ type: 'STUN', value: 1, duration: 1 }],
    usesPerBattle: 1,
    description: '一擊震懾，使目標暈眩一回合。整場只能用一次。',
    version: '1.0.0',
  },
  {
    id: 'skill_009',
    name: '虎威',
    trigger: 'PASSIVE',
    targeting: 'SELF',
    effects: [{ type: 'BUFF_ATTACK', value: 8, duration: 99 }],
    description: '被動：氣勢常在，攻擊力持續提升。',
    version: '1.0.0',
  },
  {
    id: 'skill_010',
    name: '窺機',
    trigger: 'ON_TURN_START',
    targeting: 'SELF',
    effects: [{ type: 'DRAW', value: 1 }],
    usesPerBattle: 2,
    description: '回合開始時多抽一張牌。整場兩次。',
    version: '1.0.0',
  },
];

const SKILL_MAP = new Map(SKILLS.map((skill) => [skill.id, skill]));

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILL_MAP.get(id);
}

export function allSkillIds(): Set<string> {
  return new Set(SKILL_MAP.keys());
}
