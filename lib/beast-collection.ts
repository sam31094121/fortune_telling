'use client';

/**
 * 神獸收藏（對戰贏來的卡）
 * ============================================================================
 *
 * 業主定調：「贏要有獎勵，獎勵要很清楚地告知。會分配在哪裡？
 * 遊戲的定義就是會獲得獎勵，再指引到我的成長。」
 *
 * 所以贏來的卡有一個明確的去處：成長中心的「決鬥收藏」格。
 * 不是給一個分數、不是給一個徽章——是一張看得到、翻得開的卡。
 *
 * 【必須誠實講的一件事】
 *
 * 這份收藏存在**這台裝置的瀏覽器**裡，沒有帳號、沒有上傳。
 * 換手機、清除網站資料、用無痕視窗，收藏就不在了。
 *
 * 這件事一定要寫在畫面上。如果我們寫「永久收藏」而它其實會消失，
 * 那就是作假——而且是拿客戶贏來的東西作假，比數值作假更難原諒。
 * 所以 COLLECTION_STORAGE_NOTICE 是要顯示給客戶看的，不是註解。
 *
 * 【沒收也要留紀錄】
 *
 * 輸掉被沒收的卡會記在 history 裡。客戶要能回頭看「我什麼時候失去了哪一張」，
 * 而不是某天發現卡變少了卻查不到原因。靜悄悄地拿走東西，就是作假。
 */

const COLLECTION_KEY = 'tdh_beast_collection_v1';
/** 紀錄留最近這麼多筆就好，避免 localStorage 被塞爆。 */
const MAX_HISTORY = 60;

/** 這段字要顯示在收藏區塊上，不是藏在說明裡。 */
export const COLLECTION_STORAGE_NOTICE =
  '收藏存在這台裝置的瀏覽器裡，沒有上傳到雲端。換手機、清除瀏覽資料或使用無痕視窗，收藏會不見。';

export interface CollectionEntry {
  cardId: string;
  /** 取得時間（ISO）。 */
  at: string;
  /** 怎麼來的。目前只有對戰贏來一種，未來若有別的來源要一併標明。 */
  source: 'DUEL_WIN';
}

export interface CollectionHistoryItem {
  at: string;
  kind: 'WON' | 'FORFEITED' | 'RETURNED';
  cardId: string | null;
  note: string;
}

export interface BeastCollection {
  cards: CollectionEntry[];
  history: CollectionHistoryItem[];
}

const EMPTY: BeastCollection = { cards: [], history: [] };

/**
 * 讀收藏。
 *
 * 無痕視窗、封鎖 storage 的 in-app 瀏覽器都會直接丟例外，
 * 存壞的舊資料也可能 parse 不出來——一律當作「還沒有收藏」，
 * 絕不能因為讀不到就讓頁面壞掉。
 */
export function readCollection(): BeastCollection {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(COLLECTION_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<BeastCollection>;
    return {
      cards: Array.isArray(parsed.cards) ? parsed.cards.filter((c) => typeof c?.cardId === 'string') : [],
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_HISTORY) : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(collection: BeastCollection): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(COLLECTION_KEY, JSON.stringify({
      cards: collection.cards,
      history: collection.history.slice(0, MAX_HISTORY),
    }));
    return true;
  } catch {
    // 配額滿或被封鎖。回 false 讓呼叫端能誠實告訴客戶「這次沒存起來」。
    return false;
  }
}

/**
 * 套用一次押注結算。
 *
 * 回傳 saved=false 時，呼叫端**必須**告訴客戶沒有存成功——
 * 不能顯示「已放進收藏」然後其實沒存到。
 */
export function applyStakeOutcome(outcome: {
  verdict: 'WON' | 'LOST' | 'RETURNED';
  gainedCardId: string | null;
  forfeitedCardId: string | null;
  message: string;
}): { collection: BeastCollection; saved: boolean } {
  const current = readCollection();
  const at = new Date().toISOString();
  const next: BeastCollection = {
    cards: [...current.cards],
    history: [...current.history],
  };

  if (outcome.verdict === 'WON' && outcome.gainedCardId) {
    next.cards.unshift({ cardId: outcome.gainedCardId, at, source: 'DUEL_WIN' });
    next.history.unshift({ at, kind: 'WON', cardId: outcome.gainedCardId, note: outcome.message });
  } else if (outcome.verdict === 'LOST' && outcome.forfeitedCardId) {
    /*
      沒收：從收藏裡拿掉一張同名的卡。

      只拿掉一張，不是全部——客戶可能贏過同一張好幾次。
      如果收藏裡本來就沒有（例如押的是初始牌庫的卡而不是贏來的），
      那就不扣，但紀錄照留：客戶要看得到這一場輸掉了什麼。
    */
    const index = next.cards.findIndex((entry) => entry.cardId === outcome.forfeitedCardId);
    if (index >= 0) next.cards.splice(index, 1);
    next.history.unshift({ at, kind: 'FORFEITED', cardId: outcome.forfeitedCardId, note: outcome.message });
  } else {
    next.history.unshift({ at, kind: 'RETURNED', cardId: null, note: outcome.message });
  }

  const saved = write(next);
  return { collection: next, saved };
}

/** 清空收藏。要有這個，因為客戶有權把自己的資料刪掉。 */
export function clearCollection(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(COLLECTION_KEY);
  } catch {
    /* 刪不掉就算了，不影響其他功能。 */
  }
}

/** 同一張卡贏過幾次。收藏格要顯示「×2」。 */
export function countByCard(collection: BeastCollection): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of collection.cards) {
    counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + 1);
  }
  return counts;
}
