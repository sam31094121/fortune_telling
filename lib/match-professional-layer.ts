import type { PersonalityMatrixCompat, MatchResult } from './compatibility-engine';

export type SoulMatchInputPerson = {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
};

export type SoulMatchDisplayPerson = {
  name: string;
  zodiacZh: string;
  chineseZodiac: string;
  wuxing: string;
  bloodType: string;
};

export type SoulMatchProfessionalPerson = {
  role: 'personA' | 'personB';
  name: string;
  birthDate: string;
  bloodType: string;
  gender: string;
  zodiacZh: string;
  chineseZodiac: string;
  wuxing: string;
  primaryPattern: string;
  strongestSignals: string[];
  supportNeeds: string[];
  storySeed: string;
  fixedSignals: string[];
};

export type SoulMatchProfessionalAxis = {
  key: 'resonance' | 'communication' | 'stability' | 'friction';
  title: string;
  score: number;
  explanation: string;
  storyMeaning: string;
  evidence: string[];
};

export type SoulMatchProfessionalLayer = {
  layer: 'professional_soul_match_decomposition';
  generatedFrom: 'dual_input_and_match_engine';
  recalculationAllowed: false;
  pairTitle: string;
  pairOverview: string;
  people: SoulMatchProfessionalPerson[];
  relationshipAxes: SoulMatchProfessionalAxis[];
  relationshipStory: {
    opening: string;
    resonanceStory: string;
    frictionStory: string;
    professionalSummary: string;
  };
  readingBoundaries: string[];
  aiEvolutionMaterial: {
    fixedFacts: string[];
    interpretationRules: string[];
    prohibitedMoves: string[];
  };
};

export type SoulMatchInterpretationPoint = {
  title: string;
  reading: string;
  evidence: string[];
};

export type SoulMatchAiInterpretationLayer = {
  layer: 'ai_soul_match_interpretation';
  sourceLayer: 'professional_soul_match_decomposition';
  recalculationAllowed: false;
  pairTitle: string;
  focusAxes: SoulMatchProfessionalAxis['key'][];
  userReadableSummary: string;
  relationshipPositioning: string;
  emotionalPattern: string;
  communicationPattern: string;
  riskTranslation: string;
  evidenceChain: string[];
  interpretationPoints: SoulMatchInterpretationPoint[];
};

export type SoulMatchReinforcementPriority = {
  order: 1 | 2 | 3;
  label: string;
  axis: SoulMatchProfessionalAxis['key'];
  title: string;
  direction: string;
  reason: string;
  action: string;
};

export type SoulMatchReinforcementLayer = {
  layer: 'ai_soul_match_reinforcement';
  sourceLayer: 'ai_soul_match_interpretation';
  recalculationAllowed: false;
  clearStatement: string;
  priorities: SoulMatchReinforcementPriority[];
  executionPrinciple: string;
  boundaries: string[];
};

const MATRIX_LABELS: Record<keyof PersonalityMatrixCompat, string> = {
  emotion: '\u60c5\u7dd2\u5171\u611f',
  logic: '\u908f\u8f2f\u7406\u89e3',
  social: '\u4eba\u969b\u4e92\u52d5',
  leadership: '\u4e3b\u5c0e\u63a8\u9032',
  security: '\u5b89\u5168\u7a69\u5b9a',
  creativity: '\u5275\u9020\u60f3\u50cf',
  risk: '\u8b8a\u52d5\u5192\u96aa',
  attachment: '\u89aa\u5bc6\u4f9d\u6200',
};

const BLOOD_STORY: Record<SoulMatchInputPerson['bloodType'], string> = {
  A: '\u91cd\u8996\u627f\u8afe\u3001\u79e9\u5e8f\u8207\u7a69\u5b9a\uff0c\u95dc\u4fc2\u4e2d\u9700\u8981\u88ab\u597d\u597d\u653e\u5728\u5fc3\u4e0a\u3002',
  B: '\u91cd\u8996\u81ea\u7531\u3001\u7bc0\u594f\u8207\u771f\u5be6\u611f\uff0c\u95dc\u4fc2\u4e2d\u9700\u8981\u4fdd\u7559\u547c\u5438\u7a7a\u9593\u3002',
  AB: '\u7406\u6027\u8207\u611f\u6027\u4ea4\u932f\uff0c\u95dc\u4fc2\u4e2d\u9700\u8981\u6e05\u695a\u800c\u4e0d\u58d3\u8feb\u7684\u6e9d\u901a\u3002',
  O: '\u884c\u52d5\u611f\u8207\u4fdd\u8b77\u6b32\u8f03\u5f37\uff0c\u95dc\u4fc2\u4e2d\u9700\u8981\u770b\u898b\u76ee\u6a19\u8207\u65b9\u5411\u3002',
};

function genderLabel(gender: SoulMatchInputPerson['gender']) {
  return gender === 'male' ? '\u7537\u6027' : '\u5973\u6027';
}

function scoreLevel(score: number) {
  if (score >= 80) return '\u9ad8\u5171\u9cf4';
  if (score >= 65) return '\u53ef\u7d93\u71df\u5171\u9cf4';
  if (score >= 50) return '\u9700\u8981\u78e8\u5408';
  return '\u9700\u8981\u91cd\u5efa\u7bc0\u594f';
}

function topSignals(matrix: PersonalityMatrixCompat) {
  return (Object.entries(matrix) as Array<[keyof PersonalityMatrixCompat, number]>)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, value]) => MATRIX_LABELS[key] + '\uff1a' + value);
}

function supportNeeds(matrix: PersonalityMatrixCompat) {
  const needs = (Object.entries(matrix) as Array<[keyof PersonalityMatrixCompat, number]>)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([key, value]) => MATRIX_LABELS[key] + '\uff1a' + value);
  return needs;
}

function primaryPattern(matrix: PersonalityMatrixCompat) {
  const emotion = (matrix.emotion + matrix.attachment) / 2;
  const logic = (matrix.logic + matrix.creativity) / 2;
  const action = (matrix.leadership + matrix.risk) / 2;
  const stability = (matrix.security + (100 - matrix.risk)) / 2;
  const rows = [
    ['\u60c5\u611f\u5171\u9cf4\u578b', emotion],
    ['\u7406\u89e3\u5206\u6790\u578b', logic],
    ['\u884c\u52d5\u63a8\u9032\u578b', action],
    ['\u7a69\u5b9a\u627f\u8afe\u578b', stability],
  ] as const;
  return [...rows].sort((a, b) => b[1] - a[1])[0][0];
}

function personLayer(role: 'personA' | 'personB', input: SoulMatchInputPerson, display: SoulMatchDisplayPerson, matrix: PersonalityMatrixCompat): SoulMatchProfessionalPerson {
  const name = input.name.trim();
  const strongestSignals = topSignals(matrix);
  const needs = supportNeeds(matrix);
  const pattern = primaryPattern(matrix);
  return {
    role,
    name,
    birthDate: input.birthDate,
    bloodType: input.bloodType,
    gender: genderLabel(input.gender),
    zodiacZh: display.zodiacZh,
    chineseZodiac: display.chineseZodiac,
    wuxing: display.wuxing,
    primaryPattern: pattern,
    strongestSignals,
    supportNeeds: needs,
    storySeed: name + '\u7684\u95dc\u4fc2\u5e95\u8272\u662f\u300c' + pattern + '\u300d\uff1b' + display.zodiacZh + '\u5e36\u51fa\u5916\u5728\u7bc0\u594f\uff0c' + display.chineseZodiac + '\u8207' + display.wuxing + '\u5efa\u7acb\u95dc\u4fc2\u8cea\u5730\uff0c' + BLOOD_STORY[input.bloodType],
    fixedSignals: [
      '\u59d3\u540d\uff1a' + name,
      '\u751f\u65e5\uff1a' + input.birthDate,
      '\u661f\u5ea7\uff1a' + display.zodiacZh,
      '\u751f\u8096\uff1a' + display.chineseZodiac,
      '\u4e94\u884c\uff1a' + display.wuxing,
      '\u8840\u578b\uff1a' + input.bloodType,
      '\u6027\u5225\uff1a' + genderLabel(input.gender),
      '\u95dc\u4fc2\u6a21\u5f0f\uff1a' + pattern,
    ],
  };
}

function axis(key: SoulMatchProfessionalAxis['key'], title: string, score: number, explanation: string, storyMeaning: string, evidence: string[]): SoulMatchProfessionalAxis {
  return { key, title, score, explanation, storyMeaning, evidence };
}

const REINFORCEMENT_ACTIONS: Record<SoulMatchProfessionalAxis['key'], { title: string; direction: string; reason: string; action: string }> = {
  resonance: {
    title: '\u5171\u9cf4\u88dc\u5f37',
    direction: '\u88dc\u5f37\u540c\u7406\u3001\u60c5\u7dd2\u63a5\u4f4f\u8207\u76f8\u4e92\u770b\u898b',
    reason: '\u7b2c\u4e8c\u5c64\u89e3\u8b80\u986f\u793a\u96d9\u65b9\u9700\u8981\u5148\u628a\u5f7c\u6b64\u7684\u771f\u5be6\u611f\u53d7\u63a5\u4f4f\uff0c\u5171\u9cf4\u624d\u6703\u7e7c\u7e8c\u8f49\u6210\u95dc\u4fc2\u52d5\u80fd\u3002',
    action: '\u6bcf\u9031\u56fa\u5b9a\u4e00\u6b21\u6df1\u804a\uff0c\u5404\u81ea\u8aaa\u51fa\u4e00\u4ef6\u88ab\u7406\u89e3\u7684\u4e8b\u8207\u4e00\u4ef6\u5e0c\u671b\u88ab\u770b\u898b\u7684\u4e8b\u3002',
  },
  communication: {
    title: '\u6e9d\u901a\u88dc\u5f37',
    direction: '\u88dc\u5f37\u8aaa\u660e\u65b9\u5f0f\u3001\u78ba\u8a8d\u7bc0\u594f\u8207\u8aa4\u6703\u4fee\u5fa9',
    reason: '\u7b2c\u4e8c\u5c64\u89e3\u8b80\u986f\u793a\u95dc\u4fc2\u8981\u5148\u628a\u300c\u6211\u7684\u610f\u601d\u300d\u8207\u300c\u4f60\u807d\u5230\u7684\u610f\u601d\u300d\u5c0d\u9f4a\uff0c\u58d3\u529b\u624d\u4e0d\u6703\u64f4\u5927\u3002',
    action: '\u9047\u5230\u5206\u6b67\u6642\u5148\u7528\u4e09\u53e5\u8a71\uff1a\u6211\u5728\u610f\u7684\u662f\u3001\u6211\u64d4\u5fc3\u7684\u662f\u3001\u6211\u9700\u8981\u4f60\u78ba\u8a8d\u7684\u662f\u3002',
  },
  stability: {
    title: '\u627f\u8afe\u88dc\u5f37',
    direction: '\u88dc\u5f37\u5b89\u5168\u611f\u3001\u65e5\u5e38\u7bc0\u594f\u8207\u53ef\u4fe1\u4efb\u7d2f\u7a4d',
    reason: '\u7b2c\u4e8c\u5c64\u89e3\u8b80\u986f\u793a\u95dc\u4fc2\u9700\u8981\u628a\u611f\u60c5\u843d\u5230\u7a69\u5b9a\u884c\u52d5\uff0c\u4e0d\u53ea\u505c\u5728\u611f\u89ba\u8207\u627f\u8afe\u3002',
    action: '\u5efa\u7acb\u4e00\u500b\u5c0f\u578b\u7a69\u5b9a\u7d04\u5b9a\uff1a\u56fa\u5b9a\u806f\u7e6b\u3001\u56fa\u5b9a\u78ba\u8a8d\u3001\u56fa\u5b9a\u5b8c\u6210\u4e00\u4ef6\u5171\u540c\u7684\u4e8b\u3002',
  },
  friction: {
    title: '\u78e8\u5408\u88dc\u5f37',
    direction: '\u88dc\u5f37\u754c\u7dda\u3001\u964d\u6eab\u6a5f\u5236\u8207\u885d\u7a81\u4fee\u5fa9',
    reason: '\u7b2c\u4e8c\u5c64\u89e3\u8b80\u986f\u793a\u58d3\u529b\u4e0d\u80fd\u7528\u8f38\u8d0f\u8655\u7406\uff0c\u5fc5\u9808\u5148\u5efa\u7acb\u53ef\u57f7\u884c\u7684\u505c\u640d\u8207\u56de\u4fee\u6d41\u7a0b\u3002',
    action: '\u885d\u7a81\u5347\u9ad8\u6642\u5148\u66ab\u505c 20 \u5206\u9418\uff0c\u56de\u4f86\u5f8c\u53ea\u8655\u7406\u4e00\u500b\u4e3b\u984c\uff0c\u4e0d\u7ffb\u820a\u5e33\u3001\u4e0d\u653e\u5927\u5230\u4eba\u683c\u5426\u5b9a\u3002',
  },
};

function focusAxesFromProfessionalLayer(layer: SoulMatchProfessionalLayer) {
  return [...layer.relationshipAxes]
    .map((axis) => ({ axis, need: axis.key === 'friction' ? axis.score : 100 - axis.score }))
    .sort((a, b) => b.need - a.need)
    .map((item) => item.axis.key)
    .slice(0, 3);
}

function findAxis(layer: SoulMatchProfessionalLayer, key: SoulMatchProfessionalAxis['key']) {
  return layer.relationshipAxes.find((axisItem) => axisItem.key === key) ?? layer.relationshipAxes[0];
}

export function buildSoulMatchAiInterpretationLayer(layer: SoulMatchProfessionalLayer): SoulMatchAiInterpretationLayer {
  const focusAxes = focusAxesFromProfessionalLayer(layer);
  const people = layer.people;
  const firstAxis = findAxis(layer, focusAxes[0]);
  const secondAxis = findAxis(layer, focusAxes[1]);
  const thirdAxis = findAxis(layer, focusAxes[2]);
  const evidenceChain = [
    layer.pairOverview,
    layer.relationshipStory.opening,
    layer.relationshipStory.resonanceStory,
    layer.relationshipStory.frictionStory,
    ...people.flatMap((person) => [person.storySeed, ...person.strongestSignals.slice(0, 2), ...person.supportNeeds.slice(0, 2)]),
  ];

  return {
    layer: 'ai_soul_match_interpretation',
    sourceLayer: 'professional_soul_match_decomposition',
    recalculationAllowed: false,
    pairTitle: layer.pairTitle,
    focusAxes,
    userReadableSummary: 'AI \u8b80\u53d6\u7b2c\u4e00\u5c64\u5f8c\u5224\u5b9a\uff1a' + layer.pairTitle + '\u7684\u95dc\u4fc2\u4e0d\u662f\u53ea\u770b\u7e3d\u5206\uff0c\u800c\u662f\u8981\u5148\u8655\u7406\u3010' + firstAxis.title + '\u3011\uff0c\u518d\u5e36\u52d5\u3010' + secondAxis.title + '\u3011\u8207\u3010' + thirdAxis.title + '\u3011\u3002',
    relationshipPositioning: layer.relationshipStory.opening + '\u9019\u4ee3\u8868\u95dc\u4fc2\u7684\u4e3b\u8ef8\u662f\u300c\u5169\u500b\u5e95\u8272\u4e0d\u540c\u7684\u4eba\u5982\u4f55\u5728\u540c\u4e00\u500b\u65e5\u5e38\u88e1\u5c0d\u9f4a\u300d\u3002',
    emotionalPattern: layer.relationshipStory.resonanceStory + '\u9019\u662f\u95dc\u4fc2\u53ef\u4ee5\u7e7c\u7e8c\u52a0\u6df1\u7684\u60c5\u611f\u6839\u57fa\u3002',
    communicationPattern: '\u6e9d\u901a\u9700\u8981\u5148\u56de\u5230\u300c\u78ba\u8a8d\u300d\u800c\u4e0d\u662f\u300c\u8aaa\u670d\u300d\u3002\u7576\u96d9\u65b9\u80fd\u5148\u78ba\u8a8d\u611f\u53d7\u8207\u4e8b\u5be6\uff0c\u95dc\u4fc2\u5c31\u6703\u9032\u5165\u53ef\u4fee\u5fa9\u72c0\u614b\u3002',
    riskTranslation: layer.relationshipStory.frictionStory + '\u58d3\u529b\u9ede\u4e0d\u662f\u7d50\u8ad6\uff0c\u800c\u662f\u95dc\u4fc2\u9700\u8981\u5b78\u6703\u7684\u4fee\u5fa9\u6280\u8853\u3002',
    evidenceChain,
    interpretationPoints: [
      {
        title: '\u95dc\u4fc2\u4e3b\u8ef8',
        reading: '\u95dc\u4fc2\u7684\u4e3b\u8ef8\u843d\u5728' + firstAxis.title + '\uff1a' + firstAxis.storyMeaning,
        evidence: [firstAxis.explanation, ...firstAxis.evidence.slice(0, 3)],
      },
      {
        title: '\u96d9\u65b9\u5e95\u8272',
        reading: people.map((person) => person.name + '\u662f' + person.primaryPattern).join('\uff1b') + '\u3002\u9019\u4efd\u5dee\u7570\u662f\u4e92\u88dc\u7d20\u6750\uff0c\u4e5f\u662f\u9700\u8981\u88ab\u7ffb\u8b6f\u7684\u65e5\u5e38\u8a9e\u8a00\u3002',
        evidence: people.map((person) => person.storySeed),
      },
      {
        title: '\u95dc\u4fc2\u4fee\u5fa9\u9ede',
        reading: '\u95dc\u4fc2\u9700\u8981\u628a' + secondAxis.title + '\u8207' + thirdAxis.title + '\u8f49\u6210\u53ef\u57f7\u884c\u7684\u7d04\u5b9a\uff0c\u624d\u80fd\u8b93\u5171\u9cf4\u4e0d\u88ab\u58d3\u529b\u6d88\u8017\u3002',
        evidence: [secondAxis.explanation, thirdAxis.explanation],
      },
    ],
  };
}

export function buildSoulMatchReinforcementLayer(layer: SoulMatchAiInterpretationLayer): SoulMatchReinforcementLayer {
  const labels = ['\u7b2c\u4e00\u88dc\u5f37', '\u7b2c\u4e8c\u88dc\u5f37', '\u7b2c\u4e09\u88dc\u5f37'] as const;
  const priorities = layer.focusAxes.slice(0, 3).map((axisKey, index) => {
    const action = REINFORCEMENT_ACTIONS[axisKey];
    return {
      order: (index + 1) as 1 | 2 | 3,
      label: labels[index],
      axis: axisKey,
      title: action.title,
      direction: action.direction,
      reason: action.reason,
      action: action.action,
    };
  });
  const first = priorities[0];
  const second = priorities[1];
  const third = priorities[2];

  return {
    layer: 'ai_soul_match_reinforcement',
    sourceLayer: 'ai_soul_match_interpretation',
    recalculationAllowed: false,
    clearStatement: 'AI \u5224\u5b9a\uff1a' + layer.pairTitle + '\u7b2c\u4e00\u88dc\u5f37\u70ba\u3010' + first.title + '\u3011\u3002\u5b8c\u6210\u5f8c\uff0c\u4f9d\u5e8f\u88dc\u3010' + second.title + '\u3011\uff0c\u6700\u5f8c\u88dc\u3010' + third.title + '\u3011\u3002',
    priorities,
    executionPrinciple: 'AI \u4e0d\u9810\u6e2c\u95dc\u4fc2\u547d\u904b\uff1bAI \u5224\u5b9a\u9019\u6bb5\u95dc\u4fc2\u76ee\u524d\u6700\u9700\u8981\u88dc\u5f37\u7684\u76f8\u8655\u65b9\u5411\u3002\u96d9\u65b9\u4f9d\u5e8f\u57f7\u884c\uff0c\u95dc\u4fc2\u6210\u679c\u7531\u96d9\u65b9\u5171\u540c\u5275\u9020\u3002',
    boundaries: [
      '\u7b2c\u4e09\u5c64\u53ea\u8b80\u53d6\u7b2c\u4e8c\u5c64 AI \u89e3\u8b80\uff0c\u4e0d\u91cd\u65b0\u8a08\u7b97\u914d\u5c0d\u5206\u6578\u3002',
      '\u88dc\u5f37\u662f\u660e\u78ba\u884c\u52d5\u65b9\u5411\uff0c\u4e0d\u662f\u5c0d\u95dc\u4fc2\u7d50\u679c\u505a\u4fdd\u8b49\u3002',
      '\u9019\u4efd\u88dc\u5f37\u53ea\u5c6c\u65bc\u9748\u9b42\u914d\u5c0d\u6a21\u7d44\uff0c\u4e0d\u6539\u52d5\u5176\u4ed6\u5361\u7247\u3002',
    ],
  };
}

export function buildSoulMatchProfessionalLayer(input: {
  personA: SoulMatchInputPerson;
  personB: SoulMatchInputPerson;
  displayA: SoulMatchDisplayPerson;
  displayB: SoulMatchDisplayPerson;
  matrixA: PersonalityMatrixCompat;
  matrixB: PersonalityMatrixCompat;
  result: MatchResult;
}): SoulMatchProfessionalLayer {
  const personA = personLayer('personA', input.personA, input.displayA, input.matrixA);
  const personB = personLayer('personB', input.personB, input.displayB, input.matrixB);
  const result = input.result;
  const pairTitle = personA.name + ' \u00d7 ' + personB.name;
  const strongestAxis = [
    ['\u5171\u9cf4', result.resonance],
    ['\u6e9d\u901a', result.communication],
    ['\u7a69\u5b9a', result.stability],
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0][0];
  const weakestAxis = [
    ['\u5171\u9cf4', result.resonance],
    ['\u6e9d\u901a', result.communication],
    ['\u7a69\u5b9a', result.stability],
    ['\u885d\u7a81\u98a8\u96aa', 100 - result.conflict_risk],
  ].sort((a, b) => Number(a[1]) - Number(b[1]))[0][0];

  const axes = [
    axis('resonance', '\u5171\u9cf4\u8ef8', result.resonance, '\u8b80\u53d6\u96d9\u65b9\u60c5\u7dd2\u3001\u4eba\u969b\u8207\u89aa\u5bc6\u4f9d\u6200\u7684\u63a5\u8fd1\u7a0b\u5ea6\u3002', '\u6b64\u8ef8\u6c7a\u5b9a\u5169\u4eba\u662f\u5426\u5bb9\u6613\u89ba\u5f97\u5c0d\u65b9\u61c2\u81ea\u5df1\u3002', result.zones.resonance.slice(0, 3)),
    axis('communication', '\u6e9d\u901a\u8ef8', result.communication, '\u8b80\u53d6\u96d9\u65b9\u60c5\u611f\u8868\u9054\u3001\u908f\u8f2f\u7406\u89e3\u8207\u4eba\u969b\u7bc0\u594f\u7684\u5c0d\u9f4a\u5ea6\u3002', '\u6b64\u8ef8\u6c7a\u5b9a\u8aa4\u6703\u51fa\u73fe\u6642\uff0c\u5169\u4eba\u662f\u80fd\u8aaa\u958b\uff0c\u9084\u662f\u5404\u81ea\u9000\u56de\u81ea\u5df1\u7684\u9632\u7dda\u3002', result.zones.grinding.slice(0, 2)),
    axis('stability', '\u627f\u8afe\u8ef8', result.stability, '\u8b80\u53d6\u96d9\u65b9\u5b89\u5168\u611f\u3001\u8b8a\u52d5\u7a0b\u5ea6\u8207\u95dc\u4fc2\u627f\u8f09\u80fd\u529b\u3002', '\u6b64\u8ef8\u6c7a\u5b9a\u95dc\u4fc2\u80fd\u4e0d\u80fd\u5728\u65e5\u5e38\u88e1\u7e7c\u7e8c\u7a69\u5b9a\u7d2f\u7a4d\u3002', ['\u7a69\u5b9a\u6307\u6578\uff1a' + result.stability, '\u885d\u7a81\u98a8\u96aa\uff1a' + result.conflict_risk]),
    axis('friction', '\u78e8\u5408\u8ef8', result.conflict_risk, '\u8b80\u53d6\u96d9\u65b9\u5b89\u5168\u611f\u843d\u5dee\u3001\u4f9d\u6200\u843d\u5dee\u8207\u4e3b\u5c0e\u6027\u62c9\u626f\u3002', '\u6b64\u8ef8\u4e0d\u662f\u5426\u5b9a\u95dc\u4fc2\uff0c\u800c\u662f\u6a19\u51fa\u9700\u8981\u512a\u5148\u8655\u7406\u7684\u58d3\u529b\u9ede\u3002', result.zones.conflict.slice(0, 3)),
  ];

  return {
    layer: 'professional_soul_match_decomposition',
    generatedFrom: 'dual_input_and_match_engine',
    recalculationAllowed: false,
    pairTitle,
    pairOverview: '\u7b2c\u4e00\u5c64\u5224\u5b9a\uff1a' + pairTitle + '\u5c6c\u65bc\u300c' + scoreLevel(result.match_score) + '\u300d\u578b\u95dc\u4fc2\u3002\u6700\u5f37\u8ef8\u7dda\u662f\u3010' + strongestAxis + '\u3011\uff0c\u6700\u9700\u8981\u88ab\u7167\u9867\u7684\u8ef8\u7dda\u662f\u3010' + weakestAxis + '\u3011\u3002',
    people: [personA, personB],
    relationshipAxes: axes,
    relationshipStory: {
      opening: personA.name + '\u5e36\u8457\u300c' + personA.primaryPattern + '\u300d\u9032\u5165\u95dc\u4fc2\uff0c' + personB.name + '\u5e36\u8457\u300c' + personB.primaryPattern + '\u300d\u56de\u61c9\u95dc\u4fc2\u3002',
      resonanceStory: '\u96d9\u65b9\u7684\u5171\u9cf4\u4f86\u81ea\uff1a' + result.zones.resonance.slice(0, 2).join('\uff1b') + '\u3002',
      frictionStory: '\u95dc\u4fc2\u7684\u78e8\u5408\u4f86\u81ea\uff1a' + result.zones.conflict.slice(0, 2).join('\uff1b') + '\u3002\u9019\u4e9b\u662f\u5f8c\u7e8c AI \u89e3\u8b80\u8981\u512a\u5148\u8f49\u8b6f\u6210\u65e5\u5e38\u884c\u52d5\u7684\u7d20\u6750\u3002',
      professionalSummary: '\u7b2c\u4e00\u5c64\u53ea\u5efa\u7acb\u96d9\u65b9\u56fa\u5b9a\u8cc7\u6599\u3001\u95dc\u4fc2\u8ef8\u7dda\u3001\u5206\u6578\u8b49\u64da\u8207\u6545\u4e8b\u7d20\u6750\uff0c\u4e0d\u76f4\u63a5\u505a\u88dc\u5f37\u6216\u4fdd\u8b49\u7d50\u679c\u3002',
    },
    readingBoundaries: [
      '\u7b2c\u4e00\u5c64\u53ea\u505a\u9748\u9b42\u914d\u5c0d\u5c08\u696d\u62c6\u89e3\uff0c\u4e0d\u505a AI \u88dc\u5f37\u65b9\u6848\u3002',
      '\u5f8c\u7e8c\u7b2c\u4e8c\u5c64\u53ea\u80fd\u8b80\u53d6\u6b64\u5c64\u8cc7\u6599\uff0c\u4e0d\u5f97\u91cd\u65b0\u8a08\u7b97\u914d\u5c0d\u5206\u6578\u3002',
      '\u5f8c\u7e8c\u7b2c\u4e09\u5c64\u53ea\u80fd\u8b80\u53d6\u7b2c\u4e8c\u5c64\u7d50\u679c\uff0c\u4e0d\u53cd\u5411\u6539\u5beb\u672c\u5c64\u56fa\u5b9a\u7d20\u6750\u3002',
    ],
    aiEvolutionMaterial: {
      fixedFacts: [...personA.fixedSignals, ...personB.fixedSignals, '\u914d\u5c0d\u5206\u6578\uff1a' + result.match_score, '\u5171\u9cf4\u6307\u6578\uff1a' + result.resonance, '\u6e9d\u901a\u6307\u6578\uff1a' + result.communication, '\u7a69\u5b9a\u6307\u6578\uff1a' + result.stability, '\u885d\u7a81\u98a8\u96aa\uff1a' + result.conflict_risk],
      interpretationRules: [
        '\u5148\u8b80\u500b\u4eba\u5e95\u8272\uff0c\u518d\u8b80\u96d9\u4eba\u8ef8\u7dda\uff0c\u6700\u5f8c\u8b80\u95dc\u4fc2\u6545\u4e8b\u3002',
        '\u5171\u9cf4\u8207\u627f\u8afe\u662f\u95dc\u4fc2\u52d5\u80fd\uff1b\u78e8\u5408\u8207\u885d\u7a81\u662f\u9700\u8981\u8f49\u8b6f\u6210\u65e5\u5e38\u908a\u754c\u7684\u7d20\u6750\u3002',
        '\u6545\u4e8b\u53ef\u4ee5\u6709\u8d77\u4f0f\uff0c\u4f46\u4e0d\u5f97\u504f\u96e2\u56fa\u5b9a\u5206\u6578\u8207\u96d9\u65b9\u8f38\u5165\u8cc7\u6599\u3002',
      ],
      prohibitedMoves: [
        '\u4e0d\u5f97\u5c07\u914d\u5c0d\u5beb\u6210\u7d55\u5c0d\u547d\u5b9a\u6216\u7d55\u5c0d\u4e0d\u9069\u5408\u3002',
        '\u4e0d\u5f97\u8df3\u904e\u7b2c\u4e00\u5c64\u76f4\u63a5\u505a\u88dc\u5f37\u7d50\u8ad6\u3002',
        '\u4e0d\u5f97\u6539\u52d5\u5176\u4ed6\u5361\u7247\u6216\u8de8\u6a21\u7d44\u8a08\u7b97\u3002',
      ],
    },
  };
}
