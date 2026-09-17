import {
  GENERATES as SHARED_GENERATES,
  CONTROLS as SHARED_CONTROLS,
  FIVE_ELEMENT_CODE_MAP,
  FIVE_ELEMENT_DEFINITIONS,
  getFiveElementName,
  type BrandFiveElementCode,
  type FiveElementKey,
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
//
// 2026-09-17 米其林審查：配對頁的星軌圖曾在前端另寫一套生剋循環（畫出「空剋水」「水生火」），
// 跟這裡算出的「水剋火＝相剋」在同一屏打架。生剋圈、共同元素的上下游、補強排序現在都由這裡算好
// 放進 orbit 送出，前端只照畫。守門：npm run test:soul-match
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

/** 每個元素的說明卡（點星時顯示）。這是元素本身的意義，不因人而異。 */
export type MatchElementGuide = {
  label: string;
  short: string;
  /** 對應的傳統五行（空＝金、風＝木、地＝土）。 */
  traditional: string;
  title: string;
  story: string;
  benefit: string;
  friction: string;
  action: string;
};

export type MatchFiveElementOrbit = {
  /** 相生一圈，首尾相同：空（金）生水、水生風（木）、風生火、火生地（土）、地生空。 */
  generatingCycle: MatchFiveElementKey[];
  /** 相剋一圈，首尾相同：空剋風、風剋地、地剋水、水剋火、火剋空。 */
  controllingCycle: MatchFiveElementKey[];
  /** 共同先補元素在生剋圈裡的上下游。 */
  shared: {
    generatedBy: MatchFiveElementKey;
    generates: MatchFiveElementKey;
    controlledBy: MatchFiveElementKey;
    controls: MatchFiveElementKey;
  };
  /** 兩人平均補強值由高到低；同分時共同先補元素排前面。 */
  ranking: Array<{ element: MatchFiveElementKey; averageNeed: number }>;
  cycleNote: string;
  mappingNote: string;
};

export type MatchFiveElementResult = {
  engineVersion: 'match_five_element_v2';
  summary: string;
  relationMode: 'generating' | 'conflicting' | 'balancing';
  /** 兩人各自最需要補的元素之間的生剋，例如「水剋火」。 */
  relationPair: string;
  relationTitle: string;
  relationStory: string;
  relationFocus: string;
  sharedElement: MatchFiveElementKey;
  /** 共同先補元素是怎麼選出來的。 */
  sharedReason: string;
  sharedAction: string;
  relationReason: string;
  personA: MatchFiveElementPersonResult;
  personB: MatchFiveElementPersonResult;
  integratedAdvice: string;
  inlineHighlights: string[];
  orbit: MatchFiveElementOrbit;
  elementGuide: Record<MatchFiveElementKey, MatchElementGuide>;
  /** 判讀依據與上限。 */
  basisNote: string;
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
const TRADITIONAL_KEY: Record<MatchFiveElementKey, FiveElementKey> = Object.fromEntries(
  ELEMENTS.map((key) => [
    key,
    (Object.entries(FIVE_ELEMENT_CODE_MAP).find(([, info]) => info.brandElement === MATCH_TO_BRAND[key]) as [FiveElementKey, unknown])[0],
  ]),
) as Record<MatchFiveElementKey, FiveElementKey>;

const ELEMENT_LABEL: Record<MatchFiveElementKey, string> = Object.fromEntries(
  ELEMENTS.map((key) => [key, getFiveElementName(TRADITIONAL_KEY[key])]),
) as Record<MatchFiveElementKey, string>;

const ELEMENT_SHORT: Record<MatchFiveElementKey, string> = Object.fromEntries(
  ELEMENTS.map((key) => [key, ELEMENT_LABEL[key].replace('元素', '')]),
) as Record<MatchFiveElementKey, string>;

const ELEMENT_TRADITIONAL_ZH: Record<MatchFiveElementKey, string> = Object.fromEntries(
  ELEMENTS.map((key) => [key, FIVE_ELEMENT_DEFINITIONS[TRADITIONAL_KEY[key]].zh]),
) as Record<MatchFiveElementKey, string>;

/** 「空（金）」這種寫法：名稱跟傳統五行不同時才加括號。 */
function withTraditional(key: MatchFiveElementKey) {
  return ELEMENT_SHORT[key] === ELEMENT_TRADITIONAL_ZH[key] ? ELEMENT_SHORT[key] : `${ELEMENT_SHORT[key]}（${ELEMENT_TRADITIONAL_ZH[key]}）`;
}

const CHANGE_TARGET: Record<MatchFiveElementKey, string> = {
  earth: '關係的穩定感、承諾感與安全感',
  water: '溝通柔軟度、情緒理解與換位思考',
  fire: '主動表達、熱情互動與關係推進力',
  air: '共同成長、生活節奏與未來規劃',
  space: '邊界感、尊重感與決策清晰度',
};

const ELEMENT_GUIDE_COPY: Record<MatchFiveElementKey, Omit<MatchElementGuide, 'label' | 'short' | 'traditional'>> = {
  space: {
    title: '界線、視野與距離感',
    story: '空元素代表兩人之間的呼吸空間。它讓關係有全局感，也讓彼此知道靠近與保留的界線。',
    benefit: '把空元素補起來，比較能尊重彼此，不容易把在意變成壓迫或猜測。',
    friction: '空不足時，容易黏得太緊、想太多，或一方突然抽離，另一方感到不安。',
    action: '約定彼此需要的陪伴頻率、獨處時間與安全感界線，各自說一句明確的答案。',
  },
  air: {
    title: '溝通、理解與轉念',
    story: '風元素代表訊號與語言。它關係到兩人能不能把心裡的畫面翻成對方聽得懂的話。',
    benefit: '把風元素補起來，誤會比較容易被說開，互動會更輕、更清楚。',
    friction: '風不足時，話容易卡住；風太亂時，容易講很多卻沒有真正靠近。',
    action: '每次摩擦先說一句重點：我在意的是什麼，我希望你怎麼回應。',
  },
  water: {
    title: '情緒、共感與修復',
    story: '水元素代表感受的流動。它讓關係不只爭對錯，而是能不能聽見彼此真正受傷的地方。',
    benefit: '把水元素補起來，比較願意示弱，也比較願意安撫與修復。',
    friction: '水不足時容易冷處理；水太混濁時，小情緒容易累積成大委屈。',
    action: '先接住情緒再談解法：「我知道你會難受，我們一起看下一步。」',
  },
  fire: {
    title: '熱度、主動與推進',
    story: '火元素代表心動與行動力。它讓關係有主動表達、有熱情，也有往前走的勇氣。',
    benefit: '把火元素補起來，比較不會只是等待，而會主動創造靠近的時刻。',
    friction: '火不足時關係容易冷；火太急時，一方想衝、一方想退，容易吵起來。',
    action: '用小行動補火：主動邀約、主動讚美、主動確認下一次見面。',
  },
  earth: {
    title: '穩定、承諾與落地',
    story: '地元素代表關係的地基。它讓感覺變成可靠的日常，讓承諾不只停在口頭。',
    benefit: '把地元素補起來，比較有安全感，也比較容易把未來規劃落實。',
    friction: '地不足時，容易不安、拖延、遲遲沒有承諾；地太重時，容易固執與壓迫。',
    action: '把承諾變小、變具體：固定聯絡、固定見面、固定完成一件共同的事。',
  },
};

const GENERATES: Record<MatchFiveElementKey, MatchFiveElementKey> = deriveMatchTable(SHARED_GENERATES);

const CONTROLS: Record<MatchFiveElementKey, MatchFiveElementKey> = deriveMatchTable(SHARED_CONTROLS);

/** 從空出發沿著表走一圈（首尾相同），圈的順序完全由共用生剋表決定。 */
function cycleFrom(table: Record<MatchFiveElementKey, MatchFiveElementKey>, start: MatchFiveElementKey = 'space') {
  const cycle: MatchFiveElementKey[] = [start];
  let current = start;
  for (let index = 0; index < ELEMENTS.length; index += 1) {
    current = table[current];
    cycle.push(current);
  }
  return cycle;
}

function inverse(table: Record<MatchFiveElementKey, MatchFiveElementKey>, target: MatchFiveElementKey) {
  return ELEMENTS.find((element) => table[element] === target) as MatchFiveElementKey;
}

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
  const name = person.name.trim() || '使用者';

  return {
    name,
    primaryElement,
    secondaryElement,
    elementScores,
    needScores,
    reason: `依${name}的八字五行強弱與用神喜神計算：目前最需要補${ELEMENT_LABEL[primaryElement]}，其次是${ELEMENT_LABEL[secondaryElement]}。`,
    changeTarget: `補的時候，可以先從${CHANGE_TARGET[primaryElement]}開始。`,
  };
}

function getRelationMode(a: MatchFiveElementKey, b: MatchFiveElementKey): MatchFiveElementResult['relationMode'] {
  if (GENERATES[a] === b || GENERATES[b] === a) return 'generating';
  if (CONTROLS[a] === b || CONTROLS[b] === a) return 'conflicting';
  return 'balancing';
}

function getRelationPair(a: MatchFiveElementKey, b: MatchFiveElementKey) {
  if (a === b) return `兩人都是${ELEMENT_SHORT[a]}`;
  if (GENERATES[a] === b) return `${ELEMENT_SHORT[a]}生${ELEMENT_SHORT[b]}`;
  if (GENERATES[b] === a) return `${ELEMENT_SHORT[b]}生${ELEMENT_SHORT[a]}`;
  if (CONTROLS[a] === b) return `${ELEMENT_SHORT[a]}剋${ELEMENT_SHORT[b]}`;
  return `${ELEMENT_SHORT[b]}剋${ELEMENT_SHORT[a]}`;
}

function combinedNeed(personA: MatchFiveElementPersonResult, personB: MatchFiveElementPersonResult) {
  return ELEMENTS.reduce((acc, element) => {
    acc[element] = personA.needScores[element] + personB.needScores[element];
    return acc;
  }, {} as Record<MatchFiveElementKey, number>);
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
  return rank(combinedNeed(personA, personB))[0];
}

function getSharedReason(personA: MatchFiveElementPersonResult, personB: MatchFiveElementPersonResult, sharedElement: MatchFiveElementKey) {
  const label = ELEMENT_LABEL[sharedElement];
  if (personA.primaryElement === personB.primaryElement) return `兩人最需要補的都是${label}，所以一起先補${label}。`;
  if (getRelationMode(personA.primaryElement, personB.primaryElement) === 'generating') {
    const owner = sharedElement === personA.primaryElement ? personA : personB;
    return `兩人最需要補的元素相生（${getRelationPair(personA.primaryElement, personB.primaryElement)}），先補需求分數較高的${label}（${owner.name} ${owner.needScores[sharedElement]}）。`;
  }
  return `兩人最需要補的元素相剋，所以改看兩人補強需求加總：最高的是${label}。`;
}

function buildRanking(personA: MatchFiveElementPersonResult, personB: MatchFiveElementPersonResult, sharedElement: MatchFiveElementKey) {
  const combined = combinedNeed(personA, personB);
  return [...ELEMENTS]
    .sort((a, b) => combined[b] - combined[a] || Number(b === sharedElement) - Number(a === sharedElement))
    .map((element) => ({ element, averageNeed: Math.round(combined[element] / 2) }));
}

const RELATION_COPY: Record<MatchFiveElementResult['relationMode'], (pair: string, shared: string) => { title: string; story: string; focus: string }> = {
  generating: (pair, shared) => ({
    title: '補強方向相生',
    story: `兩人最需要補的元素在五行裡相生（${pair}）：一方補起來，也比較容易帶動另一方。`,
    focus: `先一起把${shared}補起來，再各自補自己的第二順位。`,
  }),
  conflicting: (pair, shared) => ({
    title: '補強方向相剋',
    story: `兩人最需要補的元素在五行裡相剋（${pair}）。這說的是補強的先後，不代表感情一定有摩擦：一起補的時候要輪流，別讓一方的補法壓過另一方。`,
    focus: `先一起補好${shared}，再輪流照顧各自最缺的元素。`,
  }),
  balancing: (pair, shared) => ({
    title: '補強方向相同',
    story: `兩人最需要補的元素相同（${pair}）：同一件事一起做，彼此最容易感受到變化。`,
    focus: `把${shared}當成兩人的共同練習。`,
  }),
};

export function buildMatchFiveElementResult(
  personAInput: MatchElementNeedInput,
  personBInput: MatchElementNeedInput,
): MatchFiveElementResult {
  const personA = buildPersonResult(personAInput);
  const personB = buildPersonResult(personBInput);
  const relationMode = getRelationMode(personA.primaryElement, personB.primaryElement);
  const relationPair = getRelationPair(personA.primaryElement, personB.primaryElement);
  const sharedElement = getSharedElement(personA, personB);
  const sharedLabel = ELEMENT_LABEL[sharedElement];
  const relationCopy = RELATION_COPY[relationMode](relationPair, sharedLabel);

  const sharedAction = `兩人共同先補${sharedLabel}：可以先從${CHANGE_TARGET[sharedElement]}開始。`;
  const summary = `${personA.name}最需要補${ELEMENT_LABEL[personA.primaryElement]}，${personB.name}最需要補${ELEMENT_LABEL[personB.primaryElement]}。${sharedAction}`;
  const basisNote = '五元素補強方向依兩人各自的八字五行強弱與用神喜神計算，是給相處的參考方向，不是關係結果的預測。';
  const orbitShared = {
    generatedBy: inverse(GENERATES, sharedElement),
    generates: GENERATES[sharedElement],
    controlledBy: inverse(CONTROLS, sharedElement),
    controls: CONTROLS[sharedElement],
  };

  return {
    engineVersion: 'match_five_element_v2',
    summary,
    relationMode,
    relationPair,
    relationTitle: relationCopy.title,
    relationStory: relationCopy.story,
    relationFocus: relationCopy.focus,
    sharedElement,
    sharedReason: getSharedReason(personA, personB, sharedElement),
    sharedAction,
    relationReason: `兩人各自最需要補的元素，在五行裡是「${relationPair}」。`,
    personA,
    personB,
    integratedAdvice: `${summary}${basisNote}`,
    inlineHighlights: [personA.reason, personB.reason, sharedAction, relationCopy.story],
    orbit: {
      generatingCycle: cycleFrom(GENERATES),
      controllingCycle: cycleFrom(CONTROLS),
      shared: orbitShared,
      ranking: buildRanking(personA, personB, sharedElement),
      cycleNote: `傳統五行生剋：生${ELEMENT_SHORT[sharedElement]}的是${withTraditional(orbitShared.generatedBy)}，${ELEMENT_SHORT[sharedElement]}再生${withTraditional(orbitShared.generates)}；剋${ELEMENT_SHORT[sharedElement]}的是${withTraditional(orbitShared.controlledBy)}，${ELEMENT_SHORT[sharedElement]}剋${withTraditional(orbitShared.controls)}。這是元素之間的關係圖，不是兩人之間正在發生的事。`,
      mappingNote: `本站五元素對應傳統五行：${(['space', 'air', 'water', 'fire', 'earth'] as MatchFiveElementKey[]).map((key) => `${ELEMENT_SHORT[key]}＝${ELEMENT_TRADITIONAL_ZH[key]}`).join('、')}。`,
    },
    elementGuide: Object.fromEntries(
      ELEMENTS.map((key) => [key, { label: ELEMENT_LABEL[key], short: ELEMENT_SHORT[key], traditional: ELEMENT_TRADITIONAL_ZH[key], ...ELEMENT_GUIDE_COPY[key] }]),
    ) as Record<MatchFiveElementKey, MatchElementGuide>,
    basisNote,
  };
}
