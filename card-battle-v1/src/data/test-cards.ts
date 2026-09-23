/**
 * Phase 1 測試卡：5 友方 + 5 敵方。
 * 元素僅用玩家標籤 风/空/水/火/地。
 * 變身形態以資料描述，非 per-card 程式分支。
 */

import type { CardStats } from '../config/battle-config.js';
import type { PlayerElement } from '../element-engine/index.js';
import type { TransformForm } from '../transformation-engine/index.js';

export interface SkillStub {
  id: string;
  /** 玩家面向名稱 */
  nameZh: string;
  /** 簡易倍率（相對 atk）；僅測試用 */
  powerMult: number;
}

export interface TestCardDef {
  cardId: string;
  nameZh: string;
  element: PlayerElement;
  /** 基礎形態 = forms[tier0] */
  forms: TransformForm[];
  skillsCatalog: SkillStub[];
}

function form(
  tier: number,
  appearanceId: string,
  stats: CardStats,
  skillIds: string[],
): TransformForm {
  return { tier, appearanceId, stats, skillIds };
}

/** 5 張友方測試卡 */
export const ALLY_TEST_CARDS: TestCardDef[] = [
  {
    cardId: 'ally_feng_01',
    nameZh: '青嵐使者',
    element: '风',
    skillsCatalog: [
      { id: 'sk_wind_slash', nameZh: '風刃', powerMult: 1.0 },
      { id: 'sk_gale_burst', nameZh: '烈風爆發', powerMult: 1.4 },
      { id: 'sk_storm_crown', nameZh: '嵐冠裁決', powerMult: 1.8 },
    ],
    forms: [
      form(0, 'app_feng_base', { atk: 12, def: 6, hp: 40 }, ['sk_wind_slash']),
      form(1, 'app_feng_t1', { atk: 18, def: 8, hp: 48 }, ['sk_wind_slash', 'sk_gale_burst']),
      form(2, 'app_feng_t2', { atk: 26, def: 10, hp: 56 }, [
        'sk_gale_burst',
        'sk_storm_crown',
      ]),
    ],
  },
  {
    cardId: 'ally_kong_01',
    nameZh: '虛空行者',
    element: '空',
    skillsCatalog: [
      { id: 'sk_void_cut', nameZh: '空裂', powerMult: 1.0 },
      { id: 'sk_space_fold', nameZh: '折空', powerMult: 1.5 },
      { id: 'sk_null_spear', nameZh: '虛矛', powerMult: 1.9 },
    ],
    forms: [
      form(0, 'app_kong_base', { atk: 11, def: 7, hp: 38 }, ['sk_void_cut']),
      form(1, 'app_kong_t1', { atk: 17, def: 9, hp: 46 }, ['sk_void_cut', 'sk_space_fold']),
      form(2, 'app_kong_t2', { atk: 25, def: 11, hp: 54 }, [
        'sk_space_fold',
        'sk_null_spear',
      ]),
    ],
  },
  {
    cardId: 'ally_shui_01',
    nameZh: '潮汐祭司',
    element: '水',
    skillsCatalog: [
      { id: 'sk_tide_hit', nameZh: '潮擊', powerMult: 1.0 },
      { id: 'sk_wave_bind', nameZh: '水縛', powerMult: 1.3 },
      { id: 'sk_abyss_call', nameZh: '深淵之召', powerMult: 1.7 },
    ],
    forms: [
      form(0, 'app_shui_base', { atk: 10, def: 8, hp: 44 }, ['sk_tide_hit']),
      form(1, 'app_shui_t1', { atk: 15, def: 11, hp: 54 }, ['sk_tide_hit', 'sk_wave_bind']),
      form(2, 'app_shui_t2', { atk: 22, def: 14, hp: 64 }, [
        'sk_wave_bind',
        'sk_abyss_call',
      ]),
    ],
  },
  {
    cardId: 'ally_huo_01',
    nameZh: '炎魂鬥士',
    element: '火',
    skillsCatalog: [
      { id: 'sk_ember', nameZh: '餘燼', powerMult: 1.0 },
      { id: 'sk_blaze', nameZh: '烈焰', powerMult: 1.5 },
      { id: 'sk_inferno', nameZh: '焚天', powerMult: 2.0 },
    ],
    forms: [
      form(0, 'app_huo_base', { atk: 14, def: 5, hp: 36 }, ['sk_ember']),
      form(1, 'app_huo_t1', { atk: 21, def: 7, hp: 42 }, ['sk_ember', 'sk_blaze']),
      form(2, 'app_huo_t2', { atk: 30, def: 9, hp: 50 }, ['sk_blaze', 'sk_inferno']),
    ],
  },
  {
    cardId: 'ally_di_01',
    nameZh: '磐岳衛士',
    element: '地',
    skillsCatalog: [
      { id: 'sk_rock_bash', nameZh: '岩擊', powerMult: 1.0 },
      { id: 'sk_quake', nameZh: '地動', powerMult: 1.3 },
      { id: 'sk_mountain', nameZh: '山嶽鎮壓', powerMult: 1.6 },
    ],
    forms: [
      form(0, 'app_di_base', { atk: 9, def: 12, hp: 50 }, ['sk_rock_bash']),
      form(1, 'app_di_t1', { atk: 13, def: 16, hp: 62 }, ['sk_rock_bash', 'sk_quake']),
      form(2, 'app_di_t2', { atk: 18, def: 20, hp: 74 }, ['sk_quake', 'sk_mountain']),
    ],
  },
];

/** 5 張敵方測試卡（較弱，便於迴圈驗證勝利） */
export const ENEMY_TEST_CARDS: TestCardDef[] = [
  {
    cardId: 'enemy_feng_01',
    nameZh: '暗嵐雜兵',
    element: '风',
    skillsCatalog: [{ id: 'sk_e_wind', nameZh: '闇風', powerMult: 1.0 }],
    forms: [
      form(0, 'app_e_feng_base', { atk: 8, def: 4, hp: 28 }, ['sk_e_wind']),
      form(1, 'app_e_feng_t1', { atk: 12, def: 5, hp: 34 }, ['sk_e_wind']),
    ],
  },
  {
    cardId: 'enemy_kong_01',
    nameZh: '裂空雜兵',
    element: '空',
    skillsCatalog: [{ id: 'sk_e_void', nameZh: '裂空擊', powerMult: 1.0 }],
    forms: [
      form(0, 'app_e_kong_base', { atk: 9, def: 4, hp: 26 }, ['sk_e_void']),
      form(1, 'app_e_kong_t1', { atk: 13, def: 5, hp: 32 }, ['sk_e_void']),
    ],
  },
  {
    cardId: 'enemy_shui_01',
    nameZh: '濁流雜兵',
    element: '水',
    skillsCatalog: [{ id: 'sk_e_tide', nameZh: '濁浪', powerMult: 1.0 }],
    forms: [
      form(0, 'app_e_shui_base', { atk: 7, def: 5, hp: 30 }, ['sk_e_tide']),
      form(1, 'app_e_shui_t1', { atk: 10, def: 7, hp: 36 }, ['sk_e_tide']),
    ],
  },
  {
    cardId: 'enemy_huo_01',
    nameZh: '燼火雜兵',
    element: '火',
    skillsCatalog: [{ id: 'sk_e_ember', nameZh: '燼擊', powerMult: 1.0 }],
    forms: [
      form(0, 'app_e_huo_base', { atk: 10, def: 3, hp: 24 }, ['sk_e_ember']),
      form(1, 'app_e_huo_t1', { atk: 14, def: 4, hp: 30 }, ['sk_e_ember']),
    ],
  },
  {
    cardId: 'enemy_di_01',
    nameZh: '裂地雜兵',
    element: '地',
    skillsCatalog: [{ id: 'sk_e_rock', nameZh: '碎石', powerMult: 1.0 }],
    forms: [
      form(0, 'app_e_di_base', { atk: 6, def: 8, hp: 34 }, ['sk_e_rock']),
      form(1, 'app_e_di_t1', { atk: 9, def: 10, hp: 40 }, ['sk_e_rock']),
    ],
  },
];

export function getCardDef(cardId: string): TestCardDef | undefined {
  return (
    ALLY_TEST_CARDS.find((c) => c.cardId === cardId) ??
    ENEMY_TEST_CARDS.find((c) => c.cardId === cardId)
  );
}
