/**
 * 鬼魅阿修羅｜本性卡 固定規格（工程師專用）FINAL  — 2026-10-09 定版（取代 v1–v6）
 * 建議位置：lib/ghost-asura-nature-contract.ts ＋ docs\技能戰鬥檔案\鬼魅阿修羅\本性卡規格.md
 *
 * ── 定版規則（LOCKED，九條）──────────────────────────────────────────────
 * 1. 後端算清本性：紫微斗數在後端用命宮、主星、小星、煞星、強弱，把這個人的本性算清楚。
 * 2. 前台零術語：上述名稱一個都不能出現在前台（含 aria／title／隱藏文字）；
 *    傳到瀏覽器的資料（API JSON）也要拿乾淨，含術語的欄位只存後端。
 * 3. 前台只有阿修羅的世界觀：從頭到尾用阿修羅自創的意境和口氣把本性說出來；
 *    每個 traitKey 固定對應一個意象（同 trait 永遠同意象），只換說法、不加原意沒有的內容。
 * 4. 四張卡一套話術：本性卡置頂，加 過去／現在／未來，貫穿同一套阿修羅話術，講同一個人的故事；
 *    四張卡共用單一翻譯層，以 natureKey／riskKeys 串連。原三卡的版面、篩選、資料不動。
 * 5. 人格解析中間層＝主證據：四道關結果先進獨立的人格解析層，產出 PersonaEvidence；
 *    阿修羅只做翻譯、不做分析（翻譯層不得 import 任何命理引擎、不得自行推論或增減內容）。
 * 6. 四道關依序：八字 → 紫微斗數 → 易經 → 命宮（命宮資料只取自既有命宮檔案）；
 *    沿用既有閘門，不新增不修改；四關全 PASS 才翻譯，任一關未過 → null，本性卡留空、無填充字。
 * 7. 舊資料相容：舊欄位、舊 API 結構、已存資料不能失效（只增不刪）；
 *    舊「白話」欄保留欄位名，升級為阿修羅翻譯層產出。
 * 8. 測試門檻：完整自動測試全過才可交 code review；無關的既有舊錯誤保留不修，
 *    附「改動前即存在」證明照列，交使用者決定。
 * 9. 只改本機，不上傳（不 commit／push／deploy）。
 *
 * 其他命理核心（引擎、閘門、登錄、神煞計算）一律不動。文案只從固定對照表取，無隨機、
 * 不依時間變字、排序固定；同一組生辰連跑 N 次一字不差。卡片只講兩件事：本性、風險；
 * 口吻直白說人話，不含糊、不嚇人。
 */

export const NATURE_CARD_VERSION = 'nature-final' as const;

/** 四段（12:59 追加，只增不刪）：本性 essence／優勢 strength／弱點 weakness／風險 risk */
export type NatureSectionKind = 'essence' | 'strength' | 'weakness' | 'risk';

/** 送到瀏覽器的本性卡（零術語） */
export interface AsuraNatureCardPublic {
  version: typeof NATURE_CARD_VERSION;
  title: string;          // 固定「本性」
  essence: string;        // 這個人是什麼樣的人（阿修羅意境）
  risk: string;           // 這種本性讓他容易發生什麼事（阿修羅意境）
  plain?: string;         // 相容欄：舊「白話」，由阿修羅翻譯層產出
  strength?: string;      // 12:59 追加（只增不刪）：優勢；無可追溯證據＝不給
  weakness?: string;      // 12:59 追加（只增不刪）：弱點；無可追溯證據＝不給
}

/** 後端完整物件（含串連代號與出處，不得送往瀏覽器） */
export interface AsuraNatureCardServer extends AsuraNatureCardPublic {
  natureKey: string;      // 例 'NATURE.DECIDER.STRONG'（代號本身不得含術語，供三卡串連）
  riskKeys: string[];
  evidence: PersonaEvidence[];
  userCopyId?: string;    // 13:39 追加（後端專用）：套用了使用者定稿組合文案時，記下文案代號
}

/** 人格解析中間層輸出（後端專用；本性卡主證據，可含術語於 refs） */
export interface PersonaEvidence {
  traitKey: string;       // 穩定代號，例 'TRAIT.DECISION_MAKER'
  kind: NatureSectionKind; // 12:59 追加：四段 本性／優勢／弱點／風險（原 'essence' | 'risk' 仍有效）
  strength?: 'strong' | 'neutral' | 'weak';
  refs: SourceRef[];      // 必填，追溯到四道關的既有檔案
  axis: NatureAxis;       // 13:18 追加：命宮主軸 lifePalace／輔助 auxiliary（八字、易經）；只存後端
  listedOnly?: true;      // 13:29 追加：專案內查無紫微原意的星，照列「列出、不解讀」；不產文字、不進前台
  material?: true;        // 14:23 追加（使用者決定 2026-10-09 14:23）：可供話術的素材（有出處），翻譯層可取用；不自動成句、不改卡面定稿、不進前台
}

/** 13:18 追加：判讀主軸標記。命宮（含空宮規則、遷移宮（對宮）借星、命宮小星）＝lifePalace；八字／易經＝auxiliary，只能殿後補充。 */
export type NatureAxis = 'lifePalace' | 'auxiliary';

export interface SourceRef {
  layer: 'bazi' | 'ziwei' | 'yijing' | 'lifePalace';
  item: string;           // 例 '七殺'（僅後端）
  source: string;         // 檔案路徑或「使用者提供 2026-10-09」
}

export type GateStatus = 'PASS' | 'FAIL' | 'MISSING';
/** 順序固定；四關全 PASS 才產卡 */
export interface NatureGates { bazi: GateStatus; ziwei: GateStatus; yijing: GateStatus; lifePalace: GateStatus; }

/** 阿修羅意象對照表條目（文案唯一來源） */
export interface AsuraImageEntry {
  traitKey: string;       // 永不改名
  kind: NatureSectionKind;
  sortKey: number;
  text: string;           // 阿修羅自創意境定稿，零術語
}

/** 使用者提供的主星意義（後端解析用，來源：使用者 2026-10-09） */
export const USER_PROVIDED_STAR_MEANINGS = {
  七殺: { strong: '老闆命、決策者' },
  巨門: { base: '口舌之爭', weak: '未經確認就快速講話' },
  破軍: { base: '喜歡破壞', weak: '只會破壞無法建設，建設時困難重重' },
} as const;

export declare function analyzePersona(gates: NatureGates, materials: unknown): PersonaEvidence[] | null;
export declare function translateAsNature(evidence: PersonaEvidence[]): AsuraNatureCardServer;
export declare function toPublic(card: AsuraNatureCardServer): AsuraNatureCardPublic;

/**
 * 驗收（全部自動測試，全過才交 code review）
 * [ ] 決定性：1968-09-02 00:30 女、1968-09-01 23:30 女、1974 男，連跑 10 次輸出一字不差
 * [ ] 欄位契約：Public 欄位＝version,title,essence,risk(,plain)；Server 多 natureKey,riskKeys,evidence
 * [ ] 四道關依序執行；任一 FAIL/MISSING → 無本性卡、無填充字
 * [ ] 命宮內容可追溯到既有命宮檔案
 * [ ] 翻譯層不 import 命理引擎；每句對應一筆 PersonaEvidence
 * [ ] 禁用詞：頁面 HTML（含屬性）與 API JSON 無任何紫微名稱、星名、宮位、命盤術語
 * [ ] 四張卡文字皆經同一翻譯層；本性卡位於三卡上方，390×844 正常
 * [ ] 舊資料回歸：改動前快照的舊欄位全部存在且可讀；三卡顯示項目與篩選不變；措辭變動逐條列出
 * [ ] 完整測試＋tsc：新失敗為 0；既有舊錯誤附改動前證明照列
 */

/**
 * ── 使用者驗收清單（2026-10-09，回報時逐條對照，每條附證據：PASS／FAIL）──
 * A1 九條規格是否全部做完（逐條列出對應檔案／測試）
 * A2 本性卡是否以命宮人格為核心（PersonaEvidence 主要來自命宮層，列出 traitKey 與出處）
 * A3 前端是否漏術語（頁面 HTML 含屬性＋傳到瀏覽器的 API JSON，紫微任何名稱皆為 0 命中）
 * A4 阿修羅口氣是否統一（四張卡皆經同一翻譯層；附四卡實際文字）
 * A5 四張卡是否講同一個人的故事（natureKey／riskKeys 串連證據＋實際文字）
 * A6 舊資料是否完全相容（舊快照回歸：舊欄位全在、可讀；三卡顯示項目不變）
 * A7 完整測試是否新增失敗（改動前後失敗數比對；新增失敗必須為 0；舊錯誤照列）
 */

/**
 * ── 2026-10-09 12:59 追加（卡片外觀與內容）──
 * - 卡片沿用現有「本人＋姓名」區塊的位置與結構，放在過去／現在／未來上方。
 * - 收起時：第一行顯示本人姓名（例：曾威彦），下一行提示文字「看見你的本性」。
 * - 點開展開四段：本性、優勢、弱點、風險（皆阿修羅口吻、零術語）。
 * - AsuraNatureCardPublic 新增（只增不刪）：strength?: string; weakness?: string;
 *   沒有可追溯證據的段落留空，不硬寫。
 */

/**
 * ── 2026-10-09 13:02 追加 ──
 * 1) 沒填名字 → 本性卡不顯示（回到舊徽章行為）。
 * 2) 命宮空宮（無主星）替代規則（第四道命宮關的替代處理，不改既有命宮判定程式）：
 *    - 空宮本義＝「什麼都可以、什麼都能做」，作為本性底色。
 *    - 以命宮內小星（小行星）代表，並看小星強弱。
 *    - 再看對星（遷移宮（對宮）的主星，空宮借遷移宮（對宮））。
 *    - 小星、強弱、對星資料一律取自專案現有檔案並記 SourceRef；查無即該段留空，不自編。
 *    - 前台仍零術語，只以阿修羅意象翻譯。
 */
/** 13:03 補充：空宮卡片不得整張空白——順序固定：①空宮底色（本性至少有此句）②本宮全部小星＋強弱 ③遷移宮（對宮）主星借用；查無者留空不編。「沒填名字不顯示」已鎖定。 */

/** 13:06 補充：過去／現在／未來三卡與本性卡共用同一技能檔系統，來源依序：八字 → 紫微命宮（空宮則取遷移宮（對宮）主星判個性）→ 易經（只加話術）→ 阿修羅口氣（必有）。全部取自專案既有檔案，直接調出整合，不自編；三卡原有篩選／版面／資料不變，只換話術層。 */

/** 13:08 鎖定七條：①有名字才顯示，沒名字不顯示（不得因命宮邏輯誤藏）②主架構以命宮為主，有主星直接用星 ③空宮：底色「什麼都可以、什麼都能做」＋遷移宮（對宮）主星為主＋參考命宮小星強弱 ④本性／優勢／弱點／風險四段都要有內容，用阿修羅話術填滿（內容須出自專案既有技能檔；真的查無來源時回報，不自編）⑤易經只補話術 ⑥前台零星名／術語，星象只在後台 ⑦各星用各自技能檔。 */

/** 13:18 主架構寫死（最高優先）：所有本性判讀一律從紫微命宮出發。
 *  - 命宮有主星 → 直接用該主星。
 *  - 命宮空宮 → 空宮規則：底色「什麼都可以、什麼都能做」＋遷移宮（對宮）主星為主＋參考命宮小星強弱。
 *  - 八字、易經只是輔助補充，不能取代命宮當主軸；四道關的檢查順序不等於判讀主軸。
 *  - 每一句都要在 evidence 標明是「命宮主軸」或「輔助（八字／易經）」。
 */

/** 13:23 命宮準確度鎖（使用者，經指派轉述；規格檔無此段原文）：命宮錯會骨牌效應。固定盤的引擎命宮須以回歸測試釘死（1968-09-02 00:30 女＝申、空宮；1968-09-01 23:30 女＝申、空宮；1974-06-28 18:00 男＝酉、武曲＋七殺；1974-06-28 16:00 男＝戌、七殺），並斷言本性層只讀引擎命宮、不重算。 */

/** 13:24 地基硬規則（骨牌效應）：命宮有幾顆主星就全部納入，不得只取一顆代表；命宮小星、煞星、強弱、主星全部納入，只能多不能少。每顆星的意思須出自專案既有檔案；查無出處的星要在回報中列出，不自編。須有測試斷言：evidence 涵蓋引擎命宮輸出的每一顆星（含小星、煞星）。 */
