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

type MatchPersonInput = {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
};

type MatchScoreInput = {
  match_score: number;
  resonance: number;
  communication: number;
  stability: number;
  conflict_risk: number;
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

const BLOOD_ELEMENT: Record<MatchPersonInput['bloodType'], MatchFiveElementKey> = {
  A: 'earth',
  B: 'air',
  AB: 'space',
  O: 'fire',
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: 2000, month: 1, day: 1 };
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function elementFromIndex(index: number) {
  return ELEMENTS[((index % ELEMENTS.length) + ELEMENTS.length) % ELEMENTS.length];
}

function add(scores: Record<MatchFiveElementKey, number>, element: MatchFiveElementKey, amount: number) {
  scores[element] = clamp(scores[element] + amount);
}

function rank(scores: Record<MatchFiveElementKey, number>) {
  return [...ELEMENTS].sort((a, b) => scores[b] - scores[a]);
}

function buildPersonResult(person: MatchPersonInput, scores: MatchScoreInput): MatchFiveElementPersonResult {
  const birth = parseBirthDate(person.birthDate);
  const elementScores: Record<MatchFiveElementKey, number> = {
    earth: 42,
    water: 42,
    fire: 42,
    air: 42,
    space: 42,
  };

  add(elementScores, elementFromIndex(birth.year + birth.month), 18);
  add(elementScores, elementFromIndex(birth.month + birth.day), 16);
  add(elementScores, elementFromIndex(birth.year + birth.day), 12);
  add(elementScores, BLOOD_ELEMENT[person.bloodType], 14);
  add(elementScores, person.gender === 'male' ? 'fire' : 'water', 6);

  if (scores.communication < 68) add(elementScores, 'water', -10);
  if (scores.stability < 68) add(elementScores, 'earth', -10);
  if (scores.resonance < 68) add(elementScores, 'fire', -8);
  if (scores.conflict_risk > 55) add(elementScores, 'space', -10);
  if (scores.match_score < 70) add(elementScores, 'air', -8);

  const needScores = ELEMENTS.reduce((acc, element) => {
    acc[element] = clamp(100 - elementScores[element]);
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
    reason: `AI 判定：${name}目前最缺${ELEMENT_LABEL[primaryElement]}。請優先補強${ELEMENT_LABEL[primaryElement]}。完成後再補${ELEMENT_LABEL[secondaryElement]}。判定來源為生日結構、血型節奏與本次配對分數交叉計算。`,
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
  if (mode === 'conflicting') return 'water';
  const combined = ELEMENTS.reduce((acc, element) => {
    acc[element] = personA.needScores[element] + personB.needScores[element];
    return acc;
  }, {} as Record<MatchFiveElementKey, number>);
  return rank(combined)[0];
}

export function buildMatchFiveElementResult(
  personAInput: MatchPersonInput,
  personBInput: MatchPersonInput,
  scores: MatchScoreInput,
): MatchFiveElementResult {
  const personA = buildPersonResult(personAInput, scores);
  const personB = buildPersonResult(personBInput, scores);
  const relationMode = getRelationMode(personA.primaryElement, personB.primaryElement);
  const sharedElement = getSharedElement(personA, personB);
  const modeText = relationMode === 'generating'
    ? '\u76ee\u524d\u5c6c\u65bc\u53ef\u76f8\u751f\u7684\u7d50\u69cb'
    : relationMode === 'conflicting'
      ? '\u76ee\u524d\u6709\u76f8\u514b\u6469\u64e6\uff0c\u4e00\u5b9a\u8981\u5148\u505a\u8abf\u548c'
      : '\u76ee\u524d\u5c6c\u65bc\u9700\u8981\u5e73\u8861\u7684\u7d50\u69cb';

  const sharedAction = `AI 判定：兩人共同第一補強鎖定${ELEMENT_LABEL[sharedElement]}。請共同優先補強${ELEMENT_LABEL[sharedElement]}，先校準${CHANGE_TARGET[sharedElement]}。`;
  const summary = `AI 判定：${personA.name}目前最缺${ELEMENT_LABEL[personA.primaryElement]}；${personB.name}目前最缺${ELEMENT_LABEL[personB.primaryElement]}。${sharedAction} ${AI_CORE_JUDGEMENT_PRINCIPLE}`;

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
