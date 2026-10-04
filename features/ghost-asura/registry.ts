/**
 * 鬼魅阿修羅 — 固定名稱登錄表（附件 3 §五）
 *
 * 名稱母種不是運算項目上限。正式綁定以規則識別碼為準，無 ID 的工具才以中文名查找。
 * 未登錄但後端已驗證的項走穩定延伸（extendName），禁止顯示原始名當主標題。
 */

import { extendAsuraName, GHOST_ASURA_EXTENSION_VERSION } from './extendName';
import type { GhostAsuraRegistryEntry } from './types';

// 穩定延伸名稱以此版本作雜湊種子；直白文案更新不得連帶重命名未調整的印記。
export const GHOST_ASURA_NAMING_VERSION = 'GHOST_ASURA_NAMING_2026_10_01_V2';

/** 規則識別碼 → 核可阿修羅名（對齊 dual-chart coverage.id） */
export const APPROVED_BY_RULE_ID: Record<string, { displayName: string; family: string }> = {
  // Freeze the 24 names already emitted by the V4 catalogue. Registration concerns
  // naming only, not classical-source approval. Never regenerate them per request order.
  jinyu: { displayName: '祿秘庫', family: 'TREASURE' },
  tianshe: { displayName: '龍玄契', family: 'DIVINE_PROTECTION' },
  sanqi: { displayName: '噬暗印', family: 'SHADOW' },
  guluan: { displayName: '虛幽門', family: 'ISOLATION' },
  sifei: { displayName: '魂冥魂', family: 'SHADOW' },
  yuedehe: { displayName: '神護命', family: 'DIVINE_PROTECTION' },
  jinshen: { displayName: '藏寶匣', family: 'TREASURE' },
  bazhuan: { displayName: '冥纏影', family: 'SHADOW' },
  jiuchou: { displayName: '陰幽障', family: 'SHADOW' },
  liuxiu: { displayName: '幽之影', family: 'SHADOW' },
  bingfu: { displayName: '噬門暗印', family: 'SHADOW' },
  suipo: { displayName: '破碎痕', family: 'RUPTURE' },
  yuekong: { displayName: '陰魂幽障', family: 'SHADOW' },
  jielu: { displayName: '絕孤境', family: 'ISOLATION' },
  tianzhuan: { displayName: '冥印纏影', family: 'SHADOW' },
  dizhuan: { displayName: '幽域之影', family: 'SHADOW' },
  shiling: { displayName: '幽契之影', family: 'SHADOW' },
  ride: { displayName: '聖聖印', family: 'DIVINE_PROTECTION' },
  rigui: { displayName: '玄天印', family: 'DIVINE_PROTECTION' },
  panan: { displayName: '冥界纏影', family: 'SHADOW' },
  anlu: { displayName: '寶金宮', family: 'TREASURE' },
  jinshenDay: { displayName: '魂界冥魂', family: 'SHADOW' },
  tuishen: { displayName: '幽門之影', family: 'SHADOW' },
  gonglu: { displayName: '玄寶庫', family: 'TREASURE' },
  tiandehe: { displayName: '天赦神契', family: 'DIVINE_PROTECTION' },
  tiande: { displayName: '天德護印', family: 'DIVINE_PROTECTION' },
  yuede: { displayName: '月德靈契', family: 'DIVINE_PROTECTION' },
  yima: { displayName: '逐界行者', family: 'MOVEMENT' },
  gejiao: { displayName: '孤界之門', family: 'ISOLATION' },
  jinkui: { displayName: '玄金寶庫', family: 'TREASURE' },
  wugui: { displayName: '五陰纏影', family: 'SHADOW' },
  muyu: { displayName: '蛻變新生', family: 'TRANSFORMATION' },
  ripo: { displayName: '裂日之痕', family: 'RUPTURE' },
  tiangou: { displayName: '噬天之影', family: 'SHADOW' },
  zaisha: { displayName: '劫境之門', family: 'TRIBULATION' },
  tiansha: { displayName: '逆風破局', family: 'TRIBULATION' },
  yuepo: { displayName: '碎月之痕', family: 'RUPTURE' },
  jiangxing: { displayName: '鎮軍之魂', family: 'POWER' },
  longde: { displayName: '天龍護命', family: 'DIVINE_PROTECTION' },
  liue: { displayName: '六劫之關', family: 'TRIBULATION' },
  yuanchen: { displayName: '幽辰之障', family: 'SHADOW' },
  yangren: { displayName: '血刃之鋒', family: 'BLADE' },
  taohua: { displayName: '魅力引力', family: 'CHARM' },
  waiTaohua: { displayName: '界外吸引', family: 'CHARM' },
  tianyi: { displayName: '天乙神印', family: 'DIVINE_PROTECTION' },
  taiji: { displayName: '玄極天印', family: 'DIVINE_PROTECTION' },
  wenchang: { displayName: '文魂天契', family: 'DIVINE_PROTECTION' },
  fuxing: { displayName: '福曜護命', family: 'DIVINE_PROTECTION' },
  guoyin: { displayName: '鎮國之印', family: 'POWER' },
  xuetang: { displayName: '靈學之門', family: 'DIVINE_PROTECTION' },
  ciguan: { displayName: '文魄秘殿', family: 'DIVINE_PROTECTION' },
  tianchu: { displayName: '天饗神庫', family: 'TREASURE' },
  lushen: { displayName: '玄祿寶印', family: 'TREASURE' },
  tianyiDoctor: { displayName: '天醫靈契', family: 'DIVINE_PROTECTION' },
  huagai: { displayName: '孤華幽冠', family: 'ISOLATION' },
  jiesha: { displayName: '劫魂之刃', family: 'TRIBULATION' },
  wangshen: { displayName: '亡影幽魂', family: 'SHADOW' },
  baihu: { displayName: '白虎血印', family: 'BLADE' },
  sangmen: { displayName: '喪界幽門', family: 'SHADOW' },
  diaoke: { displayName: '弔魂之影', family: 'SHADOW' },
  pima: { displayName: '麻衣冥印', family: 'SHADOW' },
  guchen: { displayName: '孤辰絕界', family: 'ISOLATION' },
  guasu: { displayName: '寡宿幽宮', family: 'ISOLATION' },
  hongluan: { displayName: '紅鸞魅印', family: 'CHARM' },
  tianxi: { displayName: '天喜緣契', family: 'CHARM' },
  xianchi: { displayName: '魅池情印', family: 'CHARM' },
  hongyan: { displayName: '緋艷魅魂', family: 'CHARM' },
  tongzi: { displayName: '童靈之印', family: 'DIVINE_PROTECTION' },
  yinyangChacuo: { displayName: '陰陽錯界', family: 'TRANSFORMATION' },
  shieDabai: { displayName: '十敗劫印', family: 'TRIBULATION' },
  kuigang: { displayName: '魁罡戰魂', family: 'POWER' },
  feiren: { displayName: '飛刃血痕', family: 'BLADE' },
  liuxia: { displayName: '流霞魅痕', family: 'CHARM' },
  tianluo: { displayName: '羅網禁界', family: 'ISOLATION' },
  xueren: { displayName: '赤血刃印', family: 'BLADE' },
  goujiao: { displayName: '勾魂絞界', family: 'TRIBULATION' },
  kongwang: { displayName: '虛界空印', family: 'ISOLATION' },
};

/** 附件 3 中文母種（含 coverage 短名／貴人別名） */
export const APPROVED_BY_ORIGINAL_NAME: Record<string, { displayName: string; family: string }> = {
  天德合: { displayName: '天赦神契', family: 'DIVINE_PROTECTION' },
  天德: { displayName: '天德護印', family: 'DIVINE_PROTECTION' },
  天德貴人: { displayName: '天德護印', family: 'DIVINE_PROTECTION' },
  月德: { displayName: '月德靈契', family: 'DIVINE_PROTECTION' },
  月德貴人: { displayName: '月德靈契', family: 'DIVINE_PROTECTION' },
  驛馬: { displayName: '逐界行者', family: 'MOVEMENT' },
  隔角: { displayName: '孤界之門', family: 'ISOLATION' },
  金匱: { displayName: '玄金寶庫', family: 'TREASURE' },
  五鬼: { displayName: '五陰纏影', family: 'SHADOW' },
  沐浴: { displayName: '蛻變新生', family: 'TRANSFORMATION' },
  日破: { displayName: '裂日之痕', family: 'RUPTURE' },
  天狗: { displayName: '噬天之影', family: 'SHADOW' },
  災煞: { displayName: '劫境之門', family: 'TRIBULATION' },
  天煞: { displayName: '逆風破局', family: 'TRIBULATION' },
  月破: { displayName: '碎月之痕', family: 'RUPTURE' },
  將星: { displayName: '鎮軍之魂', family: 'POWER' },
  龍德: { displayName: '天龍護命', family: 'DIVINE_PROTECTION' },
  六厄: { displayName: '六劫之關', family: 'TRIBULATION' },
  元辰: { displayName: '幽辰之障', family: 'SHADOW' },
  羊刃: { displayName: '血刃之鋒', family: 'BLADE' },
  桃花: { displayName: '魅力引力', family: 'CHARM' },
  外桃花: { displayName: '界外吸引', family: 'CHARM' },
  天乙貴人: { displayName: '天乙神印', family: 'DIVINE_PROTECTION' },
  天乙: { displayName: '天乙神印', family: 'DIVINE_PROTECTION' },
  太極貴人: { displayName: '玄極天印', family: 'DIVINE_PROTECTION' },
  太極: { displayName: '玄極天印', family: 'DIVINE_PROTECTION' },
  文昌貴人: { displayName: '文魂天契', family: 'DIVINE_PROTECTION' },
  文昌: { displayName: '文魂天契', family: 'DIVINE_PROTECTION' },
  福星貴人: { displayName: '福曜護命', family: 'DIVINE_PROTECTION' },
  福星: { displayName: '福曜護命', family: 'DIVINE_PROTECTION' },
  國印貴人: { displayName: '鎮國之印', family: 'POWER' },
  國印: { displayName: '鎮國之印', family: 'POWER' },
  學堂: { displayName: '靈學之門', family: 'DIVINE_PROTECTION' },
  詞館: { displayName: '文魄秘殿', family: 'DIVINE_PROTECTION' },
  天廚: { displayName: '天饗神庫', family: 'TREASURE' },
  祿神: { displayName: '玄祿寶印', family: 'TREASURE' },
  天醫: { displayName: '天醫靈契', family: 'DIVINE_PROTECTION' },
  華蓋: { displayName: '孤華幽冠', family: 'ISOLATION' },
  劫煞: { displayName: '劫魂之刃', family: 'TRIBULATION' },
  亡神: { displayName: '亡影幽魂', family: 'SHADOW' },
  白虎: { displayName: '白虎血印', family: 'BLADE' },
  喪門: { displayName: '喪界幽門', family: 'SHADOW' },
  弔客: { displayName: '弔魂之影', family: 'SHADOW' },
  披麻: { displayName: '麻衣冥印', family: 'SHADOW' },
  孤辰: { displayName: '孤辰絕界', family: 'ISOLATION' },
  寡宿: { displayName: '寡宿幽宮', family: 'ISOLATION' },
  紅鸞: { displayName: '紅鸞魅印', family: 'CHARM' },
  天喜: { displayName: '天喜緣契', family: 'CHARM' },
  咸池: { displayName: '魅池情印', family: 'CHARM' },
  紅艷: { displayName: '緋艷魅魂', family: 'CHARM' },
  童子: { displayName: '童靈之印', family: 'DIVINE_PROTECTION' },
  陰差陽錯: { displayName: '陰陽錯界', family: 'TRANSFORMATION' },
  陰陽差錯: { displayName: '陰陽錯界', family: 'TRANSFORMATION' },
  十惡大敗: { displayName: '十敗劫印', family: 'TRIBULATION' },
  魁罡: { displayName: '魁罡戰魂', family: 'POWER' },
  飛刃: { displayName: '飛刃血痕', family: 'BLADE' },
  流霞: { displayName: '流霞魅痕', family: 'CHARM' },
  天羅地網: { displayName: '羅網禁界', family: 'ISOLATION' },
  血刃: { displayName: '赤血刃印', family: 'BLADE' },
  勾絞: { displayName: '勾魂絞界', family: 'TRIBULATION' },
  空亡: { displayName: '虛界空印', family: 'ISOLATION' },
};

export type GhostAsuraResolvedName = {
  displayName: string;
  family: string;
  namingApproved: boolean;
  namingSource: 'approved' | 'stable-extension';
  namingVersion: string;
};

export function lookupApprovedName(input: {
  ruleId?: string;
  originalName: string;
}): GhostAsuraRegistryEntry | null {
  const byRule = input.ruleId && Object.hasOwn(APPROVED_BY_RULE_ID, input.ruleId)
    ? APPROVED_BY_RULE_ID[input.ruleId] : undefined;
  if (byRule) {
    return {
      ruleId: input.ruleId,
      originalName: input.originalName,
      displayName: byRule.displayName,
      family: byRule.family,
      approved: true,
      namingVersion: GHOST_ASURA_NAMING_VERSION,
    };
  }

  // An explicit, unknown ID must never impersonate another rule through its name.
  const byName = !input.ruleId && Object.hasOwn(APPROVED_BY_ORIGINAL_NAME, input.originalName)
    ? APPROVED_BY_ORIGINAL_NAME[input.originalName] : undefined;
  if (byName) {
    return {
      ruleId: input.ruleId,
      originalName: input.originalName,
      displayName: byName.displayName,
      family: byName.family,
      approved: true,
      namingVersion: GHOST_ASURA_NAMING_VERSION,
    };
  }

  return null;
}

/**
 * 已核可 → 固定名；否則穩定延伸。永遠回傳 displayName（不回 null）。
 */
export function resolveDisplayName(
  input: {
    ruleId?: string;
    originalName: string;
  },
  usedNames?: Set<string>
): GhostAsuraResolvedName {
  const approved = lookupApprovedName(input);
  if (approved) {
    usedNames?.add(approved.displayName);
    return {
      displayName: approved.displayName,
      family: approved.family,
      namingApproved: true,
      namingSource: 'approved',
      namingVersion: approved.namingVersion || GHOST_ASURA_NAMING_VERSION,
    };
  }

  const extended = extendAsuraName({
    originalName: input.originalName,
    ruleId: input.ruleId,
    namingVersion: GHOST_ASURA_NAMING_VERSION,
    usedNames,
  });

  return {
    displayName: extended.displayName,
    family: extended.family,
    namingApproved: true,
    namingSource: 'stable-extension',
    namingVersion: `${GHOST_ASURA_NAMING_VERSION}+${GHOST_ASURA_EXTENSION_VERSION}`,
  };
}

/** 母種筆數（附件 3：51；含別名鍵不重複計 displayName） */
export function countApprovedSeedDisplayNames(): number {
  const names = new Set<string>();
  for (const entry of Object.values(APPROVED_BY_ORIGINAL_NAME)) {
    names.add(entry.displayName);
  }
  return names.size;
}

/** 已登錄固定 displayName 集合（延伸命名避碰撞用） */
export function collectApprovedDisplayNames(): Set<string> {
  const names = new Set<string>();
  for (const entry of Object.values(APPROVED_BY_RULE_ID)) names.add(entry.displayName);
  for (const entry of Object.values(APPROVED_BY_ORIGINAL_NAME)) names.add(entry.displayName);
  return names;
}
