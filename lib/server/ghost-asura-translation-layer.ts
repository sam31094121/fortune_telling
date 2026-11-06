/**
 * 鬼魅阿修羅 — 四張卡共用的阿修羅翻譯層（server-only，唯一模組）。規格 nature-final 第 2–5、7 條。
 *
 * 只做翻譯，不做分析：
 *   - 本性卡：輸入只有人格解析層（lib/server/ghost-asura-persona.ts）給的 PersonaEvidence[]；
 *     每筆 evidence 依 traitKey 查固定意象表 NATURE_COPY_TABLE，一筆對一句，不增不減、不改順序。
 *     意象是阿修羅自創的說法，只換說法、不換意思；不出現任何命理名稱、星名、宮名。
 *   - 過去／現在／未來三卡：版面、篩選、項目不動；既有文字（含舊「白話」欄）過同一個翻譯桶 ASURA_TERM_BUCKET。
 * 本模組不得 import 任何命理引擎（測試：tests/ghost-asura-nature-card.test.cjs）。
 * 話術規範沿用 lib/server/ghost-asura-voice.ts 檔頭五柱（好戰、傲慢、知未來但無人理解、霸氣、底氣）與 lintAsuraVoice。
 */

import 'server-only';

import { ASURA_FORBIDDEN_TERMS as ALIAS_FORBIDDEN_TERMS } from '@/lib/asura-display-alias';
import type { AsuraAgePremiumTitle, AsuraAgeTimeline, AsuraDecreeAnchor, AsuraDisplay, AsuraDisplaySection, AsuraTimelineDecree } from '@/lib/ghost-asura-display-contract';
import {
  NATURE_CARD_VERSION,
  type AsuraImageEntry,
  type AsuraNatureCardPublic,
  type AsuraNatureCardServer,
  type PersonaEvidence,
} from '@/lib/ghost-asura-nature-contract';

export const ASURA_TRANSLATION_LAYER = 'ghost-asura-translation/v1' as const;
export const NATURE_TITLE = '本性';

/* ───────────────────────── 禁用詞 ───────────────────────── */

/** 紫微斗數名稱全表（星名、宮名、四化、亮度、煞星），規格第 22 條。 */
export const ZIWEI_TERMS: readonly string[] = [
  '紫微', '紫薇', '紫微斗數',
  '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
  '天刑', '天姚', '解神', '天巫', '天月', '陰煞', '台輔', '封誥', '三台', '八座', '恩光', '天貴', '龍池', '鳳閣',
  '天才', '天壽', '天哭', '天虛', '紅鸞', '天喜', '孤辰', '寡宿', '蜚廉', '破碎', '華蓋', '咸池', '天德', '月德',
  '天空', '截路', '旬空', '天傷', '天使', '年解',
  '命宮', '身宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮', '遷移宮', '交友宮', '僕役宮', '官祿宮', '田宅宮', '福德宮', '父母宮',
  '宮位', '四化', '化祿', '化權', '化科', '化忌', '廟旺', '利陷', '入廟', '落陷', '平陷', '煞星', '主星', '星曜', '吉星', '凶星',
];

/** 規格第 7、13 條：命理通用術語。 */
const GENERAL_TERMS = ['八字', '易經', '卦', '干支', '五行', '命盤', '神煞', '四柱', '年柱', '月柱', '日柱', '時柱', '大運', '流年'] as const;

/** 四張卡前端禁用術語＝既有別名層清單（lib/asura-display-alias.ts）∪ 通用術語 ∪ 紫微名稱全表。 */
export const ASURA_CARD_FORBIDDEN_TERMS: readonly string[] = [...new Set<string>([...ALIAS_FORBIDDEN_TERMS, ...GENERAL_TERMS, ...ZIWEI_TERMS])];

export function forbiddenTermsIn(text: string, terms: readonly string[] = ASURA_CARD_FORBIDDEN_TERMS): string[] {
  return terms.filter((term) => text.includes(term));
}

/* 千人千面戰神令：四段時間線意境（後端固定；前端只照印） */
const TIMELINE_DECREE_SOURCE: AsuraTimelineDecree = {
  title: '千人千面戰神令',
  lines: [
    { key: 'opening', heading: '戰意開場', body: '你腳下這片地，不是今日才踏上的。早年一寸一寸夯實的路，就是你的根基，站得穩。' },
    { key: 'sandbox', heading: '沙盤直斷', body: '你手裡這股勁剛冒頭，刃還沒開過鋒。嫩，卻已握在掌心。' },
    { key: 'tactics', heading: '戰術號令', body: '你懂的、練過的，就是兵書。兵書壓箱底，從沒贏過一場。拿出來用，才叫戰。' },
    { key: 'closing', heading: '修羅戰令', body: '前方鼓聲已起，一快一慢。踩著鼓點走，節奏握在你手。' },
  ],
};

/** 組裝戰神令四段；組裝時跑 ASURA_CARD_FORBIDDEN_TERMS，命中即丟錯。 */
export function buildTimelineDecree(): AsuraTimelineDecree {
  const blob = [TIMELINE_DECREE_SOURCE.title, ...TIMELINE_DECREE_SOURCE.lines.flatMap((line) => [line.heading, line.body])].join('\n');
  const hits = forbiddenTermsIn(blob);
  if (hits.length > 0) {
    throw new Error(`timelineDecree forbidden: ${hits.join(',')}`);
  }
  return {
    title: TIMELINE_DECREE_SOURCE.title,
    lines: TIMELINE_DECREE_SOURCE.lines.map((line) => ({ ...line })),
  };
}

/* ───────────────────────── 十二陣・四十八道戰痕 ─────────────────────────
 * 輸入：顯示層（lib/server/ghost-asura-display.ts）從 calculateDualChart 的 ziwei.palaces[].period 原樣搬來的
 *       每陣四值（stage／boshi／suiqian／jiangqian，與紫微命盤頁 palaceCycles 同一份 iztro 資料）＋大限起訖歲。
 * 本模組不 import 任何引擎；只查下方固定對照表，{d} 換成該陣的白話領域。查不到值＝整段不出（不自編）。
 * 意涵來源分級（僅後端註記，不上畫面）：
 *   A＝長生十二：《三命通會》卷二、《子平真詮》論陰陽生死（名義）；《紫微斗數全書》卷二（安法）
 *   B＝博士十二：《紫微斗數全書》卷二歌訣「博士聰明力士權…伏兵宮府口舌纏」
 *   C＝歲前：喪門／白虎／弔客／官符／天德見《全書》卷二四飛星及安天德訣；其餘整圈名義屬後世整理
 *   D＝將前：將星／華蓋／咸池／劫煞／災煞／亡神單煞見《三命通會》；攀鞍／歲驛／息神／指背／天煞／月煞屬後世整理
 *   報告：box /workspace/ziwei-48-sources/report.md（2026-11-06）
 */

/** 宮位 → 白話領域（不得含宮名）。鍵＝ lib/ziwei 宮位 key。 */
export const PALACE_VERSE_DOMAIN: Readonly<Record<string, string>> = {
  MING: '你自己',
  XIONG_DI: '同袍',
  FU_QI: '枕邊人',
  ZI_NV: '晚輩',
  CAI_BO: '錢袋',
  JI_E: '這副身子',
  QIAN_YI: '出外的路',
  JIAO_YOU: '身邊人馬',
  GUAN_LU: '戰功',
  TIAN_ZHAI: '家門',
  FU_DE: '心氣',
  FU_MU: '上一代',
};

/** 意涵依據分級（只留後端，不外送 JSON）：classic＝古籍有名義；later＝後世整理（古典專義薄弱）。 */
export type PalaceVerseSourceLevel = 'classic' | 'later';
interface VerseTemplate { text: string; sourceLevel: PalaceVerseSourceLevel; note: string }
const T = (text: string, note: string, sourceLevel: PalaceVerseSourceLevel = 'classic'): VerseTemplate => ({ text, sourceLevel, note });

/** 第一層：氣的起落（長生十二）。洋蔥最外層＝客人第一眼那一句：我→你、直說、不鋪陳（2026-11-06 客戶視角版）。 */
export const PALACE_VERSE_STAGE: Readonly<Record<string, VerseTemplate>> = {
  長生: T('{d}，你的新勁剛冒頭，根還淺。', '如人始生而向長'),
  沐浴: T('{d}，你還嫩，一碰就傷。', '又曰敗，形體柔脆易為所損'),
  冠帶: T('{d}，你架勢成了，缺一場實戰。', '形氣漸長，如人具衣冠'),
  臨官: T('{d}，你已能自己帶人上陣。', '由長而壯，可以出仕'),
  帝旺: T('{d}，你站在最高點，再上沒路。', '壯盛之極'),
  衰: T('{d}，你的勢頭在往回收。', '盛極而衰'),
  病: T('{d}，你力氣見底，硬拚必輸。', '衰之甚'),
  死: T('{d}，你的舊勁用完了，別硬撐。', '氣之盡而無餘'),
  墓: T('{d}，我把你的鋒芒收進庫裡。', '又曰庫，造化收藏'),
  絕: T('{d}，你的舊路斷了，新路在前。', '前之氣已絕，後之氣將續'),
  胎: T('{d}，你的新局在暗處成形。', '後之氣續而結聚成胎'),
  養: T('{d}，你還在長本事，刀未出鞘。', '如人養母腹（成形）'),
};

/** 第二層：旗號（博士十二）。 */
export const PALACE_VERSE_BOSHI: Readonly<Record<string, VerseTemplate>> = {
  博士: T('{d}，你靠腦子贏，不靠蠻力。', '聰明'),
  力士: T('{d}，你說的話，算數。', '權'),
  青龍: T('{d}，好消息正敲你的門。', '喜氣'),
  小耗: T('{d}，你的錢一點一點漏走。', '錢（耗財）'),
  將軍: T('{d}，你一開口，全場安靜。', '威武'),
  奏書: T('{d}，有一份福落到你手上。', '福'),
  飛廉: T('{d}，沒人幫你，你一個人衝。', '主孤（底本作弧）'),
  喜神: T('{d}，你的好事一樁接一樁。', '延（喜慶延續）'),
  病符: T('{d}，你帶著傷，先顧好再戰。', '帶疾；不作醫療斷語'),
  大耗: T('{d}，你的老本在往外流。', '退祖'),
  伏兵: T('{d}，有人在暗處朝你放冷箭。', '口舌纏'),
  官府: T('{d}，閒話纏上你，少說為贏。', '口舌纏／主官符'),
};

/** 第三層：歲令（歲前十二）。 */
export const PALACE_VERSE_SUIQIAN: Readonly<Record<string, VerseTemplate>> = {
  歲建: T('{d}，你坐主位，起落都比人大。', '太歲本位；歲前首神屬後世整圈', 'later'),
  晦氣: T('{d}，你眼前起霧，看不清別動。', '晦暗；缺古典專條', 'later'),
  喪門: T('{d}，有人或事要離開你。', '孝服凶象；本派讀作告別與新章'),
  貫索: T('{d}，你被繩結纏住，先解再走。', '牽絆；缺古典專條', 'later'),
  官符: T('{d}，公文合約找上你，逐字看。', '官訟'),
  小耗: T('{d}，你身邊小洞不斷，逐個堵。', '小破耗；歲前系屬後世整圈', 'later'),
  大耗: T('{d}，你破了個大口，先止血。', '大破耗（或作歲破）；屬後世整圈', 'later'),
  龍德: T('{d}，你遇險，有人伸手拉你。', '吉、解厄；屬後世整圈', 'later'),
  白虎: T('{d}，猛虎擋你的路，留三分。', '凶象；本派讀作守住分寸'),
  天德: T('{d}，你有德蔭護著，凶事化開。', '德曜解厄'),
  弔客: T('{d}，你這段要經過一場哀事。', '弔喪孝服'),
  病符: T('{d}，你身體在響警鐘，先停。', '帶疾；歲前系位置屬後世；不作醫療斷語', 'later'),
};

/** 第四層：將令（將前十二）。 */
export const PALACE_VERSE_JIANGQIAN: Readonly<Record<string, VerseTemplate>> = {
  將星: T('{d}，帥旗在你手，你發號令。', '三合中位，威權'),
  攀鞍: T('{d}，你已上馬，往高處去。', '上鞍、功名；後世整理', 'later'),
  歲驛: T('{d}，你停不下來，越跑越順。', '奔波遷動；後世整理', 'later'),
  息神: T('{d}，你的鼓聲停了，先按兵。', '休止、消沉；後世整理', 'later'),
  華蓋: T('{d}，你獨坐高處，冷，但清醒。', '孤寡、術藝'),
  劫煞: T('{d}，有人伸手搶你的，刀先擋。', '劫奪'),
  災煞: T('{d}，你腳下有暗流，步子放穩。', '災厄'),
  天煞: T('{d}，你頭頂壓著重擔，扛住。', '上壓之煞；後世整理', 'later'),
  指背: T('{d}，有人在背後指你，別回頭。', '背後指議；後世整理', 'later'),
  咸池: T('{d}，酒色纏上你，刀柄握緊。', '沐浴之地、桃花敗神'),
  月煞: T('{d}，你路上有暗絆，放慢。', '阻滯；後世整理', 'later'),
  亡神: T('{d}，你心神易散，東西易丟。', '失、耗'),
};

/** 本段額外禁詞：四組名稱、48 個神名、12 宮名（含簡稱）。與 ASURA_CARD_FORBIDDEN_TERMS 併用，子字串比對。 */
export const PALACE_VERSE_FORBIDDEN_TERMS: readonly string[] = [...new Set<string>([
  '長生', '博士', '歲前', '將前', '十二神',
  ...Object.keys(PALACE_VERSE_STAGE), ...Object.keys(PALACE_VERSE_BOSHI), ...Object.keys(PALACE_VERSE_SUIQIAN), ...Object.keys(PALACE_VERSE_JIANGQIAN),
  '蜚廉', '天耗', '宮府', '吊客',
  '命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '僕役', '奴僕', '官祿', '田宅', '福德', '父母',
])];

const PALACE_VERSE_GANZHI = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/;

export function palaceVerseForbiddenHits(text: string): string[] {
  const hits = forbiddenTermsIn(text, [...new Set([...ASURA_CARD_FORBIDDEN_TERMS, ...PALACE_VERSE_FORBIDDEN_TERMS])]);
  if (PALACE_VERSE_GANZHI.test(text)) hits.push('干支組合');
  return hits;
}

export interface PalaceVerseCell { palaceKey: string; range: number[]; stage: string; boshi: string; suiqian: string; jiangqian: string }

/** 四層（固定順序；label 為畫面可用的一字標籤，零術語）。 */
export const PALACE_VERSE_LAYERS = [
  { key: 'stage', label: '氣', field: 'stage', table: PALACE_VERSE_STAGE },
  { key: 'banner', label: '旗', field: 'boshi', table: PALACE_VERSE_BOSHI },
  { key: 'decree', label: '令', field: 'suiqian', table: PALACE_VERSE_SUIQIAN },
  { key: 'force', label: '勢', field: 'jiangqian', table: PALACE_VERSE_JIANGQIAN },
] as const;
export type PalaceVerseLayerKey = (typeof PALACE_VERSE_LAYERS)[number]['key'];

/** 576 組合查詢表一列（後端完整版，含 sourceLevel／note；不外送）。 */
export interface PalaceVerseEntry { palaceKey: string; layer: PalaceVerseLayerKey; value: string; text: string; sourceLevel: PalaceVerseSourceLevel; note: string }

/**
 * 576 組合查詢表＝12 陣（白話領域）× 4 層 × 12 值。模組載入時預先組好一次（含禁詞檢查），
 * 之後每次請求只做 O(1) 查表：key＝`${palaceKey}|${layer}|${value}`。任何一列命中禁詞＝載入即丟錯（不上線）。
 */
function buildPalaceVerseTable(): ReadonlyMap<string, PalaceVerseEntry> {
  const map = new Map<string, PalaceVerseEntry>();
  for (const [palaceKey, domain] of Object.entries(PALACE_VERSE_DOMAIN)) {
    for (const layer of PALACE_VERSE_LAYERS) {
      for (const [value, tpl] of Object.entries(layer.table as Readonly<Record<string, VerseTemplate>>)) {
        const text = tpl.text.replace('{d}', domain);
        const hits = palaceVerseForbiddenHits(text);
        if (hits.length > 0) throw new Error(`palaceVerse forbidden ${palaceKey}|${layer.key}|${value}: ${hits.join(',')}`);
        map.set(`${palaceKey}|${layer.key}|${value}`, { palaceKey, layer: layer.key, value, text, sourceLevel: tpl.sourceLevel, note: tpl.note });
      }
    }
  }
  return map;
}
export const PALACE_VERSE_TABLE: ReadonlyMap<string, PalaceVerseEntry> = buildPalaceVerseTable();

export function lookupPalaceVerse(palaceKey: string, layer: PalaceVerseLayerKey, value: string): PalaceVerseEntry | undefined {
  return PALACE_VERSE_TABLE.get(`${palaceKey}|${layer}|${value}`);
}

export const PALACE_VERSES_TITLE = '十二陣・四十八道戰痕';

/* ───── 洋蔥層（只用於年齡時間軸 ageTimeline；不用於戰神令或其他卡） ─────
 * 每個值一筆：basis＝該值的傳統名義（白話，最強的一句放最前）＋hook；history＝真實史事（附出處）或 null（查無貼切史事就不編）；
 * action＝1–2 個具體行動。headline＝AGE_ROW_HEADLINE（單句 ≤16 字；上畫面加起歲前綴，總長 ≤26）。權重表 PALACE_VERSE_WEIGHT 固定、後端定義。
 * 史事出處只引原典篇名；句子為白話轉述，不加原典沒有的情節。
 */
export interface AgeDepthHistory { text: string; source: string; hook: string }
/** 一層洋蔥：basis（名義場景）→ history（真實史事，可 null）→ action（1–2 個行動）→ close（收束句，必有）。 */
export interface AgeDepthEntry { basis: { text: string; hook: string }; history: AgeDepthHistory | null; action: string[]; close: string }
interface OnionRow { weight: number; headline: string; depth: AgeDepthEntry }
/**
 * 層層承接：basis.hook 末句引向下一層——有史事＝引向 history（AGE_HOOK_TO_HISTORY），無史事＝引向 action（AGE_HOOK_TO_ACTION）；
 * history.hook 末句一律引向 action。三選一依 headline 字碼和固定挑選（決定性、無隨機）。
 */
export const AGE_HOOK_TO_HISTORY: readonly string[] = ['我翻舊史給你看。', '以前有人走過這一步。', '史書裡有人跟你一樣。'];
export const AGE_HOOK_TO_ACTION: readonly string[] = ['我只要你做一件事。', '今天就動手。', '聽好，照做。'];
const pick = (list: readonly string[], seed: string): string => list[[...seed].reduce((n, ch) => n + (ch.codePointAt(0) ?? 0), 0) % list.length];
const O = (weight: number, headline: string, basis: [string, string], action: string[], close: string, history: [string, string, string] | null = null): OnionRow => ({
  weight,
  headline,
  depth: {
    basis: { text: basis[0], hook: basis[1] + (history ? pick(AGE_HOOK_TO_HISTORY, headline) : pick(AGE_HOOK_TO_ACTION, headline)) },
    history: history ? { text: history[0], source: history[1], hook: history[2] + pick(AGE_HOOK_TO_ACTION, headline + history[1]) } : null,
    action,
    close,
  },
});

/** 權重（1–10，越高越重）：轉折、告別、破耗、凶險、官非最高；喜慶、成形中等；平穩最低。同分依層序 氣→旗→令→勢 取前者。 */
/** 洋蔥底稿：第二個參數（舊濃縮戰令）只當 hook 三選一的固定種子，確保深層文字不變；畫面 headline 一律取 AGE_ROW_HEADLINE。 */
const PALACE_VERSE_ONION_BASE: Readonly<Record<PalaceVerseLayerKey, Readonly<Record<string, OnionRow>>>> = {
  stage: {
    長生: O(7, '新刃破土，淬鋒', ['初生之勁。我看你像新刃剛出爐，正往上竄。', '根還淺，勁卻是新的。'], ['挑一件剛起頭的事，你每天推一步。'], '新刃交到你手，磨不磨，看你。'),
    沐浴: O(5, '鋒未淬火，莫硬碰', ['最易受損之時。我見你甲還軟，一碰就傷。', '太嫩去硬碰，只會受傷。'], ['大事你壓一週再拍板。'], '鋒淬好那天，我再喊你上陣。'),
    冠帶: O(3, '披甲成形，可列陣', ['漸成氣候。我看你冠已戴、甲已披。', '架勢有了，缺的是一場實戰。'], ['把你的本事，亮給該看的人。'], '甲在你身，陣由你列。'),
    臨官: O(5, '按劍出列，自薦領兵', ['由長而壯。我看你已能獨自擔事、領人。', '能扛了，就別等人點名。'], ['你主動接下一件沒人敢接的差事。'], '劍在你腰間，按不按，你定。',
      ['毛遂自薦隨平原君入楚，按劍上殿，逼楚王當場訂盟。', '《史記・平原君虞卿列傳》', '有本事的人，藏不住。']),
    帝旺: O(8, '站上峰頂，掛印封金', ['盛到極點。我看你站在這一陣的最高處。', '峰頂之後，路只剩往下。'], ['你寫下這陣贏在哪，留給退時用。'], '金印在你手，何時掛，你算。',
      ['蔡澤對范雎說：日中則移，月滿則虧。范雎後來託疾告退，交出相印。', '《史記・范雎蔡澤列傳》', '在最高處退，名才保得住。']),
    衰: O(6, '盛極而退，鳴金收兵', ['盛極而退。我看你的氣正往回收。', '退，從來不等於輸。'], ['你砍掉一件只為面子撐的事。'], '鳴金的鼓槌，在你手上。',
      ['蔡澤對范雎說：日中則移，月滿則虧。范雎後來託疾告退，交出相印。', '《史記・范雎蔡澤列傳》', '知退的人，不會被趕下台。']),
    病: O(6, '見底守根，解甲療創', ['氣力不足之時。我看你兵疲馬乏。', '這時硬拚，只會折兵。'], ['你把作息排回正軌，不適就找醫師。'], '甲解下來，傷才好得了。'),
    死: O(8, '舊氣已盡，封刀', ['舊氣用盡。我看你這陣的勁已耗完。', '撐不住的，放手才有下一陣。'], ['你停掉一件早該結束的事。'], '刀封了，人還在，陣還在。'),
    墓: O(6, '臥薪嘗膽，鋒芒入庫', ['收藏入庫。我看你把力量藏進鞘裡。', '藏，是為了出手那天。'], ['你把資源存下，不急著花。'], '庫門的鑰匙，只在你身上。',
      ['句踐兵敗回國，在座旁懸膽，坐臥仰望，飲食必嘗，多年後滅吳。', '《史記・越王句踐世家》', '藏得住苦，才等得到出手。']),
    絕: O(9, '破釜沉舟，新路接上', ['舊斷新續。我看你身後的路斷了，前頭正要接。', '斷處，就是新路的起點。'], ['你列出一條舊路，今天正式關掉。'], '船已沉，往前的槳在你手。',
      ['項羽渡河救趙，沉船砸鍋，只帶三日糧，大破秦軍。', '《史記・項羽本紀》', '斷了退路，才打出新路。']),
    胎: O(5, '新陣已結，莫張揚', ['新氣結聚。我看你的新局已成形，還沒露面。', '成形未露，旗先別舉。'], ['新計畫你只告訴一個信得過的人。'], '旗何時舉，我等你的號令。'),
    養: O(4, '暗處成形，劍未出鞘', ['在暗處長成。我看你像劍在爐中，慢慢成形。', '還沒到你出手的時候。'], ['你每週固定時間，練一樣本事。'], '爐火不熄，劍自會成。',
      ['伍子胥斷言越國：十年生聚，十年教訓，二十年後吳國將成沼澤。', '《左傳・哀公元年》', '長成要年月，急不來。']),
  },
  banner: {
    博士: O(4, '以智破陣', ['聰明取勝。我看你這陣靠腦子，不靠蠻力。', '力氣比不過，就比算計。'], ['你動手前，先寫下對手三種反應。'], '棋盤擺在你面前，子由你落。',
      ['孫臏教田忌以下等馬對上等馬，三場兩勝，贏得千金。', '《史記・孫子吳起列傳》', '同樣的馬，換個排法就贏。']),
    力士: O(6, '一言九鼎，令出必行', ['手握實權。我看你這陣，說話有人聽。', '權，要先用在立信上。'], ['你說出口的承諾，這週兌現一件。'], '你的話一落地，就是鼎。',
      ['商鞅變法前在南門立木，誰搬到北門就賞，賞金加到五十金，有人搬了當場兌現。', '《史記・商君列傳》', '權先立信，令才行得通。']),
    青龍: O(4, '喜報叩營門', ['喜氣臨門。我看你營外有好消息在等。', '喜事來了，接得住才算數。'], ['有人遞來機會，你當天回覆。'], '門已開，接不接，在你一句。'),
    小耗: O(5, '糧倉滲漏，堵住', ['耗財之象。我看你的糧草一點點流走。', '小漏不堵，大船也沉。'], ['你列出每月自動扣款，砍掉一項。'], '糧倉守住了，仗才打得久。'),
    將軍: O(6, '坐鎮中軍，威勢壓陣', ['威武之象。我看你一站出來，就鎮得住場。', '威勢靠紀律撐，不靠嗓門。'], ['你定一條規矩，自己先守。'], '軍紀在你，威也在你。',
      ['周亞夫屯兵細柳，漢文帝到營門也被攔下，只能按轡緩行。', '《史記・絳侯周勃世家》', '連天子都得守規矩，那才叫威。']),
    奏書: O(4, '福份入帳，莫揮霍', ['福祿之象。我看你手上落了一份福。', '福到手，別揮霍。'], ['你把這份好處，回饋給幫過你的人。'], '福記在帳上，帳本在你手。'),
    飛廉: O(5, '孤騎出陣，不等援', ['孤之象。我看你身邊援手少。', '沒人跟，就自己衝。'], ['靠別人的那一步，你改成自己做。'], '單騎也是騎，韁繩在你手。'),
    喜神: O(4, '捷報連營', ['喜慶延續。我看你營中好事一件接一件。', '順的時候，把根基打深。'], ['你趁勢把一件拖著的事收尾。'], '順風時紮的營，最穩。'),
    病符: O(7, '負傷在身，暫解甲', ['帶疾之象。我看你身上帶著傷。', '傷兵上陣，打不出勝仗。'], ['你排一次健康檢查。'], '傷好了，甲再披上。'),
    大耗: O(8, '家底外流，築鐵壁', ['退祖之象。我看你祖上的老本往外流。', '家底一散，再聚就難。'], ['你盤點家中大額支出，停一項。'], '家底守住，退路就在。'),
    伏兵: O(7, '暗箭在側，閉口', ['暗藏是非。我看你身側伏著冷箭。', '話傳三次，就成了真。'], ['你這陣少評論人，話留三分。'], '冷箭射不穿閉緊的嘴。',
      ['有人三次來報曾參殺人，連他母親也丟下織布梭，翻牆而逃。', '《戰國策・秦策二》', '謊話說三遍，親娘都動搖。']),
    官府: O(7, '口舌圍營，收聲', ['官非口舌。我看你營外人聲嘈雜。', '說得越多，破綻越多。'], ['有爭議的話，你寫成字據再談。'], '聲收住了，營就穩了。',
      ['龐蔥對魏王說：一人說市上有虎，王不信；三人都說，王就信了。', '《戰國策・魏策二》', '傳的人一多，假的也成真。']),
  },
  decree: {
    歲建: O(7, '坐鎮主帳，起落皆大', ['一年之主。我看你坐在主帳，眾目所視。', '主位上，一舉一動都有人看。'], ['大事你先想好退路，再拍板。'], '主帳在你，進退也在你。'),
    晦氣: O(6, '霧中不出兵', ['晦暗不明。我看你陣前起了霧。', '看不清，就別出兵。'], ['重要的事，你等霧散再定。'], '霧會散，刀先別亂揮。'),
    喪門: O(9, '舊人舊事，渡它走', ['告別之象。我看你身邊有人或事要離開。', '送走舊的，才有新章。'], ['該說的再見，你親口說完。'], '渡過去的，不必再回頭。'),
    貫索: O(7, '繩結纏身，斬棘先解', ['牽絆之象。我看你被繩結纏住。', '結越拉越緊，先找線頭。'], ['你列出最纏的一件事，先解它。'], '線頭找到，結就鬆了。'),
    官符: O(8, '官文叩門，逐字看', ['官非文書。我看你門外有契約、公文叩門。', '條款裡藏著輸贏。'], ['簽任何文件前，你逐字讀完。'], '字讀清了，刀就不會砍錯。'),
    小耗: O(5, '小洞不斷，逐個堵', ['小破耗。我看你營帳四處有小洞。', '洞小，數量一多就致命。'], ['你每週清點一次小額開銷。'], '洞補上了，糧就留得住。'),
    大耗: O(8, '缺口大，先止血', ['大破耗。我看你城牆破了個大口。', '先止血，再談反攻。'], ['你先停掉最大一筆外流。'], '血止住，才有反攻的本錢。'),
    龍德: O(6, '貴人兜底，險處轉', ['貴人相助。我看你險處有人伸手。', '有人兜底，也別把運氣當本事。'], ['受了誰的情，你記下並回禮。'], '情記在心，下一仗也有人。'),
    白虎: O(9, '猛虎攔路，留分寸', ['凶險之象。我看你路前蹲著猛虎。', '出手留三分，才收得回來。'], ['這陣你少碰險事，開車放慢。'], '分寸留住，虎就傷不了你。'),
    天德: O(6, '德蔭護身，凶處化開', ['天之德蔭。我看你凶處有德氣化開。', '德蔭是積出來的。'], ['你這週做一件不求回報的事。'], '德積在你身上，誰也拿不走。'),
    弔客: O(8, '披一回麻，再上陣', ['弔喪孝服。我看你這陣有哀事要經過。', '哀事要過，過完再戰。'], ['你給自己留出悼念的時間。'], '麻披過了，刀還在你手。'),
    病符: O(7, '警鐘已鳴，收刀歇鋒', ['疾患警訊。我看你身上的警鐘在響。', '刀鈍了，先磨再砍。'], ['你這陣排出休息日，不適就醫。'], '歇過的鋒，才砍得深。'),
  },
  force: {
    將星: O(7, '帥旗在手，立纛號令', ['將帥之象。我看你手握帥旗。', '帥旗立起，要有定策。'], ['你寫下這陣的定策，只寫三條。'], '號令出自你口，三軍就動。',
      ['劉邦設壇拜韓信為大將，韓信隨即獻上東出爭天下之策。', '《史記・淮陰侯列傳》', '立帥之後，要拿出定策。']),
    攀鞍: O(6, '跨上馬鞍，往高處走', ['功名攀升。我看你一腳踩上馬鐙。', '上了馬，就往高處去。'], ['你爭取一個更高的位置。'], '馬已備好，往哪走，你定。'),
    歲驛: O(5, '拔營就走，越動越活', ['奔走之象。我看你這陣總在路上。', '停下來反而生鏽。'], ['你這陣安排一趟該走的遠路。'], '路在你腳下，走完才算數。',
      ['張騫出使西域，被匈奴扣留十餘年，脫身後仍繼續西行。', '《史記・大宛列傳》', '被扣十年，路還是走完。']),
    息神: O(5, '鼓歇按兵，淬鋒待時', ['歇息之象。我看你的鼓聲暫歇。', '歇，是為了下一通鼓。'], ['你這陣排一段真正的休息。'], '下一通鼓，由你來擂。'),
    華蓋: O(5, '獨坐高處，自成一格', ['孤高才藝。我看你獨坐高處。', '孤，正好磨刀。'], ['你挑一門手藝，閉門苦練。'], '高處的冷，換得來刀上的光。'),
    劫煞: O(8, '有人奪寶，橫刀擋', ['劫奪之象。我看你手上的東西有人來搶。', '東西在誰手上，看誰守得住。'], ['你把重要財物、帳密收好。'], '寶在你手，誰也奪不走。',
      ['秦王想用空話換和氏璧，藺相如持璧倚柱，終於完璧歸趙。', '《史記・廉頗藺相如列傳》', '守得住，靠的是膽與準備。']),
    災煞: O(8, '暗流有災，鐵壁穩步', ['災厄之象。我看你腳下有暗流。', '穩，比快重要。'], ['你這陣出門多留一條退路。'], '步子穩了，暗流就沖不走你。'),
    天煞: O(7, '重擔壓頂，扛住', ['重壓之象。我看你肩上壓著重擔。', '壓得住你的，也練得出你。'], ['你把重擔拆成三段，一段段扛。'], '扛過這陣，你肩更寬。'),
    指背: O(6, '背後有人指點，不回頭', ['背後是非。我看你身後有人指指點點。', '回頭辯，就輸了一半。'], ['閒話你不回應，用結果說話。'], '結果攤開，閒話自散。'),
    咸池: O(7, '酒色近身，握緊刀柄', ['酒色之象。我看你營外有迷香飄來。', '迷香近身，刀柄別鬆。'], ['這陣你應酬設上限，酒不過量。'], '刀柄握緊，你就還是主帥。',
      ['紂以酒為池，懸肉為林，長夜之飲，終失天下。', '《史記・殷本紀》', '沉進酒色，江山也守不住。']),
    月煞: O(6, '暗處有阻，緩轡', ['暗阻之象。我看你路上有看不見的絆馬索。', '阻在暗處，快了反而撞上。'], ['你重要行程多留緩衝時間。'], '慢下來，絆索就現形。'),
    亡神: O(7, '心神易散，坐鎮收攏', ['耗神之象。我看你的心神四處飄散。', '心一散，陣就亂。'], ['你一次只做一件事，做完再換。'], '心收回來，陣就成了。'),
  },
};

/**
 * 每值的段落標題本體（客戶視角版 2026-11-06）：我→你、白話直說、零行話（不用渡／披麻／歃血／立纛／淬鋒等）；單句 ≤16 字。
 * 上畫面時由 buildAgeTimelineServer 前綴「{起歲} 歲起，」，總長 ≤26。
 */
export const AGE_ROW_HEADLINE: Readonly<Record<PalaceVerseLayerKey, Readonly<Record<string, string>>>> = {
  stage: { 長生: '新的勁剛冒出來，你每天推一步', 沐浴: '你還嫩，別硬碰，先練好再上', 冠帶: '你架勢有了，該讓人看見你', 臨官: '你能自己帶隊了，別等人點名', 帝旺: '你在最高點，我要你守住', 衰: '勢頭往回收，你先退一步', 病: '你力氣見底，先顧好身體', 死: '舊的勁用完了，你別再硬撐', 墓: '我要你把實力先藏起來', 絕: '舊路斷了，你從這裡走新路', 胎: '新局已成形，你先別張揚', 養: '你在暗處長本事，還沒到出手' },
  banner: { 博士: '這段你靠腦子贏，不靠力氣', 力士: '你說話有分量，先兌現承諾', 青龍: '有好消息找上你，當天就接', 小耗: '你的錢在漏，先堵住開銷', 將軍: '你一站出來，場子就靜', 奏書: '有一份好處落到你手上', 飛廉: '沒人幫你，你就自己衝', 喜神: '你好事連著來，趁勢收尾', 病符: '你身上帶傷，先顧好再戰', 大耗: '你的老本在外流，守住家底', 伏兵: '有人在背後放話，你少評論', 官府: '閒話圍著你，你先收聲' },
  decree: { 歲建: '你坐在主位，一舉一動都被看', 晦氣: '你眼前一片霧，看清再動', 喪門: '該散的散了，你往前走', 貫索: '你被事情纏住，先解最纏的', 官符: '合約上門，你逐字看完再簽', 小耗: '你的小開銷不斷，逐個堵', 大耗: '你破了個大口，先止血', 龍德: '你遇險有人拉你一把', 白虎: '你前面有險，出手留三分', 天德: '你積的德，這段替你擋災', 弔客: '你這段有傷心事，哭完再站起來', 病符: '身體在喊停，你先停再打' },
  force: { 將星: '你手上有帥旗，定三條規矩', 攀鞍: '你已上馬，往高處爬', 歲驛: '你總在路上，越動越順', 息神: '你該停一停，歇夠再出手', 華蓋: '你一個人待得住，正好練功', 劫煞: '有人搶你的東西，你先守住', 災煞: '你腳下不穩，步子放慢', 天煞: '你肩上壓得重，拆開來扛', 指背: '背後有人說你，你用結果回', 咸池: '酒局和誘惑找上你，你守住', 月煞: '你路上有暗絆，行程留緩衝', 亡神: '你心神散了，一次做一件' },
};
/** 洋蔥層（對外）：深層＝底稿原樣；headline＝AGE_ROW_HEADLINE。 */
export const PALACE_VERSE_ONION: Readonly<Record<PalaceVerseLayerKey, Readonly<Record<string, OnionRow>>>> = Object.fromEntries(
  (Object.keys(PALACE_VERSE_ONION_BASE) as PalaceVerseLayerKey[]).map((layer) => [layer, Object.fromEntries(Object.entries(PALACE_VERSE_ONION_BASE[layer]).map(([value, row]) => [value, { ...row, headline: AGE_ROW_HEADLINE[layer][value] ?? row.headline }]))]),
) as Readonly<Record<PalaceVerseLayerKey, Readonly<Record<string, OnionRow>>>>;

/** 承接分類（只供 bridge 用）：rise 起勢、hold 收藏、cut 斷捨、loss 耗損、clash 交鋒。依每段 headline 那一值歸類。 */
export type AgeBridgeKind = 'rise' | 'hold' | 'cut' | 'loss' | 'clash';
export const AGE_BRIDGE_KIND: Readonly<Record<PalaceVerseLayerKey, Readonly<Record<string, AgeBridgeKind>>>> = {
  stage: { 長生: 'rise', 沐浴: 'hold', 冠帶: 'rise', 臨官: 'rise', 帝旺: 'rise', 衰: 'hold', 病: 'loss', 死: 'cut', 墓: 'hold', 絕: 'cut', 胎: 'hold', 養: 'hold' },
  banner: { 博士: 'rise', 力士: 'rise', 青龍: 'rise', 小耗: 'loss', 將軍: 'rise', 奏書: 'rise', 飛廉: 'hold', 喜神: 'rise', 病符: 'loss', 大耗: 'loss', 伏兵: 'clash', 官府: 'clash' },
  decree: { 歲建: 'rise', 晦氣: 'clash', 喪門: 'cut', 貫索: 'clash', 官符: 'clash', 小耗: 'loss', 大耗: 'loss', 龍德: 'rise', 白虎: 'clash', 天德: 'rise', 弔客: 'cut', 病符: 'loss' },
  force: { 將星: 'rise', 攀鞍: 'rise', 歲驛: 'rise', 息神: 'hold', 華蓋: 'hold', 劫煞: 'clash', 災煞: 'clash', 天煞: 'clash', 指背: 'clash', 咸池: 'clash', 月煞: 'clash', 亡神: 'loss' },
};
/**
 * 段與段之間的承接句＝「這段」起句（依本段分類）＋「下一段」落句（依下段分類），只由兩段意涵決定。
 * 客戶視角版（2026-11-06 14:53）：白話、對你說、零行話（不用立纛／歃血／淬鋒／擂鼓／掛印封金／破釜沉舟／臥薪嘗膽／虎賁／金戈鐵馬／封刀）；整句 ≤16 字。
 * 各分類三種起句、三種落句；同一張盤內不重複（依段序起選，撞到已用就順延）。
 */
export const AGE_BRIDGE_OPEN: Readonly<Record<AgeBridgeKind, readonly string[]>> = {
  rise: ['這段你往上走', '這段你要站上來', '這段機會找上你'],
  hold: ['這段你要忍', '這段你要守住', '這段你先藏好'],
  cut: ['這段你放下舊的', '這段你斷舊路', '這段有人離開你'],
  loss: ['這段你在失血', '這段你要止損', '這段你先顧傷'],
  clash: ['這段你硬碰硬', '這段有人衝你來', '這段你正面接招'],
};
export const AGE_BRIDGE_CLOSE: Readonly<Record<AgeBridgeKind, readonly string[]>> = {
  rise: ['下一段你往上衝', '下一段輪到你上', '下一段你抓機會'],
  hold: ['下一段你先守住', '下一段你先忍住', '下一段你先藏好'],
  cut: ['下一段你放下舊的', '下一段你斷舊路', '下一段你送走舊人'],
  loss: ['下一段你守住錢', '下一段你先止損', '下一段你先顧傷'],
  clash: ['下一段你正面迎戰', '下一段你擋住來人', '下一段你別退'],
};
/** 依段序組出整張盤的承接句（長度＝段數；最後一段 null）。同盤不重複。 */
export function buildAgeBridges(kinds: readonly AgeBridgeKind[]): Array<string | null> {
  const used = new Set<string>();
  return kinds.map((kind, i) => {
    if (i === kinds.length - 1) return null;
    const opens = AGE_BRIDGE_OPEN[kind]; const closes = AGE_BRIDGE_CLOSE[kinds[i + 1]];
    let first = '';
    for (let k = 0; k < opens.length * closes.length; k++) {
      const n = (i + k) % (opens.length * closes.length);
      const line = `${opens[n % opens.length]}，${closes[Math.floor(n / opens.length)]}。`;
      if (!first) first = line;
      if (!used.has(line)) { used.add(line); return line; }
    }
    return first;
  });
}
/** 時間軸導覽文字（後端固定；前端只照印）。endLine＝最後一段之後的收尾（最後一段 bridge 為 null）。 */
/**
 * 時間軸導覽文字（後端固定；前端只照印，且 AsuraAgeTimeline.tsx 的 fallback 必須逐字相同）。
 * 客戶視角版（2026-11-06）：每句都是「點哪裡／看什麼」的白話動作。不含個人資料（個人化在 viewerLine／opening.text）。
 * 時間軸只留到「今年實歲＋10」那一段（AGE_TIMELINE_LOOKAHEAD），故 endLine 不寫段數。前一版（使用者原版）：hereLabel「你現在在這裡」、toPast「回頭看來時路」、toFuture「往前看下一陣」、endLine「最後一陣也已看過。刀在你手，路你自己走。」
 */
export const AGE_TIMELINE_GUIDE = { hereLabel: '你現在在這段，往下看', toPast: '點這裡看上一段', toFuture: '點這裡看下一段', endLine: '往後的路你都看完了。點最上面的亮點，回到你現在這段。' } as const;

/** 客人本人資料（後端算好、已清洗）：name＝表單姓名（清洗後；無或含禁詞＝null）；age＝今日（台北）實歲；null＝無法計算。 */
export interface AgeTimelineViewer { name: string | null; age: number | null }

/** 從 ageLabel（「約 34–43 歲」）取回起訖歲；格式不符＝null。 */
function parseAgeLabel(label: string): [number, number] | null {
  const m = /(\d+)–(\d+)/.exec(label);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * 戰神令四卡對應的年齡段（文字不動，只給定位＋卡面標記）：1→現在前一段（過去，無則現在）、2→現在、3→現在（focus action）、4→現在後一段（未來，無則現在）。
 * 無「現在」段＝null。卡面標記（label／ageRange／mark／headline）全由後端組好，前端只照印。
 */
export function buildDecreeAnchors(timeline: AsuraAgeTimeline | null | undefined, viewer: AgeTimelineViewer | null = null): AsuraDecreeAnchor[] | null {
  if (!timeline || timeline.segments.length === 0) return null;
  const cur = timeline.segments.findIndex((s) => s.isCurrent);
  if (cur < 0) return null;
  const age = viewer && typeof viewer.age === 'number' ? viewer.age : null;
  const at = (i: number, focus: AsuraDecreeAnchor['focus']): AsuraDecreeAnchor => {
    const seg = timeline.segments[i];
    const r = parseAgeLabel(seg.ageLabel);
    const ageRange = r ? `${r[0]}–${r[1]}` : seg.ageLabel;
    const mark: AsuraDecreeAnchor['mark'] = seg.tense === '過去' ? '走過' : seg.tense === '未來' ? '下一段' : focus === 'action' ? '現在就做' : '現在';
    const label =
      mark === '走過' ? `你 ${ageRange} 歲・走過的路`
      : mark === '下一段' ? `你 ${r ? r[0] : ageRange} 歲起・下一段`
      : age !== null ? `你今年 ${age} 歲・${mark === '現在就做' ? '現在就做' : '就在這段'}`
      : `你 ${ageRange} 歲・${mark === '現在就做' ? '現在就做' : '就在這段'}`;
    return { segmentIndex: i, ageLabel: seg.ageLabel, tense: seg.tense, focus, label, ageRange, mark, headline: seg.opening.headline };
  };
  const last = timeline.segments.length - 1;
  return [at(cur > 0 ? cur - 1 : cur, 'segment'), at(cur, 'segment'), at(cur, 'action'), at(cur < last ? cur + 1 : cur, 'segment')];
}

/**
 * 表單姓名清洗（後端）：去控制字元與標點符號外殼、收合空白、上限 12 字；含任何禁詞（神名／宮名／星名／干支／別名表）＝整個不用（回 null，改稱「你」），
 * 不做局部刪字，以免把客人名字改錯。
 */
export function sanitizeViewerName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.normalize('NFKC').replace(/[\u0000-\u001f\u007f<>{}\[\]\\\/"'`]/g, '').replace(/\s+/g, ' ').trim();
  const name = Array.from(cleaned).slice(0, 12).join('').trim();
  if (!name) return null;
  if (palaceVerseForbiddenHits(name).length > 0 || /星/.test(name)) return null;
  return name;
}

/**
 * 段落開場位置句（客戶本人資料版）：{d}＝白話領域、{from}/{to}＝本段起訖歲、{n}＝今年虛歲、{wait}＝距本段起歲還有幾年、
 * {name}＝「姓名，」或空字串（只用在現在段）、{left}＝現在段剩餘年數句。全部後端代入，前端照印。
 */
export const AGE_OPENING_POSITION: Readonly<Record<'過去' | '現在' | '未來', string>> = {
  過去: '你 {from}–{to} 歲走過這段，落在{d}。',
  現在: '{name}你今年虛歲 {n}，正走在這段，落在{d}；{left}',
  未來: '再過 {wait} 年，你 {from} 歲進這段，落在{d}。',
};
/** 現在段剩餘年數句：本段止歲＝今年虛歲→最後一年；否則還有幾年。 */
const leftLine = (to: number, n: number): string => (to - n <= 0 ? '今年是這段最後一年。' : `這段還有 ${to - n} 年。`);
/** 標題上限（含「{起歲} 歲起，」前綴）。 */
export const AGE_HEADLINE_MAX = 26;
/**
 * 截斷：時間軸只留到「含 今年實歲＋10」的那一段為止，之後的段不外送（使用者 2026-11-06 指示）。
 * 例：實歲 18→留到含 28 的段；52→含 62；80→含 90。實歲無法計算＝用虛歲。截斷後承接句、招牌語、戰神令定位都只算留下的段。
 */
export const AGE_TIMELINE_LOOKAHEAD = 10;
const headlinePrefix = (from: number): string => `${from} 歲起，`;

/** 後端完整版（含每句 sourceLevel 與數字起訖歲，供稽核／測試）；外送前只取 timeline。 */
export interface AgeTimelineServer { timeline: AsuraAgeTimeline; sourceLevels: PalaceVerseSourceLevel[][]; ranges: Array<[number, number]>; headlineLayers: PalaceVerseLayerKey[] }

/**
 * 精品標題（premium）：四句招牌語只准當「真的含有其來源值」那一段的 headline（事實規則）；headline＝「{起歲} 歲起，」＋整句，≤26 字。
 * 客戶視角版（2026-11-06）：使用者核准原句（14:29）→ 依 14:31 指示改白話（去渡／披麻等行話），保留我→你。白話領域只放位置句 opening.text，不放標題。
 * 來源值全在「令」層（歲前系），每段只有一個令值，故每段至多一個候選；保留依段序輪替（segmentIndex % 候選數）以防日後擴充。
 * 命中＝壓過權重表，headline 取該值洋蔥列的 headline；未命中＝沿用權重表。
 */
export const AGE_PREMIUM_TITLES: readonly { layer: PalaceVerseLayerKey; value: string; phrase: string }[] = [
  { layer: 'decree', value: '喪門', phrase: '該散的我替你散了，留下的都是你的人' },
  { layer: 'decree', value: '弔客', phrase: '這段有場傷心事，我陪你哭完再站起來' },
  { layer: 'decree', value: '病符', phrase: '身體在喊停，我要你先停，再打下一仗' },
  { layer: 'decree', value: '官符', phrase: '合約公文上門，我陪你一字一字看完再簽' },
];
/**
 * 權重標題：本段權重最高值＝下列之一（且未命中招牌語）時，headline 改用此整句（前綴「{起歲} 歲起，」）。
 * 客戶視角版（2026-11-06）：由使用者 14:29 核准整句改寫為白話（去藏鋒／出鞘／史書等行話）；大耗只取「旗」層（家底），每盤至多一次。
 */
export const AGE_WEIGHTED_TITLES: readonly { layer: PalaceVerseLayerKey; value: string; phrase: string }[] = [
  { layer: 'stage', value: '墓', phrase: '這十年我叫你藏好實力，出手那天一次到位' },
  { layer: 'stage', value: '帝旺', phrase: '我把你推到最高點，守得住才是你的' },
  { layer: 'stage', value: '絕', phrase: '舊路我替你斷了，新路從你腳下開始' },
  { layer: 'banner', value: '大耗', phrase: '錢在往外流，我要你先守住家底' },
  { layer: 'banner', value: '官府', phrase: '閒話滿天飛，我叫你少說，最後你說了算' },
  { layer: 'force', value: '劫煞', phrase: '有人伸手搶你的東西，我的刀先到' },
];

/**
 * headline：含招牌語來源值＝招牌語（AGE_PREMIUM_TITLES）優先；否則權重最高者（同分取前層）。bridge：buildAgeBridges(依 headline 那一值的 AGE_BRIDGE_KIND)。
 */
/** 依本人每段四值查 576 表組 48 句（依大限起歲由小到大）。任何一值查不到、或命中禁詞＝回 null，不補不編。 */
export function buildAgeTimelineServer(cells: readonly PalaceVerseCell[], nominalAge: number, viewer: AgeTimelineViewer | null = null): AgeTimelineServer | null {
  const name = viewer?.name ?? null;
  const age = viewer && typeof viewer.age === 'number' ? viewer.age : null;
  if (cells.length !== 12) return null;
  const sorted = cells.filter((c) => c.range.length === 2 && Number.isFinite(c.range[0]) && Number.isFinite(c.range[1])).sort((a, b) => a.range[0] - b.range[0]);
  if (sorted.length !== 12) return null;
  const segments: AsuraAgeTimeline['segments'] = [];
  const sourceLevels: PalaceVerseSourceLevel[][] = [];
  const ranges: Array<[number, number]> = [];
  const headlineLayers: PalaceVerseLayerKey[] = [];
  const kinds: AgeBridgeKind[] = [];
  const premiumTitles: AsuraAgePremiumTitle[] = [];
  for (const [segmentIndex, c] of sorted.entries()) {
    const entries = PALACE_VERSE_LAYERS.map((layer) => lookupPalaceVerse(c.palaceKey, layer.key, c[layer.field]));
    if (entries.some((e) => !e)) return null;
    const [from, to] = c.range;
    const tense = to < nominalAge ? '過去' : from > nominalAge ? '未來' : '現在';
    const rows = PALACE_VERSE_LAYERS.map((layer) => PALACE_VERSE_ONION[layer.key][c[layer.field]]);
    if (rows.some((row) => !row)) return null;
    let top = 0;
    rows.forEach((row, li) => { if (row!.weight > rows[top]!.weight) top = li; });
    const domain = PALACE_VERSE_DOMAIN[c.palaceKey];
    const premium = AGE_PREMIUM_TITLES.filter((p) => c[PALACE_VERSE_LAYERS.find((l) => l.key === p.layer)!.field] === p.value);
    if (premium.length > 0) {
      const chosen = premium[segmentIndex % premium.length];
      top = PALACE_VERSE_LAYERS.findIndex((l) => l.key === chosen.layer);
      premiumTitles.push({ segmentIndex, ageLabel: `約 ${from}–${to} 歲`, phrase: chosen.phrase, headline: headlinePrefix(from) + chosen.phrase });
    }
    const weighted = premium.length > 0 ? null : AGE_WEIGHTED_TITLES.find((w) => w.layer === PALACE_VERSE_LAYERS[top].key && c[PALACE_VERSE_LAYERS[top].field] === w.value);
    const headline = premium.length > 0 ? premiumTitles[premiumTitles.length - 1].headline : headlinePrefix(from) + (weighted ? weighted.phrase : rows[top]!.headline);
    if (Array.from(headline).length > AGE_HEADLINE_MAX) return null;
    const openingText = AGE_OPENING_POSITION[tense]
      .replace('{d}', domain).replace('{from}', String(from)).replace('{to}', String(to)).replace('{n}', String(nominalAge))
      .replace('{wait}', String(from - nominalAge)).replace('{name}', name ? `${name}，` : '').replace('{left}', leftLine(to, nominalAge));
    segments.push({
      ageLabel: `約 ${from}–${to} 歲`,
      tense,
      isCurrent: tense === '現在',
      opening: { text: openingText, headline },
      lines: entries.map((e) => e!.text),
      depth: rows.map((row) => ({ basis: { ...row!.depth.basis }, history: row!.depth.history ? { ...row!.depth.history } : null, action: [...row!.depth.action], close: row!.depth.close })),
      bridge: null,
    });
    headlineLayers.push(PALACE_VERSE_LAYERS[top].key);
    const topLayer = PALACE_VERSE_LAYERS[top];
    const kind = AGE_BRIDGE_KIND[topLayer.key][c[topLayer.field]];
    if (!kind) return null;
    kinds.push(kind);
    sourceLevels.push(entries.map((e) => e!.sourceLevel));
    ranges.push([from, to]);
  }
  const cutoff = (age ?? nominalAge) + AGE_TIMELINE_LOOKAHEAD;
  const hit = ranges.findIndex(([a, b]) => a <= cutoff && cutoff <= b);
  const keep = hit >= 0 ? hit + 1 : ranges[0][0] > cutoff ? 1 : ranges.length;
  segments.splice(keep); kinds.splice(keep); sourceLevels.splice(keep); ranges.splice(keep); headlineLayers.splice(keep);
  for (let k = premiumTitles.length - 1; k >= 0; k--) if (premiumTitles[k].segmentIndex >= keep) premiumTitles.splice(k, 1);
  buildAgeBridges(kinds).forEach((bridge, i) => { segments[i].bridge = bridge; });
  const curSeg = segments.findIndex((g) => g.isCurrent);
  const who = name ? `${name}，` : '';
  const ageText = age !== null ? `你今年 ${age} 歲（虛歲 ${nominalAge}）` : `你今年虛歲 ${nominalAge}`;
  const viewerLine = curSeg >= 0 ? `${who}${ageText}，正走在 ${ranges[curSeg][0]}–${ranges[curSeg][1]} 歲這段。` : `${who}${ageText}。`;
  const timeline: AsuraAgeTimeline = { title: PALACE_VERSES_TITLE, guide: { ...AGE_TIMELINE_GUIDE }, viewerLine, segments, premiumTitles };
  // 禁詞檢查排除客人姓名本身（姓名已在 sanitizeViewerName 擋過一次）
  const blob = JSON.stringify(timeline);
  if (palaceVerseForbiddenHits(name ? blob.split(name).join('') : blob).length > 0) return null;
  return { timeline, sourceLevels, ranges, headlineLayers };
}

/** 外送版：只回 AsuraAgeTimeline（不含 sourceLevel／note／值／陣鍵）。 */
export function buildAgeTimeline(cells: readonly PalaceVerseCell[], nominalAge: number, viewer: AgeTimelineViewer | null = null): AsuraAgeTimeline | null {
  return buildAgeTimelineServer(cells, nominalAge, viewer)?.timeline ?? null;
}

/* ───────────────────────── 三卡：翻譯桶 ───────────────────────── */

/**
 * 翻譯桶：既有文案中出現的命理名稱 → 人話（固定對照，逐條列出供審查）。
 * 來源原文不改（lib/iching-shensha-teacher-readings.ts 第 144 行），只在上畫面前替換。
 */
export const ASURA_TERM_BUCKET: ReadonlyArray<readonly [from: string, to: string]> = [
  ['文昌的光', '文思的光'],
];

export function asuraTranslateLine(text: string): string;
export function asuraTranslateLine(text: string | null | undefined): string | null | undefined;
export function asuraTranslateLine(text: string | null | undefined) {
  if (typeof text !== 'string' || text === '') return text;
  let out = text;
  for (const [from, to] of ASURA_TERM_BUCKET) out = out.split(from).join(to);
  return out;
}

/** 三卡（過去／現在／未來）：只換字，不增刪項目、不改順序、不新增欄位。 */
export function asuraTranslateSection(section: AsuraDisplaySection): AsuraDisplaySection {
  const out: AsuraDisplaySection = {
    ...section,
    heading: asuraTranslateLine(section.heading),
    label: asuraTranslateLine(section.label),
    lead: asuraTranslateLine(section.lead),
    items: section.items.map((item) => ({
      ...item,
      label: asuraTranslateLine(item.label),
      text: asuraTranslateLine(item.text),
      ...(typeof item.plain === 'string' ? { plain: asuraTranslateLine(item.plain) } : {}), // 非字串（undefined）原樣由 ...item 保留
    })),
  };
  if ('narrative' in section) out.narrative = asuraTranslateLine(section.narrative);
  if ('blocks' in section) {
    out.blocks = section.blocks
      ? section.blocks.map((block) => ({
          text: asuraTranslateLine(block.text),
          plain: block.plain.map((line) => ({ label: asuraTranslateLine(line.label), plain: asuraTranslateLine(line.plain) })),
        }))
      : section.blocks;
  }
  if ('coda' in section) out.coda = asuraTranslateLine(section.coda);
  return out;
}

export function asuraTranslateDisplay(display: AsuraDisplay): AsuraDisplay {
  return { ...display, sections: display.sections.map(asuraTranslateSection) };
}

/* ───────────────────────── 本性卡：traitKey → 阿修羅意象（固定表，文案唯一來源） ─────────────────────────
 * 一個 traitKey 永遠對一句；意象是阿修羅自創說法，只換說法、不換意思（原意見人格解析層 refs）。零術語。
 * sortKey：90 空宮底色｜100–113 人格主軸｜200 才藝｜300 暗傷｜400 人前／心裡｜500 骨子。
 * kind：essence 本性｜strength 優勢｜weakness 弱點｜risk 風險（四段）。 */
export const ASURA_IMAGE_TABLE: ReadonlyArray<AsuraImageEntry> = [
  // 空宮底色（使用者提供 2026-10-09 13:02）
  { traitKey: 'NATURE.OPEN', kind: 'essence', sortKey: 90, text: '你這塊地，還沒人插過旗。插什麼旗，就長成什麼樣。什麼都容得下。什麼都做得成。' },
  // SOVEREIGN
  { traitKey: 'NATURE.SOVEREIGN', kind: 'essence', sortKey: 100, text: '你是陣心那面旗。位置和尊嚴，寸步不讓。' },
  { traitKey: 'STRENGTH.SOVEREIGN', kind: 'strength', sortKey: 100, text: '你一站出來，全局歸你管。標準由你立，人自然服。' },
  { traitKey: 'WEAKNESS.SOVEREIGN.OVERCONTROL', kind: 'weakness', sortKey: 100, text: '規矩你拉得太死。不照你規矩走的，你吞不下。' },
  { traitKey: 'RISK.SOVEREIGN.PRESSURE', kind: 'risk', sortKey: 100, text: '壓力一來，你沉下去。話，越來越少。' },
  // STRATEGIST
  { traitKey: 'NATURE.STRATEGIST', kind: 'essence', sortKey: 101, text: '你腦中擺著一盤棋。下一步，早算好了。' },
  { traitKey: 'STRENGTH.STRATEGIST', kind: 'strength', sortKey: 101, text: '你腦子轉得快。別人剛起步，你已看到第三步。' },
  { traitKey: 'WEAKNESS.STRATEGIST.OVERTHINK', kind: 'weakness', sortKey: 101, text: '棋算得太多，子遲遲不落。' },
  { traitKey: 'RISK.STRATEGIST.PRESSURE', kind: 'risk', sortKey: 101, text: '壓力一來，你話變多。腦子轉得更快。' },
  // TORCHBEARER
  { traitKey: 'NATURE.TORCHBEARER', kind: 'essence', sortKey: 102, text: '你是陣前那把火。事你扛，人你照。' },
  { traitKey: 'STRENGTH.TORCHBEARER', kind: 'strength', sortKey: 102, text: '你火足，扛得起事，帶得動人。' },
  { traitKey: 'WEAKNESS.TORCHBEARER.BURNOUT', kind: 'weakness', sortKey: 102, text: '照遍了別人，自己的油先燒乾。' },
  { traitKey: 'RISK.TORCHBEARER.PRESSURE', kind: 'risk', sortKey: 102, text: '壓力越大，你燒得越亮。反倒更去顧別人。' },
  // EXECUTOR
  { traitKey: 'NATURE.EXECUTOR', kind: 'essence', sortKey: 103, text: '你是一桿秤。只秤結果，只認效率。' },
  { traitKey: 'STRENGTH.EXECUTOR', kind: 'strength', sortKey: 103, text: '事交到你手上，就落地。成本算得清，手不軟。' },
  { traitKey: 'WEAKNESS.EXECUTOR.COLD', kind: 'weakness', sortKey: 103, text: '秤只看斤兩。過程和人情，都被你秤冷了。' },
  { traitKey: 'RISK.EXECUTOR.PRESSURE', kind: 'risk', sortKey: 103, text: '壓力一來，你下手更快更狠。眼裡只剩效率。' },
  // EASYGOING
  { traitKey: 'NATURE.EASYGOING', kind: 'essence', sortKey: 104, text: '你是一池溫水。心軟，誰都容得下。' },
  { traitKey: 'STRENGTH.EASYGOING', kind: 'strength', sortKey: 104, text: '你在哪，哪裡就鬆下來。心善，容得下人。一句反差話，僵局就破。' },
  { traitKey: 'WEAKNESS.EASYGOING.AVOID', kind: 'weakness', sortKey: 104, text: '水太溫。該起浪時，你先沉底。' },
  { traitKey: 'RISK.EASYGOING.PRESSURE', kind: 'risk', sortKey: 104, text: '壓力一來，你縮回殼裡，默默躲開。' },
  // BOUNDARY
  { traitKey: 'NATURE.BOUNDARY', kind: 'essence', sortKey: 105, text: '你手裡握著紅線。界線分明，魅力自帶。' },
  { traitKey: 'STRENGTH.BOUNDARY', kind: 'strength', sortKey: 105, text: '你一開口，人就被說動。界線清楚，場子歸你。' },
  { traitKey: 'WEAKNESS.BOUNDARY.HARSH', kind: 'weakness', sortKey: 105, text: '紅線繃太硬。話一出口就割人。' },
  { traitKey: 'RISK.BOUNDARY.PRESSURE', kind: 'risk', sortKey: 105, text: '壓力一來，你更銳，下手更狠。' },
  // KEEPER
  { traitKey: 'NATURE.KEEPER', kind: 'essence', sortKey: 106, text: '你是一座糧倉。守得住，底一直留著。' },
  { traitKey: 'STRENGTH.KEEPER', kind: 'strength', sortKey: 106, text: '你守得住。手上有糧，心裡有底。' },
  { traitKey: 'WEAKNESS.KEEPER.RIGID', kind: 'weakness', sortKey: 106, text: '倉門關太死。機會在門外走掉。' },
  { traitKey: 'RISK.KEEPER.PRESSURE', kind: 'risk', sortKey: 106, text: '壓力一來，倉門你守得更緊。' },
  // OBSERVER
  { traitKey: 'NATURE.OBSERVER', kind: 'essence', sortKey: 107, text: '你是夜裡那盞燈。心細，看得深。' },
  { traitKey: 'STRENGTH.OBSERVER', kind: 'strength', sortKey: 107, text: '別人漏掉的細處，你一眼看穿。想得也深。' },
  { traitKey: 'WEAKNESS.OBSERVER.BROOD', kind: 'weakness', sortKey: 107, text: '燈只照自己。想多了，悶著耗。' },
  { traitKey: 'RISK.OBSERVER.PRESSURE', kind: 'risk', sortKey: 107, text: '壓力一來，你往裡縮。自己耗自己。' },
  // SEEKER
  { traitKey: 'NATURE.SEEKER', kind: 'essence', sortKey: 108, text: '你是出獵的狼。要得多，愛闖。人緣，從不缺。' },
  { traitKey: 'STRENGTH.SEEKER', kind: 'strength', sortKey: 108, text: '你走到哪都吃得開。想要的，伸手就拿。' },
  { traitKey: 'WEAKNESS.SEEKER.IMPULSE', kind: 'weakness', sortKey: 108, text: '獵物太多，挑到手軟。一衝就咬。' },
  { traitKey: 'RISK.SEEKER.PRESSURE', kind: 'risk', sortKey: 108, text: '壓力一來，你更躁。拚命找出口。' },
  // QUESTIONER
  { traitKey: 'NATURE.QUESTIONER', kind: 'essence', sortKey: 109, text: '你嘴裡藏刀。凡事拆開，問到底。' },
  { traitKey: 'STRENGTH.QUESTIONER', kind: 'strength', sortKey: 109, text: '你邏輯硬，話講得透，不信邪。假的騙不過你。' },
  { traitKey: 'WEAKNESS.QUESTIONER.SHARP', kind: 'weakness', sortKey: 109, text: '你嘴太利，一句就割傷人。誰的話，你都先打折。' },
  { traitKey: 'RISK.QUESTIONER.QUARREL', kind: 'risk', sortKey: 109, text: '話鋒一碰，就起口角。' },
  { traitKey: 'RISK.QUESTIONER.SPEAK_BEFORE_CONFIRM', kind: 'risk', sortKey: 109, text: '刀還沒看清靶，就先出鞘。事沒確認，話先出口。' },
  // MEDIATOR
  { traitKey: 'NATURE.MEDIATOR', kind: 'essence', sortKey: 110, text: '你是桌上那枚印。懂場面，講公平，會協調。' },
  { traitKey: 'STRENGTH.MEDIATOR', kind: 'strength', sortKey: 110, text: '再亂的場子，你都擺得平。人人信你公道。' },
  { traitKey: 'WEAKNESS.MEDIATOR.PLEASE', kind: 'weakness', sortKey: 110, text: '印蓋得太圓。忍到連立場都沒了。' },
  { traitKey: 'RISK.MEDIATOR.PRESSURE', kind: 'risk', sortKey: 110, text: '壓力一來，你更謹慎。心思全花在圓場面。' },
  // GUARDIAN
  { traitKey: 'NATURE.GUARDIAN', kind: 'essence', sortKey: 111, text: '你是一根老梁。有原則，看得遠，人靠你護著。' },
  { traitKey: 'STRENGTH.GUARDIAN', kind: 'strength', sortKey: 111, text: '你看得遠，判得準。身邊的人，靠你撐著。' },
  { traitKey: 'WEAKNESS.GUARDIAN.OVERMANAGE', kind: 'weakness', sortKey: 111, text: '梁撐得太寬。管太多，話也說太重。' },
  { traitKey: 'RISK.GUARDIAN.PRESSURE', kind: 'risk', sortKey: 111, text: '壓力一來，你更沉。責任全往自己身上攬。' },
  // VANGUARD
  { traitKey: 'NATURE.DECIDER', kind: 'essence', sortKey: 112, text: '你是握令旗的將。拍板做主，天生就是。' },
  { traitKey: 'NATURE.VANGUARD', kind: 'essence', sortKey: 112, text: '你是先鋒那把刀。敢衝，敢扛，出手就快。' },
  { traitKey: 'STRENGTH.VANGUARD', kind: 'strength', sortKey: 112, text: '你拍板快，扛得住。說衝，就衝。' },
  { traitKey: 'WEAKNESS.VANGUARD.RASH', kind: 'weakness', sortKey: 112, text: '刀出得太快。沒想清楚，人已衝出去。' },
  { traitKey: 'RISK.VANGUARD.PRESSURE', kind: 'risk', sortKey: 112, text: '壓力一來，你馬上動手，又快又狠。' },
  // BREAKER
  { traitKey: 'NATURE.BREAKER', kind: 'essence', sortKey: 113, text: '你是拆城的錘。舊局看不慣，就拆。' },
  { traitKey: 'STRENGTH.BREAKER', kind: 'strength', sortKey: 113, text: '死局到你手上，你撕開一條新路。' },
  { traitKey: 'WEAKNESS.BREAKER.NO_BUILD', kind: 'weakness', sortKey: 113, text: '錘落得太勤。舊城倒了，新城沒起。' },
  { traitKey: 'RISK.BREAKER.PRESSURE', kind: 'risk', sortKey: 113, text: '壓力一來，你更反骨，拆得更兇。' },
  { traitKey: 'RISK.BREAKER.CANNOT_BUILD', kind: 'risk', sortKey: 113, text: '錘拆得動城，砌不起牆。一要建，處處卡。' },
  // 才藝／暗傷／骨子（易經只供措辭，不設特質）
  // 13:24 命宮四化（原意見 persona PERSONA_TRANSFORMATIONS）
  { traitKey: 'NATURE.MARK.FLOW', kind: 'essence', sortKey: 150, text: '你走到哪，資源跟到哪。人緣，也跟著來。' },
  { traitKey: 'NATURE.MARK.COMMAND', kind: 'essence', sortKey: 151, text: '擔子越給越重。拍板的權，落在你手上。' },
  { traitKey: 'NATURE.MARK.SEEN', kind: 'essence', sortKey: 152, text: '你做成的事，擺在明處。名聲反過來護著你。' },
  { traitKey: 'WEAKNESS.MARK.KNOT', kind: 'weakness', sortKey: 153, text: '你心裡有個結，放不下。那是你要補的缺口。' },
  { traitKey: 'NATURE.SCRIBE', kind: 'essence', sortKey: 200, text: '你袖裡藏著一支筆。開口落字，條理分明。' },
  { traitKey: 'NATURE.ARTIST', kind: 'essence', sortKey: 201, text: '你身上帶著琴音。有才氣，懂美，會說話。' },
  { traitKey: 'RISK.CLASH', kind: 'risk', sortKey: 300, text: '你腰間掛著刀。遇事，硬碰硬。' },
  { traitKey: 'RISK.DRAG', kind: 'risk', sortKey: 301, text: '你腳下纏著藤。事一拖，越纏越緊。' },
  { traitKey: 'RISK.TEMPER', kind: 'risk', sortKey: 302, text: '你胸口埋著火藥。火氣一點就著。' },
  { traitKey: 'RISK.SMOLDER', kind: 'risk', sortKey: 303, text: '你心裡懸著暗鈴。焦躁暗響，悶著不說。' },
  { traitKey: 'RISK.DRIFT', kind: 'risk', sortKey: 304, text: '你踩在雲上。想得遠，落地時空轉。' },
  { traitKey: 'RISK.LEAK', kind: 'risk', sortKey: 305, text: '你袋口破了洞。手上的東西，容易被分走。' },
];

/**
 * 13:39 使用者定稿文案（逐字，依命宮主星組合套用；只在後端翻譯層，元件不寫死）。
 * 觸發：本性證據同時含 武曲（NATURE.EXECUTOR）與 七殺（NATURE.DECIDER 或 NATURE.VANGUARD）。
 * 套用時四段改用此文案；evidence（武曲／七殺／化科等 refs）、natureKey、riskKeys 全部照舊保留。
 * 風險句取代 ASURA_UNIVERSAL_RISK（僅此組合；其他盤仍用通用句）。
 * 這些句子為使用者原句，超過話術 lint 單句 16 字上限，測試明列為使用者提供例外。
 */
export interface AsuraUserComboCopy {
  id: string;
  requiresAll: ReadonlyArray<ReadonlyArray<string>>; // 每組至少命中一個 traitKey
  stars: string;                                      // 後端註記：對應命宮主星
  source: string;
  essence: string;
  strength: string;
  weakness: string;
  risk: string;
  /** 本性句對應的星曜原意出處（後端註記） */
  essenceRefs: ReadonlyArray<string>;
}
export const ASURA_USER_COMBO_COPY: ReadonlyArray<AsuraUserComboCopy> = [
  {
    id: 'COMBO.EXECUTOR_DECIDER',
    requiresAll: [['NATURE.EXECUTOR'], ['NATURE.DECIDER', 'NATURE.VANGUARD']],
    stars: '武曲＋七殺（命宮雙主星）',
    source: '使用者提供 2026-10-09 13:39（武曲＋七殺 命宮組合定稿，逐字；本性依 13:41 使用者改定版）',
    // 13:40 使用者決定：去掉「命宮雙星」，兩顆星用意象帶出、不點名（武曲 coreDrive＝秤／結果效率；七殺強＝令旗／拍板做主）
    // 13:39 原句（僅留註解）：你向來都是硬骨加殺氣，不繞彎，命宮雙星，你的底色就是這樣。
    // 13:41 使用者改定：七殺殺氣加重＝戰場最前面的將軍（13:40 版「一手是令旗，你拍板，旁人照走」已替換）
    essence: '你向來都是硬骨加殺氣，不繞彎。兩股力在你身上：一手是秤，只秤結果，只秤效率；一手是戰旗，你走在最前面，軍隊跟著你衝。這就是你的底色。',
    essenceRefs: ['lib/asura/ziwei-personality-registry.ts:92 WUQU.coreDrive「效率、結果、資源、紀律、執行」', '使用者提供 2026-10-09 七殺（強）「老闆命、決策者」', 'lib/asura/ziwei-personality-registry.ts:263 QISHA.coreDrive「決斷、衝鋒、承擔、突破、快速行動」', '使用者提供 2026-10-09 13:41 七殺意象「戰場最前面的將軍」'],
    strength: '你不吃軟，不吃轟，你只認實力和結果。',
    weakness: '別指望誰來救場，你的路是你自己殺出來的，靠人不如靠自己，這點你比誰都清楚。習慣自己殺出來，不輕易交背，什麼都自己扛，避風得太緊。',
    risk: '記住，一旦你開始猶豫和退讓，你就把自己磨鈍了。別怕得罪人，該硬就硬到底。',
  },
];
export function asuraUserComboFor(evidence: PersonaEvidence[]): AsuraUserComboCopy | null {
  const keys = new Set(evidence.filter((e) => e.kind === 'essence' && e.axis === 'lifePalace' && e.listedOnly !== true && e.material !== true).map((e) => e.traitKey));
  return ASURA_USER_COMBO_COPY.find((c) => c.requiresAll.every((group) => group.some((k) => keys.has(k)))) ?? null;
}

/**
 * 13:32 使用者指定：風險段一律用此句（通用、逐字、不改字）。
 * 原為天同＋天梁那張盤寫的句子；使用者 13:32 指定給 曾威艷，並要求所有盤通用。
 * 只在有風險證據時套用（無證據仍留空）。要還原成「依各星風險意象」：把 enabled 改成 false 即可（後端 riskKeys／evidence 不受影響）。
 * 單句 38 字，超過話術 lint 單句 16 字上限；為使用者原句，測試明列例外。
 */
export const ASURA_UNIVERSAL_RISK = {
  enabled: true,
  text: '壓力一來，會先縮回去，不聲不響地撐著，可真正該扛的責任，你最後還是會往自己身上攬。',
  source: '使用者提供 2026-10-09 13:16／13:32（逐字；13:32 起所有盤通用）',
} as const;

/**
 * 合併風險句（2026-10-09 13:16 使用者提供原句，逐字，不改字）：
 * 同一張盤同時有「天同 stressResponse」＋「天梁 stressResponse」兩條風險證據時，
 * 兩句合成一句。兩條星曜證據原樣保留在 evidence（只存後端）；前台只見合併句。
 * 決定性：只看 traitKey 是否同時出現，位置取兩者中較前者。
 * 註：此句為使用者原句，整句 38 字，超過話術 lint 單句 16 字上限；依「使用者原句逐字」保留，lint 例外於測試中明列。
 */
export interface AsuraCombinedRisk {
  comboKey: string;
  parts: readonly string[];
  text: string;
  source: string;
  userVerbatim: true;
}
export const ASURA_COMBINED_RISKS: ReadonlyArray<AsuraCombinedRisk> = [
  {
    comboKey: 'RISK.EASYGOING_GUARDIAN.PRESSURE',
    parts: ['RISK.EASYGOING.PRESSURE', 'RISK.GUARDIAN.PRESSURE'],
    text: '壓力一來，會先縮回去，不聲不響地撐著，可真正該扛的責任，你最後還是會往自己身上攬。',
    source: '使用者提供 2026-10-09 13:16（天同＋天梁 stressResponse 合併句，逐字）',
    userVerbatim: true,
  },
];
const COMBINED_RISK_IMAGES: AsuraImageEntry[] = ASURA_COMBINED_RISKS.map((c) => ({
  traitKey: c.comboKey,
  kind: 'risk',
  sortKey: Math.min(...c.parts.map((k) => ASURA_IMAGE_TABLE.find((e) => e.traitKey === k)?.sortKey ?? 999)),
  text: c.text,
}));
const IMAGE_BY_KEY = new Map([...ASURA_IMAGE_TABLE, ...COMBINED_RISK_IMAGES].map((entry) => [entry.traitKey, entry]));
export function asuraImageOf(traitKey: string): AsuraImageEntry | null {
  return IMAGE_BY_KEY.get(traitKey) ?? null;
}

/**
 * 契約 translateAsNature：PersonaEvidence[] → 後端完整本性卡。只翻譯：一筆 evidence 對一句意象，
 * 依意象表 sortKey 升冪（同 sortKey 保留 evidence 原順序）。查不到意象、kind 不符、缺 refs、
 * 本性為空 → 丟錯（呼叫端改回 null，不補字）；優勢／弱點／風險無證據＝空。
 * natureKey＝第一句本性的 traitKey＋強弱（例 NATURE.EXECUTOR.STRONG）；riskKeys＝各句風險 traitKey。
 */
const axisRank = (ev: PersonaEvidence) => (ev.axis === 'auxiliary' ? 1 : 0);
export function translateAsNature(evidence: PersonaEvidence[]): AsuraNatureCardServer {
  // 13:29：列出、不解讀的星只留在後端證據，不產任何文字
  // 14:23：話術素材（material）只隨證據保留，供翻譯層取用（asuraWordingMaterials），不自動成句
  const listed = evidence.filter((ev) => ev.listedOnly === true || ev.material === true);
  const lines = evidence.filter((ev) => ev.listedOnly !== true && ev.material !== true).map((ev, index) => {
    const image = asuraImageOf(ev.traitKey);
    if (!image || image.kind !== ev.kind || !Array.isArray(ev.refs) || ev.refs.length === 0) throw new Error(`ASURA_NATURE_NO_IMAGE:${ev.traitKey}`);
    return { ev, image, index };
  })
    // 13:18：命宮主軸一律在前，輔助（八字／易經）只能殿後；同軸再依 sortKey
    .sort((a, b) => axisRank(a.ev) - axisRank(b.ev) || a.image.sortKey - b.image.sortKey || a.index - b.index);
  // 同一 traitKey 只說一次（空宮借星與命宮小星可能落在同一特質）
  const seen = new Set<string>();
  const uniq = lines.filter((l) => (seen.has(l.ev.traitKey) ? false : (seen.add(l.ev.traitKey), true)));
  const of = (kind: PersonaEvidence['kind']) => uniq.filter((l) => l.ev.kind === kind);
  const essence = of('essence');
  // 13:18：本性必須由命宮主軸起頭；沒有命宮主軸句＝不成卡
  if (essence.length === 0 || essence[0].ev.axis !== 'lifePalace') throw new Error('ASURA_NATURE_INCOMPLETE');
  const join = (ls: Array<{ image: AsuraImageEntry }>) => ls.map((l) => l.image.text).join('');
  const lead = essence[0].ev;
  // 風險段：套用合併句（兩條證據都在才合併；證據本身不刪）
  let riskLines: Array<{ key: string; image: AsuraImageEntry }> = of('risk').map((l) => ({ key: l.ev.traitKey, image: l.image }));
  for (const combo of ASURA_COMBINED_RISKS) {
    const idx = combo.parts.map((k) => riskLines.findIndex((r) => r.key === k));
    if (idx.some((i) => i < 0)) continue;
    const at = Math.min(...idx);
    const image = asuraImageOf(combo.comboKey)!;
    riskLines = riskLines.flatMap((r, i) => (i === at ? [{ key: combo.comboKey, image }] : combo.parts.includes(r.key) ? [] : [r]));
  }
  const card: AsuraNatureCardServer = {
    version: NATURE_CARD_VERSION,
    title: NATURE_TITLE,
    essence: join(essence),
    // 13:32：有風險證據才給（無證據仍留空）；給的時候一律用使用者通用句
    risk: riskLines.length === 0 ? '' : ASURA_UNIVERSAL_RISK.enabled ? ASURA_UNIVERSAL_RISK.text : join(riskLines),
    natureKey: lead.strength ? `${lead.traitKey}.${lead.strength.toUpperCase()}` : lead.traitKey,
    riskKeys: riskLines.map((r) => r.key),
    evidence: [...uniq.map((l) => l.ev), ...listed],
  };
  const strength = join(of('strength'));
  const weakness = join(of('weakness'));
  if (strength) card.strength = strength;
  if (weakness) card.weakness = weakness;
  // 13:39：命中使用者定稿組合 → 四段改用定稿文案（證據照舊）
  const userCopy = asuraUserComboFor(card.evidence);
  if (userCopy) {
    card.essence = userCopy.essence;
    card.strength = userCopy.strength;
    card.weakness = userCopy.weakness;
    card.risk = userCopy.risk;
    card.userCopyId = userCopy.id;
  }
  return card;
}

/** 14:23（使用者決定 2026-10-09 14:23）：翻譯層可取用的話術素材（有出處、後端專用）；不自動成句、不進前台 */
export function asuraWordingMaterials(evidence: PersonaEvidence[]): Array<{ traitKey: string; item: string; source: string }> {
  return evidence.filter((e) => e.material === true).map((e) => ({ traitKey: e.traitKey, item: e.refs[0]?.item ?? '', source: e.refs[0]?.source ?? '' }));
}

/** 契約 toPublic：只留 version／title／essence／risk（＋有證據才給的 strength／weakness）。plain 為相容欄，本卡不給。 */
export function toPublic(card: AsuraNatureCardServer): AsuraNatureCardPublic {
  const pub: AsuraNatureCardPublic = { version: card.version, title: card.title, essence: card.essence, risk: card.risk };
  if (card.strength) pub.strength = card.strength;
  if (card.weakness) pub.weakness = card.weakness;
  return pub;
}

/**
 * 四張卡串連（後端專用，不送瀏覽器）：本性卡置頂，接 過去／現在／未來；以 natureKey／riskKeys 串連。
 * 三卡內容不動，這裡只產出串連紀錄，供日後三卡依 natureKey／riskKeys 取用。
 */
export const ASURA_STORY_ORDER = ['nature', 'hits', 'pillars', 'verdict'] as const;
export interface AsuraStoryLink {
  natureKey: string;
  riskKeys: string[];
  cards: Array<{ key: (typeof ASURA_STORY_ORDER)[number]; heading: string; layer: typeof ASURA_TRANSLATION_LAYER }>;
}
export function linkFourCards(card: AsuraNatureCardServer | null, display: Pick<AsuraDisplay, 'sections'>): AsuraStoryLink | null {
  if (!card) return null;
  const heading = (key: string) => display.sections.find((s) => s.key === key)?.heading ?? '';
  return {
    natureKey: card.natureKey,
    riskKeys: [...card.riskKeys],
    cards: ASURA_STORY_ORDER.map((key) => ({ key, heading: key === 'nature' ? card.title : heading(key), layer: ASURA_TRANSLATION_LAYER })),
  };
}

/**
 * 三卡接本性（13:06／13:10）：同一翻譯層、同一份本性卡證據，給 過去／現在／未來 各加一句「故事線」（新增選填欄 story，只增不改）。
 * 過去＝natureKey 那句本性；現在＝第一句優勢（無則第二句本性）；未來＝riskKeys 第一句風險。只取意象表既有句子，不新增意思。
 * 三卡原有欄位、項目、篩選、排序一律不動。本性卡為 null＝不加。
 */
export const ASURA_STORY_LEAD = {
  hits: '我先說你的底。',
  pillars: '眼下你憑的是這個。',
  verdict: '往後你要防的是這個。',
} as const;

export function asuraStoryFor(card: AsuraNatureCardServer | null): Partial<Record<keyof typeof ASURA_STORY_LEAD, string>> {
  if (!card) return {};
  // 13:39：使用者定稿組合 → 三卡故事句接同一份定稿（過去＝本性、現在＝優勢、未來＝風險）
  const userCopy = card.userCopyId ? ASURA_USER_COMBO_COPY.find((c) => c.id === card.userCopyId) : undefined;
  if (userCopy) return { hits: ASURA_STORY_LEAD.hits + userCopy.essence, pillars: ASURA_STORY_LEAD.pillars + userCopy.strength, verdict: ASURA_STORY_LEAD.verdict + userCopy.risk };
  const text = (key: string | undefined) => (key ? asuraImageOf(key)?.text ?? null : null);
  // 13:18：故事線只取命宮主軸句（輔助句不進三卡）
  const main = card.evidence.filter((e) => e.axis !== 'auxiliary' && e.listedOnly !== true && e.material !== true);
  const ess = main.filter((e) => e.kind === 'essence').map((e) => e.traitKey);
  const str = main.filter((e) => e.kind === 'strength').map((e) => e.traitKey);
  const lead = ess.find((k) => card.natureKey === k || card.natureKey.startsWith(`${k}.`));
  const out: Partial<Record<keyof typeof ASURA_STORY_LEAD, string>> = {};
  const past = text(lead);
  const now = text(str[0]) ?? text(ess[1]);
  const future = card.riskKeys.length === 0 ? null : ASURA_UNIVERSAL_RISK.enabled ? ASURA_UNIVERSAL_RISK.text : text(card.riskKeys[0]);
  if (past) out.hits = ASURA_STORY_LEAD.hits + past;
  if (now) out.pillars = ASURA_STORY_LEAD.pillars + now;
  if (future) out.verdict = ASURA_STORY_LEAD.verdict + future;
  return out;
}

/** 把故事線掛到三卡（只加 story 欄；其餘欄位原封不動） */
export function asuraLinkStory(display: AsuraDisplay, card: AsuraNatureCardServer | null): AsuraDisplay {
  const story = asuraStoryFor(card);
  if (Object.keys(story).length === 0) return display;
  // 14:41：過去段草稿接在「過去」故事線之後（依覺醒印記出句；見 ASURA_PAST_DRAFT）
  const pastDraft = asuraPastDraftFor(display).text;
  if (story.hits && pastDraft) story.hits = story.hits + pastDraft;
  return {
    ...display,
    sections: display.sections.map((section) => {
      const line = story[section.key as keyof typeof ASURA_STORY_LEAD];
      return line ? { ...section, story: line } : section;
    }),
  };
}

/**
 * 過去段草稿上卡（使用者 2026-10-09 14:41 授權；只在本機）。
 * 每句都走詞典四步（技能文件〈四之二〉）：詞＋檔案:行 → 教育部《重編國語辭典修訂本》釋義＋網址 → 推論（INFERENCE）→ 阿修羅意象。
 * 規則（14:42）：詞典優先；查無或推不出意象才退回封神框架（只限盤上主星）。本段六句都查得到詞典，fallback 一律 false。
 * 出句條件：對應的本命印記在四柱清單中是「覺醒」（tone='awakened'，即已過嚴格驗證）才出；不在就不出，不補字。
 * 只接在「過去」故事線（hits）之後；本性卡為 null 時整段不加（與故事線同規則）。證據只留後端，不送瀏覽器。
 */
export interface AsuraPastDraftEvidence {
  word: string;
  wordSource: string;
  moeDefinition: string;
  moeUrl: string;
  inference: string;
  image: string;
  fallback: false;
}
export interface AsuraPastDraftLine {
  id: string;
  text: string;
  /** 需在場的本命印記（顯示名） */
  seal: string;
  source: string;
  dictionary: AsuraPastDraftEvidence[];
}
export const ASURA_PAST_DRAFT: ReadonlyArray<AsuraPastDraftLine> = [
  {
    id: 'PAST.BLADE_UNSHEATHED', text: '以前的你，刀沒入過鞘。', seal: '血刃之鋒', source: 'lib/ghost-asura-wordings-core.ts:143「刀鋒已經出鞘。」',
    dictionary: [
      { word: '刀鋒', wordSource: 'lib/ghost-asura-wordings-core.ts:143', moeDefinition: '刀刃。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=42605&la=0&powerMode=0', inference: 'INFERENCE：刀刃已出鞘＝刀在手、可用', image: '刀', fallback: false },
      { word: '鞘', wordSource: 'lib/ghost-asura-wordings-core.ts:143', moeDefinition: '刀套。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=6404&la=0&powerMode=0', inference: 'INFERENCE：刀不入刀套＝一直在手', image: '刀沒入過鞘', fallback: false },
    ],
  },
  {
    id: 'PAST.AHEAD_OF_WIND', text: '別人還在看風向，你已經站上去了。', seal: '血刃之鋒', source: 'lib/ghost-asura-wordings-core.ts:144「不是等著被激怒，而是隨時準備好一刀決出。」',
    dictionary: [
      { word: '風向', wordSource: '技能文件 6.2（草稿句）', moeDefinition: '指情勢或形勢的變化。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=37157&la=0&powerMode=0', inference: 'INFERENCE：原文「不是等著」＝不等情勢變化；看風向＝等情勢變化', image: '別人還在看風向，你已經站上去了', fallback: false },
    ],
  },
  {
    id: 'PAST.NOT_TRAPPED', text: '哪一處都困不住你。', seal: '逐界行者', source: 'lib/ghost-asura-wordings-core.ts:129「不穩定的人，往往是最難被困住的人。」',
    dictionary: [
      { word: '困住', wordSource: 'lib/ghost-asura-wordings-core.ts:129', moeDefinition: '陷在艱難的環境中，無法解脫。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=78528&la=0&powerMode=0', inference: 'INFERENCE：最難被困住＝不會陷在一處無法解脫', image: '哪一處都困不住你', fallback: false },
    ],
  },
  {
    id: 'PAST.STOPS_ARE_POSITIONS', text: '停下的地方，都是你的陣地。', seal: '逐界行者', source: 'lib/ghost-asura-wordings-core.ts:129「每一個停靠點都是一個陣地。」',
    dictionary: [
      { word: '陣地', wordSource: 'lib/ghost-asura-wordings-core.ts:129', moeDefinition: '軍隊作戰時據守的地區。通常築有工事，可攻可守。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=116815&la=0&powerMode=0', inference: 'INFERENCE：停靠點＝陣地＝據守、可攻可守之地', image: '停下的地方，都是你的陣地', fallback: false },
    ],
  },
  {
    id: 'PAST.SEE_AND_AVOID', text: '路上的暗障，你先看見，先避開。', seal: '幽辰之障', source: 'lib/ghost-asura-wordings-core.ts:92「元辰在暗處，障礙是隱性的。」；:95「先看見，才能先避開。」',
    dictionary: [
      { word: '障礙', wordSource: 'lib/ghost-asura-wordings-core.ts:92', moeDefinition: '阻礙通行的東西。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=117224&la=0&powerMode=0', inference: 'INFERENCE：原文「在暗處」＋阻礙通行的東西＝路上看不見的阻礙', image: '路上的暗障', fallback: false },
      { word: '避開', wordSource: 'lib/ghost-asura-wordings-core.ts:95', moeDefinition: '躲避、離開。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=18145&la=0&powerMode=0', inference: 'INFERENCE：先看見才能先躲避', image: '你先看見，先避開', fallback: false },
    ],
  },
  {
    id: 'PAST.BURST', text: '撐過來的，靠的是那一股爆發。', seal: '血刃之鋒', source: 'lib/ghost-asura-wordings-core.ts:144「爆發力就在邊界。」',
    dictionary: [
      { word: '爆發力', wordSource: 'lib/ghost-asura-wordings-core.ts:144', moeDefinition: '瞬間突然產生的猛烈力量。', moeUrl: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=16360&la=0&powerMode=0', inference: 'INFERENCE：瞬間的猛烈力量＝關鍵時那一股勁', image: '那一股爆發', fallback: false },
    ],
  },
];

/** 依四柱清單「覺醒」印記挑出過去段草稿句（照 ASURA_PAST_DRAFT 順序，不改字） */
export function asuraPastDraftFor(display: Pick<AsuraDisplay, 'columns'>): { text: string; lines: AsuraPastDraftLine[] } {
  const awake = new Set((display.columns ?? []).flatMap((c) => c.seals ?? []).filter((s) => s.tone === 'awakened').map((s) => s.name));
  const lines = ASURA_PAST_DRAFT.filter((l) => awake.has(l.seal));
  return { text: lines.map((l) => l.text).join(''), lines };
}
