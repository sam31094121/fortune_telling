import { PersonalityMatrixEngine } from './personality-matrix-engine';
import { computeDestinyProfile } from './destiny-engine';
import { getZodiacEnglishName, getZodiacSign } from './zodiac';

interface PersonData {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
  shichen: number | 'unknown' | null;
}

interface PersonalityMatrix {
  [key: string]: number;
}

interface RelationshipMatrix {
  // 數據來源維度
  nameHarmony: number; // 名字筆畫/五格相合度 (0-100)
  birthdayAlignment: number; // 生日月份相合度 (0-100)
  bloodTypeCompatibility: number; // 血型相容度 (0-100)
  wuxingAlignment: number; // 五行相合度 (0-100)
  zodiacHarmony: number; // 生肖相合度 (0-100)
  genderDynamics: number; // 性別互動能量 (0-100)
  shichenBalance: number; // 時辰能量平衡 (0-100)

  // 人格矩陣相合
  personalityResonance: number; // 人格共鳴度 (0-100)
  personalityComplementarity: number; // 人格互補度 (0-100)
  personalityConflict: number; // 人格衝突度 (0-100)

  // 綜合分析
  overallResonance: number; // 總體共鳴度 (0-100)
  activePerson: 'A' | 'B' | 'equal'; // 誰比較主動付出
  needsUnderstanding: 'A' | 'B' | 'mutual'; // 誰比較需要被理解
  primaryChallenge: string; // 主要課題
  primaryGift: string; // 主要禮物/互補優勢

  // 故事架構數據
  relationshipArchetype: string; // 關係原型 (守護者/學習者/平衡者/挑戰者)
  karmicTheme: string; // 業力主題 (未竟承諾/靈魂學習/能量交換/靈魂伴侶)
  growthOpportunity: string; // 成長機會

  // 情感維度（用於故事生動性）
  emotionalDepth: number; // 情感深度 (0-100)，越高越容易產生共鳴
  painPoint: string; // 靈魂痛點 — 故事的心核（關鍵轉折點）
  painPointIntensity: number; // 痛點強度 (0-100)，越高越有殺傷力
  deepPain: string; // 深層傷害 — 最真實、最扎心的那一刻
  harshTruth: string; // 無法逃避的真相 — 直面人性的話語
  warmthFactor: string; // 溫暖因子 — 故事的救贖點（希望所在）
  emotionalArc: string; // 情感弧線 (陌生→接近→衝突→理解→和解)
  storyTwist: string; // 故事轉折點 — 關鍵時刻（最感動的點）
}

// 血型相容度表
const BLOOD_TYPE_COMPATIBILITY: Record<string, Record<string, number>> = {
  A: { A: 100, B: 45, AB: 60, O: 70 },
  B: { A: 45, B: 100, AB: 65, O: 50 },
  AB: { A: 60, B: 65, AB: 100, O: 40 },
  O: { A: 70, B: 50, AB: 40, O: 100 },
};

// 生肖相合度表
const ZODIAC_HARMONY: Record<string, Record<string, number>> = {
  鼠: { 鼠: 100, 牛: 95, 虎: 40, 兔: 50, 龍: 95, 蛇: 50, 馬: 30, 羊: 35, 猴: 100, 雞: 40, 狗: 35, 豬: 100 },
  牛: { 鼠: 95, 牛: 100, 虎: 30, 兔: 35, 龍: 40, 蛇: 95, 馬: 25, 羊: 30, 猴: 35, 雞: 95, 狗: 40, 豬: 50 },
  虎: { 鼠: 40, 牛: 30, 虎: 100, 兔: 95, 龍: 50, 蛇: 40, 馬: 95, 羊: 45, 猴: 35, 雞: 40, 狗: 95, 豬: 50 },
  兔: { 鼠: 50, 牛: 35, 虎: 95, 兔: 100, 龍: 40, 蛇: 50, 馬: 70, 羊: 95, 猴: 35, 雞: 45, 狗: 65, 豬: 95 },
  龍: { 鼠: 95, 牛: 40, 虎: 50, 兔: 40, 龍: 100, 蛇: 50, 馬: 60, 羊: 40, 猴: 95, 雞: 50, 狗: 40, 豬: 50 },
  蛇: { 鼠: 50, 牛: 95, 虎: 40, 兔: 50, 龍: 50, 蛇: 100, 馬: 35, 羊: 45, 猴: 40, 雞: 95, 狗: 35, 豬: 50 },
  馬: { 鼠: 30, 牛: 25, 虎: 95, 兔: 70, 龍: 60, 蛇: 35, 馬: 100, 羊: 95, 猴: 40, 雞: 50, 狗: 95, 豬: 50 },
  羊: { 鼠: 35, 牛: 30, 虎: 45, 兔: 95, 龍: 40, 蛇: 45, 馬: 95, 羊: 100, 猴: 30, 雞: 40, 狗: 50, 豬: 95 },
  猴: { 鼠: 100, 牛: 35, 虎: 35, 兔: 35, 龍: 95, 蛇: 40, 馬: 40, 羊: 30, 猴: 100, 雞: 40, 狗: 50, 豬: 40 },
  雞: { 鼠: 40, 牛: 95, 虎: 40, 兔: 45, 龍: 50, 蛇: 95, 馬: 50, 羊: 40, 猴: 40, 雞: 100, 狗: 40, 豬: 50 },
  狗: { 鼠: 35, 牛: 40, 虎: 95, 兔: 65, 龍: 40, 蛇: 35, 馬: 95, 羊: 50, 猴: 50, 雞: 40, 狗: 100, 豬: 95 },
  豬: { 鼠: 100, 牛: 50, 虎: 50, 兔: 95, 龍: 50, 蛇: 50, 馬: 50, 羊: 95, 猴: 40, 雞: 50, 狗: 95, 豬: 100 },
};

// 五行相合度表
const WUXING_HARMONY: Record<string, Record<string, number>> = {
  木: { 木: 100, 火: 95, 土: 40, 金: 30, 水: 70 },
  火: { 木: 95, 火: 100, 土: 90, 金: 40, 水: 30 },
  土: { 木: 40, 火: 90, 土: 100, 金: 50, 水: 40 },
  金: { 木: 30, 火: 40, 土: 50, 金: 100, 水: 50 },
  水: { 木: 70, 火: 30, 土: 40, 金: 50, 水: 100 },
};

function getChineseZodiac(birthDate: string): string {
  const year = Number.parseInt(birthDate.slice(0, 4), 10);
  const zodiacs = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
  return zodiacs[(year - 1900) % 12];
}

function getCharStrokes(char: string): number {
  const code = char.charCodeAt(0);
  // 用一個確定的雜湊對應出分佈均勻的 2 到 25 之間的數值作為中文字筆劃數
  return ((code * 17 + 3) % 24) + 2;
}

function getDeterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // 轉換為 32 位元整數
  }
  return Math.abs(hash);
}

function calculateNameHarmony(nameA: string, nameB: string): number {
  const strokesA = Array.from(nameA).map(getCharStrokes);
  const strokesB = Array.from(nameB).map(getCharStrokes);

  // 姓名學總格（所有字筆畫相加）
  const totalA = strokesA.reduce((sum, val) => sum + val, 0);
  const totalB = strokesB.reduce((sum, val) => sum + val, 0);

  // 姓名學人格（姓氏最後一字 + 名字第一字）
  const renA = (strokesA[0] ?? 0) + (strokesA[1] ?? 0);
  const renB = (strokesB[0] ?? 0) + (strokesB[1] ?? 0);

  const diffRen = Math.abs(renA - renB);
  const diffTotal = Math.abs(totalA - totalB);

  // 計算一個高靈敏度、不易出現滿分的姓名相合分數
  return Math.max(35, 100 - (diffRen * 3.5 + diffTotal * 1.5));
}

function calculateBirthdayAlignment(dateA: string, dateB: string): number {
  // 月份相合度（同月份100，相差6個月最低）
  const monthA = Number.parseInt(dateA.slice(5, 7), 10);
  const monthB = Number.parseInt(dateB.slice(5, 7), 10);
  const monthDiff = Math.min(Math.abs(monthA - monthB), 12 - Math.abs(monthA - monthB));
  return Math.max(0, 100 - monthDiff * 10);
}

function calculateShichenBalance(shichenA: number | 'unknown' | null, shichenB: number | 'unknown' | null): number {
  if (shichenA === null || shichenB === null || shichenA === 'unknown' || shichenB === 'unknown') {
    return 50; // 無法計算時返回中等值
  }
  const timeDiff = Math.abs((shichenA as number) - (shichenB as number));
  return Math.max(0, 100 - timeDiff * 8);
}

function calculateGenderDynamics(genderA: string, genderB: string): number {
  // 異性相吸 (95)，同性相斥 (40)，但也有例外
  return genderA !== genderB ? 95 : 40;
}

export function computeRelationshipMatrix(personA: PersonData, personB: PersonData): RelationshipMatrix {
  // 計算各維度數據
  const nameHarmony = calculateNameHarmony(personA.name, personB.name);
  const birthdayAlignment = calculateBirthdayAlignment(personA.birthDate, personB.birthDate);
  const bloodTypeCompatibility = BLOOD_TYPE_COMPATIBILITY[personA.bloodType]?.[personB.bloodType] ?? 50;

  const destinyA = computeDestinyProfile(personA.birthDate);
  const destinyB = computeDestinyProfile(personB.birthDate);
  const wuxingAlignment = WUXING_HARMONY[destinyA.dominantWuxing]?.[destinyB.dominantWuxing] ?? 50;

  const zodiacA = getChineseZodiac(personA.birthDate);
  const zodiacB = getChineseZodiac(personB.birthDate);
  const zodiacHarmony = ZODIAC_HARMONY[zodiacA]?.[zodiacB] ?? 50;

  const genderDynamics = calculateGenderDynamics(personA.gender, personB.gender);
  const shichenBalance = calculateShichenBalance(personA.shichen, personB.shichen);

  // 計算人格矩陣相合
  const matrixA = PersonalityMatrixEngine.generatePersonalityMatrix(
    {
      birthDate: personA.birthDate,
      zodiacSign: getZodiacEnglishName(personA.birthDate),
      gender: personA.gender,
      bloodType: personA.bloodType,
      voiceCharacteristics: [],
      firstName: personA.name,
    },
    destinyA.personalityAdjust,
  ) as any;

  const matrixB = PersonalityMatrixEngine.generatePersonalityMatrix(
    {
      birthDate: personB.birthDate,
      zodiacSign: getZodiacEnglishName(personB.birthDate),
      gender: personB.gender,
      bloodType: personB.bloodType,
      voiceCharacteristics: [],
      firstName: personB.name,
    },
    destinyB.personalityAdjust,
  ) as any;

  // 計算人格共鳴度（相同特質）
  let resonanceSum = 0;
  let resonanceCount = 0;
  for (const key in matrixA) {
    const k = key as keyof typeof matrixA;
    if (matrixB[k] !== undefined) {
      const diff = Math.abs((matrixA[k] as number) - (matrixB[k] as number));
      resonanceSum += Math.max(0, 100 - diff);
      resonanceCount += 1;
    }
  }
  const personalityResonance = resonanceCount > 0 ? resonanceSum / resonanceCount : 50;

  // 計算人格互補度（互補特質）
  const personalityComplementarity = Math.abs(personalityResonance - 50) < 25 ? 75 : 50;

  // 計算人格衝突度
  const personalityConflict = 100 - personalityResonance;

  // 大數據唯一金鑰指紋雜湊，確保世界上沒有任何兩對伴侶的數據與話術完全相同
  const relationKey = personA.name + personB.name + personA.birthDate + personB.birthDate + personA.bloodType + personB.bloodType + String(personA.shichen) + String(personB.shichen);
  const seed = getDeterministicHash(relationKey);

  // 各核心指標隨機波動 (Deterministic Jitter)
  const jitterOverall = ((seed % 31) - 15);      // -15 ~ 15
  const jitterResonance = (((seed >> 2) % 31) - 15);
  const jitterWuxing = (((seed >> 4) % 25) - 12);
  const jitterName = (((seed >> 6) % 25) - 12);
  const jitterZodiac = (((seed >> 8) % 25) - 12);
  const jitterShichen = (((seed >> 10) % 25) - 12);
  const jitterConflictRisk = (((seed >> 12) % 31) - 15);

  // 綜合計算總體共鳴度 (加入 Jitter 後限制邊界)
  let rawResonance = Math.round(
    (nameHarmony * 0.1 +
      birthdayAlignment * 0.1 +
      bloodTypeCompatibility * 0.15 +
      wuxingAlignment * 0.15 +
      zodiacHarmony * 0.15 +
      personalityResonance * 0.2 +
      genderDynamics * 0.05 +
      shichenBalance * 0.1) /
      0.8
  );
  const overallResonance = Math.max(32, Math.min(99, rawResonance + jitterOverall));

  // 判斷誰比較主動付出（基於性格矩陣）
  const activeScore = (matrixA['dominance'] ?? 50) - (matrixB['dominance'] ?? 50);
  const activePerson: 'A' | 'B' | 'equal' =
    activeScore > 10 ? 'A' : activeScore < -10 ? 'B' : 'equal';

  // 判斷誰比較需要被理解（基於敏感度）
  const sensitivityA = matrixA['sensitivity'] ?? 50;
  const sensitivityB = matrixB['sensitivity'] ?? 50;
  const needsUnderstanding: 'A' | 'B' | 'mutual' =
    sensitivityA > sensitivityB + 10 ? 'A' : sensitivityB > sensitivityA + 10 ? 'B' : 'mutual';

  // 判斷主要課題
  let primaryChallenge = '相處溝通';
  if (personalityConflict > 60) {
    primaryChallenge = '理解與包容';
  } else if (bloodTypeCompatibility < 50) {
    primaryChallenge = '行為模式調和';
  } else if (zodiacHarmony < 50) {
    primaryChallenge = '生活節奏協調';
  }

  // 判斷主要禮物/互補優勢
  let primaryGift = '互相滋養';
  if (personalityComplementarity > 70) {
    primaryGift = '性格互補';
  } else if (wuxingAlignment > 70) {
    primaryGift = '能量平衡';
  } else if (zodiacHarmony > 80) {
    primaryGift = '生肖相合';
  }

  // 判斷關係原型
  let relationshipArchetype = '平衡者';
  if (overallResonance > 80) {
    relationshipArchetype = '靈魂伴侶';
  } else if (personalityConflict > 50) {
    relationshipArchetype = '挑戰者';
  } else if (activePerson !== 'equal') {
    relationshipArchetype = activePerson === 'A' ? '守護者（甲方）' : '守護者（乙方）';
  }

  // 判斷業力主題
  let karmicTheme = '靈魂學習';
  if (overallResonance > 85) {
    karmicTheme = '靈魂伴侶相聚';
  } else if (personalityConflict > 60) {
    karmicTheme = '業力挑戰';
  } else if (activePerson !== 'equal') {
    karmicTheme = '未竟承諾';
  }

  // 判斷成長機會
  let growthOpportunity = '在關係中學會信任';
  if (needsUnderstanding === 'A') {
    growthOpportunity = '甲方學會表達，乙方學會傾聽';
  } else if (needsUnderstanding === 'B') {
    growthOpportunity = '乙方學會表達，甲方學會傾聽';
  } else if (personalityConflict > 50) {
    growthOpportunity = '在衝突中學會尊重與妥協';
  }

  // 計算情感維度（故事的心核）
  const emotionalDepth = Math.round(
    (personalityConflict > 0 ? personalityConflict : 50) +
    (personalityResonance / 2) +
    (50 - Math.abs(activeScore)) // 互動差異越大越有故事張力
  ) / 3;

  // 3. 根據合盤基因 seed 動態多路選擇直擊痛點、具有強烈殺傷力與戲劇起伏的文案
  const painPoints = [
    '被看見與承認的潛意識渴望',
    '控制與掙脫的邊界撕扯課題',
    '信任崩塌後的防禦性自我冷漠',
    '無聲付出與被視為理所當然的絕望感',
    '靈魂相近卻因日常失焦的無聲撕裂',
    '在親密包圍中喪失自我的宿命恐懼',
    '被伴侶無意忽視的慢性靈魂窒息',
    '期待落空後築起的防禦性心靈防線'
  ];

  const deepPains = [
    `你在這段關係中習慣了默默吞下委屈，卻在某個無意間的冰冷細節裡發現——對方其實從未試圖真正看懂你的敏感。那一刻的荒涼，比任何激烈的爭吵都更具殺傷力。`,
    `最深的刺痛，是看著眼前最親密的伴侶，卻感到相顧無言的絕望。你們曾經一見如故，如今卻在同一個屋簷下默默築起各自防禦的冰冷城牆。`,
    `你傾其所有的無悔付出，最終成了對方予取予求的安全感。而當你展露出絲毫的疲憊時，得到的不是心疼，而是對方的冷眼與不解。`,
    `每一次試圖溝通，最終都演變成情緒的宣洩與對人性的懷疑。最扎心的真相是——你們都在用「最愛對方」的藉口，精準地往對方最痛的傷口上灑鹽。`,
    `你總是在期待對方為你改變，卻在一次次的期待落空中學會了自我封閉。那種被最愛之人無視的冰冷，正在慢慢抽乾你靈魂深處的熱情。`
  ];

  const harshTruths = [
    `你們爭執時說出的那些最傷人的狠話，其實正是潛意識裡壓抑已久的真心話。不要用「衝動」當藉口，那是你們積怨已久的真話。`,
    `你自以為偉大、無私的奉獻，在對方眼中可能只是一座無形的精神牢籠。而對方的冷漠與逃避，其實是他在這座牢籠裡無聲、被動的反抗。`,
    `親密關係中最致命的不是背叛，而是習慣性的忽視。當兩個人不再願意分享靈魂的顫動，這段感情就已經名存實亡，只剩冰冷的外殼。`,
    `你的敏感不是無理取鬧，而是靈魂在深淵邊緣掙扎的警報。當你終於不再抱怨、不再索求，代表你已經在心底為這段關係宣判了死刑。`,
    `你們都在強撐著自尊等待對方先低頭。但實際上，低頭的代價是暴露自己的軟肋。在這場以愛為名的權力博弈中，你們註定兩敗俱傷。`
  ];

  const painPoint = painPoints[seed % painPoints.length];
  const selectedDeepPain = deepPains[(seed >> 3) % deepPains.length];
  const selectedHarshTruth = harshTruths[(seed >> 5) % harshTruths.length];

  // 判斷溫暖因子 — 故事的救贖點（希望所在）
  let warmthFactor = '在陌生中找到歸屬';
  if (zodiacHarmony > 80) {
    warmthFactor = '生肖相合的天然默契';
  } else if (wuxingAlignment > 75) {
    warmthFactor = '五行能量的自然流動';
  } else if (personalityComplementarity > 70) {
    warmthFactor = '性格互補帶來的完整感';
  } else {
    warmthFactor = '在衝突中學會珍惜';
  }

  // 判斷情感弧線 — 故事的敘述結構
  let emotionalArc = '陌生→接近→衝突→理解→和解';
  if (personalityResonance > 85) {
    emotionalArc = '陌生→一見如故→深入→挑戰→蛻變';
  } else if (personalityConflict > 50) {
    emotionalArc = '吸引→衝擊→痛楚→反思→成長';
  } else if (overallResonance > 75) {
    emotionalArc = '相遇→熟悉→信任→承諾→永恆';
  }

  // 判斷故事轉折點 — 最感動的一刻
  let storyTwist = '';
  if (activeScore > 15) {
    storyTwist = `當${activePerson === 'A' ? personA.name : personB.name}終於停止付出，${activePerson === 'A' ? personB.name : personA.name}才明白對方有多重要`;
  } else if (personalityConflict > 55) {
    storyTwist = `在最激烈的爭執時，彼此才發現——生氣是因為在乎`;
  } else if (personalityResonance > 85) {
    storyTwist = `原來靈魂相近的兩個人，早已在冥冥中等待彼此`;
  } else {
    storyTwist = `衝突成為轉機，誤解化作理解的契機`;
  }

  // 計算痛點強度 — 故事的殺傷力 (引入 Jitter 放大波動)
  const rawPainIntensity = Math.round(
    (personalityConflict > 0 ? personalityConflict : 50) * 0.7 +
    (100 - personalityResonance) * 0.3
  );
  const painPointIntensity = Math.max(35, Math.min(98, rawPainIntensity + jitterConflictRisk));

  // 判斷深層傷害與無法逃避的真相 (由關係金鑰 seed 動態選擇)
  const deepPain = selectedDeepPain;
  const harshTruth = selectedHarshTruth;

  return {
    nameHarmony: Math.max(32, Math.min(99, Math.round(nameHarmony + jitterName))),
    birthdayAlignment: Math.max(32, Math.min(99, Math.round(birthdayAlignment + jitterOverall))),
    bloodTypeCompatibility: Math.max(32, Math.min(99, Math.round(bloodTypeCompatibility + jitterResonance))),
    wuxingAlignment: Math.max(32, Math.min(99, Math.round(wuxingAlignment + jitterWuxing))),
    zodiacHarmony: Math.max(32, Math.min(99, Math.round(zodiacHarmony + jitterZodiac))),
    genderDynamics: Math.round(genderDynamics),
    shichenBalance: Math.max(32, Math.min(99, Math.round(shichenBalance + jitterShichen))),
    personalityResonance: Math.max(32, Math.min(99, Math.round(personalityResonance + jitterResonance))),
    personalityComplementarity: Math.max(32, Math.min(99, Math.round(personalityComplementarity))),
    personalityConflict: Math.max(32, Math.min(99, Math.round(personalityConflict - jitterResonance))),
    overallResonance,
    activePerson,
    needsUnderstanding,
    primaryChallenge,
    primaryGift,
    relationshipArchetype,
    karmicTheme,
    growthOpportunity,
    emotionalDepth,
    painPoint,
    painPointIntensity,
    deepPain,
    harshTruth,
    warmthFactor,
    emotionalArc,
    storyTwist,
  };
}
