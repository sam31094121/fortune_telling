/**
 * 神獸卡遊戲｜技能登錄中心（Skill Registry）
 * ============================================================================
 *
 * 規格第九條：技能不得寫死在 UI，未來新增技能只新增資料，不要修改 Battle Engine。
 *
 * 所以這裡只有資料。每個技能就是「什麼時候觸發 → 結算哪些效果」，
 * 效果種類全部來自 Effect Engine 的 13 種 EffectType，不自己發明。
 *
 * 編號規則：
 *   001–010  通用（初版六張卡沿用，不動）
 *   101–115  五元素的攻守招（成獸主力）
 *   201–210  幼子的成長與輔助招
 *   301–304  四象的招牌招
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
  /* ── 通用 ────────────────────────────────────────────────────────── */
  { id: 'skill_001', name: '龍息', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 20 }],
    description: '攻擊時附加一道龍息，額外造成傷害。', version: '1.0.0' },
  { id: 'skill_002', name: '角衝', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 10 }, { type: 'DEBUFF_DEFENSE', value: 10, duration: 2 }],
    usesPerBattle: 3,
    description: '以角破陣，傷害之外再削弱對手防禦兩回合。', version: '1.0.0' },
  { id: 'skill_003', name: '金鱗護體', trigger: 'ON_SUMMON', targeting: 'SELF',
    effects: [{ type: 'SHIELD', value: 25 }],
    description: '登場時展開金鱗，獲得護盾。', version: '1.0.0' },
  { id: 'skill_004', name: '土遁', trigger: 'ON_DAMAGED', targeting: 'SELF',
    effects: [{ type: 'BUFF_DEFENSE', value: 15, duration: 2 }], usesPerBattle: 2,
    description: '受創後遁入土中，兩回合內防禦提升。', version: '1.0.0' },
  { id: 'skill_005', name: '日耀', trigger: 'ON_TURN_START', targeting: 'SELF',
    effects: [{ type: 'ELEMENT_BOOST', value: 15, duration: 1, element: 'FIRE' }],
    description: '回合開始時聚日之力，本回合火屬性傷害提升。', version: '1.0.0' },
  { id: 'skill_006', name: '月華', trigger: 'ON_TURN_END', targeting: 'SELF',
    effects: [{ type: 'HEAL', value: 12 }],
    description: '回合結束時承月華，回復少量生命。', version: '1.0.0' },
  { id: 'skill_007', name: '水幕', trigger: 'ON_SUMMON', targeting: 'SELF',
    effects: [{ type: 'SHIELD', value: 15 }, { type: 'BUFF_SPEED', value: 10, duration: 3 }],
    description: '登場時張開水幕，同時護體與提速。', version: '1.0.0' },
  { id: 'skill_008', name: '雷震', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'STUN', value: 1, duration: 1 }], usesPerBattle: 1,
    description: '一擊震懾，使目標暈眩一回合。整場只能用一次。', version: '1.0.0' },
  { id: 'skill_009', name: '虎威', trigger: 'PASSIVE', targeting: 'SELF',
    effects: [{ type: 'BUFF_ATTACK', value: 8, duration: 99 }],
    description: '被動：氣勢常在，攻擊力持續提升。', version: '1.0.0' },
  { id: 'skill_010', name: '窺機', trigger: 'ON_TURN_START', targeting: 'SELF',
    effects: [{ type: 'DRAW', value: 1 }], usesPerBattle: 2,
    description: '回合開始時多抽一張牌。整場兩次。', version: '1.0.0' },

  /* ── 五元素・成獸主力 ────────────────────────────────────────────── */
  { id: 'skill_101', name: '風刃', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 14 }],
    description: '風屬攻招：以風為刃，直取要害。', version: '1.0.0' },
  { id: 'skill_102', name: '空斷', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 10 }, { type: 'DEBUFF_ATTACK', value: 8, duration: 2 }],
    usesPerBattle: 3,
    description: '空屬攻招：斷其鋒銳，兩回合內削弱對手攻擊。', version: '1.0.0' },
  { id: 'skill_103', name: '潮湧', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 12 }], usesPerBattle: 4,
    description: '水屬攻招：潮起連綿，穩定輸出。', version: '1.0.0' },
  { id: 'skill_104', name: '焚天', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 22 }], usesPerBattle: 2,
    description: '火屬攻招：一擊灼盡，次數有限。', version: '1.0.0' },
  { id: 'skill_105', name: '地裂', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 8 }, { type: 'DEBUFF_DEFENSE', value: 12, duration: 2 }],
    usesPerBattle: 3,
    description: '地屬攻招：裂其陣腳，削防為主。', version: '1.0.0' },

  { id: 'skill_106', name: '御風', trigger: 'ON_SUMMON', targeting: 'SELF',
    effects: [{ type: 'BUFF_SPEED', value: 14, duration: 3 }],
    description: '風屬守招：登場即御風而行，三回合提速。', version: '1.0.0' },
  { id: 'skill_107', name: '空明', trigger: 'ON_SUMMON', targeting: 'SELF',
    effects: [{ type: 'SHIELD', value: 20 }],
    description: '空屬守招：登場張開空明之壁。', version: '1.0.0' },
  { id: 'skill_108', name: '澤潤', trigger: 'ON_TURN_END', targeting: 'SELF',
    effects: [{ type: 'HEAL', value: 10 }],
    description: '水屬守招：回合結束自我潤養。', version: '1.0.0' },
  { id: 'skill_109', name: '烈燄纏身', trigger: 'ON_DAMAGED', targeting: 'SELF',
    effects: [{ type: 'BUFF_ATTACK', value: 12, duration: 2 }], usesPerBattle: 3,
    description: '火屬守招：受創反而更烈，兩回合攻擊提升。', version: '1.0.0' },
  { id: 'skill_110', name: '厚土', trigger: 'ON_DAMAGED', targeting: 'SELF',
    effects: [{ type: 'BUFF_DEFENSE', value: 14, duration: 2 }], usesPerBattle: 3,
    description: '地屬守招：受創後以厚土自固。', version: '1.0.0' },

  { id: 'skill_111', name: '疾行', trigger: 'PASSIVE', targeting: 'SELF',
    effects: [{ type: 'BUFF_SPEED', value: 10, duration: 99 }],
    description: '被動：生而疾行，速度常駐提升。', version: '1.0.0' },
  { id: 'skill_112', name: '鐵背', trigger: 'PASSIVE', targeting: 'SELF',
    effects: [{ type: 'BUFF_DEFENSE', value: 8, duration: 99 }],
    description: '被動：皮糙肉厚，防禦常駐提升。', version: '1.0.0' },
  { id: 'skill_113', name: '銳爪', trigger: 'PASSIVE', targeting: 'SELF',
    effects: [{ type: 'BUFF_ATTACK', value: 7, duration: 99 }],
    description: '被動：爪牙鋒利，攻擊常駐提升。', version: '1.0.0' },
  { id: 'skill_115', name: '定身', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'STUN', value: 1, duration: 1 }], usesPerBattle: 2,
    description: '重擊定身，使目標暈眩一回合。整場兩次。', version: '1.0.0' },

  /* ── 幼子・成長與輔助 ────────────────────────────────────────────── */
  { id: 'skill_201', name: '初鳴', trigger: 'ON_SUMMON', targeting: 'SELF',
    effects: [{ type: 'SHIELD', value: 8 }],
    description: '幼子初啼，登場護體。', version: '1.0.0' },
  { id: 'skill_202', name: '嗷嗷待哺', trigger: 'ON_TURN_END', targeting: 'SELF',
    effects: [{ type: 'HEAL', value: 6 }],
    description: '幼子自癒，回合結束回復少量生命。', version: '1.0.0' },
  { id: 'skill_203', name: '好奇', trigger: 'ON_TURN_START', targeting: 'SELF',
    effects: [{ type: 'DRAW', value: 1 }], usesPerBattle: 1,
    description: '幼子好奇四顧，整場多抽一張牌。', version: '1.0.0' },
  { id: 'skill_204', name: '幼獠', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 6 }],
    description: '尚未長成的獠牙，仍能咬下一口。', version: '1.0.0' },
  { id: 'skill_205', name: '藏匿', trigger: 'ON_DAMAGED', targeting: 'SELF',
    effects: [{ type: 'BUFF_DEFENSE', value: 10, duration: 1 }], usesPerBattle: 2,
    description: '受驚就躲，一回合內防禦提升。', version: '1.0.0' },
  { id: 'skill_206', name: '蹦跳', trigger: 'PASSIVE', targeting: 'SELF',
    effects: [{ type: 'BUFF_SPEED', value: 6, duration: 99 }],
    description: '被動：好動不安分，速度常駐提升。', version: '1.0.0' },
  { id: 'skill_207', name: '依偎', trigger: 'ON_SUMMON', targeting: 'SELF',
    effects: [{ type: 'HEAL', value: 8 }],
    description: '登場時依偎取暖，回復生命。', version: '1.0.0' },
  { id: 'skill_208', name: '學步', trigger: 'ON_TURN_START', targeting: 'SELF',
    effects: [{ type: 'BUFF_ATTACK', value: 5, duration: 2 }], usesPerBattle: 3,
    description: '一次比一次穩，兩回合內攻擊提升。', version: '1.0.0' },

  /* ── 四象・招牌 ──────────────────────────────────────────────────── */
  { id: 'skill_301', name: '蒼龍騰霄', trigger: 'ON_SUMMON', targeting: 'SELF',
    effects: [{ type: 'BUFF_ATTACK', value: 15, duration: 4 }, { type: 'BUFF_SPEED', value: 15, duration: 4 }],
    description: '青龍登場，四回合內攻速齊揚。', version: '1.0.0' },
  { id: 'skill_302', name: '朱雀焚野', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 28 }, { type: 'ELEMENT_BOOST', value: 20, duration: 2, element: 'FIRE', target: 'SELF' }],
    usesPerBattle: 2,
    description: '朱雀展翼，烈火焚野；自身兩回合內火屬傷害再提升。', version: '1.0.1' },
  { id: 'skill_303', name: '白虎嘯陣', trigger: 'ON_ATTACK', targeting: 'ENEMY',
    effects: [{ type: 'DAMAGE', value: 18 }, { type: 'STUN', value: 1, duration: 1 }],
    usesPerBattle: 1,
    description: '白虎一嘯，破陣奪勢並震懾對手。整場一次。', version: '1.0.0' },
  { id: 'skill_304', name: '玄武承淵', trigger: 'ON_SUMMON', targeting: 'SELF',
    effects: [{ type: 'SHIELD', value: 40 }, { type: 'BUFF_DEFENSE', value: 15, duration: 4 }],
    description: '玄武負淵而立，登場即厚盾加身。', version: '1.0.0' },
];

const SKILL_MAP = new Map(SKILLS.map((skill) => [skill.id, skill]));

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILL_MAP.get(id);
}

export function allSkillIds(): Set<string> {
  return new Set(SKILL_MAP.keys());
}

/** 三戰兩勝演出技能（對照《技能戰鬥檔案》；不進 Effect Engine）。 */
export {
  BATTLE_PRESENTATION_SKILLS,
  getBattlePresentationSkill,
} from './battle-presentation';
