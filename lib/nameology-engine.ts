import type { DimensionScores } from './types';

export type NameologyElement = '木' | '火' | '土' | '金' | '水';
export type NameologyRelation = '相生' | '相剋' | '比和';

type CharProfile = {
  strokes: number;
  element: NameologyElement;
  imagery: string;
  traits: string[];
  caution: string;
};

export type NameologyCharAnalysis = {
  char: string;
  position: number;
  role: string;
  strokeCount: number;
  strokeSource: 'fixed_table' | 'structural_estimate';
  element: NameologyElement;
  yinYang: '陽' | '陰';
  imagery: string;
  traits: string[];
  caution: string;
};

export type NameologyGridItem = {
  key: 'sky' | 'person' | 'earth' | 'outer' | 'total';
  label: string;
  value: number;
  element: NameologyElement;
  meaning: string;
  advice: string;
};

export type NameologyAnalysis = {
  name: string;
  characters: NameologyCharAnalysis[];
  grids: NameologyGridItem[];
  elementFlow: {
    from: string;
    to: string;
    relation: NameologyRelation;
    note: string;
  }[];
  corePersonality: string;
  imageAndPreference: string;
  strengths: string[];
  cautions: string[];
  recommendations: string[];
  score: number;
  level: string;
  summary: string;
  ruleVersion: 'Nameology Core V1.0.0';
};

const CHAR_PROFILE_MAP: Record<string, CharProfile> = {
  王: { strokes: 4, element: '土', imagery: '王者定軸，重視格局、承擔與主導。', traits: ['主見清楚', '重視承諾', '有管理感'], caution: '避免把責任全部扛在自己身上。' },
  李: { strokes: 7, element: '木', imagery: '木下有子，帶學習、延伸與照顧之象。', traits: ['學習快', '重人情', '彈性高'], caution: '容易想太多，需要把界線說清楚。' },
  陳: { strokes: 16, element: '火', imagery: '陳列成局，重視累積、表達與聲勢。', traits: ['能整合資源', '行動有節奏', '重視成果'], caution: '節奏過快時容易急著證明。' },
  林: { strokes: 8, element: '木', imagery: '雙木成林，代表人脈、成長與共生。', traits: ['親和力好', '重視團隊', '善於累積'], caution: '選擇太多時容易分心。' },
  張: { strokes: 11, element: '火', imagery: '弓長有勢，象徵展開、突破與外放。', traits: ['企圖心強', '反應快', '願意挑戰'], caution: '壓力高時語氣容易太硬。' },
  黃: { strokes: 12, element: '土', imagery: '中央厚土，重視穩定、信任與資源。', traits: ['務實可靠', '重視品質', '有財務感'], caution: '不要因求穩而錯過時機。' },
  蔡: { strokes: 17, element: '木', imagery: '草木有文，帶審美、規劃與人際辨識。', traits: ['觀察細膩', '懂得布局', '重視品味'], caution: '容易對自己要求過高。' },
  劉: { strokes: 15, element: '金', imagery: '金氣成刃，代表決斷、規則與執行。', traits: ['判斷果斷', '重效率', '能收斂問題'], caution: '太快下結論會讓人有距離。' },
  吳: { strokes: 7, element: '火', imagery: '口天相接，帶表達、舞台與影響力。', traits: ['表達自然', '適合曝光', '感染力佳'], caution: '情緒上來時要先停一拍。' },
  楊: { strokes: 13, element: '木', imagery: '木逢日升，象徵成長、光感與擴張。', traits: ['向上心強', '有生命力', '喜歡突破'], caution: '不要同時開太多戰場。' },
  周: { strokes: 8, element: '土', imagery: '周全成圓，代表照顧、循環與秩序。', traits: ['思慮完整', '重承諾', '會顧全大局'], caution: '別讓顧全變成委屈。' },
  許: { strokes: 11, element: '木', imagery: '言午成諾，帶承諾、信任與溝通。', traits: ['重信用', '善協調', '懂分寸'], caution: '答應前要先確認能量。' },
  鄭: { strokes: 19, element: '金', imagery: '邑中有正，重規矩、定位與名聲。', traits: ['原則強', '重視名譽', '能立制度'], caution: '彈性不足時容易僵住。' },
  謝: { strokes: 17, element: '金', imagery: '言射有準，代表表達精準與責任交付。', traits: ['分析精準', '重禮數', '有交代感'], caution: '避免話語太直接刺傷人。' },
  賴: { strokes: 16, element: '土', imagery: '信賴成基，重資源、支持與持久力。', traits: ['耐力好', '守信用', '重家庭'], caution: '過度承受會形成慢性壓力。' },
  龍: { strokes: 16, element: '火', imagery: '龍象升騰，代表氣勢、企圖與轉化力。', traits: ['格局感強', '敢衝敢扛', '有舞台能量'], caution: '氣勢太滿時要留空間給別人。' },
  明: { strokes: 8, element: '火', imagery: '日月同明，思路清楚，適合照亮方向。', traits: ['邏輯清楚', '願意承擔', '有啟發力'], caution: '看得太清楚時容易急著糾正。' },
  心: { strokes: 4, element: '火', imagery: '心主感受，重情、直覺與內在信念。', traits: ['感受敏銳', '有同理', '重真誠'], caution: '不要把別人的情緒全收進來。' },
  慧: { strokes: 15, element: '水', imagery: '慧根內藏，代表洞察、學習與靈性理解。', traits: ['洞察力強', '學習快', '善反思'], caution: '想太深時行動會變慢。' },
  安: { strokes: 6, element: '土', imagery: '安定入宅，重安全感、秩序與照護。', traits: ['穩定可靠', '重和氣', '善照顧'], caution: '太求安穩會壓住企圖心。' },
  祥: { strokes: 10, element: '土', imagery: '祥瑞聚氣，代表修和、貴人與祝福感。', traits: ['人緣溫厚', '能聚福氣', '重善意'], caution: '不要只求圓融而不表態。' },
  瑞: { strokes: 13, element: '金', imagery: '瑞氣成章，象徵價值、品質與辨識度。', traits: ['品味好', '重價值', '能建立信任'], caution: '避免標準太高而難放鬆。' },
  豪: { strokes: 14, element: '水', imagery: '豪氣外放，帶資源、膽識與人情味。', traits: ['有膽識', '重義氣', '願意投入'], caution: '大方前要先算清資源。' },
  傑: { strokes: 12, element: '木', imagery: '傑出拔起，代表能力、突破與被看見。', traits: ['競爭力強', '敢出頭', '目標感強'], caution: '不要把成功只綁在表現。' },
  宇: { strokes: 6, element: '土', imagery: '宇量成局，象徵格局、包容與空間感。', traits: ['格局開闊', '能包容', '有穩定氣場'], caution: '包容不等於沒有底線。' },
  軒: { strokes: 10, element: '木', imagery: '軒昂向上，帶氣度、門面與上升力。', traits: ['氣質明朗', '重形象', '有上進心'], caution: '要把外在氣勢落到行動。' },
  承: { strokes: 8, element: '土', imagery: '承接有力，代表責任、傳承與可靠度。', traits: ['能承擔', '守信用', '重長期'], caution: '不要把承接變成硬撐。' },
  家: { strokes: 10, element: '土', imagery: '家宅聚氣，重根基、守護與資源管理。', traits: ['重家庭', '懂照顧', '有累積力'], caution: '別讓責任感壓過自我。' },
  志: { strokes: 7, element: '火', imagery: '志向定心，代表目標、意志與方向。', traits: ['有目標', '願意堅持', '重成就'], caution: '目標太硬時要保留彈性。' },
  仁: { strokes: 4, element: '木', imagery: '仁者有愛，代表善意、同理與人和。', traits: ['有同理', '重情義', '願意幫人'], caution: '助人前先守住自己的力氣。' },
  義: { strokes: 13, element: '金', imagery: '義理成準，代表原則、公道與判斷。', traits: ['重原則', '講公道', '敢表態'], caution: '原則要配合溝通溫度。' },
  信: { strokes: 9, element: '土', imagery: '人言為信，重承諾、信用與穩定關係。', traits: ['可信任', '重承諾', '適合長期合作'], caution: '不要因守信而過度委屈。' },
  美: { strokes: 9, element: '金', imagery: '美感成形，代表審美、關係與吸引力。', traits: ['審美好', '重感受', '懂得修飾'], caution: '不要為了好看而忽略真實需求。' },
  婷: { strokes: 12, element: '木', imagery: '婷婷有姿，代表柔韌、禮節與細膩表達。', traits: ['氣質柔和', '善觀察', '人際敏銳'], caution: '不要把敏感藏成壓抑。' },
  雅: { strokes: 12, element: '木', imagery: '雅正有度，重品味、分寸與內涵。', traits: ['有品味', '懂分寸', '重質感'], caution: '避免因太在意體面而不敢要求。' },
  欣: { strokes: 8, element: '木', imagery: '欣然向生，代表喜悅、成長與感染力。', traits: ['正向明亮', '善鼓舞', '容易親近'], caution: '低潮時不要勉強自己開朗。' },
  怡: { strokes: 8, element: '土', imagery: '怡然和氣，重舒適、人和與穩定節奏。', traits: ['親和穩定', '懂照顧氣氛', '重安全感'], caution: '要避免過度迎合。' },
  妤: { strokes: 7, element: '水', imagery: '柔水有姿，代表感受、流動與細膩美感。', traits: ['感受細膩', '適應力好', '有柔性魅力'], caution: '容易受環境情緒牽動。' },
};

const ELEMENT_GENERATES: Record<NameologyElement, NameologyElement> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

const ELEMENT_CONTROLS: Record<NameologyElement, NameologyElement> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

const ELEMENT_THEME: Record<NameologyElement, { strength: string; caution: string }> = {
  木: { strength: '成長、學習、人脈延伸', caution: '分心、猶豫、承諾過多' },
  火: { strength: '表達、行動、舞台能量', caution: '急躁、情緒外放、過度證明' },
  土: { strength: '穩定、承擔、資源累積', caution: '保守、硬撐、變通不足' },
  金: { strength: '判斷、品質、規則與決斷', caution: '距離感、標準過高、語氣太硬' },
  水: { strength: '洞察、彈性、智慧與流動', caution: '想太深、拖延、能量分散' },
};

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function elementFromNumber(value: number): NameologyElement {
  const tail = Math.abs(value) % 10;
  if (tail === 1 || tail === 2) return '木';
  if (tail === 3 || tail === 4) return '火';
  if (tail === 5 || tail === 6) return '土';
  if (tail === 7 || tail === 8) return '金';
  return '水';
}

function estimateStroke(char: string): number {
  return 5 + (stableHash(char) % 14);
}

function roleForIndex(index: number, total: number) {
  if (index === 0) return '姓氏根基';
  if (total === 2) return '名字主氣';
  if (index === 1) return '名字主軸';
  if (index === total - 1) return '名字收束';
  return '名字延伸';
}

function fallbackProfile(char: string): CharProfile {
  const strokes = estimateStroke(char);
  const element = elementFromNumber(strokes);
  return {
    strokes,
    element,
    imagery: `「${char}」字目前未在固定字義表中，系統先依字形複雜度與筆畫尾數做結構判讀。`,
    traits: [ELEMENT_THEME[element].strength, strokes % 2 === 0 ? '偏向穩定收斂' : '偏向主動開展'],
    caution: ELEMENT_THEME[element].caution,
  };
}

function relationOf(from: NameologyElement, to: NameologyElement): NameologyRelation {
  if (from === to) return '比和';
  if (ELEMENT_GENERATES[from] === to) return '相生';
  if (ELEMENT_CONTROLS[from] === to) return '相剋';
  return '相生';
}

function relationNote(fromLabel: string, toLabel: string, from: NameologyElement, to: NameologyElement) {
  const relation = relationOf(from, to);
  if (relation === '比和') return `${fromLabel}與${toLabel}同屬${from}，個性訊號集中，優點明顯但也容易固執。`;
  if (relation === '相生') return `${fromLabel}${from}生助${toLabel}${to}，代表前後意境能接力，做事比較容易形成連續性。`;
  return `${fromLabel}${from}制約${toLabel}${to}，代表名字內有拉扯感，適合把壓力轉成紀律與界線。`;
}

function gridMeaning(label: string, value: number, element: NameologyElement) {
  const tail = value % 10;
  const keyword = tail === 1 ? '開創' : tail === 2 ? '協調' : tail === 3 ? '表達' : tail === 4 ? '秩序' : tail === 5 ? '承擔' : tail === 6 ? '貴人' : tail === 7 ? '突破' : tail === 8 ? '掌控' : tail === 9 ? '理想' : '收束';
  return `${label}${value}畫，尾數落在「${keyword}」，五行屬${element}，主題偏向${ELEMENT_THEME[element].strength}。`;
}

function gridAdvice(label: string, element: NameologyElement) {
  return `${label}要用${ELEMENT_THEME[element].strength}發揮優勢，同時留意${ELEMENT_THEME[element].caution}。`;
}

function buildFiveGrids(chars: NameologyCharAnalysis[]): NameologyGridItem[] {
  const strokes = chars.map((item) => item.strokeCount);
  const surname = strokes[0] ?? 1;
  const given = strokes.slice(1);
  const firstGiven = given[0] ?? 1;
  const total = strokes.reduce((sum, value) => sum + value, 0);
  const earth = given.length > 0 ? given.reduce((sum, value) => sum + value, 0) : 1;
  const person = surname + firstGiven;
  const outer = Math.max(2, total - person + 1);
  const gridValues = [
    ['sky', '天格', surname + 1],
    ['person', '人格', person],
    ['earth', '地格', earth + (given.length === 1 ? 1 : 0)],
    ['outer', '外格', outer],
    ['total', '總格', total],
  ] as const;

  return gridValues.map(([key, label, value]) => {
    const element = elementFromNumber(value);
    return {
      key,
      label,
      value,
      element,
      meaning: gridMeaning(label, value, element),
      advice: gridAdvice(label, element),
    };
  });
}

function levelFromScore(score: number) {
  if (score >= 86) return '姓名氣場集中';
  if (score >= 76) return '姓名結構順暢';
  if (score >= 66) return '姓名穩定可用';
  if (score >= 56) return '姓名需要補強';
  return '姓名拉扯較強';
}

export function buildNameologyAnalysis(name: string, nameScores: DimensionScores): NameologyAnalysis {
  const cleanName = name.trim();
  const sourceChars = Array.from(cleanName).slice(0, 8);
  const characters = sourceChars.map((char, index) => {
    const fixed = CHAR_PROFILE_MAP[char];
    const profile = fixed ?? fallbackProfile(char);
    return {
      char,
      position: index + 1,
      role: roleForIndex(index, sourceChars.length),
      strokeCount: profile.strokes,
      strokeSource: fixed ? 'fixed_table' as const : 'structural_estimate' as const,
      element: profile.element,
      yinYang: profile.strokes % 2 === 1 ? '陽' as const : '陰' as const,
      imagery: profile.imagery,
      traits: profile.traits,
      caution: profile.caution,
    };
  });

  const grids = buildFiveGrids(characters);
  const elementFlow = characters.slice(0, -1).map((item, index) => {
    const next = characters[index + 1];
    return {
      from: item.char,
      to: next.char,
      relation: relationOf(item.element, next.element),
      note: relationNote(`「${item.char}」`, `「${next.char}」`, item.element, next.element),
    };
  });

  const personGrid = grids.find((item) => item.key === 'person') ?? grids[0];
  const totalGrid = grids.find((item) => item.key === 'total') ?? grids[grids.length - 1];
  if (personGrid && totalGrid) {
    elementFlow.push({
      from: personGrid.label,
      to: totalGrid.label,
      relation: relationOf(personGrid.element, totalGrid.element),
      note: relationNote(personGrid.label, totalGrid.label, personGrid.element, totalGrid.element),
    });
  }

  const relationScore = elementFlow.reduce((sum, item) => sum + (item.relation === '相生' ? 8 : item.relation === '比和' ? 4 : -6), 62);
  const topScores = Object.entries(nameScores).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const averageTop = topScores.reduce((sum, [, value]) => sum + value, 0) / Math.max(1, topScores.length);
  const score = clampScore(relationScore * 0.55 + averageTop * 0.45);
  const dominantElement = totalGrid?.element ?? characters[0]?.element ?? '土';
  const dominantTheme = ELEMENT_THEME[dominantElement];
  const mainChars = characters.slice(0, 3).map((item) => `「${item.char}」${item.element}${item.yinYang}`).join('、');

  return {
    name: cleanName,
    characters,
    grids,
    elementFlow,
    corePersonality: `人格主軸落在${personGrid?.value ?? 0}畫${personGrid?.element ?? '土'}氣，名字呈現的是${dominantTheme.strength}。${mainChars ? `前三個字的核心訊號為${mainChars}。` : ''}`,
    imageAndPreference: `姓名外顯形象偏向「${dominantTheme.strength}」，容易被看見的作為是${topScores.map(([key]) => key).join('、')}相關特質；偏好清楚、有秩序、能累積成果的路線。`,
    strengths: [
      characters[0] ? `${characters[0].char}字提供${characters[0].traits[0]}的根基。` : '姓名根基偏中性。',
      personGrid ? `${personGrid.label}${personGrid.value}畫讓人格主軸偏向${ELEMENT_THEME[personGrid.element].strength}。` : '人格格局穩定。',
      totalGrid ? `${totalGrid.label}${totalGrid.value}畫代表長期方向適合累積${ELEMENT_THEME[totalGrid.element].strength}。` : '總體方向以穩定發展為主。',
    ],
    cautions: [
      characters.find((item) => item.strokeSource === 'structural_estimate') ? '部分字尚未納入固定筆畫表，已用結構估算，後續可補正式康熙筆畫。' : '姓名字義與筆畫皆可由固定表重算。',
      ...elementFlow.filter((item) => item.relation === '相剋').slice(0, 2).map((item) => item.note),
      dominantTheme.caution,
    ].slice(0, 4),
    recommendations: [
      `先把${dominantTheme.strength}用在最重要的一件事上，不要分散。`,
      personGrid ? `遇到壓力時，用${personGrid.label}${personGrid.element}氣的方式處理：先定規則，再談感受。` : '遇到壓力時，先把問題拆小再行動。',
      '姓名能量不是宿命，而是提醒你把自己的作為、形象與選擇調整到更一致。',
    ],
    score,
    level: levelFromScore(score),
    summary: `姓名「${cleanName}」的主要訊號是${dominantElement}氣，筆畫與字義組合顯示：你的形象不適合模糊，越能把作為、說話方式與目標放在同一條線上，越容易讓人信任。`,
    ruleVersion: 'Nameology Core V1.0.0',
  };
}