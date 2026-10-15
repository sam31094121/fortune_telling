/**
 * 鬼魅阿修羅｜四張卡的人生階段（千歲壽、障月、障日、一剎那）
 * ============================================================================
 * 後端運算、前端只照印。這裡的每一句話都是後端組好的字串，前端不得自己組句。
 *
 * 這份資料能說什麼、不能說什麼（公信力定位，2026-10-15 上網查證）：
 *
 * 1. 古籍《淵海子平》（維基文庫，頁面標示「未完成」）〈詳解定真論〉〈看命入式〉把四柱分給親屬：
 *    年＝祖上、月＝父母、日＝自身（日支妻妾）、時＝子息。〈論月令〉只說年對應早年，
 *    三節都沒有出現具體歲數。
 * 2. 「約 1–16／17–32／33–48／49 歲以後」是後世通行的簡化分法，出自現代命理網站，
 *    不是古籍原文，各家分界略有不同。本檔如實標示，不得寫成古籍記載。
 * 3. 沒有任何同儕審查研究或大規模統計證明「某一柱會在某個歲數應驗某件事」。
 *    所以這裡只提供三樣東西：傳統對應的人事、發展心理學的人生階段背景、官方統計的真實數字。
 *    它們是背景，不是預測。
 *
 * 來源登記：docs/技能戰鬥檔案/八字/來源登記.json 的 C-ASURA-LIFE-STAGES（狀態由閘門算，不手填）。
 * 守門：npm run test:ghost-asura-life-stages。
 * ============================================================================
 */

export type LifePillarKey = 'year' | 'month' | 'day' | 'hour';

/** 一段人生：歲數是「約」；to 為 null 表示往後不設上限。 */
interface StageDef {
  from: number;
  to: number | null;
  ageText: string;
  roleText: string;
  contextLines: readonly string[];
}

export const LIFE_STAGE_BASIS_TEXT =
  '歲數是後世通行的簡化分法，不是《淵海子平》原文；古籍只把這一段分給特定的人事，沒有寫歲數，各家分界也略有不同。';

export const LIFE_STAGE_DISCLAIMER = '以上是傳統對應與統計背景，不是預測；你實際走到哪一步，要看時間軸與你自己的選擇。';

export const LIFE_STAGE_DEFS: Readonly<Record<LifePillarKey, StageDef>> = {
  year: {
    from: 1,
    to: 16,
    ageText: '約 1–16 歲',
    roleText: '傳統上這一段對應：祖上與早年（《淵海子平》以年為祖上）。',
    contextLines: [
      '發展心理學：這個時期的課題從信任、勤勉，走到後段開始形成自我認同（艾瑞克森）。',
    ],
  },
  month: {
    from: 17,
    to: 32,
    ageText: '約 17–32 歲',
    roleText: '傳統上這一段對應：父母與成長背景（《淵海子平》以月為父母）。',
    contextLines: [
      '發展心理學：約 18 到 29 歲被稱為「成年初顯期」，特徵是探索身分、生活不穩定、可能性很多（阿奈特）。',
      '官方統計：108 年生育第 1 胎的生母平均年齡為 31 歲（內政部統計處，內政統計通報 109 年第 20 週）。',
    ],
  },
  day: {
    from: 33,
    to: 48,
    ageText: '約 33–48 歲',
    roleText: '傳統上這一段對應：自己與配偶（《淵海子平》以日干為自身、日支為妻妾）。',
    contextLines: [
      '發展心理學：約 40 歲前後，課題從經營親密關係，轉向照顧下一代與傳承（艾瑞克森的親密對停滯期；列文森稱之為中年轉換期）。',
    ],
  },
  hour: {
    from: 49,
    to: null,
    ageText: '約 49 歲以後',
    roleText: '傳統上這一段對應：子息（《淵海子平》以時為子息）。',
    contextLines: [
      '發展心理學：約 40 到 65 歲的課題是生產與傳承，65 歲後轉向回顧與整合（艾瑞克森）。',
      '官方統計：114 年勞動部調查中，已規劃退休的勞工平均規劃 60.9 歲退休，但只有 14.6% 的勞工已有規劃（勞工生活及就業狀況調查）。',
    ],
  },
};

export type LifeTense = '過去' | '現在' | '未來';

/** 把時間換成台北時區的 年月日，避免伺服器時區造成差一天。 */
function taipeiYmd(now: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: pick('year'), m: pick('month'), d: pick('day') };
}

/** 週歲（滿幾歲）。生日在未來或格式錯誤回 null，不猜。 */
export function completedAge(birthDate: string, now: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [by, bm, bd] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const today = taipeiYmd(now);
  let age = today.y - by;
  if (today.m < bm || (today.m === bm && today.d < bd)) age -= 1;
  return age >= 0 ? age : null;
}

/** 這個歲數相對於某一段：還沒到＝未來、正在其中＝現在、已走過＝過去。 */
export function tenseOf(age: number, def: Pick<StageDef, 'from' | 'to'>): LifeTense {
  if (age < def.from) return '未來';
  if (def.to !== null && age > def.to) return '過去';
  return '現在';
}

/** 給前端照印的人生階段（全部是字串）。 */
export interface AsuraLifeStageView {
  ageText: string;
  /** 沒有可驗證的出生日期時為空字串，前端就不顯示這個標籤。 */
  tenseLabel: string;
  roleText: string;
  basisText: string;
  contextLines: string[];
  disclaimer: string;
}

export function buildLifeStageView(key: LifePillarKey, birthDate: string | undefined, now: Date): AsuraLifeStageView {
  const def = LIFE_STAGE_DEFS[key];
  const age = typeof birthDate === 'string' ? completedAge(birthDate, now) : null;
  return {
    ageText: def.ageText,
    tenseLabel: age === null ? '' : tenseOf(age, def),
    roleText: def.roleText,
    basisText: LIFE_STAGE_BASIS_TEXT,
    contextLines: [...def.contextLines],
    disclaimer: LIFE_STAGE_DISCLAIMER,
  };
}
