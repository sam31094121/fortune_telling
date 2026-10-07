/**
 * 鬼魅阿修羅 Skill 母版 — 條目組裝。
 *
 * 一個 asuraId（＝後端規則編號）一筆；固定知識在 seeds.ts、字義在 charGlossary.ts，
 * 意境／落地／主題取自本派既有導師話術（lib/iching-shensha-teacher-readings.ts，手寫）。
 * 顯示名稱只從 registry 讀（命名的唯一來源），這裡不另存第二份名稱。
 *
 * 缺欄位不丟錯（避免整站在匯入時掛掉）：缺的欄位留空，由 validateAsuraSkillEntry／稽核測試判為不完整，
 * 解析器對不完整條目會丟 ASURA_INTERPRETATION_INCOMPLETE。
 */
import { SHENSHA_TEACHER_READINGS } from '@/lib/iching-shensha-teacher-readings';
import { APPROVED_BY_RULE_ID } from '../registry';
import { ASURA_CHAR_GLOSSARY } from './charGlossary';
import { ASURA_SEEDS, type AsuraPolarity } from './seeds';
import { ASURA_SKILL_VERSION } from './version';

export type { AsuraPolarity } from './seeds';

/** 解析器允許使用的證據種類（只有已驗證的後端事實；強弱、時間要等後端有驗證輸出才可加入）。 */
export type AsuraEvidenceKind = 'matched' | 'pillars';

export interface AsuraSkillEntry {
  asuraId: string;
  /** 後端神煞規則編號；目前與 asuraId 相同（編號就是來源編號）。 */
  sourceId: string;
  displayName: string;
  characterMeaning: { char1: string; char2: string; char3: string; char4: string };
  coreMeaning: string;
  domain: string[];
  polarity: AsuraPolarity;
  keywords: string[];
  /** 一句強宣告（短）。 */
  declarationTemplates: string[];
  /** 解讀本文；{pillar} 於執行時代入已驗證的柱位句。 */
  interpretationTemplates: string[];
  adviceTemplates: string[];
  warningTemplates: string[];
  battleTemplates: string[];
  allowedEvidence: AsuraEvidenceKind[];
  version: string;
}

const WARNING_BY_POLARITY: Record<AsuraPolarity, string[]> = {
  positive: ['福氣要有人接得住才算數：別把助力當成理所當然。'],
  dynamic: ['力道用過頭，容易傷到自己人：出手前先留一口氣。'],
  caution: ['這是提醒，不是定論：留一道備案，波折就只是轉個彎。'],
};

const BATTLE_BY_POLARITY: Record<AsuraPolarity, (theme: string) => string[]> = {
  positive: (t) => [
    `「${t}」是你的底牌：先認得它，再決定何時亮出來。`,
    `「${t}」在戰局裡是助力，用得穩，比用得滿更有效。`,
  ],
  dynamic: (t) => [
    `「${t}」是你的推進力：順勢出手，節奏由自己掌握。`,
    `「${t}」在戰局裡主動出擊，出手之前先看清方向。`,
  ],
  caution: (t) => [
    `「${t}」是這一局要先看清的地方：看清了是防線，看不清才會變破口。`,
    `「${t}」不是判決，是提醒：先預備，再出手。`,
  ],
};

function characterMeaningOf(displayName: string): AsuraSkillEntry['characterMeaning'] {
  const [c1 = '', c2 = '', c3 = '', c4 = ''] = [...displayName];
  const gloss = (c: string) => ASURA_CHAR_GLOSSARY[c] ?? '';
  return { char1: gloss(c1), char2: gloss(c2), char3: gloss(c3), char4: gloss(c4) };
}

function buildEntry(asuraId: string): AsuraSkillEntry {
  const seed = ASURA_SEEDS[asuraId];
  const reading = SHENSHA_TEACHER_READINGS[asuraId];
  const displayName = APPROVED_BY_RULE_ID[asuraId]?.displayName ?? '';
  const theme = reading?.theme ?? '';
  const imagery = reading?.imagery ?? '';
  const action = reading?.action ?? '';
  return {
    asuraId,
    sourceId: asuraId,
    displayName,
    characterMeaning: characterMeaningOf(displayName),
    coreMeaning: seed.coreMeaning,
    domain: [...seed.domain],
    polarity: seed.polarity,
    keywords: [...seed.keywords],
    declarationTemplates: theme ? [`${theme}。`] : [],
    interpretationTemplates: imagery
      ? [`${seed.coreMeaning}{pillar}${imagery}`, `${seed.coreMeaning}${imagery}{pillar}`]
      : [],
    adviceTemplates: action ? [action] : [],
    warningTemplates: WARNING_BY_POLARITY[seed.polarity],
    battleTemplates: theme ? BATTLE_BY_POLARITY[seed.polarity](theme) : [],
    allowedEvidence: ['matched', 'pillars'],
    version: ASURA_SKILL_VERSION,
  };
}

export const ASURA_SKILL_ENTRIES: Readonly<Record<string, AsuraSkillEntry>> = Object.freeze(
  Object.fromEntries(Object.keys(ASURA_SEEDS).map((id) => [id, buildEntry(id)])),
);

/** 條目缺哪些欄位（空陣列＝完整）。 */
export function missingFieldsOf(entry: AsuraSkillEntry | undefined): string[] {
  if (!entry) return ['entry'];
  const missing: string[] = [];
  const text = (key: string, value: string) => { if (!value || !value.trim()) missing.push(key); };
  const list = (key: string, value: readonly string[]) => {
    if (!value || value.length === 0 || value.some((v) => !v || !v.trim())) missing.push(key);
  };
  text('asuraId', entry.asuraId);
  text('sourceId', entry.sourceId);
  text('displayName', entry.displayName);
  for (const key of ['char1', 'char2', 'char3', 'char4'] as const) text(`characterMeaning.${key}`, entry.characterMeaning[key]);
  text('coreMeaning', entry.coreMeaning);
  list('domain', entry.domain);
  text('polarity', entry.polarity);
  list('keywords', entry.keywords);
  list('declarationTemplates', entry.declarationTemplates);
  list('interpretationTemplates', entry.interpretationTemplates);
  list('adviceTemplates', entry.adviceTemplates);
  list('warningTemplates', entry.warningTemplates);
  list('battleTemplates', entry.battleTemplates);
  list('allowedEvidence', entry.allowedEvidence);
  text('version', entry.version);
  return missing;
}
