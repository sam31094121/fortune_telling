import { createHash } from 'node:crypto';

/**
 * 留言板匿名人物（純函式，後端專用）。
 * 同一個 authorKey 永遠算出同一個人物：十二生肖 × 8 色 × 四位數編號。
 * 不存資料庫、不用姓名；前端只照印這裡算好的結果。
 */
export type GuestbookAvatar = {
  /** 生肖符號 */
  symbol: string;
  /** 例如「匿名的龍 #4821」 */
  label: string;
  /** 頭像底色 */
  color: string;
};

const ZODIAC: ReadonlyArray<readonly [string, string]> = [
  ['🐀', '鼠'], ['🐂', '牛'], ['🐯', '虎'], ['🐇', '兔'], ['🐉', '龍'], ['🐍', '蛇'],
  ['🐎', '馬'], ['🐐', '羊'], ['🐒', '猴'], ['🐓', '雞'], ['🐕', '狗'], ['🐖', '豬'],
];

// 深色底上都看得清楚的 8 色
const COLORS = ['#c0392b', '#d35400', '#b7950b', '#1e8449', '#117a8b', '#2e5fa3', '#6c3483', '#a93e73'] as const;

export function avatarFor(authorKey: string): GuestbookAvatar {
  const h = createHash('sha256').update(`guestbook-avatar|${authorKey}`).digest('hex');
  const [symbol, name] = ZODIAC[parseInt(h.slice(0, 4), 16) % ZODIAC.length];
  const color = COLORS[parseInt(h.slice(4, 8), 16) % COLORS.length];
  const num = String(parseInt(h.slice(8, 14), 16) % 10000).padStart(4, '0');
  return { symbol, label: `匿名的${name} #${num}`, color };
}
