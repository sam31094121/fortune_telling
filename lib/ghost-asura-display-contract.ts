/**
 * 鬼魅阿修羅 — 前端顯示契約（由後端 POST /api/ghost-asura/reading 產出）
 *
 * 只放「可直接顯示的文字」型別：已在後端分組、篩選、排序完成。
 * 不含四柱干支、天干地支、命中旗標或任何可供前端運算的原始資料。
 * 本檔只有型別；前端一律以 `import type` 引用，不會打包任何命理邏輯。
 */

import type { AsuraNatureCardPublic } from '@/lib/ghost-asura-nature-contract';

export const ASURA_DISPLAY_CONTRACT = 'ghost-asura-display/v1' as const;

/** 本性卡送往瀏覽器的部分（nature-final：AsuraNatureCardPublic，零術語）。natureKey／riskKeys／evidence 只存後端。 */
export type AsuraNatureView = AsuraNatureCardPublic;

/** 純樣式用的語氣標記（決定顏色），不是可運算的命理資料。 */
export type AsuraDisplayTone = 'awakened' | 'dormant' | 'pending';

export interface AsuraDisplayEntry {
  /** Optional stable navigation identity; never infer it from the visible label. */
  id?: string;
  label: string;
  text: string;
  /** 白話：一句日常中文（≤25 字、無術語），顯示在該項最後。 */
  plain?: string;
}

export interface AsuraDisplaySeal {
  /** 穩定識別（用於動畫／DOM 定位） */
  id: string;
  name: string;
  tone: AsuraDisplayTone;
  sealLabel: string;
  declaration: string | null;
  meaning: string | null;
  clash: string | null;
}

/** 四柱清單以外的印記（沉眠／待校核）：統計有算、清單就要列，讓上下數字一致。 */
export interface AsuraDisplayRestGroup {
  key: 'dormant' | 'pending';
  /** 例：沉眠印記（49項） */
  heading: string;
  /** 該群每一項共同的柱位說明，例：本次無落印柱位 */
  note: string;
  seals: AsuraDisplaySeal[];
}

/** 這一段人生（阿修羅口氣，後端組好的字串，前端只照印；見 lib/ghost-asura-life-stages.ts）。 */
export interface AsuraDisplayLifeStage {
  ageText: string;
  /** 過去／現在／未來；沒有可驗證的出生日期時為空字串。 */
  tenseLabel: string;
  /** 阿修羅對這一段的一句話，常駐顯示；沒有出生日期時為空字串。 */
  headline: string;
  /** 指向底下印記卡的一句話（這張卡只講這一段人生，細項在印記卡）；沒有數據時為空字串。 */
  pointer: string;
  /** 收合區：古籍對應與背景。 */
  lines: string[];
  /** 收合區最後一句。 */
  note: string;
}

export interface AsuraDisplayColumn {
  key: 'year' | 'month' | 'day' | 'hour';
  heading: string;
  lead: string;
  countText: string;
  seals: AsuraDisplaySeal[];
  life?: AsuraDisplayLifeStage;
}

export interface AsuraDisplayStat {
  value: string;
  label: string;
  tone?: AsuraDisplayTone;
  /** 一句白話：這個數字數的是什麼（單位「種」） */
  caption?: string;
  /** 點這個數字要跳去哪份清單；沒有清單可看就不給 */
  target?: 'pillars' | 'dormant' | 'pending';
}

export interface AsuraDisplaySupplement {
  key: 'dual' | 'chain';
  heading: string;
  entries: Array<{ id: string; title: string; members: string; text: string }>;
}

export interface AsuraNarrativeBlock {
  text: string;
  plain: { label: string; plain: string }[];
}

export interface AsuraDisplaySection {
  /** Server-selected navigation only; absent means no suggested navigation. */
  guidance?: {
    stage?: { key: AsuraDisplayColumn['key']; ageText: string; seals: Array<{ id: string; name: string }> };
    related: Array<{ columnKey: AsuraDisplayColumn['key']; ageText: string; id: string; name: string }>;
  };
  key: 'hits' | 'pillars' | 'verdict';
  /** 段落主標：過去／現在／未來 */
  heading: string;
  /** 功能小標：命中神煞／柱位與封印／阿修羅判語 */
  label: string;
  lead: string;
  items: AsuraDisplayEntry[];
  /** 「過去」卡：一段連續的阿修羅讀盤（段落以換行分隔）；有值時前端先印這段，再印 items 的白話區 */
  narrative?: string | null;
  /**
   * 三張時間軸卡：narrative 依段落拆開，每段後緊接該段印記的白話（同柱兩印＝兩行）。
   * 有值時前端逐段照印，不再於文末另放白話區；開場在最前、coda 在最後。
   */
  blocks?: AsuraNarrativeBlock[] | null;
  /** 「過去」卡收尾：「你以前就是這樣的人。……」（白話區之後，金色、略大） */
  coda?: string | null;
  /** 新增（2026-10-09，只增不改）：依本性卡 natureKey／riskKeys 由阿修羅翻譯層加的一句故事線；舊資料無此欄＝不畫。 */
  story?: string | null;
}

/** 稽核用（不顯示）：三格輸出挑選的誠實計數。 */
export interface AsuraDisplayAudit {
  /** 上方統計與下方清單的逐項核對（前端不顯示；不一致時後端會讓 alert 出聲） */
  listing: {
    total: number;
    awakened: number;
    dormant: number;
    pending: number;
    columnRows: number;
    listedDistinct: number;
    ok: boolean;
  };
  pipelineTotal: number;
  emitted: number;
  droppedDormant: number;
  droppedDormantNames: string[];
  droppedPendingNames: string[];
  droppedNoPillarNames: string[];
  /** 通過三重條件、但沒有判語文案而未進「未來」格的印記 */
  verdictNoCopyNames: string[];
  /** 時間軸（過去／現在／未來）各卡的觸發來源與篩選結果（前端不顯示） */
  timeAxis: {
    todayTaipei: string;
    flowYear: number;
    flowGanZhi: string;
    ageShi: number;
    ageXu: number;
    cards: Array<{ when: 'past' | 'present' | 'future'; luck: string[]; flowYears: [number, number] | null; triggered: string[]; shown: string[]; dropped: string[] }>;
  } | null;
  /** 顯示中、且柱位落在時柱的印記（後界） */
  hourPillarNames: string[];
  /** 時辰為預設子時（hourAssumed）時，顯示中依賴時柱的印記；目前不隱藏，留給業主決定 */
  hourDependentNames: string[];
  /** 顯示中但尚無時間軸（過去／現在／未來）三句的印記：照原文案顯示 */
  timelineMissingNames: string[];
  /** 顯示中但尚無白話的印記 */
  plainMissingNames: string[];
  droppedPending: number;
  droppedNoPillar: number;
  droppedNotCrossVerified: number;
  droppedNotCrossVerifiedNames: string[];
  droppedPlaceholder: number;
  droppedPlaceholderNames: string[];
  leadHidden: boolean;
  voiceRewritten: number;
}

export interface AsuraDisplay {
  /** 客人不知道時辰時，後端以子時（早子 00:00）排；此旗標誠實標示 */
  hourAssumed: boolean;
  assumedHour: '子時' | null;
  /** hourAssumed 時前端照印的一句：「時辰未知，以子時排。」 */
  hourNote: string | null;
  contract: typeof ASURA_DISPLAY_CONTRACT;
  title: string;
  subtitle: string;
  /** 阿修羅短句（後端固定文案） */
  lines: string[];
  /** 秘卷不完整時的提示；完整時為 null */
  alert: string | null;
  scrollHint: string;
  columns: AsuraDisplayColumn[];
  /** 四柱清單以外的沉眠／待校核印記（統計有算的，這裡全部列出） */
  rest: AsuraDisplayRestGroup[];
  stats: AsuraDisplayStat[];
  statsHint: string;
  /** 統計怎麼算的逐行白話（同一份數字，前端逐行照印） */
  statsLines: string[];
  supplements: AsuraDisplaySupplement[];
  battleField: { heading: string; rows: AsuraDisplayEntry[] };
  /** 三格只含「命中＋有真實文案」的印記（後端已挑選）。時間軸：過去＝此印對你過去的說法／現在＝此刻帶來什麼／未來＝接下來；小標新舊並陳：過去（命中神煞）／現在（柱位與封印）／未來（阿修羅判語）（GhostAsuraCard 卡頭下方的原生段落） */
  sections: AsuraDisplaySection[];
  /** 需要點亮動畫的印記 id（後端已篩好） */
  glowIds: string[];
  /** 稽核計數（前端不顯示） */
  audit: AsuraDisplayAudit;
  scopeNote: string;
  /** 受測者姓名（功能臺輸入，有填寫時直呼其名） */
  targetName?: string | null;
  /** 分析對象：self (我自己) | guest (親朋好友) */
  identityTarget?: 'self' | 'guest' | null;
  /** 性別表達個人化增強層（可選） */
  personalizedEnhancements?: Record<string, any>;
  /**
   * 本性卡（新增欄位；舊資料沒有此欄＝不畫）。四道關（八字→紫微→易經→命宮）全過才有值，否則 null。
   * 規格：lib/ghost-asura-nature-contract.ts；前端只印名牌＋四段（本性／優勢／弱點／風險）。
   */
  nature?: AsuraNatureView | null;
  /**
   * 話術含金量一句（新增欄位，只增不改；舊資料沒有此欄＝不畫）。
   * 後端依客戶資料從句庫挑出一句（lib/ghost-asura-gold-wording.ts）；查無資料時 text 為明確中文狀態。前端只照印。
   */
  goldWording?: AsuraGoldWordingView | null;
  /** 鬼魅阿修羅 18 歲禁忌守門（同時檢查今日實歲與查詢日期實歲；未達標時回傳 WITHHELD 與後端中性提示） */
  ageGate?: AsuraAgeGate;
  /**
   * 千人千面戰神令｜四段時間線意境（新增欄位，只增不改；舊資料無此欄＝不畫）。
   * 後端固定文案，經禁用詞檢查；前端只照印。不含紫微／命理術語，亦不帶實際盤值。
   */
  timelineDecree?: AsuraTimelineDecree | null;
  /**
   * 十二陣・四十八道戰痕｜年齡時間軸（新增欄位，只增不改；舊資料無此欄＝不畫；未滿 18 歲＝null）。
   * 後端讀本人紫微盤（calculateDualChart 的同一份 iztro periods）每段四值，查 576 組合表組句，依年齡由過去到未來排列；
   * 經禁用詞檢查。前端只照印，不運算、不自生內容。不含任何命理名稱、陣名或神名；意涵分級 sourceLevel 只留後端。
   */
  ageTimeline?: AsuraAgeTimeline | null;
  /**
   * 戰神令四卡 → 年齡段定位（新增欄位；長度 4，依卡序）。由 ageTimeline 推得；ageTimeline 為 null 或無「現在」段＝null。
   * 不改戰神令文字。
   */
  decreeAnchors?: AsuraDecreeAnchor[] | null;
  /**
   * 置頂摘要（新增欄位，只增不改；舊資料無此欄＝不畫）：例「你今年虛歲 53（實歲 52），這段今年收尾」；大限與剩餘年皆以虛歲計，實歲僅對照。
   * 有姓名時前綴「{姓名}，」。無實歲＝null。前端只照印。
   */
  pinnedSummary?: string | null;
  /**
   * 客人本人（新增欄位）：後端由表單資料算出，前端只照印、不自算。
   * name＝表單 name 清洗後（trim、去控制字元與符號、上限 12 字；含任何禁詞＝null）；表單未填＝null，前端改稱「你」，不得自編姓名。
   * age＝今日（台北）實歲（與 ageGate 同一套足歲算法）；生日缺漏＝null。
   */
  viewer?: AsuraViewer | null;
}

/** 客人本人資料（display.viewer）。 */
export interface AsuraViewer {
  /** 清洗後姓名；無＝null */
  name: string | null;
  /** 今日（台北）實歲；無法計算＝null */
  age: number | null;
}

export interface AsuraGoldWordingView {
  label: string;
  text: string;
  /** 「依據」一句（後端只用已核准的公信力句子與閘門狀態說法組成）；沒有就不畫。 */
  basis?: string | null;
}

/** 技能頁三張摺疊卡：生辰未送出前的一句（阿修羅口吻；無命盤資料，故放在共用合約）。 */
export const ASURA_AWAIT_BIRTH = '生辰未至，我不開卷。日期、時辰、性別，交來。';

export type AsuraAgeGateStatus = 'AVAILABLE' | 'WITHHELD';

export interface AsuraAgeGate {
  status: AsuraAgeGateStatus;
  minimumAge: 18;
  label: string;
  todayTaipei: string;
  targetDate: string;
  todayAge: number;
  targetAge: number;
  birthdayPassedToday: boolean;
  birthdayPassedOnTarget: boolean;
  message: string | null;
}

export interface AsuraTimelineDecreeLine {
  key: 'opening' | 'sandbox' | 'tactics' | 'closing';
  heading: string;
  body: string;
}

export interface AsuraTimelineDecree {
  title: string;
  lines: AsuraTimelineDecreeLine[];
}

/** 年齡段時態（依今日台北虛歲判定）。 */
export type AsuraAgeTimelineTense = '過去' | '現在' | '未來';

/** 年齡時間軸一段＝一個大限十年段（共 12 段，已依年齡由小到大排序；前端不需再排）。 */
export interface AsuraAgeTimelineSegment {
  /** 例：約 4–13 歲 */
  ageLabel: string;
  /** 依今日（台北）虛歲判定：段止歲 < 虛歲＝過去；段起歲 > 虛歲＝未來；其餘＝現在。 */
  tense: AsuraAgeTimelineTense;
  /** 當前年齡段（＝tense 為「現在」）；全軸最多一段為 true。前端據此高亮，不需自行計算。 */
  isCurrent: boolean;
  /**
   * 段落開場：text＝位置句（依時態＋白話領域＋客人年齡，後端代入）；headline＝「{起歲} 歲起，」＋本段標題，≤26 字。
   * headline 選法：本段含招牌語來源值＝該招牌語（見 premiumTitles）；否則權重最高值（同分取前層），該值有核准整句（權重標題）時用整句。
   */
  opening: AsuraAgeTimelineOpening;
  /** 固定四句，固定層序：氣（起落）→ 旗（旗號）→ 令（歲令）→ 勢（兵勢）。 */
  lines: string[];
  /** 洋蔥層：與 lines 一一對應（長度固定 4）。 */
  depth: AsuraAgeTimelineDepth[];
  /** 承接句：連到下一段（只由兩段意涵決定）；最後一段為 null，改用 AsuraAgeTimeline.guide.endLine。 */
  bridge: string | null;
}

/** 段落開場。 */
export interface AsuraAgeTimelineOpening {
  /**
   * 位置句（後端代入客人資料）：
   * 過去「你 34–43 歲走過這段，落在家門。」；現在「{姓名，}今年是這段最後一年，收尾要穩。」（不落領域詞）；
   * 未來「再過 1 年，你 54 歲進這段，落在身邊的人。」
   */
  text: string;
  /** 段落標題：「{起歲} 歲起，」＋我→你白話整句（不含白話領域），≤26 字。例「44 歲起，身體在喊停，我要你先停，再打下一仗」 */
  headline: string;
}

/** 一句（lines[j]）的洋蔥層，依序顯示：basis → history → action → close。 */
export interface AsuraAgeTimelineDepth {
  /** 名義層：傳統名義＋修羅場景（我→你）；hook 末句引向下一層（有 history 引向史事，否則引向 action）。 */
  basis: { text: string; hook: string };
  /** 史鑒層：真實史事（白話轉述、忠於原典）＋出處《書・篇》＋hook（末句引向 action）；查無貼切史事＝null，不編。 */
  history: { text: string; source: string; hook: string } | null;
  /** 行動層：1–2 個具體行動（修羅口吻，對「你」下令）。 */
  action: string[];
  /** 收束層：這一層洋蔥的修羅收尾句（必有，接在 action 之後顯示）。 */
  close: string;
}

/** 時間軸導覽文字（後端固定，前端照印）。 */
export interface AsuraAgeTimelineGuide {
  /** 現在段標籤（目前：「你現在在這段，往下看」）；固定字，不含個人資料，前端 fallback 逐字相同 */
  hereLabel: string;
  /** 往上一段的按鈕字（目前：「點這裡看上一段」） */
  toPast: string;
  /** 往下一段的按鈕字（目前：「點這裡看下一段」） */
  toFuture: string;
  /** 最後一段之後的收尾句（目前：「往後的路你都看完了。點最上面的亮點，回到你現在這段。」） */
  endLine: string;
}

/** 戰神令四卡對應的年齡段（只給定位，不改戰神令文字）。 */
export interface AsuraDecreeAnchor {
  /** ageTimeline.segments 的索引 */
  segmentIndex: number;
  /** 同 segments[segmentIndex].ageLabel */
  ageLabel: string;
  /** 同 segments[segmentIndex].tense */
  tense: AsuraAgeTimelineTense;
  /** segment＝對應整段；action＝對應該段洋蔥層的行動 */
  focus: 'segment' | 'action';
  /** 卡面標記一句（後端代入客人年齡）：例「你 34–43 歲・走過的路」「你今年 52 歲・就在這段」「你今年 52 歲・現在就做」「你 54 歲起・下一段」 */
  label: string;
  /** 大字年齡區間：例「34–43」（前端加「歲」字樣即可，不自算） */
  ageRange: string;
  /** 卡面狀態章：走過／現在／現在就做／下一段 */
  mark: '走過' | '現在' | '現在就做' | '下一段';
  /** focus=segment：同 segments[segmentIndex].opening.headline；focus=action：由該段洋蔥行動句組成的行動式標題（例「今天就做這一件：…」） */
  headline: string;
}

/** 精品標題：哪一段的 headline 由四句招牌語之一擔綱（供前端加強顯示）。只出現在真的含其來源值的段。 */
export interface AsuraAgePremiumTitle {
  /** ageTimeline.segments 的索引 */
  segmentIndex: number;
  /** 同 segments[segmentIndex].ageLabel */
  ageLabel: string;
  /** 招牌語整句（不含年齡前綴），四句之一，見 AGE_PREMIUM_TITLES */
  phrase: string;
  /** 與 segments[segmentIndex].opening.headline 相同 */
  headline: string;
}

/** 十二陣・四十八道戰痕（display.ageTimeline）：每段 4 句；段數＝截到「今年實歲＋10」所在段為止（1–12 段）。 */
export interface AsuraAgeTimeline {
  /** 「十二陣・四十八道戰痕」 */
  title: string;
  /** 導覽文字 */
  guide: AsuraAgeTimelineGuide;
  /**
   * 客人本人一句（後端代入）：例「你今年虛歲 53（實歲 52）。」；不重複大限 A–B（歲距／剩餘年見 pinnedSummary，皆虛歲制）。
   * 有姓名時前綴「{姓名}，」。
   */
  viewerLine: string;
  segments: AsuraAgeTimelineSegment[];
  /** 哪些段由招牌語擔綱 headline（依段序；只列真的含來源值的段，現行規則下每張盤 4 段）。 */
  premiumTitles: AsuraAgePremiumTitle[];
}
