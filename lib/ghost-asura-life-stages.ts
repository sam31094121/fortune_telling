/**
 * 鬼魅阿修羅｜四張卡的人生階段（千歲壽、障月、障日、一剎那）
 * ============================================================================
 * 後端運算、前端只照印。這裡的每一句話都是後端組好的字串，前端不得自己組句。
 *
 * 口氣：阿修羅。不是數據播報。規範沿用鬼魅阿修羅技能檔案
 *   - 性格五要素與 lintAsuraVoice（lib/server/ghost-asura-voice.ts）：短句、只陳述、不發問、不求認同、
 *     不解釋原因、不含糊、不做具體預言、不威嚇、不邀功；每句 16 字內。
 *   - 脾氣系統：過去＝冷（翻舊帳）、現在＝最直（當面點醒）、未來＝先把話放在前面。
 *   - 「如果沒有證據，阿修羅閉嘴」：每一句背景都對得回下面的查證結果，數字不改、機關年度不省。
 * 每個欄位有多個小品說法，依「出生日期＋哪一段」決定性挑選：同一個人永遠同一套，
 * 不同的人讀到不同說法；同一個人的四張卡之間不重複同一句。
 *
 * 這份資料能說什麼、不能說什麼（公信力定位，2026-10-15 上網查證）：
 * 1. 古籍《淵海子平》（維基文庫，頁面標示「未完成」）〈詳解定真論〉〈看命入式〉把四柱分給親屬：
 *    年＝祖上、月＝父母、日＝自身（日支妻妾）、時＝子息。〈論月令〉只說年對應早年，
 *    三節都沒有出現具體歲數。
 * 2. 「約 1–16／17–32／33–48／49 歲以後」是後世通行的簡化分法，出自現代命理網站，
 *    不是古籍原文，各家分界略有不同。話術如實說「後人劃的線」，不得寫成古籍記載。
 * 3. 沒有任何同儕審查研究或大規模統計證明「某一柱會在某個歲數應驗某件事」。
 *    所以只提供：古籍對應的人事、發展心理學的人生階段、政府機關的真實統計。它們是背景，不是預測。
 *
 * 來源登記：docs/技能戰鬥檔案/八字/來源登記.json 的 C-ASURA-LIFE-STAGES（狀態由閘門算，不手填）。
 * 守門：npm run test:ghost-asura-life-stages。
 * ============================================================================
 */

export type LifePillarKey = 'year' | 'month' | 'day' | 'hour';
export type LifeTense = '過去' | '現在' | '未來';

/** 一段人生：歲數是「約」；to 為 null 表示往後不設上限。 */
interface StageDef {
  from: number;
  to: number | null;
  ageText: string;
}

export const LIFE_STAGE_DEFS: Readonly<Record<LifePillarKey, StageDef>> = {
  year: { from: 1, to: 16, ageText: '約 1–16 歲' },
  month: { from: 17, to: 32, ageText: '約 17–32 歲' },
  day: { from: 33, to: 48, ageText: '約 33–48 歲' },
  hour: { from: 49, to: null, ageText: '約 49 歲以後' },
};

/**
 * 小品話術庫。每一句都 ≤16 字、只陳述、不發問。事實句不得改數字。
 * headline：這一段此刻對你的位置（依過去／現在／未來，各 3 種）。
 * role：古籍把這一段分給誰。
 * facts：背景（心理學與政府統計），每筆都帶出處名稱。
 * age：歲數是後人劃的線（每段說法不同，避免四張卡重複同一句）。
 */
interface StageVoice {
  headline: Record<LifeTense, readonly string[]>;
  role: readonly string[];
  facts: readonly string[];
  age: string;
}

const VOICE: Readonly<Record<LifePillarKey, StageVoice>> = {
  year: {
    headline: {
      過去: [
        '這一役，你早就打完了。疤還在，勳章也在。',
        '千歲壽那段路，已在你身後。數傷口的時間，省下來。',
        '根早已扎下。那些年，如今只剩教訓。',
      ],
      現在: [
        '你正站在根上。每一步，都往下扎。',
        '這一役正在打。祖上留下的，你正在接手。',
        '千歲壽正當頭。此刻學到的，一輩子帶著。',
      ],
      未來: [
        '這一役還在前方。祖上先替你鋪了底。',
        '千歲壽尚未開打。底子，已有人墊好。',
        '根還沒扎。刀，先別急著拔。',
      ],
    },
    role: [
      '古書把這一段，記給祖上與早年。',
      '《淵海子平》說，年為祖上。你的根，從這裡算。',
      '祖上的底，早年的路。古書分給這一段。',
    ],
    facts: [
      '心理學這樣記。先學信任，再學勤勉。最後找到自己是誰。艾瑞克森的階段論。',
      '艾瑞克森的階段論，把這段分成三關。信任、勤勉、認同。一關一關過。',
    ],
    age: '歲數是後人劃的線，古書沒寫。',
  },
  month: {
    headline: {
      過去: [
        '這一段你已走完。得失，都算在你身上了。',
        '障月那場仗，早已落幕。留下的，是你的底子。',
        '最亂的那幾年，你過來了。這件事，不必再證明。',
      ],
      現在: [
        '你正在這一役。最亂，也最自由。',
        '障月正熱。身分在試，路在選。',
        '此刻刀最利，也最容易亂揮。出手之前，看準。',
      ],
      未來: [
        '這一役在前方。先把刀磨好。',
        '障月尚未到。現在練的，都是本錢。',
        '前方是最亂的一段。也是最自由的一段。',
      ],
    },
    role: [
      '古書記著，月為父母。成長的背景，算在這一段。',
      '《淵海子平》說，月為父母。你的來處，在這裡。',
      '父母給的底色，古書分給這一段。',
    ],
    facts: [
      '心理學管十八到二十九歲。叫成年初顯。身分在試，生活在晃。阿奈特的說法。',
      '政府的帳也在這。108 年，頭一胎的母親。平均 31 歲。內政部統計處的數字。',
    ],
    age: '十七到三十二，是後人的分法。',
  },
  day: {
    headline: {
      過去: [
        '障日那一役，你已走過。留下的，是你現在的樣子。',
        '這一段已經過去。能帶走的，你早帶走了。',
        '正中央的那些年，已是舊帳。翻過一遍，就夠了。',
      ],
      現在: [
        '你站在正中央。自己是誰，這裡定。',
        '障日正打。身邊的人，手上的事，都在這一役。',
        '此刻最重。扛得住，才算你的。',
      ],
      未來: [
        '障日還在前方。先認清自己。',
        '這一役未到。底子，現在就能練。',
        '前方是最重的一段。現在先把肩膀練硬。',
      ],
    },
    role: [
      '古書說，日是自身，也是妻妾。這一段，只問你自己。',
      '《淵海子平》記著。自身與妻妾，歸這一段。',
      '你是誰，身邊是誰。古書全記在這裡。',
    ],
    facts: [
      '四十歲前後，心理學說是轉折。從經營兩個人，轉向顧到下一代。艾瑞克森，列文森。',
      '心理學稱四十出頭為中年轉換。往回看，也往前看。列文森的分期。',
    ],
    age: '這條線是後人畫的，不是古書。',
  },
  hour: {
    headline: {
      過去: [
        '一剎那已經過去。你留下的，還在。',
        '最後一段，你已走完。路上的東西，都有去處。',
        '這一役落幕了。帶不走的，留給後面的人。',
      ],
      現在: [
        '一剎那就在此刻。後面的路，由你定。',
        '最後一段正在打。留下什麼，自己選。',
        '此刻這一役，最算數。',
      ],
      未來: [
        '一剎那在前方。現在布的局，那時用。',
        '最後一段尚未到。留下什麼，現在就能挑。',
        '前方這一役，最安靜。也最見功夫。',
      ],
    },
    role: [
      '《淵海子平》說，時為子息。你留下什麼，在這裡看。',
      '古書把這一段，記給子息與後來的人。',
      '子息，是古書給這一段的名字。',
    ],
    facts: [
      '心理學說，四十到六十五。是傳下去的時期。六十五以後，是回頭整合。艾瑞克森。',
      '政府的帳。114 年，勞動部問勞工。有規劃退休的，平均 60.9 歲。但 82% 還沒規劃。',
    ],
    age: '四十九歲這道線，也是後人畫的。這些是背景，不是預言。',
  },
};

/** 簡單、穩定的字串雜湊（可重現，不用亂數）。 */
function hashOf(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function choose<T>(list: readonly T[], seed: string): T {
  return list[hashOf(seed) % list.length];
}

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
  /** 過去／現在／未來；沒有可驗證的出生日期時為空字串，前端就不顯示這個標籤。 */
  tenseLabel: string;
  /** 阿修羅對這一段的一句話（常駐顯示）。沒有出生日期時為空字串。 */
  headline: string;
  /** 收合區：古籍對應、心理學與政府統計的背景，全是阿修羅口氣。 */
  lines: string[];
  /** 收合區最後一句：歲數是後人的線（每段說法不同）；時柱那段另加「不是預言」。 */
  note: string;
}

export function buildLifeStageView(key: LifePillarKey, birthDate: string | undefined, now: Date): AsuraLifeStageView {
  const def = LIFE_STAGE_DEFS[key];
  const voice = VOICE[key];
  const age = typeof birthDate === 'string' ? completedAge(birthDate, now) : null;
  const tense = age === null ? null : tenseOf(age, def);
  const seed = `${birthDate ?? ''}|${key}`;
  return {
    ageText: def.ageText,
    tenseLabel: tense ?? '',
    headline: tense ? choose(voice.headline[tense], `${seed}|h`) : '',
    // 傳統對應 1 句＋背景 1 句；背景有心理學與統計時，依生日挑一種，避免每張卡都塞同樣的東西
    lines: [choose(voice.role, `${seed}|r`), choose(voice.facts, `${seed}|f`)],
    note: voice.age,
  };
}
