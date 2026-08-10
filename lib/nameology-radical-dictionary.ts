import type { NameologyElement, NameologyTendencyKey } from './nameology-engine';

export const NAMEOLOGY_RADICAL_DICTIONARY_VERSION = 'nameology_radical_dictionary_v1.0.0' as const;

export type NameologyRadicalProfile = {
  radical: string;
  aliases?: string[];
  element: NameologyElement;
  imagery: string;
  namingIntent: string;
  structureHint: string;
  partsHint: string[];
  traits: string[];
  caution: string;
  tendencyBoosts: Partial<Record<NameologyTendencyKey, number>>;
  sampleChars: string[];
};

const NAMEOLOGY_RADICAL_DICTIONARY: NameologyRadicalProfile[] = [
  {
    radical: '人',
    aliases: ['亻'],
    element: '土',
    imagery: '人部主關係、信任、承擔、互助與人格站位，姓名中代表做人方式與被他人信任的形象。',
    namingIntent: '取人部入名，多半希望此人重情義、可信任，能在人際關係中站得穩、說到做到。',
    structureHint: '人形立身',
    partsHint: ['人', '關係'],
    traits: ['可信任', '重情義', '有承擔感'],
    caution: '太在意他人期待時容易過度承接，需要清楚界線。',
    tendencyBoosts: { relationship: 16, service: 12, stability: 10 },
    sampleChars: ['仁', '佩', '信', '佳', '俊', '倫', '傑', '偉', '儀', '佑', '侑', '伶'],
  },
  {
    radical: '日',
    element: '火',
    imagery: '日部主光明、辨識、公開表達與被看見，姓名中代表方向感、透明度與舞台感。',
    namingIntent: '取日部入名，通常是希望此人心念明朗、方向清楚、能照亮自己也照亮他人。',
    structureHint: '光明顯象',
    partsHint: ['日', '光'],
    traits: ['方向清楚', '能見度高', '表達直接'],
    caution: '光太強時容易急著證明，需要保留傾聽空間。',
    tendencyBoosts: { visibility: 16, logic: 10, communication: 8 },
    sampleChars: ['明', '昱', '昌', '晶', '晟', '晴', '暘', '曜', '旭', '昭', '晏', '曦'],
  },
  {
    radical: '月',
    element: '水',
    imagery: '月部主感受、節奏、滋養與內在溫度，姓名中代表情緒辨識、照顧感與柔性承接。',
    namingIntent: '取月部入名，多半希望此人感受細膩、懂得照顧關係，也能在變化中保持節奏。',
    structureHint: '月象滋養',
    partsHint: ['月', '內在節奏'],
    traits: ['感受敏銳', '情緒細膩', '有照顧力'],
    caution: '容易承接太多情緒，需要建立界線。',
    tendencyBoosts: { empathy: 16, intuition: 12, gentleness: 8 },
    sampleChars: ['朗', '朋', '育', '勝', '朝', '期', '望', '有', '服', '胤'],
  },
  {
    radical: '氵',
    aliases: ['水'],
    element: '水',
    imagery: '水部主流動、智慧、溝通、適應與資源流轉，姓名中代表變通力與深層理解。',
    namingIntent: '取水部入名，通常希望此人有智慧、有彈性，能在不同環境中找到流動的出路。',
    structureHint: '水勢流通',
    partsHint: ['氵', '流動'],
    traits: ['適應力強', '理解力深', '懂得轉圜'],
    caution: '水氣過重時容易想太多或拖延，需要明確收束。',
    tendencyBoosts: { adaptability: 16, intuition: 12, learning: 8 },
    sampleChars: ['涵', '淇', '沛', '潔', '清', '淳', '澤', '洋', '泓', '浩', '海', '潤', '瀚', '沁', '湘', '沐'],
  },
  {
    radical: '木',
    element: '木',
    imagery: '木部主生長、延伸、規劃、學習與人脈，姓名中代表向上發展與持續累積。',
    namingIntent: '取木部入名，多半希望此人有生命力、能學習、能成長，也能形成自己的枝葉。',
    structureHint: '木氣生發',
    partsHint: ['木', '生長'],
    traits: ['成長力強', '善於規劃', '重視連結'],
    caution: '枝葉太多時容易分心，需要定主幹。',
    tendencyBoosts: { learning: 16, relationship: 10, adaptability: 8 },
    sampleChars: ['林', '森', '杰', '柏', '梓', '楷', '榮', '樺', '桓', '棠', '柔', '桐', '桂', '杉', '楚'],
  },
  {
    radical: '心',
    aliases: ['忄'],
    element: '火',
    imagery: '心部主情感、信念、內在感受與真誠承諾，姓名中代表心性、同理與精神核心。',
    namingIntent: '取心部入名，通常希望此人有真心、有感受力，能以內在信念承接人生選擇。',
    structureHint: '心念內守',
    partsHint: ['心', '信念'],
    traits: ['真誠敏銳', '重視信念', '有同理心'],
    caution: '心太重時容易把事情往內收，需要練習表達。',
    tendencyBoosts: { empathy: 18, intuition: 12, gentleness: 10 },
    sampleChars: ['心', '怡', '恬', '恩', '慈', '慧', '念', '思', '悅', '愷', '惟', '懿', '忠', '恆'],
  },
  {
    radical: '口',
    element: '火',
    imagery: '口部主表達、承諾、聲音、溝通與人際互動，姓名中代表說服力與對外連結。',
    namingIntent: '取口部入名，多半希望此人能說清楚、能建立信任，也能用聲音創造影響力。',
    structureHint: '口象發聲',
    partsHint: ['口', '聲音'],
    traits: ['表達自然', '能建立連結', '重承諾'],
    caution: '話語有力量，需要避免太快下定論。',
    tendencyBoosts: { communication: 18, visibility: 8, relationship: 6 },
    sampleChars: ['君', '哲', '品', '和', '嘉', '喜', '善', '啟', '可', '名', '吟', '唐'],
  },
  {
    radical: '女',
    element: '水',
    imagery: '女部主柔性、關係、承接、審美與親和，姓名中代表細膩互動與柔韌影響力。',
    namingIntent: '取女部入名，通常希望此人柔中有力、懂得關係分寸，也帶有美感與親和力。',
    structureHint: '柔性承接',
    partsHint: ['女', '柔韌'],
    traits: ['柔和細膩', '人際敏銳', '有親和力'],
    caution: '柔性太強時容易壓抑需求，需要把界線說明白。',
    tendencyBoosts: { feminine: 18, gentleness: 12, relationship: 10 },
    sampleChars: ['婷', '妤', '姍', '婕', '妮', '如', '姿', '妍', '嫻', '媛', '妙', '婉'],
  },
  {
    radical: '宀',
    element: '土',
    imagery: '宀部主安定、保護、家宅、歸屬與資源保存，姓名中代表穩定根基與守護感。',
    namingIntent: '取宀部入名，多半希望此人一生有安身之所、重視家庭秩序，也能保護重要的人事物。',
    structureHint: '屋宇成局',
    partsHint: ['宀', '家宅'],
    traits: ['穩定可靠', '重視安全', '懂得照顧'],
    caution: '太求穩會降低突破感，需要保留行動出口。',
    tendencyBoosts: { stability: 18, service: 12, resource: 8 },
    sampleChars: ['安', '宇', '宸', '宏', '宜', '宣', '家', '宥', '寧', '宗', '容', '宛'],
  },
  {
    radical: '王',
    aliases: ['玉'],
    element: '金',
    imagery: '王玉部主價值、品格、光澤、品質與信任，姓名中代表辨識度、標準與被珍視的氣質。',
    namingIntent: '取王玉部入名，通常希望此人有品格、有價值感，能把品質與信任立起來。',
    structureHint: '玉質成章',
    partsHint: ['王', '價值'],
    traits: ['重視品質', '有辨識度', '守信用'],
    caution: '標準過高時容易緊繃，需要允許過程。',
    tendencyBoosts: { resource: 14, discipline: 12, visibility: 10 },
    sampleChars: ['瑞', '瑋', '瑜', '琳', '琦', '瑄', '珊', '珍', '琪', '瑾', '珈', '璇'],
  },
  {
    radical: '言',
    aliases: ['訁', '讠'],
    element: '金',
    imagery: '言部主語言、承諾、規範、傳達與名聲，姓名中代表說話的準度與信用。',
    namingIntent: '取言部入名，多半希望此人言而有信、能清楚表達，也能用理念建立影響。',
    structureHint: '言語立信',
    partsHint: ['言', '承諾'],
    traits: ['表達精準', '重信用', '懂規範'],
    caution: '太重道理時容易顯得距離，需要加入溫度。',
    tendencyBoosts: { communication: 16, discipline: 10, logic: 8 },
    sampleChars: ['語', '誠', '諾', '詠', '詩', '謙', '謹', '譽', '謀', '訓', '許', '謝'],
  },
  {
    radical: '金',
    aliases: ['釒'],
    element: '金',
    imagery: '金部主規範、決斷、價值、界線與取捨，姓名中代表判斷力與執行標準。',
    namingIntent: '取金部入名，通常希望此人有判斷、有品質、有界線，能把事情收斂成結果。',
    structureHint: '金氣收斂',
    partsHint: ['金', '決斷'],
    traits: ['判斷明確', '重視品質', '有執行力'],
    caution: '金氣太銳時容易顯得強硬，需要保留彈性。',
    tendencyBoosts: { logic: 16, discipline: 14, authority: 8 },
    sampleChars: ['鈞', '銘', '鋒', '錦', '鎧', '鑫', '鉦', '銀', '銓', '鍾'],
  },
  {
    radical: '土',
    element: '土',
    imagery: '土部主穩定、承載、基礎、信任與累積，姓名中代表可靠度與長期承擔。',
    namingIntent: '取土部入名，多半希望此人踏實可靠、能承載責任，也能把資源慢慢累積起來。',
    structureHint: '土氣承載',
    partsHint: ['土', '根基'],
    traits: ['踏實穩定', '能承擔', '重長期'],
    caution: '土太重時容易保守或硬撐，需要學會流動。',
    tendencyBoosts: { stability: 18, resilience: 12, resource: 10 },
    sampleChars: ['坤', '城', '垣', '培', '基', '堂', '堯', '均', '境', '垚'],
  },
  {
    radical: '艹',
    element: '木',
    imagery: '艹部主生機、審美、柔韌、外在形象與人際辨識，姓名中代表可塑性與生命感。',
    namingIntent: '取艹部入名，通常希望此人有生命力、有美感，也能在環境中自然伸展。',
    structureHint: '草木萌發',
    partsHint: ['艹', '生機'],
    traits: ['有生命力', '美感佳', '可塑性高'],
    caution: '太在意環境反應時容易消耗自己，需要穩住主見。',
    tendencyBoosts: { creativity: 14, adaptability: 10, relationship: 8 },
    sampleChars: ['芳', '芸', '若', '英', '莉', '萱', '蓉', '華', '茹', '菲', '蓁', '菁'],
  },
  {
    radical: '辶',
    element: '水',
    imagery: '辶部主行進、移動、轉向、路徑與遠方，姓名中代表人生推進與適應路線。',
    namingIntent: '取辶部入名，多半希望此人能走出去、能開路，也能在變動中找到方向。',
    structureHint: '行路推進',
    partsHint: ['辶', '路徑'],
    traits: ['行動有路線', '適應變動', '能開展'],
    caution: '移動太多時容易不安定，需要建立回到核心的節奏。',
    tendencyBoosts: { action: 12, adaptability: 14, ambition: 8 },
    sampleChars: ['逸', '遠', '達', '迪', '道', '進', '逢', '遊', '遙', '選'],
  },
  {
    radical: '禾',
    element: '木',
    imagery: '禾部主收成、節氣、累積、務實成果與生活資源，姓名中代表耕耘後的穩定回報。',
    namingIntent: '取禾部入名，通常希望此人懂得耕耘、能累積成果，也能珍惜生活資源。',
    structureHint: '禾稼收成',
    partsHint: ['禾', '收成'],
    traits: ['務實累積', '懂得收成', '重視節奏'],
    caution: '太重成果時容易焦慮，需要信任時間。',
    tendencyBoosts: { resource: 12, stability: 10, discipline: 8 },
    sampleChars: ['秀', '秋', '秉', '科', '秦', '程', '稚', '穎', '穗', '穆'],
  },
  {
    radical: '貝',
    element: '金',
    imagery: '貝部主資源、價值、財務、交換與現實成果，姓名中代表資源管理與價值辨識。',
    namingIntent: '取貝部入名，多半希望此人懂得掌握資源、建立價值，也能把能力轉成成果。',
    structureHint: '貝財聚值',
    partsHint: ['貝', '資源'],
    traits: ['有財務感', '懂資源', '重成果'],
    caution: '太看重成果時容易壓力過高，需要平衡人情與價值。',
    tendencyBoosts: { resource: 18, discipline: 8, ambition: 8 },
    sampleChars: ['財', '賢', '貴', '賀', '資', '賜', '賓', '賴', '贊'],
  },
  {
    radical: '阝',
    aliases: ['阜', '邑'],
    element: '土',
    imagery: '阝部一支承地勢、一支承城邑，姓名中代表根基、位置、累積、邊界與外在名分。',
    namingIntent: '取阝部入名，多半希望此人有穩定根基、能守住定位，也能在群體或家族脈絡中建立名分。',
    structureHint: '阜邑定位',
    partsHint: ['阝', '定位'],
    traits: ['重視根基', '有位置感', '能累積聲望'],
    caution: '太重位置時容易背負包袱，需要把責任與自我分清楚。',
    tendencyBoosts: { stability: 14, discipline: 8, visibility: 8 },
    sampleChars: ['陳', '鄭', '郭', '邱', '邵', '邢', '郁', '都', '郡', '陵', '陽', '隅'],
  },
  {
    radical: '羊',
    element: '土',
    imagery: '羊部主祥和、美善、群體秩序與柔中有義，姓名中代表善意、審美、禮節與被祝福的氣質。',
    namingIntent: '取羊部入名，通常希望此人溫厚有禮、心性向善，能把美感、善意與原則合在一起。',
    structureHint: '羊象美善',
    partsHint: ['羊', '美善'],
    traits: ['溫厚有禮', '重視美感', '心性向善'],
    caution: '過度求和時容易壓下真實立場，需要善意也需要界線。',
    tendencyBoosts: { gentleness: 14, creativity: 12, balance: 10 },
    sampleChars: ['美', '善', '義', '祥', '羿', '群', '羚', '翔'],
  },
];

const CHARACTER_RADICAL_OVERRIDES: Record<string, string> = Object.fromEntries(
  NAMEOLOGY_RADICAL_DICTIONARY.flatMap((entry) => entry.sampleChars.map((char) => [char, entry.radical])),
);

export function getNameologyRadicalProfile(radical: string) {
  return NAMEOLOGY_RADICAL_DICTIONARY.find((entry) => entry.radical === radical || entry.aliases?.includes(radical));
}

export function resolveNameologyRadicalProfile(char: string, _fallbackElement: NameologyElement) {
  const radical = CHARACTER_RADICAL_OVERRIDES[char];
  if (radical) return getNameologyRadicalProfile(radical);

  const direct = getNameologyRadicalProfile(char);
  if (direct) return direct;

  return undefined;
}
