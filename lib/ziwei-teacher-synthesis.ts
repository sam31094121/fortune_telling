/**
 * 紫微老師合盤、命宮塔羅與年齡——後端計算，前端只顯示。
 *
 * 2026-09-15 米其林審查：這些原本寫在 app/insight/page.tsx，由瀏覽器自己
 * 選塔羅牌、組「老師完整判讀」的句子、算「你現在幾歲」——都是前端自己產生
 * 看起來像結論的東西（品質鐵律：前端不得自己編結論、自己算數字）。
 * 程式碼原封不動搬到這裡，改由 /api/insight-analyze 算好一起送出。
 * 守門：npm run test:ziwei-display-only
 */

import { TAROT_CARDS } from '@/features/tarot/data/cards';
import type { TarotAiElement, TarotCard } from '@/features/tarot/types';
import type { AdviceMatrix, AnnualFortuneAnalysis, AnnualPalaceFortune } from './annual-fortune-engine';
import type { ZiweiDestinyCard } from './ziwei-destiny-card';
import type { ZiweiCrossCheck, ZiweiFullPalaceEvidence, ZiweiSanFangAnalysis } from './ziwei-sanfang-engine';

export type ZiweiFullPalace = Pick<ZiweiFullPalaceEvidence, 'key' | 'name' | 'focus' | 'branch' | 'palaceStem' | 'majorStars' | 'minorStars' | 'transformations'>;
type ZiweiAnnualPalace = Pick<AnnualPalaceFortune, 'score' | 'trend' | 'focus' | 'advice' | 'encouragement' | 'action' | 'basis' | 'strengths' | 'tensions'>;
type ZiweiAnnualFortune = Pick<AnnualFortuneAnalysis, 'adviceMatrix' | 'overallScore' | 'level' | 'annualTheme' | 'recommendations'> & {
  motivation: Pick<AnnualFortuneAnalysis['motivation'], 'actionAdvice' | 'coreEncouragement' | 'growthReminder' | 'mainWarning'>;
  baziFocus: Pick<AnnualFortuneAnalysis['baziFocus'], 'advice'>;
};
type ZiweiAdviceMatrixKey = keyof AdviceMatrix;
type ZiweiCrossCheckItem = ZiweiCrossCheck;
export type ZiweiPalaceKey = typeof ZIWEI_TWELVE_PALACE_ORDER[number];

export const ZIWEI_TWELVE_PALACE_ORDER = [
  'MING',
  'XIONG_DI',
  'FU_QI',
  'ZI_NV',
  'CAI_BO',
  'JI_E',
  'QIAN_YI',
  'JIAO_YOU',
  'GUAN_LU',
  'TIAN_ZHAI',
  'FU_DE',
  'FU_MU',
] as const;

export const ZIWEI_PROFESSIONAL_SUPPORT_STARS = [
  { name: '左輔', group: '輔曜', role: '外來助力、團隊支援、貴人扶持。' },
  { name: '右弼', group: '輔曜', role: '內在協調、旁人補位、人脈支援。' },
  { name: '文昌', group: '文曜', role: '文書、考試、表達、制度化能力。' },
  { name: '文曲', group: '文曜', role: '才華、審美、溝通、感性表達。' },
  { name: '天魁', group: '貴人', role: '上位貴人、提拔、關鍵機會。' },
  { name: '天鉞', group: '貴人', role: '暗中助力、轉介、危中得助。' },
  { name: '祿存', group: '財祿', role: '固定資源、累積財庫、可守之祿。' },
  { name: '擎羊', group: '煞曜', role: '直接衝擊、競爭、傷口與突破壓力。' },
  { name: '陀羅', group: '煞曜', role: '拖延纏繞、阻力、慢性壓力。' },
  { name: '火星', group: '火煞', role: '急發事件、爆發力、短促壓力。' },
  { name: '鈴星', group: '火煞', role: '暗伏焦躁、突發聲響、內部張力。' },
  { name: '地空', group: '空劫', role: '空轉、抽離、想像與落差。' },
  { name: '地劫', group: '空劫', role: '耗損、失落、資源被切分。' },
  { name: '天馬', group: '動星', role: '移動、奔波、跨域、遠行變動。' },
] as const;

export const ZIWEI_PROFESSIONAL_TRANSFORMATIONS = [
  { name: '化祿', role: '資源流入、緣分增加、可用條件變多。' },
  { name: '化權', role: '責任放大、主導權提升、需要承擔決策。' },
  { name: '化科', role: '名聲、證照、保護力與可被看見的成果。' },
  { name: '化忌', role: '卡點、執著、壓力源與必須修正的漏洞。' },
] as const;

export const ZIWEI_FOURTEEN_MAJOR_STAR_MATERIAL = [
  { name: '紫微', element: '土', role: '帝座主星，主統御、承擔、整合全局。', keywords: ['領導', '核心', '責任'] },
  { name: '天機', element: '木', role: '智星，主思考、變化、策略與機動。', keywords: ['策略', '變通', '學習'] },
  { name: '太陽', element: '火', role: '陽曜，主外放、照亮、名聲與行動。', keywords: ['表達', '推進', '公眾'] },
  { name: '武曲', element: '金', role: '財星與執行星，主紀律、資源、決斷。', keywords: ['財務', '執行', '標準'] },
  { name: '天同', element: '水', role: '福星，主柔和、修復、享受與人情。', keywords: ['福氣', '療癒', '親和'] },
  { name: '廉貞', element: '火', role: '次桃花與規範星，主界線、慾望、制度與轉化。', keywords: ['界線', '轉化', '規範'] },
  { name: '天府', element: '土', role: '庫星，主承載、管理、資源保存與穩定。', keywords: ['資源', '穩定', '管理'] },
  { name: '太陰', element: '水', role: '陰曜，主內在、情感、累積、財庫與照顧。', keywords: ['感受', '累積', '照顧'] },
  { name: '貪狼', element: '木', role: '慾望與才藝星，主社交、吸引、創造與開拓。', keywords: ['魅力', '創造', '開拓'] },
  { name: '巨門', element: '水', role: '暗曜與口舌星，主辨析、表達、質疑與真相。', keywords: ['辨析', '溝通', '真相'] },
  { name: '天相', element: '水', role: '印星，主協調、制度、輔佐與公共形象。', keywords: ['協調', '制度', '輔佐'] },
  { name: '天梁', element: '土', role: '蔭星，主庇護、原則、長輩與危機解厄。', keywords: ['庇護', '原則', '解厄'] },
  { name: '七殺', element: '金', role: '將星，主突破、決斷、壓力與戰場能力。', keywords: ['突破', '決斷', '開局'] },
  { name: '破軍', element: '水', role: '耗星，主破舊立新、重組、冒險與改革。', keywords: ['重組', '改革', '破局'] },
] as const;

export const ZIWEI_PALACE_FALLBACK: Record<ZiweiPalaceKey, { name: string; focus: string }> = {
  MING: { name: '命', focus: '人格底色、人生主軸、決策方式與自我承擔。' },
  XIONG_DI: { name: '兄弟', focus: '手足同輩、合作支援、資源分配與橫向連結。' },
  FU_QI: { name: '夫妻', focus: '親密關係、伴侶互動、承諾模式與情感磨合。' },
  ZI_NV: { name: '子女', focus: '創造力、作品延伸、教養照顧與後續成果。' },
  CAI_BO: { name: '財帛', focus: '收入方式、金錢觀、資源轉換與財務節奏。' },
  JI_E: { name: '疾厄', focus: '身心壓力、健康警訊、能量消耗與修復能力。' },
  QIAN_YI: { name: '遷移', focus: '外部機會、遠方舞台、出行變動與環境適應。' },
  JIAO_YOU: { name: '交友', focus: '人脈圈層、合作對象、社群影響與貴人品質。' },
  GUAN_LU: { name: '官祿', focus: '職涯方向、專業定位、責任承擔與成就路徑。' },
  TIAN_ZHAI: { name: '田宅', focus: '家庭根基、居住環境、資產安全與內在安定。' },
  FU_DE: { name: '福德', focus: '精神狀態、內在滿足、休養品質與長期福分。' },
  FU_MU: { name: '父母', focus: '長輩關係、上級緣分、傳承支持與制度資源。' },
};

export function createZiweiFallbackPalace(key: ZiweiPalaceKey): ZiweiFullPalace {
  const fallback = ZIWEI_PALACE_FALLBACK[key];
  return {
    key,
    name: fallback.name,
    focus: fallback.focus,
    branch: '',
    palaceStem: '',
    majorStars: [],
    minorStars: [],
    transformations: [],
  };
}

export const ZIWEI_PALACE_ANNUAL_LENS: Record<string, { label: string; matrixKey: ZiweiAdviceMatrixKey; source: string }> = {
  MING: { label: '自我定位', matrixKey: 'confidence', source: '年度主軸回到命宮，需確認人生方向與行動承擔。' },
  XIONG_DI: { label: '同輩協作', matrixKey: 'communication', source: '年度訊號落在人際分工與同輩互助。' },
  FU_QI: { label: '關係磨合', matrixKey: 'relationshipAwareness', source: '年度重點牽動親密關係、承諾與互動模式。' },
  ZI_NV: { label: '成果養成', matrixKey: 'learningGrowth', source: '年度提醒把創造力與成果延伸穩定養成。' },
  CAI_BO: { label: '財務節奏', matrixKey: 'financialDiscipline', source: '年度重點落在收入、支出與資源配置。' },
  JI_E: { label: '身心修復', matrixKey: 'stressManagement', source: '年度提醒先穩住健康、壓力與日常節奏。' },
  QIAN_YI: { label: '外部機會', matrixKey: 'adaptability', source: '年度訊號指向移動、外界舞台與環境適應。' },
  JIAO_YOU: { label: '人脈品質', matrixKey: 'communication', source: '年度重點在圈層、合作對象與社群影響。' },
  GUAN_LU: { label: '事業落點', matrixKey: 'execution', source: '年度訊號要求職涯定位與專業輸出更具體。' },
  TIAN_ZHAI: { label: '安定根基', matrixKey: 'patience', source: '年度重點落在家庭、居住與長期資產安全。' },
  FU_DE: { label: '精神續航', matrixKey: 'stressManagement', source: '年度提醒重建休養、興趣與內在滋養。' },
  FU_MU: { label: '傳承資源', matrixKey: 'learningGrowth', source: '年度重點牽動長輩、制度、學習與文件資源。' },
};

export function getZiweiAnnualSignal(
  palaceKey: string,
  annualPalace?: ZiweiAnnualPalace,
  annual?: ZiweiAnnualFortune,
) {
  const lens = ZIWEI_PALACE_ANNUAL_LENS[palaceKey];
  const matrixScore = annual && lens ? annual.adviceMatrix[lens.matrixKey] : undefined;
  return {
    score: annualPalace?.score ?? matrixScore ?? annual?.overallScore ?? null,
    label: annualPalace?.trend ?? lens?.label ?? annual?.level ?? '年度訊號',
    focus: annualPalace?.focus ?? lens?.source ?? annual?.annualTheme ?? '年度主軸與十二宮位交叉觀察。',
    advice: annualPalace?.advice ?? annual?.motivation.actionAdvice,
    encouragement: annualPalace?.encouragement ?? annual?.motivation.coreEncouragement,
    action: annualPalace?.action ?? annual?.motivation.growthReminder,
    basis: annualPalace?.basis ?? annual?.baziFocus.advice,
    strengths: annualPalace?.strengths ?? annual?.recommendations.slice(0, 2) ?? [],
    tensions: annualPalace?.tensions ?? (annual ? [annual.motivation.mainWarning] : []),
    scoreSource: annualPalace ? '宮位年度分數' : lens ? '年度矩陣分數' : '整體年度分數',
  };
}

export function normalizeZiweiPalaceName(name: string) {
  const fallback = Object.values(ZIWEI_PALACE_FALLBACK).find((item) => item.name === name || item.name + '宮' === name);
  if (fallback) return fallback.name + '宮';
  const trimmed = (name || '').trim();
  if (!trimmed) return '宮位';
  return trimmed.endsWith('宮') ? trimmed : trimmed + '宮';
}

export const ZIWEI_DESTINY_ELEMENT_LABELS: Record<string, string> = {
  SPACE: '空',
  AIR: '風',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

export type ZiweiThreeHarmonyStructure = {
  origin: ZiweiFullPalace;
  harmonyA: ZiweiFullPalace;
  harmonyB: ZiweiFullPalace;
  opposite: ZiweiFullPalace;
};

export const ZIWEI_HARMONY_ZONE_LABEL = { origin: '本宮', harmonyA: '三合宮位', harmonyB: '三合宮位', opposite: '對宮' } as const;

/**
 * 三方四正幾何：以 ZIWEI_TWELVE_PALACE_ORDER 的環狀位置推算，
 * 三合＝本宮 ±4 位，對宮＝本宮 +6 位（例：命宮 0 → 財帛 4／官祿 8／遷移 6，與既有命財官遷排列一致）。
 */
export function getZiweiThreeHarmonyStructure(originKey: string, palaceMap: Map<string, ZiweiFullPalace>): ZiweiThreeHarmonyStructure {
  const originIndex = Math.max(0, ZIWEI_TWELVE_PALACE_ORDER.indexOf(originKey as ZiweiPalaceKey));
  const resolve = (offset: number) => {
    const key = ZIWEI_TWELVE_PALACE_ORDER[(originIndex + offset) % 12];
    return palaceMap.get(key) ?? createZiweiFallbackPalace(key);
  };
  return {
    origin: palaceMap.get(originKey) ?? createZiweiFallbackPalace(originKey as ZiweiPalaceKey),
    harmonyA: resolve(4),
    harmonyB: resolve(8),
    opposite: resolve(6),
  };
}

export function buildZiweiStarCombinationText(palace: ZiweiFullPalace): string {
  const palaceName = normalizeZiweiPalaceName(palace.name);
  if (!palace.majorStars.length) {
    return `${palaceName}未見十四主星坐守，本宮不硬斷單星，改以三方四正與四化訊號合看。`;
  }
  const materials = palace.majorStars.map((star) => ({ star, material: ZIWEI_FOURTEEN_MAJOR_STAR_MATERIAL.find((item) => item.name === star) }));
  if (materials.length === 1) {
    const { star, material } = materials[0];
    return material ? `${palaceName}由${star}單星坐守：${material.role}` : `${palaceName}由${star}坐守，星曜字典待補角色說明。`;
  }
  const parts = materials.map(({ star, material }) => (material ? `${star}（${material.role}）` : `${star}（字典待補）`));
  return `${palaceName}由${palace.majorStars.join('、')}同宮，需合看非單論：${parts.join('；')}。同宮不是相加，而是互相牽動，判讀要看兩星如何互相強化、制衡或轉化對方力量。`;
}

export function buildZiweiHarmonyTexts(structure: ZiweiThreeHarmonyStructure) {
  return (['origin', 'harmonyA', 'harmonyB', 'opposite'] as const).map((zoneKey) => {
    const palace = structure[zoneKey];
    const palaceName = normalizeZiweiPalaceName(palace.name);
    return {
      zoneKey,
      zoneLabel: ZIWEI_HARMONY_ZONE_LABEL[zoneKey],
      palaceName,
      stars: palace.majorStars.length ? palace.majorStars.join('、') : '無主星，借對宮判讀',
      text: buildZiweiStarCombinationText(palace),
    };
  });
}

export function normalizeZiweiTransformationMeta(raw: string) {
  const bare = raw.replace('化', '');
  return ZIWEI_PROFESSIONAL_TRANSFORMATIONS.find((item) => item.name === `化${bare}`) ?? null;
}

export function buildZiweiTransformationEffects(structure: ZiweiThreeHarmonyStructure) {
  const zones = (['origin', 'harmonyA', 'harmonyB', 'opposite'] as const).map((zoneKey) => ({ zoneKey, palace: structure[zoneKey] }));
  return zones.flatMap(({ zoneKey, palace }) =>
    palace.transformations.map((raw) => {
      const meta = normalizeZiweiTransformationMeta(raw);
      const palaceName = normalizeZiweiPalaceName(palace.name);
      const zoneLabel = ZIWEI_HARMONY_ZONE_LABEL[zoneKey];
      return {
        raw,
        palaceName,
        zoneLabel,
        text: meta ? `${zoneLabel}．${palaceName}見${meta.name}：${meta.role}` : `${zoneLabel}．${palaceName}見化${raw}，字典待補說明。`,
      };
    }),
  );
}

export type ZiweiTeacherTarotSlot = {
  slotKey: 'MING' | 'QIAN_YI' | 'GUAN_LU' | 'CAI_BO';
  slotTitle: string;
  palaceName: string;
  role: string;
  starBasis: string;
  cardId: string;
  cardName: string;
  cardNameEn: string;
  imageUrl: string;
  reason: string;
  chainText: string;
};

export const ZIWEI_TAROT_CARD_ZH: Record<string, string> = {
  'major-fool': '\u611a\u8005',
  'major-magician': '\u9b54\u8853\u5e2b',
  'major-high-priestess': '\u5973\u796d\u53f8',
  'major-empress': '\u5973\u7687',
  'major-emperor': '\u7687\u5e1d',
  'major-hierophant': '\u6559\u7687',
  'major-lovers': '\u6200\u4eba',
  'major-chariot': '\u6230\u8eca',
  'major-strength': '\u529b\u91cf',
  'major-hermit': '\u96b1\u8005',
  'major-wheel': '\u547d\u904b\u4e4b\u8f2a',
  'major-justice': '\u6b63\u7fa9',
  'major-hanged-man': '\u5012\u540a\u4eba',
  'major-death': '\u6b7b\u795e',
  'major-temperance': '\u7bc0\u5236',
  'major-devil': '\u60e1\u9b54',
  'major-tower': '\u9ad8\u5854',
  'major-star': '\u661f\u661f',
  'major-moon': '\u6708\u4eae',
  'major-sun': '\u592a\u967d',
  'major-judgement': '\u5be9\u5224',
  'major-world': '\u4e16\u754c',
  'minor-pentacles-ace': '\u9322\u5e63\u4e00',
  'minor-pentacles-three': '\u9322\u5e63\u4e09',
  'minor-pentacles-four': '\u9322\u5e63\u56db',
  'minor-pentacles-six': '\u9322\u5e63\u516d',
  'minor-pentacles-eight': '\u9322\u5e63\u516b',
  'minor-pentacles-ten': '\u9322\u5e63\u5341',
  'minor-pentacles-king': '\u9322\u5e63\u570b\u738b',
  'minor-swords-ace': '\u5bf6\u528d\u4e00',
  'minor-swords-queen': '\u5bf6\u528d\u7687\u540e',
  'minor-wands-six': '\u6b0a\u6756\u516d',
  'minor-wands-king': '\u6b0a\u6756\u570b\u738b',
  'minor-cups-queen': '\u8056\u676f\u7687\u540e',
};

export const ZIWEI_STAR_TAROT_CANDIDATES: Record<string, string[]> = {
  '\u7d2b\u5fae': ['major-emperor', 'major-world', 'major-justice'],
  '\u5929\u6a5f': ['major-magician', 'major-wheel', 'minor-swords-ace'],
  '\u592a\u967d': ['major-sun', 'major-chariot', 'minor-wands-six'],
  '\u6b66\u66f2': ['major-justice', 'minor-pentacles-king', 'minor-pentacles-four'],
  '\u5929\u540c': ['major-temperance', 'minor-cups-queen', 'major-star'],
  '\u5ec9\u8c9e': ['major-devil', 'major-justice', 'major-lovers'],
  '\u5929\u5e9c': ['major-empress', 'major-emperor', 'minor-pentacles-ten'],
  '\u592a\u9670': ['major-high-priestess', 'major-moon', 'minor-cups-queen'],
  '\u8caa\u72fc': ['major-devil', 'major-magician', 'major-fool'],
  '\u5de8\u9580': ['major-hermit', 'minor-swords-queen', 'major-moon'],
  '\u5929\u76f8': ['major-justice', 'major-hierophant', 'major-temperance'],
  '\u5929\u6881': ['major-hierophant', 'major-hermit', 'major-star'],
  '\u4e03\u6bba': ['major-chariot', 'major-tower', 'minor-wands-king'],
  '\u7834\u8ecd': ['major-tower', 'major-death', 'major-fool'],
};

export const ZIWEI_PALACE_TAROT_CANDIDATES: Record<ZiweiTeacherTarotSlot['slotKey'], string[]> = {
  MING: ['major-emperor', 'major-magician', 'major-strength', 'major-wheel'],
  QIAN_YI: ['major-chariot', 'major-world', 'major-fool', 'major-wheel'],
  GUAN_LU: ['major-emperor', 'major-hierophant', 'minor-pentacles-three', 'minor-pentacles-eight'],
  CAI_BO: ['minor-pentacles-king', 'minor-pentacles-ace', 'minor-pentacles-ten', 'minor-pentacles-six'],
};

export function findTarotCard(cardId: string): TarotCard | null {
  return TAROT_CARDS.find((card) => card.id === cardId) ?? null;
}

export function getZiweiStarTarotCandidates(stars: string[]) {
  return stars.flatMap((star) => {
    const normalized = Object.keys(ZIWEI_STAR_TAROT_CANDIDATES).find((key) => star.includes(key) || key.includes(star));
    return normalized ? ZIWEI_STAR_TAROT_CANDIDATES[normalized] : [];
  });
}

export function pickZiweiTarotCard(candidateIds: string[], used: Set<string>) {
  const candidates = [...candidateIds, 'major-wheel', 'major-world'];
  const id = candidates.find((candidate) => findTarotCard(candidate) && !used.has(candidate))
    ?? candidates.find((candidate) => findTarotCard(candidate))
    ?? 'major-wheel';
  used.add(id);
  return findTarotCard(id) ?? TAROT_CARDS[0];
}

// 命工卡專用：依命宮主星候選 + 命盤五行比例，從 78 張塔羅挑出最符合的一張（結果固定、可回溯）
export type DestinyTarotMatch = {
  cardId: string;
  imageUrl: string;
  cardNameZh: string;
  reason: string;
};

export function pickDestinyTarotCard(
  heroStarNames: string[],
  elementSignals: string[],
): DestinyTarotMatch {
  const starCandidateIds = getZiweiStarTarotCandidates(heroStarNames);
  const candidateIds = (starCandidateIds.length ? starCandidateIds : ['major-wheel', 'major-world'])
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const signals = elementSignals.filter((signal): signal is TarotAiElement =>
    signal === 'AIR' || signal === 'SPACE' || signal === 'WATER' || signal === 'FIRE' || signal === 'EARTH');

  // 星座比例原則：候選牌中，取五行權重與命盤訊號最貼合的那張
  let best: TarotCard | null = null;
  let bestScore = -1;
  candidateIds.forEach((id) => {
    const candidate = findTarotCard(id);
    if (!candidate) return;
    const score = signals.length
      ? signals.reduce((sum, signal) => sum + (candidate.elementWeights[signal] ?? 0), 0)
      : 0;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });

  const card = best ?? findTarotCard(candidateIds[0]) ?? TAROT_CARDS[0];
  const cardNameZh = ZIWEI_TAROT_CARD_ZH[card.id] ?? card.nameZh;
  const starText = heroStarNames.filter(Boolean).join('、') || '命宮主星';
  const elementText = signals.map((signal) => ZIWEI_DESTINY_ELEMENT_LABELS[signal] ?? signal).join('、');
  const reason = elementText
    ? `命宮主星「${starText}」對應星象，以五行比例（${elementText}）在候選塔羅中比對最貼近的一張。`
    : `命宮主星「${starText}」對應星象，依十四主星原則對到這張塔羅。`;

  return { cardId: card.id, cardNameZh, imageUrl: card.imageUrl, reason };
}

export function buildZiweiTeacherTarotBridge(structure: ZiweiThreeHarmonyStructure): ZiweiTeacherTarotSlot[] {
  const used = new Set<string>();
  const slots = [
    {
      slotKey: 'MING' as const,
      slotTitle: '\u7b2c\u4e00\u5f35\uff1a\u547d\u5bae\u5854\u7f85\u724c',
      role: '\u5148\u5b9a\u547d\u4e3b\u6838\u5fc3\uff1a\u9019\u500b\u4eba\u7528\u4ec0\u9ebc\u65b9\u5f0f\u9762\u5c0d\u4eba\u751f\u3002',
      chainText: '\u547d\u5bae\u662f\u4e3b\u8ef8\uff0c\u5f8c\u9762\u4e09\u5f35\u724c\u90fd\u8981\u56de\u4f86\u652f\u6490\u9019\u500b\u4e3b\u661f\u6027\u683c\u3002',
      palace: structure.origin,
    },
    {
      slotKey: 'QIAN_YI' as const,
      slotTitle: '\u7b2c\u4e8c\u5f35\uff1a\u9077\u79fb\u5bae\u5854\u7f85\u724c',
      role: '\u518d\u770b\u5916\u754c\u821e\u53f0\uff1a\u5916\u754c\u5982\u4f55\u56de\u61c9\u547d\u4e3b\u3002',
      chainText: '\u9077\u79fb\u5bae\u662f\u5c0d\u5bae\uff0c\u5b83\u4e0d\u6539\u8b8a\u547d\u5bae\uff0c\u800c\u662f告訴你走出去後\u6703\u9047\u5230\u4ec0\u9ebc\u5834\u57df\u3002',
      palace: structure.opposite,
    },
    {
      slotKey: 'GUAN_LU' as const,
      slotTitle: '\u7b2c\u4e09\u5f35\uff1a\u5b98\u797f\u5bae\u5854\u7f85\u724c',
      role: '\u7b2c\u4e09\u770b\u4e8b\u696d\u8def\u7dda\uff1a\u80fd\u529b\u5982\u4f55\u843d\u6210\u8cac\u4efb\u8207\u6210\u5c31\u3002',
      chainText: '\u5b98\u797f\u5bae\u628a\u547d\u5bae\u7684\u6027\u683c\u8f49\u6210\u5de5\u4f5c\u65b9\u6cd5\uff0c\u662f\u300c\u6211\u80fd\u505a\u4ec0\u9ebc\u300d\u7684\u7b54\u6848\u3002',
      palace: structure.harmonyB,
    },
    {
      slotKey: 'CAI_BO' as const,
      slotTitle: '\u7b2c\u56db\u5f35\uff1a\u8ca1\u5e1b\u5bae\u5854\u7f85\u724c',
      role: '\u6700\u5f8c\u770b\u8cc7\u6e90\u8f49\u5316\uff1a\u80fd\u529b\u80fd\u4e0d\u80fd\u8b8a\u6210\u6536\u5165\u8207\u7a69\u5b9a\u7d2f\u7a4d\u3002',
      chainText: '\u8ca1\u5e1b\u5bae\u662f\u843d\u5730\u9ede\uff0c\u5b83\u628a\u547d\u5bae\u3001\u9077\u79fb\u3001\u5b98\u797f\u4e32\u6210\u53ef\u7528\u8cc7\u6e90\u3002',
      palace: structure.harmonyA,
    },
  ];

  return slots.map((slot) => {
    const starCandidates = getZiweiStarTarotCandidates(slot.palace.majorStars);
    const card = pickZiweiTarotCard([...starCandidates, ...ZIWEI_PALACE_TAROT_CANDIDATES[slot.slotKey]], used);
    const starBasis = slot.palace.majorStars.join('\u3001') || '\u7121\u4e3b\u661f\uff0c\u501f\u4e09\u65b9\u56db\u6b63';
    const palaceName = normalizeZiweiPalaceName(slot.palace.name);
    const cardName = ZIWEI_TAROT_CARD_ZH[card.id] ?? card.nameZh;
    return {
      slotKey: slot.slotKey,
      slotTitle: slot.slotTitle,
      palaceName,
      role: slot.role,
      starBasis,
      cardId: card.id,
      cardName,
      cardNameEn: card.nameEn,
      imageUrl: card.imageUrl,
      reason: `${palaceName}\u4ee5\u300c${starBasis}\u300d\u70ba\u4e3b\u8ef8\uff0c\u5f9e 78 \u5f35\u724c\u4e2d\u9078\u300c${cardName}\u300d\u4f5c\u70ba\u5716\u50cf\u8f14\u52a9\u3002`,
      chainText: slot.chainText,
    };
  });
}

export function buildZiweiSupportStarLines(structure: ZiweiThreeHarmonyStructure): string[] {
  const zones = (['origin', 'harmonyA', 'harmonyB', 'opposite'] as const).map((zoneKey) => ({ zoneKey, palace: structure[zoneKey] }));
  const lines = zones.flatMap(({ zoneKey, palace }) =>
    palace.minorStars.map((star) => {
      const meta = ZIWEI_PROFESSIONAL_SUPPORT_STARS.find((item) => item.name === star);
      const palaceName = normalizeZiweiPalaceName(palace.name);
      const zoneLabel = ZIWEI_HARMONY_ZONE_LABEL[zoneKey];
      return meta ? `${zoneLabel}${palaceName}：${star}（${meta.group}．${meta.role}）` : `${zoneLabel}${palaceName}：${star}`;
    }),
  );
  return lines.length ? lines.slice(0, 8) : ['本宮與三方四正輔星未集中顯示，判讀以主星與四化為主，不補星。'];
}

/**
 * 老師專業解析合成器：本宮→主星組合→三方四正→四化→輔煞→老師合盤總結。
 * 只讀後端已回傳的命盤資料（allPalaces / crossChecks / annualPalace），不生成命盤沒有的星曜或宮位。
 */
export function buildZiweiTeacherSynthesis(
  originKey: string,
  palaceMap: Map<string, ZiweiFullPalace>,
  annualPalace: ZiweiAnnualPalace | undefined,
  crossCheck: ZiweiCrossCheckItem | null,
  annual: ZiweiAnnualFortune | undefined,
) {
  const structure = getZiweiThreeHarmonyStructure(originKey, palaceMap);
  const originName = normalizeZiweiPalaceName(structure.origin.name);
  const harmonyTexts = buildZiweiHarmonyTexts(structure);
  const transformationEffects = buildZiweiTransformationEffects(structure);
  const supportStarLines = buildZiweiSupportStarLines(structure);
  const annualSignal = getZiweiAnnualSignal(originKey, annualPalace, annual);
  const tarotBridge = buildZiweiTeacherTarotBridge(structure);

  const taboo = transformationEffects.find((item) => item.raw.includes('忌'));
  const positive = transformationEffects.filter((item) => item.raw.includes('祿') || item.raw.includes('權') || item.raw.includes('科'));

  const strength = positive.length
    ? `三方四正內見 ${positive.length} 處祿權科：${positive.map((item) => `${item.zoneLabel}${item.palaceName}`).join('、')}，屬於可用資源與擴張力道。`
    : '三方四正未見祿權科進駐，力量以主星本質與輔星為主，擴張力道較保守。';

  const structuralRisk = taboo
    ? `${taboo.zoneLabel}${taboo.palaceName}見化忌，是這一圈最需要留意的卡點：${taboo.text}`
    : '三方四正未見化忌，暫無明顯卡點訊號，仍以主星特質與輔星組合為觀察重點。';

  const currentTheme = annualPalace
    ? `年度訊號落在${originName}：${annualPalace.focus ?? '流年主題與本宮呼應'}${typeof annualPalace.score === 'number' ? `（年度分數 ${annualPalace.score}）` : ''}。`
    : `本次未提供${originName}的流年比對資料，先以命盤結構為主，不另行推測流年。`;

  const teacherAdvice = [buildZiweiStarCombinationText(structure.origin), strength, structuralRisk].join(' ');

  return {
    originName,
    structure,
    harmonyTexts,
    transformationEffects,
    supportStarLines,
    tarotBridge,
    crossCheck,
    annualSignal,
    corePattern: `${originName}三方四正：${harmonyTexts.map((item) => item.palaceName).join('、')}`,
    strength,
    structuralRisk,
    currentTheme,
    teacherAdvice,
  };
}

export type ZiweiTeacherSynthesis = ReturnType<typeof buildZiweiTeacherSynthesis>;

/** 以台北日期計算足歲。生日無效或不合理就回 null，不猜。 */
export function ageOnDate(birthDate: string, now: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  const today = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  let age = Number(today.year) - year;
  if (Number(today.month) < month || (Number(today.month) === month && Number(today.day) < day)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export interface ZiweiCustomerReadings {
  /** 十二宮各自的老師合盤；未確認時辰時為空物件，不替客戶猜命宮。 */
  teacherSynthesisByPalace: Record<string, ZiweiTeacherSynthesis>;
  destinyTarot: DestinyTarotMatch | null;
  subjectAge: number | null;
}

export function buildZiweiCustomerReadings(input: {
  chart?: ZiweiSanFangAnalysis | null;
  annual?: AnnualFortuneAnalysis | null;
  destinyCard?: ZiweiDestinyCard | null;
  birthDate: string;
  now?: Date;
}): ZiweiCustomerReadings {
  const subjectAge = ageOnDate(input.birthDate, input.now);
  const chart = input.chart;
  if (!chart || chart.timeConfidence !== 'exact') return { teacherSynthesisByPalace: {}, destinyTarot: null, subjectAge };

  const source: ZiweiFullPalace[] = chart.allPalaces?.length ? chart.allPalaces : chart.palaces;
  const palaceMap = new Map<string, ZiweiFullPalace>(source.map((palace) => [palace.key, palace]));
  const teacherSynthesisByPalace: Record<string, ZiweiTeacherSynthesis> = {};
  for (const key of ZIWEI_TWELVE_PALACE_ORDER) {
    if (!palaceMap.has(key)) continue;
    const annualPalace = input.annual?.sanFangFourZheng?.find((item) => item.palaceKey === key);
    const crossCheck = chart.crossChecks?.find((item) => item.palaceKey === key) ?? null;
    teacherSynthesisByPalace[key] = buildZiweiTeacherSynthesis(key, palaceMap, annualPalace, crossCheck, input.annual ?? undefined);
  }

  const card = input.destinyCard;
  const destinyTarot = card
    ? pickDestinyTarotCard(card.heroStars.map((star) => star.name), card.visualTheme.elementSignals)
    : null;
  return { teacherSynthesisByPalace, destinyTarot, subjectAge };
}
