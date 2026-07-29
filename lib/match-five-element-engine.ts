export type MatchFiveElementKey = 'earth' | 'water' | 'fire' | 'wind' | 'space';

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

const ELEMENTS: MatchFiveElementKey[] = ['earth', 'water', 'fire', 'wind', 'space'];

const ELEMENT_LABEL: Record<MatchFiveElementKey, string> = {
  earth: '\u5730\u5143\u7d20',
  water: '\u6c34\u5143\u7d20',
  fire: '\u706b\u5143\u7d20',
  wind: '\u98a8\u5143\u7d20',
  space: '\u7a7a\u5143\u7d20',
};

const CHANGE_TARGET: Record<MatchFiveElementKey, string> = {
  earth: '\u95dc\u4fc2\u7684\u7a69\u5b9a\u611f\u3001\u627f\u8afe\u611f\u8207\u5b89\u5168\u611f',
  water: '\u6e9d\u901a\u67d4\u8edf\u5ea6\u3001\u60c5\u7dd2\u7406\u89e3\u8207\u63db\u4f4d\u601d\u8003',
  fire: '\u4e3b\u52d5\u8868\u9054\u3001\u71b1\u60c5\u4e92\u52d5\u8207\u95dc\u4fc2\u63a8\u9032\u529b',
  wind: '\u5171\u540c\u6210\u9577\u3001\u751f\u6d3b\u7bc0\u594f\u8207\u672a\u4f86\u898f\u5283',
  space: '\u908a\u754c\u611f\u3001\u5c0a\u91cd\u611f\u8207\u6c7a\u7b56\u6e05\u6670\u5ea6',
};

const GENERATES: Record<MatchFiveElementKey, MatchFiveElementKey> = {
  wind: 'fire',
  fire: 'earth',
  earth: 'space',
  space: 'water',
  water: 'wind',
};

const CONTROLS: Record<MatchFiveElementKey, MatchFiveElementKey> = {
  wind: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'space',
  space: 'wind',
};

const BLOOD_ELEMENT: Record<MatchPersonInput['bloodType'], MatchFiveElementKey> = {
  A: 'earth',
  B: 'wind',
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
    wind: 42,
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
  if (scores.match_score < 70) add(elementScores, 'wind', -8);

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
    reason: `${name}\u76ee\u524d\u6700\u7f3a${ELEMENT_LABEL[primaryElement]}\uff0c\u7b2c\u4e8c\u9806\u4f4d\u662f${ELEMENT_LABEL[secondaryElement]}\u3002\u5224\u5b9a\u4f86\u6e90\u70ba\u751f\u65e5\u7d50\u69cb\u3001\u8840\u578b\u7bc0\u594f\u8207\u672c\u6b21\u914d\u5c0d\u5206\u6578\u4ea4\u53c9\u8a08\u7b97\u3002`,
    changeTarget: `\u88dc${ELEMENT_LABEL[primaryElement]}\u6703\u5148\u6539\u8b8a${CHANGE_TARGET[primaryElement]}\u3002`,
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

  const sharedAction = `\u5169\u500b\u4eba\u5171\u540c\u5148\u88dc${ELEMENT_LABEL[sharedElement]}\uff0c\u6703\u512a\u5148\u6539\u8b8a${CHANGE_TARGET[sharedElement]}\u3002`;
  const summary = `${personA.name}\u8981\u5148\u88dc${ELEMENT_LABEL[personA.primaryElement]}\uff0c${personB.name}\u8981\u5148\u88dc${ELEMENT_LABEL[personB.primaryElement]}\u3002${sharedAction}`;

  return {
    engineVersion: 'match_five_element_v1',
    summary,
    relationMode,
    sharedElement,
    sharedAction,
    relationReason: `${modeText}\uff1a${personA.name}\u7684\u4e3b\u7f3a\u70ba${ELEMENT_LABEL[personA.primaryElement]}\uff0c${personB.name}\u7684\u4e3b\u7f3a\u70ba${ELEMENT_LABEL[personB.primaryElement]}\u3002`,
    personA,
    personB,
    integratedAdvice: `\u672c\u6b21\u9748\u9b42\u914d\u5c0d\u7684 5 \u5143\u7d20\u7d50\u8ad6\uff1a${summary}\u9019\u6703\u8b93\u95dc\u4fc2\u66f4\u5bb9\u6613\u5f9e\u76f8\u514b\u8f49\u6210\u76f8\u751f\u3002`,
    inlineHighlights: [
      personA.reason,
      personB.reason,
      sharedAction,
      `${modeText}\uff0c\u6240\u4ee5\u88dc\u5f37\u4e0d\u662f\u53ea\u770b\u4e00\u500b\u4eba\uff0c\u800c\u662f\u5169\u500b\u4eba\u90fd\u8981\u88dc\u5230\u6b63\u78ba\u4f4d\u7f6e\u3002`,
    ],
  };
}
