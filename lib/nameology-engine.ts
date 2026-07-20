import type { BloodType, DimensionScores, Gender } from './types';

export type NameologyElement = '木' | '火' | '土' | '金' | '水';
export type NameologyRelation = '相生' | '相剋' | '比和';

export type NameologyTendencyKey =
  | 'authority'
  | 'gentleness'
  | 'logic'
  | 'empathy'
  | 'action'
  | 'stability'
  | 'creativity'
  | 'communication'
  | 'resource'
  | 'relationship'
  | 'learning'
  | 'discipline'
  | 'ambition'
  | 'service'
  | 'independence'
  | 'adaptability'
  | 'leadership'
  | 'detail'
  | 'intuition'
  | 'resilience'
  | 'feminine'
  | 'masculine'
  | 'balance'
  | 'visibility';

type CharGlyphProfile = {
  radical: string;
  parts: string[];
  structure: string;
  meaning: string;
  namingIntent: string;
};

type CharProfile = {
  strokes: number;
  element: NameologyElement;
  imagery: string;
  traits: string[];
  caution: string;
  glyph?: CharGlyphProfile;
  tendencies?: Partial<Record<NameologyTendencyKey, number>>;
};

export type NameologyTendency = {
  key: NameologyTendencyKey;
  label: string;
  score: number;
  tone: string;
  meaning: string;
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
  glyph: CharGlyphProfile;
  tendencies: NameologyTendency[];
};

export type NameologyGridItem = {
  key: 'sky' | 'person' | 'earth' | 'outer' | 'total';
  label: string;
  value: number;
  element: NameologyElement;
  meaning: string;
  advice: string;
};

export type NameologyNameComposition = {
  surname: string;
  givenName: string;
  surnameSummary: string;
  givenNameSummary: string;
  combinedIntent: string;
};

export type NameologyCrossCheck = {
  genderLens: string;
  bloodTypeLens: string;
  birthdayLens: string;
  alignmentLabel: string;
  summary: string;
  corrections: string[];
};

export type NameologyAnalysis = {
  name: string;
  composition: NameologyNameComposition;
  crossCheck: NameologyCrossCheck;
  characters: NameologyCharAnalysis[];
  grids: NameologyGridItem[];
  elementFlow: {
    from: string;
    to: string;
    relation: NameologyRelation;
    note: string;
  }[];
  temperamentProfile: {
    topTendencies: NameologyTendency[];
    allTendencies: NameologyTendency[];
    summary: string;
    clearDirection: string;
  };
  corePersonality: string;
  imageAndPreference: string;
  strengths: string[];
  cautions: string[];
  recommendations: string[];
  score: number;
  level: string;
  summary: string;
  ruleVersion: 'Nameology Core V1.2.0';
};

const TENDENCY_META: Record<NameologyTendencyKey, { label: string; tone: string; meaning: string }> = {
  authority: { label: '權威主導', tone: '偏掌控、重立場', meaning: '容易想把方向定清楚，適合承擔決策與規則。' },
  gentleness: { label: '柔和包容', tone: '偏溫柔、重感受', meaning: '重視舒服的關係與柔性溝通。' },
  logic: { label: '邏輯理性', tone: '偏分析、重證據', meaning: '適合用拆解、判斷與條理來處理事情。' },
  empathy: { label: '情感同理', tone: '偏感性、重人心', meaning: '能感受他人狀態，適合做連結與安撫。' },
  action: { label: '行動突破', tone: '偏主動、重速度', meaning: '遇到機會會想先動起來，用行動打開局面。' },
  stability: { label: '穩定守成', tone: '偏穩重、重安全', meaning: '適合累積資源、建立制度與長期信任。' },
  creativity: { label: '創意美感', tone: '偏美感、重表現', meaning: '對形象、作品與品味有感，適合創造可被看見的價值。' },
  communication: { label: '表達號召', tone: '偏說服、重聲音', meaning: '容易透過說話、承諾、教導或舞台影響他人。' },
  resource: { label: '資源財務', tone: '偏累積、重價值', meaning: '重視實際成果、資源配置與財務安全。' },
  relationship: { label: '人際親和', tone: '偏圓融、重連結', meaning: '容易在人群中建立信任，適合合作與服務。' },
  learning: { label: '學習洞察', tone: '偏吸收、重理解', meaning: '會從經驗中找規律，適合研究與自我提升。' },
  discipline: { label: '規範自律', tone: '偏原則、重標準', meaning: '重視秩序與品質，適合把事情做穩做準。' },
  ambition: { label: '格局企圖', tone: '偏大局、重成就', meaning: '名字帶有往上走、撐場面與追求突破的訊號。' },
  service: { label: '照顧服務', tone: '偏守護、重責任', meaning: '容易承接他人需求，適合把照顧轉成專業。' },
  independence: { label: '獨立自主', tone: '偏自立、重自由', meaning: '不喜歡被過度限制，適合保留自主判斷。' },
  adaptability: { label: '彈性應變', tone: '偏流動、重變通', meaning: '能在變動裡找路，適合跨領域與調整策略。' },
  leadership: { label: '領導責任', tone: '偏帶人、重承擔', meaning: '適合成為方向感的來源，帶人一起前進。' },
  detail: { label: '細膩觀察', tone: '偏精細、重分寸', meaning: '能看見細節與氣氛變化，適合精準修正。' },
  intuition: { label: '直覺靈感', tone: '偏感知、重靈動', meaning: '對氛圍與暗示敏銳，適合靠洞察找到答案。' },
  resilience: { label: '抗壓韌性', tone: '偏耐力、重恢復', meaning: '遇到壓力不容易倒下，適合長期作戰。' },
  feminine: { label: '陰柔魅力', tone: '偏女性、重柔韌', meaning: '帶細膩、包容、審美與柔性影響力。' },
  masculine: { label: '陽剛氣勢', tone: '偏剛強、重氣場', meaning: '帶決斷、壓場、企圖與保護力。' },
  balance: { label: '協調平衡', tone: '偏中和、重整合', meaning: '能把不同立場放在一起，適合調停與整合。' },
  visibility: { label: '舞台曝光', tone: '偏亮眼、重辨識', meaning: '名字容易帶出被看見、被記住、被辨識的氣場。' },
};

const TENDENCY_KEYS = Object.keys(TENDENCY_META) as NameologyTendencyKey[];

const CHAR_PROFILE_MAP: Record<string, CharProfile> = {
  王: { strokes: 4, element: '土', imagery: '王者定軸，重視格局、承擔與主導。', traits: ['主見清楚', '重視承諾', '有管理感'], caution: '避免把責任全部扛在自己身上。', tendencies: { authority: 20, leadership: 18, stability: 12, ambition: 10 } },
  李: { strokes: 7, element: '木', imagery: '木下有子，帶學習、延伸與照顧之象。', traits: ['學習快', '重人情', '彈性高'], caution: '容易想太多，需要把界線說清楚。', tendencies: { learning: 18, service: 12, relationship: 10, adaptability: 10 } },
  陳: { strokes: 16, element: '火', imagery: '陳列成局，重視累積、表達與聲勢。', traits: ['能整合資源', '行動有節奏', '重視成果'], caution: '節奏過快時容易急著證明。', tendencies: { visibility: 14, communication: 12, resource: 12, action: 10 } },
  林: { strokes: 8, element: '木', imagery: '雙木成林，代表人脈、成長與共生。', traits: ['親和力好', '重視團隊', '善於累積'], caution: '選擇太多時容易分心。', tendencies: { relationship: 18, learning: 14, stability: 10, balance: 10 } },
  張: { strokes: 11, element: '火', imagery: '弓長有勢，象徵展開、突破與外放。', traits: ['企圖心強', '反應快', '願意挑戰'], caution: '壓力高時語氣容易太硬。', tendencies: { action: 18, ambition: 16, masculine: 12, visibility: 10 } },
  黃: { strokes: 12, element: '土', imagery: '中央厚土，重視穩定、信任與資源。', traits: ['務實可靠', '重視品質', '有財務感'], caution: '不要因求穩而錯過時機。', tendencies: { stability: 18, resource: 16, resilience: 12, discipline: 8 } },
  蔡: { strokes: 17, element: '木', imagery: '草木有文，帶審美、規劃與人際辨識。', traits: ['觀察細膩', '懂得布局', '重視品味'], caution: '容易對自己要求過高。', tendencies: { creativity: 16, detail: 16, learning: 10, relationship: 8 } },
  劉: { strokes: 15, element: '金', imagery: '金氣成刃，代表決斷、規則與執行。', traits: ['判斷果斷', '重效率', '能收斂問題'], caution: '太快下結論會讓人有距離。', tendencies: { logic: 18, discipline: 18, authority: 12, masculine: 10 } },
  吳: { strokes: 7, element: '火', imagery: '口天相接，帶表達、舞台與影響力。', traits: ['表達自然', '適合曝光', '感染力佳'], caution: '情緒上來時要先停一拍。', tendencies: { communication: 18, visibility: 16, relationship: 10, action: 8 } },
  楊: { strokes: 13, element: '木', imagery: '木逢日升，象徵成長、光感與擴張。', traits: ['向上心強', '有生命力', '喜歡突破'], caution: '不要同時開太多戰場。', tendencies: { ambition: 18, action: 14, learning: 12, visibility: 10 } },
  周: { strokes: 8, element: '土', imagery: '周全成圓，代表照顧、循環與秩序。', traits: ['思慮完整', '重承諾', '會顧全大局'], caution: '別讓顧全變成委屈。', tendencies: { balance: 18, service: 14, stability: 12, relationship: 10 } },
  許: { strokes: 11, element: '木', imagery: '言午成諾，帶承諾、信任與溝通。', traits: ['重信用', '善協調', '懂分寸'], caution: '答應前要先確認能量。', tendencies: { communication: 16, relationship: 14, balance: 12, discipline: 8 } },
  鄭: { strokes: 19, element: '金', imagery: '邑中有正，重規矩、定位與名聲。', traits: ['原則強', '重視名譽', '能立制度'], caution: '彈性不足時容易僵住。', tendencies: { discipline: 20, authority: 14, visibility: 10, logic: 10 } },
  謝: { strokes: 17, element: '金', imagery: '言射有準，代表表達精準與責任交付。', traits: ['分析精準', '重禮數', '有交代感'], caution: '避免話語太直接刺傷人。', tendencies: { logic: 16, communication: 14, discipline: 12, detail: 10 } },
  賴: { strokes: 16, element: '土', imagery: '信賴成基，重資源、支持與持久力。', traits: ['耐力好', '守信用', '重家庭'], caution: '過度承受會形成慢性壓力。', tendencies: { stability: 18, resilience: 16, service: 12, resource: 10 } },
  龍: { strokes: 16, element: '火', imagery: '龍象升騰，代表氣勢、企圖與轉化力。', traits: ['格局感強', '敢衝敢扛', '有舞台能量'], caution: '氣勢太滿時要留空間給別人。', tendencies: { ambition: 22, masculine: 18, visibility: 14, leadership: 14 } },
  明: { strokes: 8, element: '火', imagery: '日月同明，思路清楚，適合照亮方向。', traits: ['邏輯清楚', '願意承擔', '有啟發力'], caution: '看得太清楚時容易急著糾正。', glyph: { radical: '日', parts: ['日', '月'], structure: '左右明照', meaning: '日月同在，象徵看見、照亮、分辨與公開。', namingIntent: '取名用明，多半希望此人思路清楚、做人坦亮、能把方向照出來。' }, tendencies: { logic: 18, visibility: 16, communication: 10, leadership: 8 } },
  心: { strokes: 4, element: '火', imagery: '心主感受，重情、直覺與內在信念。', traits: ['感受敏銳', '有同理', '重真誠'], caution: '不要把別人的情緒全收進來。', tendencies: { empathy: 20, intuition: 16, gentleness: 12, feminine: 8 } },
  慧: { strokes: 15, element: '水', imagery: '慧根內藏，代表洞察、學習與靈性理解。', traits: ['洞察力強', '學習快', '善反思'], caution: '想太深時行動會變慢。', tendencies: { learning: 20, intuition: 18, logic: 10, detail: 8 } },
  安: { strokes: 6, element: '土', imagery: '安定入宅，重安全感、秩序與照護。', traits: ['穩定可靠', '重和氣', '善照顧'], caution: '太求安穩會壓住企圖心。', tendencies: { stability: 18, gentleness: 14, service: 14, relationship: 8 } },
  祥: { strokes: 10, element: '土', imagery: '祥瑞聚氣，代表修和、貴人與祝福感。', traits: ['人緣溫厚', '能聚福氣', '重善意'], caution: '不要只求圓融而不表態。', tendencies: { relationship: 18, balance: 14, gentleness: 12, resource: 8 } },
  瑞: { strokes: 13, element: '金', imagery: '瑞氣成章，象徵價值、品質與辨識度。', traits: ['品味好', '重價值', '能建立信任'], caution: '避免標準太高而難放鬆。', tendencies: { resource: 16, creativity: 14, visibility: 12, discipline: 10 } },
  豪: { strokes: 14, element: '水', imagery: '豪氣外放，帶資源、膽識與人情味。', traits: ['有膽識', '重義氣', '願意投入'], caution: '大方前要先算清資源。', tendencies: { masculine: 16, resource: 14, relationship: 12, ambition: 10 } },
  傑: { strokes: 12, element: '木', imagery: '傑出拔起，代表能力、突破與被看見。', traits: ['競爭力強', '敢出頭', '目標感強'], caution: '不要把成功只綁在表現。', tendencies: { ambition: 18, action: 14, visibility: 14, independence: 8 } },
  宇: { strokes: 6, element: '土', imagery: '宇量成局，象徵格局、包容與空間感。', traits: ['格局開闊', '能包容', '有穩定氣場'], caution: '包容不等於沒有底線。', tendencies: { ambition: 14, gentleness: 12, stability: 12, balance: 10 } },
  軒: { strokes: 10, element: '木', imagery: '軒昂向上，帶氣度、門面與上升力。', traits: ['氣質明朗', '重形象', '有上進心'], caution: '要把外在氣勢落到行動。', tendencies: { visibility: 16, ambition: 14, action: 10, creativity: 8 } },
  承: { strokes: 8, element: '土', imagery: '承接有力，代表責任、傳承與可靠度。', traits: ['能承擔', '守信用', '重長期'], caution: '不要把承接變成硬撐。', tendencies: { stability: 16, leadership: 12, resilience: 12, service: 10 } },
  家: { strokes: 10, element: '土', imagery: '家宅聚氣，重根基、守護與資源管理。', traits: ['重家庭', '懂照顧', '有累積力'], caution: '別讓責任感壓過自我。', tendencies: { service: 18, stability: 16, resource: 10, relationship: 10 } },
  志: { strokes: 7, element: '火', imagery: '志向定心，代表目標、意志與方向。', traits: ['有目標', '願意堅持', '重成就'], caution: '目標太硬時要保留彈性。', tendencies: { ambition: 18, resilience: 14, action: 12, discipline: 8 } },
  仁: { strokes: 4, element: '木', imagery: '仁者有愛，代表善意、同理與人和。', traits: ['有同理', '重情義', '願意幫人'], caution: '助人前先守住自己的力氣。', tendencies: { empathy: 18, relationship: 16, service: 12, gentleness: 10 } },
  義: { strokes: 13, element: '金', imagery: '義理成準，代表原則、公道與判斷。', traits: ['重原則', '講公道', '敢表態'], caution: '原則要配合溝通溫度。', tendencies: { discipline: 18, authority: 12, logic: 12, masculine: 8 } },
  信: { strokes: 9, element: '土', imagery: '人言為信，重承諾、信用與穩定關係。', traits: ['可信任', '重承諾', '適合長期合作'], caution: '不要因守信而過度委屈。', tendencies: { stability: 16, discipline: 12, relationship: 12, service: 8 } },
  美: { strokes: 9, element: '金', imagery: '美感成形，代表審美、關係與吸引力。', traits: ['審美好', '重感受', '懂得修飾'], caution: '不要為了好看而忽略真實需求。', tendencies: { creativity: 18, feminine: 14, visibility: 12, empathy: 8 } },
  婷: { strokes: 12, element: '木', imagery: '婷婷有姿，代表柔韌、禮節與細膩表達。', traits: ['氣質柔和', '善觀察', '人際敏銳'], caution: '不要把敏感藏成壓抑。', tendencies: { feminine: 18, gentleness: 16, detail: 12, relationship: 10 } },
  雅: { strokes: 12, element: '木', imagery: '雅正有度，重品味、分寸與內涵。', traits: ['有品味', '懂分寸', '重質感'], caution: '避免因太在意體面而不敢要求。', tendencies: { creativity: 14, discipline: 12, detail: 12, feminine: 8 } },
  欣: { strokes: 8, element: '木', imagery: '欣然向生，代表喜悅、成長與感染力。', traits: ['正向明亮', '善鼓舞', '容易親近'], caution: '低潮時不要勉強自己開朗。', tendencies: { relationship: 16, visibility: 12, action: 10, gentleness: 8 } },
  怡: { strokes: 8, element: '土', imagery: '怡然和氣，重舒適、人和與穩定節奏。', traits: ['親和穩定', '懂照顧氣氛', '重安全感'], caution: '要避免過度迎合。', tendencies: { gentleness: 18, relationship: 14, stability: 12, balance: 10 } },
  妤: { strokes: 7, element: '水', imagery: '柔水有姿，代表感受、流動與細膩美感。', traits: ['感受細膩', '適應力好', '有柔性魅力'], caution: '容易受環境情緒牽動。', tendencies: { feminine: 18, empathy: 14, adaptability: 12, intuition: 10 } },
  大: { strokes: 3, element: '火', imagery: '大象開張，代表擴張、格局、承擔與氣勢。', traits: ['格局放大', '願意承擔', '氣勢明顯'], caution: '格局太大時，要用細節把承諾落地。', glyph: { radical: '大', parts: ['人形開展'], structure: '獨體開張', meaning: '像人張開手腳，有放大、擴張、承擔之象。', namingIntent: '取名用大，通常是希望此人有大器、大格局與敢承擔的方向。' }, tendencies: { ambition: 20, masculine: 14, leadership: 12, action: 10 } },
  小: { strokes: 3, element: '火', imagery: '小象精微，代表細膩、謹慎、觀察與收斂。', traits: ['觀察細膩', '懂得收斂', '反應靈巧'], caution: '不要因太謹慎而低估自己的格局。', glyph: { radical: '小', parts: ['中心', '兩側分點'], structure: '獨體收束', meaning: '力量向中心收攏，象徵細節、精準、微觀與謹慎。', namingIntent: '取名用小，常是希望此人靈巧、細心、懂分寸，能把小處做好。' }, tendencies: { detail: 20, gentleness: 10, learning: 10, adaptability: 8 } },
  君: { strokes: 7, element: '火', imagery: '君有口令，代表表達、號令、承諾與領導語氣。', traits: ['有領導感', '表達有份量', '重承諾'], caution: '話語有力量，更要留意說出口的承擔。', glyph: { radical: '口', parts: ['尹', '口'], structure: '上下發聲', meaning: '下有口，象徵發言、承諾、號令；上承治理之象，代表能以話語定方向。', namingIntent: '取名用君，多半希望此人有格局、有禮、有領導氣質，說話能讓人信服。' }, tendencies: { communication: 20, leadership: 18, authority: 12, visibility: 10 } },
  威: { strokes: 9, element: '土', imagery: '威儀立界，代表威嚴、規範、壓場與界線感。', traits: ['氣場明顯', '重原則', '有壓場力'], caution: '威太重時，要用溫度平衡距離感。', glyph: { radical: '女', parts: ['戌', '女'], structure: '內柔外剛', meaning: '字中見女，柔象藏於剛勢之內；外有戌的守衛與規範，形成既有威儀又需守住分寸的象。', namingIntent: '取名用威，通常希望此人有氣勢、有尊嚴、有界線，不容易被環境壓倒。' }, tendencies: { authority: 22, masculine: 18, discipline: 12, feminine: 8 } },
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

const ELEMENT_THEME: Record<NameologyElement, { strength: string; caution: string; tendency: NameologyTendencyKey[] }> = {
  木: { strength: '成長、學習、人脈延伸', caution: '分心、猶豫、承諾過多', tendency: ['learning', 'relationship', 'adaptability'] },
  火: { strength: '表達、行動、舞台能量', caution: '急躁、情緒外放、過度證明', tendency: ['communication', 'action', 'visibility'] },
  土: { strength: '穩定、承擔、資源累積', caution: '保守、硬撐、變通不足', tendency: ['stability', 'resource', 'resilience'] },
  金: { strength: '判斷、品質、規則與決斷', caution: '距離感、標準過高、語氣太硬', tendency: ['logic', 'discipline', 'authority'] },
  水: { strength: '洞察、彈性、智慧與流動', caution: '想太深、拖延、能量分散', tendency: ['intuition', 'adaptability', 'learning'] },
};

const PART_TENDENCIES: Record<string, Partial<Record<NameologyTendencyKey, number>>> = {
  口: { communication: 14, visibility: 6 },
  女: { feminine: 14, gentleness: 8, empathy: 6 },
  心: { empathy: 14, intuition: 8 },
  忄: { empathy: 12, intuition: 8 },
  言: { communication: 14, discipline: 6 },
  讠: { communication: 12 },
  木: { learning: 10, relationship: 6 },
  日: { visibility: 10, logic: 6 },
  月: { empathy: 8, intuition: 6 },
  金: { logic: 10, discipline: 8 },
  氵: { adaptability: 10, intuition: 8 },
  水: { adaptability: 10, intuition: 8 },
  土: { stability: 10, resource: 8 },
  宀: { stability: 10, service: 8 },
  王: { authority: 12, leadership: 8 },
  大: { ambition: 12, masculine: 8 },
  小: { detail: 12, gentleness: 5 },
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

function fallbackGlyph(char: string, element: NameologyElement): CharGlyphProfile {
  return {
    radical: element,
    parts: [char],
    structure: '字形結構判讀',
    meaning: `「${char}」目前未建立完整測字拆解，先依字形複雜度、筆畫尾數與五行${element}氣判讀。`,
    namingIntent: `取名使用「${char}」，系統先視為一個帶有${ELEMENT_THEME[element].strength}的姓名訊號；後續可補入正式字源與部首資料。`,
  };
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
    glyph: fallbackGlyph(char, element),
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

function addTendency(scores: Record<NameologyTendencyKey, number>, key: NameologyTendencyKey, value: number) {
  scores[key] = (scores[key] ?? 0) + value;
}

function buildTendencyList(scores: Record<NameologyTendencyKey, number>): NameologyTendency[] {
  const highest = Math.max(...TENDENCY_KEYS.map((key) => scores[key] ?? 0), 1);
  return TENDENCY_KEYS
    .map((key) => {
      const meta = TENDENCY_META[key];
      return {
        key,
        label: meta.label,
        score: clampScore(((scores[key] ?? 0) / highest) * 100),
        tone: meta.tone,
        meaning: meta.meaning,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildCharTendencies(profile: CharProfile, glyph: CharGlyphProfile): NameologyTendency[] {
  const scores = Object.fromEntries(TENDENCY_KEYS.map((key) => [key, 0])) as Record<NameologyTendencyKey, number>;
  for (const key of ELEMENT_THEME[profile.element].tendency) addTendency(scores, key, 8);
  for (const [key, value] of Object.entries(profile.tendencies ?? {}) as [NameologyTendencyKey, number][]) addTendency(scores, key, value);
  for (const part of glyph.parts) {
    const partScores = PART_TENDENCIES[part];
    if (!partScores) continue;
    for (const [key, value] of Object.entries(partScores) as [NameologyTendencyKey, number][]) addTendency(scores, key, value);
  }
  addTendency(scores, profile.strokes % 2 === 0 ? 'stability' : 'action', 5);
  return buildTendencyList(scores).slice(0, 4);
}

function buildTemperamentProfile(characters: NameologyCharAnalysis[], grids: NameologyGridItem[]) {
  const scores = Object.fromEntries(TENDENCY_KEYS.map((key) => [key, 0])) as Record<NameologyTendencyKey, number>;

  characters.forEach((char, index) => {
    const positionWeight = index === 0 ? 0.45 : index === 1 ? 1.35 : 1.25;
    char.tendencies.forEach((tendency) => addTendency(scores, tendency.key, tendency.score * positionWeight));
    for (const key of ELEMENT_THEME[char.element].tendency) addTendency(scores, key, 5 * positionWeight);
  });

  grids.forEach((grid) => {
    const weight = grid.key === 'person' ? 12 : grid.key === 'total' ? 10 : 6;
    for (const key of ELEMENT_THEME[grid.element].tendency) addTendency(scores, key, weight);
  });

  const allTendencies = buildTendencyList(scores);
  const topTendencies = allTendencies.slice(0, 5);
  const [first, second, third] = topTendencies;
  return {
    topTendencies,
    allTendencies,
    summary: first && second && third
      ? `這個名字的性情主軸落在「${first.label}、${second.label}、${third.label}」，不是模糊的好壞，而是偏向${first.tone}，並由${second.label}與${third.label}補成完整人格方向。`
      : '姓名性情傾向偏中性，需依完整字義與筆畫補充判讀。',
    clearDirection: first
      ? `最明確的方向是「${first.label}」：${first.meaning}`
      : '方向尚未集中，建議先補完整姓名資料。',
  };
}

function tendencyScore(profile: { allTendencies: NameologyTendency[] }, key: NameologyTendencyKey) {
  return profile.allTendencies.find((item) => item.key === key)?.score ?? 0;
}

function buildNameComposition(characters: NameologyCharAnalysis[], temperamentProfile: ReturnType<typeof buildTemperamentProfile>): NameologyNameComposition {
  const surname = characters[0];
  const givenChars = characters.slice(1);
  const givenName = givenChars.map((item) => item.char).join('');
  const givenTop = givenChars.flatMap((item) => item.tendencies.slice(0, 2)).sort((a, b) => b.score - a.score).slice(0, 3);
  const givenTone = givenTop.map((item) => item.label).join('、') || temperamentProfile.topTendencies.slice(0, 2).map((item) => item.label).join('、');
  const givenIntent = givenChars.map((item) => `「${item.char}」${item.glyph.namingIntent}`).join(' ');

  return {
    surname: surname?.char ?? '',
    givenName,
    surnameSummary: surname
      ? `姓氏「${surname.char}」是家族根基與承接底盤，提供${surname.element}氣的基礎，不作為主要取名意圖。`
      : '尚未取得姓氏根基。',
    givenNameSummary: givenName
      ? `名字「${givenName}」才是取名者放入的主意境，主要偏向${givenTone}。`
      : '名字主體不足，無法完整判讀取名意境。',
    combinedIntent: givenIntent || temperamentProfile.clearDirection,
  };
}

function bloodTypeLens(bloodType?: Exclude<BloodType, ''>) {
  if (bloodType === 'A') return { label: 'A 型校正：重秩序、細節與安全感。', keys: ['discipline', 'detail', 'stability'] as NameologyTendencyKey[] };
  if (bloodType === 'B') return { label: 'B 型校正：重自由、創意與彈性。', keys: ['independence', 'creativity', 'adaptability'] as NameologyTendencyKey[] };
  if (bloodType === 'AB') return { label: 'AB 型校正：重理性、直覺與雙軌整合。', keys: ['logic', 'intuition', 'balance'] as NameologyTendencyKey[] };
  if (bloodType === 'O') return { label: 'O 型校正：重行動、領導與人際號召。', keys: ['action', 'leadership', 'relationship'] as NameologyTendencyKey[] };
  return { label: '血型未提供，先不做血型校正。', keys: [] as NameologyTendencyKey[] };
}

function birthdayLens(birthDate?: string) {
  const month = Number.parseInt((birthDate ?? '').slice(5, 7), 10);
  const element: NameologyElement = month >= 2 && month <= 4 ? '木' : month >= 5 && month <= 7 ? '火' : month >= 8 && month <= 10 ? '金' : month === 11 || month === 12 || month === 1 ? '水' : '土';
  return {
    label: `生日節奏校正：月份落在${element}氣，輔助觀察${ELEMENT_THEME[element].strength}。`,
    keys: ELEMENT_THEME[element].tendency,
  };
}

function buildCrossCheck(
  temperamentProfile: ReturnType<typeof buildTemperamentProfile>,
  context?: { gender?: Gender; bloodType?: Exclude<BloodType, ''>; birthDate?: string },
): NameologyCrossCheck {
  const masculine = tendencyScore(temperamentProfile, 'masculine') + tendencyScore(temperamentProfile, 'authority') * 0.45 + tendencyScore(temperamentProfile, 'action') * 0.35;
  const feminine = tendencyScore(temperamentProfile, 'feminine') + tendencyScore(temperamentProfile, 'gentleness') * 0.45 + tendencyScore(temperamentProfile, 'empathy') * 0.35;
  const gender = context?.gender;
  const genderLens = gender === 'male'
    ? feminine > masculine + 12
      ? '男性資料交叉：名字帶柔性細膩，代表外在男性氣場中有觀察、照顧與柔性影響力。'
      : masculine > feminine + 12
        ? '男性資料交叉：名字陽剛訊號順勢，行動、主導與承擔會比較直接。'
        : '男性資料交叉：名字陰陽接近，適合走剛柔並用的路線。'
    : gender === 'female'
      ? masculine > feminine + 12
        ? '女性資料交叉：名字帶陽剛主導，代表主見、決斷、扛責任與開路能力明顯。'
        : feminine > masculine + 12
          ? '女性資料交叉：名字柔性訊號順勢，親和、感受、審美與細膩影響力較明顯。'
          : '女性資料交叉：名字陰陽接近，適合用柔中帶剛的方式發揮。'
      : '性別未提供，先以姓名本身的陰陽偏向判讀。';

  const blood = bloodTypeLens(context?.bloodType);
  const birthday = birthdayLens(context?.birthDate);
  const topKeys = temperamentProfile.topTendencies.slice(0, 6).map((item) => item.key);
  const bloodHits = blood.keys.filter((key) => topKeys.includes(key));
  const birthdayHits = birthday.keys.filter((key) => topKeys.includes(key));
  const alignmentScore = bloodHits.length + birthdayHits.length + (Math.abs(masculine - feminine) <= 12 ? 1 : 0);
  const alignmentLabel = alignmentScore >= 4 ? '交叉高度一致' : alignmentScore >= 2 ? '交叉可互補' : '交叉需要校正';

  return {
    genderLens,
    bloodTypeLens: bloodHits.length > 0 ? `${blood.label} 與姓名主軸中的${bloodHits.map((key) => TENDENCY_META[key].label).join('、')}相呼應。` : `${blood.label} 與姓名主軸不完全重疊，適合用後天習慣補齊。`,
    birthdayLens: birthdayHits.length > 0 ? `${birthday.label} 與姓名主軸中的${birthdayHits.map((key) => TENDENCY_META[key].label).join('、')}相呼應。` : `${birthday.label} 與姓名主軸不同頻，代表要靠選擇與環境把能量接起來。`,
    alignmentLabel,
    summary: `完整資料交叉後，系統判定為「${alignmentLabel}」。姓名先定性情主軸，性別看陰陽呈現，血型看行為習慣，生日看節奏輔助，最後合成同一個答案。`,
    corrections: [genderLens, blood.label, birthday.label],
  };
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

export function buildNameologyAnalysis(name: string, nameScores: DimensionScores, context?: { gender?: Gender; bloodType?: Exclude<BloodType, ''>; birthDate?: string }): NameologyAnalysis {
  const cleanName = name.trim();
  const sourceChars = Array.from(cleanName).slice(0, 8);
  const characters = sourceChars.map((char, index) => {
    const fixed = CHAR_PROFILE_MAP[char];
    const profile = fixed ?? fallbackProfile(char);
    const glyph = profile.glyph ?? fallbackGlyph(char, profile.element);
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
      glyph,
      tendencies: buildCharTendencies(profile, glyph),
    };
  });

  const grids = buildFiveGrids(characters);
  const temperamentProfile = buildTemperamentProfile(characters, grids);
  const composition = buildNameComposition(characters, temperamentProfile);
  const crossCheck = buildCrossCheck(temperamentProfile, context);
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
  const crossBonus = crossCheck.alignmentLabel === '交叉高度一致' ? 5 : crossCheck.alignmentLabel === '交叉可互補' ? 2 : -3;
  const score = clampScore(relationScore * 0.42 + averageTop * 0.33 + (temperamentProfile.topTendencies[0]?.score ?? 60) * 0.2 + crossBonus);
  const dominantElement = totalGrid?.element ?? characters[0]?.element ?? '土';
  const dominantTheme = ELEMENT_THEME[dominantElement];
  const mainChars = characters.slice(0, 3).map((item) => `「${item.char}」${item.element}${item.yinYang}`).join('、');
  const topTemperaments = temperamentProfile.topTendencies.slice(0, 3).map((item) => item.label).join('、');

  return {
    name: cleanName,
    composition,
    crossCheck,
    characters,
    grids,
    elementFlow,
    temperamentProfile,
    corePersonality: `人格主軸落在${personGrid?.value ?? 0}畫${personGrid?.element ?? '土'}氣，名字呈現的是${dominantTheme.strength}；24性情矩陣顯示，最明顯偏向為${topTemperaments}。${composition.givenName ? `名字「${composition.givenName}」是主要意境來源。` : ''}${mainChars ? `前三個字的核心訊號為${mainChars}。` : ''}`,
    imageAndPreference: `姓名外顯形象偏向「${dominantTheme.strength}」，性情表現以${topTemperaments}最容易被看見；${crossCheck.genderLens} 偏好清楚、有秩序、能累積成果的路線。`,
    strengths: [
      characters[0] ? `${characters[0].char}字提供${characters[0].traits[0]}的根基。` : '姓名根基偏中性。',
      temperamentProfile.topTendencies[0] ? `${temperamentProfile.topTendencies[0].label}是最強性情訊號，代表${temperamentProfile.topTendencies[0].meaning}` : '性情訊號偏中性。',
      `${crossCheck.alignmentLabel}：${crossCheck.summary}`,
      personGrid ? `${personGrid.label}${personGrid.value}畫讓人格主軸偏向${ELEMENT_THEME[personGrid.element].strength}。` : '人格格局穩定。',
      totalGrid ? `${totalGrid.label}${totalGrid.value}畫代表長期方向適合累積${ELEMENT_THEME[totalGrid.element].strength}。` : '總體方向以穩定發展為主。',
    ],
    cautions: [
      characters.find((item) => item.strokeSource === 'structural_estimate') ? '部分字尚未納入固定筆畫表，已用結構估算，後續可補正式康熙筆畫。' : '姓名字義與筆畫皆可由固定表重算。',
      ...elementFlow.filter((item) => item.relation === '相剋').slice(0, 2).map((item) => item.note),
      dominantTheme.caution,
    ].slice(0, 4),
    recommendations: [
      temperamentProfile.topTendencies[0] ? `先把${temperamentProfile.topTendencies[0].label}用在正確的位置：${temperamentProfile.topTendencies[0].meaning}` : `先把${dominantTheme.strength}用在最重要的一件事上，不要分散。`,
      personGrid ? `遇到壓力時，用${personGrid.label}${personGrid.element}氣的方式處理：先定規則，再談感受。` : '遇到壓力時，先把問題拆小再行動。',
      crossCheck.alignmentLabel === '交叉需要校正' ? '姓名與資料交叉有落差時，不代表不好，而是提醒你要刻意把習慣、說話方式與行動節奏校準。' : '姓名能量不是宿命，而是提醒你把自己的作為、形象與選擇調整到更一致。',
    ],
    score,
    level: levelFromScore(score),
    summary: `姓名「${cleanName}」的主要訊號是${dominantElement}氣，24性情矩陣顯示偏向${topTemperaments}；${composition.givenNameSummary}${crossCheck.summary} 字義、字形與筆畫組合顯示：你的形象不適合模糊，越能把作為、說話方式與目標放在同一條線上，越容易讓人信任。`,
    ruleVersion: 'Nameology Core V1.2.0',
  };
}