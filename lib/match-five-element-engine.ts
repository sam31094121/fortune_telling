import { AI_CORE_JUDGEMENT_PRINCIPLE } from './ai-language-principle';
import {
  GENERATES as SHARED_GENERATES,
  CONTROLS as SHARED_CONTROLS,
  FIVE_ELEMENT_CODE_MAP,
  getFiveElementName,
  type BrandFiveElementCode,
} from './five-element-engine';

export type MatchFiveElementKey = 'earth' | 'water' | 'fire' | 'air' | 'space';

// Match's public API has always used lowercase keys (earth/water/fire/air/space)
// throughout app/match/page.tsx and the /api/match-generate response, so that
// external shape is kept unchanged. Internally, everything about *which*
// element generates/controls which, and what each is called, is derived from
// the shared lib/five-element-engine.ts (the same source bazi/zodiac/nameology/
// number use) instead of a second hand-maintained copy of the 相生相剋 cycle --
// previously this file duplicated that table independently, which is exactly
// the kind of drift risk (one gets updated, the other doesn't) that produces
// customer-visible contradictions between cards.
const MATCH_TO_BRAND: Record<MatchFiveElementKey, BrandFiveElementCode> = {
  earth: 'EARTH',
  water: 'WATER',
  fire: 'FIRE',
  air: 'AIR',
  space: 'SPACE',
};

const BRAND_TO_MATCH: Record<BrandFiveElementCode, MatchFiveElementKey> = {
  EARTH: 'earth',
  WATER: 'water',
  FIRE: 'fire',
  AIR: 'air',
  SPACE: 'space',
};

function deriveMatchTable(
  sharedTable: typeof SHARED_GENERATES,
): Record<MatchFiveElementKey, MatchFiveElementKey> {
  const result = {} as Record<MatchFiveElementKey, MatchFiveElementKey>;
  for (const [traditionalKey, info] of Object.entries(FIVE_ELEMENT_CODE_MAP)) {
    const fromMatchKey = BRAND_TO_MATCH[info.brandElement];
    const toTraditional = sharedTable[traditionalKey as keyof typeof sharedTable];
    const toMatchKey = BRAND_TO_MATCH[FIVE_ELEMENT_CODE_MAP[toTraditional].brandElement];
    result[fromMatchKey] = toMatchKey;
  }
  return result;
}

export type MatchFiveElementPersonResult = {
  name: string;
  primaryElement: MatchFiveElementKey;
  secondaryElement: MatchFiveElementKey;
  elementScores: Record<MatchFiveElementKey, number>;
  needScores: Record<MatchFiveElementKey, number>;
  reason: string;
  changeTarget: string;
};

export type MatchFiveElementResult = {
  engineVersion: 'match_five_element_v1';
  summary: string;
  relationMode: 'generating' | 'conflicting' | 'balancing';
  sharedElement: MatchFiveElementKey;
  sharedAction: string;
  relationReason: string;
  personA: MatchFiveElementPersonResult;
  personB: MatchFiveElementPersonResult;
  integratedAdvice: string;
  inlineHighlights: string[];
};

/** 這個人的真實五元素需求分數——來自八字引擎的 elementPriority（用神喜神＋五行強弱），
 * 不是生日數字雜湊出來的近似值。呼叫端（match-generate/route.ts）負責把 analyzeBazi() 的
 * elementPriority 轉成這個 Record，兩人共用同一份真實命盤資料，不會各算各的。 */
export type MatchElementNeedInput = {
  name: string;
  needScores: Record<MatchFiveElementKey, number>;
};

const ELEMENTS: MatchFiveElementKey[] = ['earth', 'water', 'fire', 'air', 'space'];

// Derived from the shared engine's getFiveElementName(), not hand-copied text --
// verified to produce byte-identical labels to the previous hard-coded map.
const ELEMENT_LABEL: Record<MatchFiveElementKey, string> = Object.fromEntries(
  ELEMENTS.map((key) => {
    const traditionalKey = (Object.entries(FIVE_ELEMENT_CODE_MAP).find(
      ([, info]) => info.brandElement === MATCH_TO_BRAND[key],
    ) as [keyof typeof FIVE_ELEMENT_CODE_MAP, unknown])[0];
    return [key, getFiveElementName(traditionalKey)];
  }),
) as Record<MatchFiveElementKey, string>;

const CHANGE_TARGET: Record<MatchFiveElementKey, string> = {
  earth: '\u95dc\u4fc2\u7684\u7a69\u5b9a\u611f\u3001\u627f\u8afe\u611f\u8207\u5b89\u5168\u611f',
  water: '\u6e9d\u901a\u67d4\u8edf\u5ea6\u3001\u60c5\u7dd2\u7406\u89e3\u8207\u63db\u4f4d\u601d\u8003',
  fire: '\u4e3b\u52d5\u8868\u9054\u3001\u71b1\u60c5\u4e92\u52d5\u8207\u95dc\u4fc2\u63a8\u9032\u529b',
  air: '\u5171\u540c\u6210\u9577\u3001\u751f\u6d3b\u7bc0\u594f\u8207\u672a\u4f86\u898f\u5283',
  space: '\u908a\u754c\u611f\u3001\u5c0a\u91cd\u611f\u8207\u6c7a\u7b56\u6e05\u6670\u5ea6',
};

const GENERATES: Record<MatchFiveElementKey, MatchFiveElementKey> = deriveMatchTable(SHARED_GENERATES);

const CONTROLS: Record<MatchFiveElementKey, MatchFiveElementKey> = deriveMatchTable(SHARED_CONTROLS);

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function rank(scores: Record<MatchFiveElementKey, number>) {
  return [...ELEMENTS].sort((a, b) => scores[b] - scores[a]);
}

function buildPersonResult(person: MatchElementNeedInput): MatchFiveElementPersonResult {
  const needScores = ELEMENTS.reduce((acc, element) => {
    acc[element] = clamp(person.needScores[element] ?? 0);
    return acc;
  }, {} as Record<MatchFiveElementKey, number>);
  // elementScores 只為型別相容保留（前端未使用）；數值就是需求分數的反面。
  const elementScores = ELEMENTS.reduce((acc, element) => {
    acc[element] = clamp(100 - needScores[element]);
    return acc;
  }, {} as Record<MatchFiveElementKey, number>);

  const needRank = rank(needScores);
  const primaryElement = needRank[0];
  const secondaryElement = needRank[1];
  const name = person.name.trim() || '\u4f7f\u7528\u8005';

  return {
    name,
    primaryElement,
    secondaryElement,
    elementScores,
    needScores,
    reason: `易經卜卦判定：${name}目前最缺${ELEMENT_LABEL[primaryElement]}。請優先補強${ELEMENT_LABEL[primaryElement]}。完成後再補${ELEMENT_LABEL[secondaryElement]}。判定來源為本人真實八字五行強弱與用神喜神分析。`,
    changeTarget: `補強${ELEMENT_LABEL[primaryElement]}，先校準${CHANGE_TARGET[primaryElement]}。`,
  };
}

function getRelationMode(a: MatchFiveElementKey, b: MatchFiveElementKey): MatchFiveElementResult['relationMode'] {
  if (GENERATES[a] === b || GENERATES[b] === a) return 'generating';
  if (CONTROLS[a] === b || CONTROLS[b] === a) return 'conflicting';
  return 'balancing';
}

function getSharedElement(personA: MatchFiveElementPersonResult, personB: MatchFiveElementPersonResult) {
  if (personA.primaryElement === personB.primaryElement) return personA.primaryElement;
  const mode = getRelationMode(personA.primaryElement, personB.primaryElement);
  if (mode === 'generating') {
    return personA.needScores[personA.primaryElement] >= personB.needScores[personB.primaryElement]
      ? personA.primaryElement
      : personB.primaryElement;
  }
  // 相剋／制衡都改用兩人真實需求分數加總最高者；相剋不再寫死固定答案，
  // 而是從兩人各自的真實八字需求裡，找出兩人共同都缺得最多的那一個。
  const combined = ELEMENTS.reduce((acc, element) => {
    acc[element] = personA.needScores[element] + personB.needScores[element];
    return acc;
  }, {} as Record<MatchFiveElementKey, number>);
  return rank(combined)[0];
}

export function buildMatchFiveElementResult(
  personAInput: MatchElementNeedInput,
  personBInput: MatchElementNeedInput,
): MatchFiveElementResult {
  const personA = buildPersonResult(personAInput);
  const personB = buildPersonResult(personBInput);
  const relationMode = getRelationMode(personA.primaryElement, personB.primaryElement);
  const sharedElement = getSharedElement(personA, personB);
  const modeText = relationMode === 'generating'
    ? '\u76ee\u524d\u5c6c\u65bc\u53ef\u76f8\u751f\u7684\u7d50\u69cb'
    : relationMode === 'conflicting'
      ? '\u76ee\u524d\u6709\u76f8\u514b\u6469\u64e6\uff0c\u4e00\u5b9a\u8981\u5148\u505a\u8abf\u548c'
      : '\u76ee\u524d\u5c6c\u65bc\u9700\u8981\u5e73\u8861\u7684\u7d50\u69cb';

  const sharedAction = `易經卜卦判定：兩人共同第一補強鎖定${ELEMENT_LABEL[sharedElement]}。請共同優先補強${ELEMENT_LABEL[sharedElement]}，先校準${CHANGE_TARGET[sharedElement]}。`;
  const summary = `易經卜卦判定：${personA.name}目前最缺${ELEMENT_LABEL[personA.primaryElement]}；${personB.name}目前最缺${ELEMENT_LABEL[personB.primaryElement]}。${sharedAction} ${AI_CORE_JUDGEMENT_PRINCIPLE}`;

  return {
    engineVersion: 'match_five_element_v1',
    summary,
    relationMode,
    sharedElement,
    sharedAction,
    relationReason: `${modeText}\uff1a${personA.name}\u7684\u4e3b\u7f3a\u70ba${ELEMENT_LABEL[personA.primaryElement]}\uff0c${personB.name}\u7684\u4e3b\u7f3a\u70ba${ELEMENT_LABEL[personB.primaryElement]}\u3002`,
    personA,
    personB,
    integratedAdvice: `本次靈魂配對的 5 元素結論：${summary} 平台只判定補強方向，不保證關係結果；請把補強方向落到日常溝通與共同節奏。`,
    inlineHighlights: [
      personA.reason,
      personB.reason,
      sharedAction,
      `${modeText}，所以補強不是只看一個人；兩個人都要補到正確位置。`,
    ],
  };
}
