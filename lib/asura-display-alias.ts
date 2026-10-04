/**
 * 鬼魅阿修羅｜前端顯示別名層（Asura-only；只換顯示字，不碰運算）
 *
 * 後端（排盤、規則、registry、gate、filter）照舊以四個時層運算，內部鍵（year/month/day/hour、
 * 規則編號）不變。本檔只把「要顯示給客人看的字」換成阿修羅語彙：術數用語一律不上畫面。
 *
 * 經典出處（逐字原文與 CBETA 行號）：docs/技能戰鬥檔案/鬼魅阿修羅/詞彙庫.md
 * 技能登錄：docs/技能戰鬥檔案/鬼魅阿修羅/技能清單.md
 * 移除本檔的呼叫點即回到原字；本檔不 import 任何引擎。
 */

export type AsuraTimeLayer = 'year' | 'month' | 'day' | 'hour';

export interface AsuraTimeTerm {
  /** 時間單位（類比：年／月／日／時） */
  unit: '年' | '月' | '日' | '時';
  /** 主選（畫面上顯示） */
  term: string;
  /** 備選（未上畫面；業主可改用） */
  alternate: string;
  /** 經典出處（CBETA 行首） */
  source: string;
}

/** 四時層 → 阿修羅語彙。年＝歲、月＝月、日＝日、時＝剎那。 */
export const ASURA_TIME_TERMS: Readonly<Record<AsuraTimeLayer, AsuraTimeTerm>> = {
  year: { unit: '年', term: '千歲壽', alternate: '六千歲', source: 'T0024《起世經》卷7 T01n0024_p0344b28；T0001《長阿含經》卷20 T01n0001_p0133a27' },
  month: { unit: '月', term: '障月', alternate: '滿月', source: 'T0721《正法念處經》卷18 T17n0721_p0107c05–c07' },
  day: { unit: '日', term: '障日', alternate: '一日一夜', source: 'T0721《正法念處經》卷20 T17n0721_p0117c21–c22；卷19 T17n0721_p0112a05' },
  hour: { unit: '時', term: '一剎那', alternate: '最後念', source: 'T1558《阿毘達磨俱舍論》卷9 T29n1558_p0048b25；T29n1558_p0046a17' },
};

/** 舊顯示字（柱名、舊域名）→ 時層 */
const LAYER_LABELS: ReadonlyArray<[string, AsuraTimeLayer]> = [
  ['祖域（年柱）', 'year'], ['命境（月柱）', 'month'], ['本魂（日柱）', 'day'], ['後界（時柱）', 'hour'],
];

/** 整句改寫（術數痕跡太重、逐詞替換讀不通者）。鍵＝原字，值＝阿修羅口吻。 */
export const ASURA_STRING_OVERRIDES: Readonly<Record<string, string>> = {
  '左右滑動查看四柱，印記依柱對齊。': '左右滑過四有，印記各歸其位。',
  '四柱與所屬印記，可左右捲動': '四有與所屬印記，可左右捲動',
  '統計為印記種類；同一印記命中多柱時，各柱分別呈現。': '數的是印記種類；同一印落在數處，每一處我各立一次。',
  '命盤是戰場，不是保護區。你已經站上去了。': '業鏡照出的是戰場，不是保護區。你已經站上去了。',
  '時辰未知，以子時排。': '出生時刻未說，我以夜半起算。',
  '子時': '夜半',
  '往後的流年，我已先看過。': '往後的年歲，我已先看過。',
  '往後的流年裡，還有動靜。': '往後的年歲裡，還有動靜。',
  // 技能檔案頁（content.ts）
  '八字排盤不改。': '生緣的算法不改。',
  '正統八字排盤': '生緣照見無誤',
  '易經老師解盤（《神煞易經》）': '神之卷：另一位老師解盤',
  '鬼魅老師解盤（《神煞異君》）': '魔之卷：鬼魅老師解盤',
  '客戶資料 → 八字 → 紫微（四柱逐字核對）→ 特星神煞 → 易經起卦，兩位老師共用，不另算。鬼魅老師只換說法，前端只照印。':
    '客戶生辰 → 生緣 → 四有逐字核對 → 業果 → 起象，兩位老師共用，不另算。鬼魅老師只換說法，前端只照印。',
  '依據：docs/技能戰鬥檔案/神煞異君/新人檔案.md〈一、兩張卡，一神一魔〉〈二、同一條後端〉（業主定案 2026-09-28）。鬼魅阿修羅沿用此規矩，延伸為三張。':
    '依據：業主定案 2026-09-28〈兩張卡，一神一魔〉〈同一條後端〉。鬼魅阿修羅沿用此規矩，延伸為三張。',
  '後端仍保留年柱／月柱／日柱／時柱。括號內正統柱位不能消失，方便追溯。':
    '後端照舊運算，一分不動。畫面只立我的名：千歲壽、障月、障日、一剎那。',
  '桃花顯示魅生之印': '魅生之印，名不可改',
  '與鬼魅老師《神煞異君》卡並列；2026-09-30 實裝三卡選擇邏輯。': '與鬼魅老師的魔之卷並列；2026-09-30 實裝三卡選擇邏輯。',
  '易經老師、鬼魅老師，我排第三。': '兩位老師在前，我第三個出手。',
  '落印柱位': '落印之位',
  '天煞顯示裂天劫印': '裂天劫印，名不可改',
  '五鬼顯示五陰纏影': '五陰纏影，名不可改',
  '羊刃顯示血刃之鋒': '血刃之鋒，名不可改',
  '桃花、情感、人緣類': '魅緣、情感、人緣類',
  '阿修羅是戰士 ── 用你的命盤做戰場，用你的力量做武器。': '阿修羅是戰士 ── 以你的業鏡為戰場，以你的力量為武器。',
  '原始神煞名稱不得作為一般使用者主標題。原始名稱只保留在：老師版、除錯頁、追溯資料、驗證資料。':
    '原名不上主標題。原名只留在：老師版、除錯頁、追溯資料、驗證資料。',
  '原始神煞名稱永久保留': '原名永久留在後端',
  '空亡': '虛位',
};

/** 逐詞替換（長詞在前）。只用於顯示字串。 */
export const ASURA_TERM_RULES: ReadonlyArray<[string, string]> = [
  // 時層：舊域名＋句式
  ['祖域之上', '千歲壽中'], ['命境之上', '障月之時'], ['本魂之上', '障日之時'], ['後界之上', '一剎那間'],
  ['年柱', '千歲壽'], ['月柱', '障月'], ['日柱', '障日'], ['時柱', '一剎那'],
  ['祖域', '千歲壽'], ['命境', '障月'], ['本魂', '障日'], ['後界', '一剎那'],
  // 運／歲
  ['那幾步運裡', '那幾個十年裡'], ['這一步運裡', '這個十年裡'], ['這一步運', '這個十年'], ['那一步運', '那個十年'], ['運換了一步', '十年換了一關'],
  ['大運裡', '這十年裡'], ['大運', '十年'], ['流年裡', '這些年歲裡'], ['流年', '年歲'],
  // 名相
  ['柱位與封印', '四有與封印'], ['四柱神煞表', '四有業果表'],['四柱', '四有'], ['柱位', '落位'], ['落柱', '落位'], ['命中柱', '命中之位'],
  ['這幾柱', '這幾位'], ['這一柱', '這一位'], ['多柱', '數處'], ['各柱', '各處'], ['柱', '位'],
  ['原始神煞', '原名'], ['神煞', '業果'], ['八字', '生緣'], ['命盤', '業鏡'], ['排盤', '照鏡'],
  ['紫微斗數', '業鏡'], ['紫微', '業鏡'], ['易經', '神之卷'], ['起卦', '起象'],
  ['不知道時辰', '不知道出生時刻'], ['時辰', '出生時刻'], ['子時', '夜半'],
  ['天干', '天時'], ['地支', '地時'], ['干支', '時序'], ['十神', '十相'], ['五行', '五力'],
];

/** 單一顯示字串 → 阿修羅語彙 */
export function asuraScrub(text: string): string {
  if (!text) return text;
  const whole = ASURA_STRING_OVERRIDES[text];
  if (whole !== undefined) return whole;
  let out = text;
  for (const [label, layer] of LAYER_LABELS) out = out.split(label).join(ASURA_TIME_TERMS[layer].term);
  for (const [from, to] of Object.entries(ASURA_STRING_OVERRIDES)) if (from.length >= 6) out = out.split(from).join(to);
  for (const [from, to] of ASURA_TERM_RULES) out = out.split(from).join(to);
  return out;
}

/** 不改的欄位：識別鍵、狀態旗標、稽核資料（不顯示） */
const SKIP_KEYS = new Set(['key', 'id', 'ids', 'contract', 'tone', 'glowIds', 'audit', 'resultId', 'sealStatus']);

/** 物件內所有顯示字串一次換掉（陣列、巢狀物件皆可；識別鍵不動） */
export function asuraDeepScrub<T>(value: T): T {
  if (typeof value === 'string') return asuraScrub(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => asuraDeepScrub(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SKIP_KEYS.has(k) ? v : asuraDeepScrub(v);
    return out as T;
  }
  return value;
}

/** 畫面不得出現的術數用語（測試共用） */
export const ASURA_FORBIDDEN_TERMS: readonly string[] = [
  '年柱', '月柱', '日柱', '時柱', '四柱', '神煞', '八字', '紫微', '命宮', '主星', '宮位', '四化', '大運', '流年',
  '天干', '地支', '干支', '十神', '五行', '命盤', '排盤', '命主', '日主', '納音', '空亡', '星曜', '易經', '卦', '子時', '時辰',
];
/** 具體干支組合（甲子…癸亥） */
export const ASURA_GANZHI_PAIR = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/;

/**
 * 鬼魅阿修羅的技能（讀盤時施用的名相）。只描述該時層代表什麼，不新增任何運算。
 * use＝阿修羅口吻（過 lintAsuraVoice：短句、不發問、不求認同、不解釋原因、不預言、不邀功）。
 * 文件：docs/技能戰鬥檔案/鬼魅阿修羅/技能清單.md（每筆連到 詞彙庫.md 的同名錨點）。
 */
export interface AsuraSkill {
  name: string;
  unit: '年' | '月' | '日' | '時' | 'n/a';
  replaces: string;
  use: string;
  anchor: string;
}
export const ASURA_SKILLS: readonly AsuraSkill[] = [
  { name: '千歲壽', unit: '年', replaces: '年柱', use: '量歲。阿修羅壽千歲。你的根，我以千歲量。', anchor: 'qiansuishou' },
  { name: '障月', unit: '月', replaces: '月柱', use: '障月。羅睺一手，月便無光。你長成的那段月，我先遮過。', anchor: 'zhangyue' },
  { name: '障日', unit: '日', replaces: '日柱', use: '障日。一手障日，日光由我。你自身這一面，我照得透。', anchor: 'zhangri' },
  { name: '一剎那', unit: '時', replaces: '時柱', use: '截剎那。結生只在一剎那。最後一念，我早已看過。', anchor: 'yichana' },
  { name: '四有', unit: 'n/a', replaces: '四柱', use: '盡四有。生生相續，不過四有。你的四層，我一眼盡收。', anchor: 'siyou' },
  { name: '業果', unit: 'n/a', replaces: '神煞', use: '知業果。落在你身上的印，我照即知。不必多言。', anchor: 'yeguo' },
  { name: '業鏡', unit: 'n/a', replaces: '命盤', use: '照業鏡。業鏡一照，業報現形。你的局，在我鏡中。', anchor: 'yejing' },
  { name: '生緣', unit: 'n/a', replaces: '八字', use: '握生緣。生緣一合，便得結生。你的生緣，我已握住。', anchor: 'shengyuan' },
  { name: '落位', unit: 'n/a', replaces: '柱／柱位', use: '定其位。印落何位，我說了算。', anchor: 'luowei' },
];
