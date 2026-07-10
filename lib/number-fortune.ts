/**
 * 天宿數字神數 · 易經數理吉凶解碼引擎
 * 
 * 融合「易經梅花易數起卦法」與「八十一數理靈動數」大數據統計學，
 * 100% 在前端/本地運行，反應順暢、零超時、極致穩定。
 */

export interface NumberFortuneResult {
  number: string;
  wuxing: string;
  wuxingChar: string;
  fortuneLevel: '大吉' | '吉' | '半吉' | '平' | '凶' | '大凶';
  lingdongNum: number;
  lingdongTitle: string;
  lingdongDesc: string;
  hexagramName: string;
  hexagramDesc: string;
  wisdomNote: string;
}

// ────────────────────────────────────────────────────────────
// 八十一數理靈動數資料庫 (精選最經典的 1-80 靈動數)
// ────────────────────────────────────────────────────────────

const LINGDONG_DB: Record<number, { title: string; desc: string; level: NumberFortuneResult['fortuneLevel'] }> = {
  1: { title: '繁榮發達', desc: '萬物開泰，身體健康，富貴長壽的尊榮之數。', level: '大吉' },
  2: { title: '動盪不安', desc: '志大才疏，多勞少獲，常陷於孤立無援之境。', level: '凶' },
  3: { title: '進取如意', desc: '名利雙收，才德兼備，能成大業的吉祥之數。', level: '大吉' },
  4: { title: '前途坎坷', desc: '常有阻礙，意志薄弱，容易半途而廢或招致損失。', level: '大凶' },
  5: { title: '福祿豐盈', desc: '陰陽和合，生意興隆，富貴榮華的家門興旺數。', level: '大吉' },
  6: { title: '安穩餘慶', desc: '天德相助，順風揚帆，衣食無憂的平穩吉祥數。', level: '吉' },
  7: { title: '剛毅果斷', desc: '精力充沛，排除萬難，能奪得權力與成功的開拓數。', level: '吉' },
  8: { title: '意志堅強', desc: '克難成就，勤儉建業，終能發達的成功數。', level: '吉' },
  9: { title: '興途受阻', desc: '孤獨無依，財力匱乏，容易陷入困境與抱恨之數。', level: '大凶' },
  10: { title: '暗淡無光', desc: '雪上加霜，多病多災，缺乏生氣，凡事宜守不宜進。', level: '大凶' },
  11: { title: '穩步發展', desc: '草木逢春，才德兼備，能獲得眾人擁戴而成功。', level: '大吉' },
  12: { title: '薄弱無力', desc: '意志薄弱，多情善感，容易招致失敗與孤立。', level: '凶' },
  13: { title: '智慧超群', desc: '才藝雙全，充滿謀略，能憑智慧成就大業的吉數。', level: '大吉' },
  14: { title: '淪落天涯', desc: '事與願違，多感困惑，家屬緣薄，凡事需保守。', level: '大凶' },
  15: { title: '福壽雙全', desc: '德澤深厚，溫和謙遜，能得貴人相助而安富尊榮。', level: '大吉' },
  16: { title: '厚重載德', desc: '名望高重，反凶化吉，能成就大業的巨富吉祥數。', level: '大吉' },
  17: { title: '突破萬難', desc: '剛毅過人，開拓進取，但宜注意謙遜，避免剛愎自用。', level: '半吉' },
  18: { title: '有志竟成', desc: '掌權發達，能克服萬難達成目標，名利雙收之數。', level: '吉' },
  19: { title: '成敗引退', desc: '風雲蔽日，才智雖高但易招致挫折，宜修身養性。', level: '凶' },
  20: { title: '實而不華', desc: '常有憂心，前途多舛，凡事宜腳踏實地防範未然。', level: '大凶' },
  21: { title: '明月光照', desc: '光風霽月，首領之格，受人尊敬，能成大業。', level: '大吉' },
  22: { title: '秋草逢霜', desc: '憂始薄弱，常感懷才不遇，多勞少獲之數。', level: '凶' },
  23: { title: '旭日東升', desc: '威勢沖天，名顯四方，能建大功立大業的昌盛數。', level: '大吉' },
  24: { title: '家門餘慶', desc: '白手起家，財源廣進，子孫賢孝，晚年安樂。', level: '大吉' },
  25: { title: '英俊才特', desc: '資質英俊，性格剛毅，但宜注意溫和，以免樹敵。', level: '半吉' },
  26: { title: '變怪奇異', desc: '成敗交替，英雄之格，若能堅忍能成偉業，反之則敗。', level: '平' },
  27: { title: '吉凶互見', desc: '迎新棄舊，成敗並存，自我反省可保平安。', level: '平' },
  28: { title: '自豪招非', desc: '易招誹謗，難免孤獨，宜收斂鋒芒，多行善事。', level: '凶' },
  29: { title: '名利雙收', desc: '欲望難滿，但才智過人，肯拼搏必能獲取財富地位。', level: '大吉' },
  30: { title: '成敗難測', desc: '沉浮不定，冒險投機易致失敗，宜保守經營。', level: '凶' },
  31: { title: '和樂安祥', desc: '智勇雙全，凡事順遂，家庭和樂，名利兼收。', level: '大吉' },
  32: { title: '如龍得水', desc: '溫和親切，能得長輩貴人提攜，前途無量。', level: '大吉' },
  33: { title: '旭日高照', desc: '名動天下，權力大增，但女性用此數宜溫婉。', level: '大吉' },
  34: { title: '破家亡身', desc: '災禍連連，孤立無援，凡事需極力保守忍耐。', level: '大凶' },
  35: { title: '保守平安', desc: '溫和優雅，善於輔佐，能過著安定殷實的生活。', level: '吉' },
  36: { title: '波瀾重疊', desc: '常有起伏，俠義心腸但易招損失，宜安分守己。', level: '凶' },
  37: { title: '猛虎出林', desc: '剛毅果斷，德高望重，能排除萬難開創大業。', level: '大吉' },
  38: { title: '技藝成功', desc: '文學藝術天賦高，但缺乏首領之格，宜專精技藝。', level: '半吉' },
  39: { title: '富貴榮華', desc: '才德相配，名利雙收，晚年安樂的長壽繁榮數。', level: '大吉' },
  40: { title: '沉浮不定', desc: '成敗難料，宜退守，切忌貪功好進。', level: '平' },
  41: { title: '德高望重', desc: '膽識過人，能成大業，富貴長壽，福澤子孫。', level: '大吉' },
  42: { title: '多勞少成', desc: '才藝雖多但意志薄弱，容易流於空談，宜專一。', level: '凶' },
  43: { title: '雨夜之花', desc: '表面風光，內心空虛，財來財去，宜開源節流。', level: '凶' },
  44: { title: '逆境折磨', desc: '波折起伏，容易遇到小人，凡事以和為貴。', level: '大凶' },
  45: { title: '新生回泰', desc: '排除萬難，化險為夷，能得眾望而建大功。', level: '大吉' },
  46: { title: '秋風落葉', desc: '孤立無援，艱難困頓，宜多布施累積陰德。', level: '大凶' },
  47: { title: '點鐵成金', desc: '得貴人助，如意發達，白手起家，名利兼收。', level: '大吉' },
  48: { title: '有德望眾', desc: '才德兼備，顧問之格，深受擁戴，名利雙收。', level: '大吉' },
  49: { title: '吉凶折半', desc: '成敗並存，自立自強可化險為夷，安分守己。', level: '平' },
  50: { title: '先吉後凶', desc: '晚景宜防敗退，切忌好大喜功，宜守成.，', level: '凶' },
  51: { title: '盛衰交替', desc: '時來運轉，時而受挫，宜保持平常心，積德行善。', level: '平' },
  52: { title: '先憂後喜', desc: '青年多勞，中年得志，能開創事業，收穫財富。', level: '吉' },
  53: { title: '內憂外患', desc: '表面昌盛但內藏隱患，凡事需謹慎防微杜漸。', level: '凶' },
  54: { title: '多難多舛', desc: '前途多障礙，常感無力，多布施、心存善念可化解。', level: '大凶' },
  55: { title: '外祥內苦', desc: '表裡不一，宜踏實做事，莫圖虛名，可保平安。', level: '平' },
  56: { title: '浪裡行舟', desc: '波折重重，缺乏安定感，宜修身養性，不宜冒險。', level: '大凶' },
  57: { title: '寒雪逢春', desc: '苦盡甘來，獲得貴人扶持，晚景榮華安樂。', level: '吉' },
  58: { title: '先苦後甜', desc: '排除萬難，晚年發達，意志堅強者能成就大業。', level: '半吉' },
  59: { title: '意志薄弱', desc: '缺乏決斷力，財來財去，宜尋求穩健合夥人。', level: '凶' },
  60: { title: '黑暗無光', desc: '搖擺不定，常受挫折，宜保守，心存善念能化吉。', level: '大凶' },
  61: { title: '名利交收', desc: '修身養性，能建大功，但宜戒驕戒躁。', level: '吉' },
  62: { title: '衰敗困頓', desc: '基礎不穩，多憂慮，凡事宜守舊，不宜開拓。', level: '大凶' },
  63: { title: '萬事順意', desc: '繁榮昌盛，富貴雙全，子孫賢孝，吉祥安樂。', level: '大吉' },
  64: { title: '海中落日', desc: '晚景宜防退步，凡事低調防小人，多行善事。', level: '凶' },
  65: { title: '巨商富格', desc: '家庭興旺，財源廣進，福澤深厚，受人景仰。', level: '大吉' },
  66: { title: '內外不和', desc: '信用受損，多有口舌，以和為貴，修口德可化解。', level: '大凶' },
  67: { title: '獨自建功', desc: '白手起家，得到眾人擁戴，名利雙收之數。', level: '大吉' },
  68: { title: '志同道合', desc: '能得賢內助或好合夥人，共同建業，平穩發達。', level: '吉' },
  69: { title: '動搖不定', desc: '常有起伏，財產易耗，以守為吉，莫起貪心。', level: '凶' },
  70: { title: '寂寞荒涼', desc: '家運衰微，晚年宜修心養性，多與家人溝通。', level: '大凶' },
  71: { title: '得而復失', desc: '宜防盛極必衰，保持勤儉，積德行善可保晚年。', level: '平' },
  72: { title: '外祥內憂', desc: '宜防虛榮跑版，腳踏實地，防範財務糾紛。', level: '凶' },
  73: { title: '盛衰參半', desc: '自力更生，勤勉做事，晚年可得安康平穩。', level: '平' },
  74: { title: '多勞無獲', desc: '宜防小人，以守為安，切忌聽信謠言盲目投資。', level: '大凶' },
  75: { title: '守成保泰', desc: '退一步海闊天空，不宜強求名利，知足常樂。', level: '吉' },
  76: { title: '傾覆退敗', desc: '波折重重，多遇挫折，修心向善，廣結善緣可化吉。', level: '大凶' },
  77: { title: '苦樂參半', desc: '前半生波折，後半生平穩，宜早積蓄防晚年。', level: '平' },
  78: { title: '盛極必衰', desc: '晚景宜守，莫行險棋，心存善念，多行善事可化險。', level: '凶' },
  79: { title: '阻礙重重', desc: '精力匱乏，宜多注意身體健康，凡事隨緣。', level: '大凶' },
  80: { title: '吉凶折半', desc: '一生起伏不定，自律自強，保持正念可得平順。', level: '平' },
};

// ────────────────────────────────────────────────────────────
// 八卦起卦與易經卦象資料庫 (八進制起卦)
// ────────────────────────────────────────────────────────────

const BAGUA_NAMES = ['坤', '乾', '兌', '離', '震', '巽', '坎', '艮', '坤'];

// 64 卦名與精華神斷
const HEXAGRAM_DB: Record<string, { name: string; desc: string; note: string }> = {
  '乾乾': { name: '乾為天', desc: '元亨利貞，剛健中正。飛龍在天，大吉之象。', note: '行事光明磊落，自強不息，必有大成。' },
  '坤坤': { name: '坤為地', desc: '柔順厚德，載物無疆。宜守不宜進，吉。', note: '以柔克剛，順應天時，廣結善緣即是改命。' },
  '坎坎': { name: '坎為水', desc: '重重險陷，行險用險。凡事宜防，避開爭端。', note: '水滴石穿，堅定正念，心存善念即可化險。' },
  '離離': { name: '離為火', desc: '明兩作雨，附麗光明。利貞，亨通。', note: '戒驕戒躁，虛心待人，事業必能紅紅火火。' },
  '震震': { name: '震為雷', desc: '雷聲震動，震驚百里。先驚後喜，轉安為福。', note: '處變不驚，改過自新，危機即是最大的轉機。' },
  '巽巽': { name: '巽為風', desc: '隨風順應，謙遜有禮。利市三倍，吉。', note: '謙和待人，莫行險棋，順天而行則萬事吉。' },
  '艮艮': { name: '艮為山', desc: '動靜得宜，知止不移。適時停下，安全之象。', note: '知止常樂，切忌盲目追求名利，守成最吉。' },
  '兌兌': { name: '兌為澤', desc: '歡樂歌舞，剛中柔外。口舌宜防，吉。', note: '和顏悅色，廣結善緣，但防口蜜腹劍之人。' },
  '乾坤': { name: '天地否', desc: '天地不交，閉塞不通。小人得勢，宜守。', note: '此時宜低調，莫強求，多行善積德默默耕耘。' },
  '坤乾': { name: '地天泰', desc: '天地交泰，三陽開泰。凡事通暢，大吉。', note: '氣運亨通，此時更宜多結善緣，廣施恩德。' },
  '離坎': { name: '火水未濟', desc: '未竟之功，乾坤流轉。希望在即，中吉。', note: '黎明前的黑暗，持之以恆，改心即能扭轉乾坤。' },
  '坎離': { name: '水火既濟', desc: '功成名就，完美和合。宜防盛極必衰，吉。', note: '當下圓滿，但需防微杜漸，保持謙遜以守成。' },
  '震巽': { name: '雷風恆', desc: '剛柔並濟，恆常不變。平穩安康，吉。', note: '守之以恆，心存善念，感情事業皆能長長久久。' },
  '巽震': { name: '風雷益', desc: '風雷交作，損上益下。利涉大川，大吉.，', note: '助人即是助己，多做公益善事，福報自然翻倍。' },
};

const DEFAULT_HEXAGRAM = {
  name: '風雷益卦',
  desc: '損上益下，利涉大川。風雷交作，蒸蒸日上。',
  note: '天道無私，常與善人。多行善積德，運勢必然如風雷般順暢通達。'
};

// ────────────────────────────────────────────────────────────
// 核心解碼算法
// ────────────────────────────────────────────────────────────

export function analyzeNumberFortune(rawNum: string): NumberFortuneResult {
  // 1. 清洗出純數字
  const clean = rawNum.replace(/\D/g, '');
  if (!clean) {
    return {
      number: rawNum,
      wuxing: '土',
      wuxingChar: '土',
      fortuneLevel: '平',
      lingdongNum: 8,
      lingdongTitle: '意志堅強',
      lingdongDesc: '克難成就，勤儉建業，終能發達的成功數。',
      hexagramName: '風雷益卦',
      hexagramDesc: '損上益下，利涉大川。風雷交作，蒸蒸日上。',
      wisdomNote: '輸入的數字不包含數理，天道守恆，多行善事是唯一的改命良方。',
    };
  }

  // 2. 計算 81 靈動數 (取最後 4 碼，或總和。手機號碼一般以最後 4 碼除以 80 的餘數最為經典)
  const numVal = Number.parseInt(clean.slice(-4) || clean, 10);
  let lingdong = numVal % 80;
  if (lingdong === 0) lingdong = 80;

  const lingdongResult = LINGDONG_DB[lingdong] || LINGDONG_DB[8];

  // 3. 計算五行 (看尾數)
  const lastDigit = Number.parseInt(clean.slice(-1), 10);
  let wuxing = '土';
  let wuxingChar = '土';
  if ([1, 2].includes(lastDigit)) {
    wuxing = '木 (東方青龍之氣)';
    wuxingChar = '木';
  } else if ([3, 4].includes(lastDigit)) {
    wuxing = '火 (南方朱雀之火)';
    wuxingChar = '火';
  } else if ([5, 6].includes(lastDigit)) {
    wuxing = '土 (中央麒麟之土)';
    wuxingChar = '土';
  } else if ([7, 8].includes(lastDigit)) {
    wuxing = '金 (西方白虎之金)';
    wuxingChar = '金';
  } else if ([9, 0].includes(lastDigit)) {
    wuxing = '水 (北方玄武之水)';
    wuxingChar = '水';
  }

  // 4. 易經八卦起卦 (梅花易數拆分法)
  // 將數字字串切半：前半段之和 % 8 為上卦，後半段之和 % 8 為下卦
  const mid = Math.ceil(clean.length / 2);
  const partA = clean.slice(0, mid);
  const partB = clean.slice(mid);

  const sumA = partA.split('').reduce((acc, curr) => acc + Number.parseInt(curr, 10), 0);
  const sumB = partB.split('').reduce((acc, curr) => acc + Number.parseInt(curr, 10), 0);

  let upperIndex = sumA % 8;
  if (upperIndex === 0) upperIndex = 8;
  let lowerIndex = sumB % 8;
  if (lowerIndex === 0) lowerIndex = 8;

  const upperBagua = BAGUA_NAMES[upperIndex];
  const lowerBagua = BAGUA_NAMES[lowerIndex];
  const key = `${upperBagua}${lowerBagua}`;

  const hexagram = HEXAGRAM_DB[key] || HEXAGRAM_DB[`${lowerBagua}${upperBagua}`] || DEFAULT_HEXAGRAM;

  // 5. 結合善念哲學
  const wisdomNote = `數理天命僅為引導，所謂「命隨心轉，運由己造」。${
    lingdongResult.level.includes('凶') 
      ? '此數字雖有阻礙，但若持守正念、改心行善、多結善緣，任何凶煞皆能化為修行菩提，化險為夷。' 
      : '此數字雖屬吉兆，但切忌驕矜，唯有持續心存善念，福澤才能長長久久。'
  }`;

  return {
    number: clean,
    wuxing,
    wuxingChar,
    fortuneLevel: lingdongResult.level,
    lingdongNum: lingdong,
    lingdongTitle: lingdongResult.title,
    lingdongDesc: lingdongResult.desc,
    hexagramName: `${upperBagua}下${lowerBagua}上：${hexagram.name}`,
    hexagramDesc: hexagram.desc,
    wisdomNote,
  };
}
