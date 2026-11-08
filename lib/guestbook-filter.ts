/**
 * 留言板內容檢查（純函式，後端專用）。
 *
 * 不審核、不擋髒話：留言直接公開，管理員再下架。
 * 只擋兩類「一旦公開就收不回來」的東西：個人資料與網址。
 * 命理站的人很容易在留言裡寫生辰、電話，所以一定在後端擋。
 */
export const GUESTBOOK_MAX_LENGTH = 200;

export type GuestbookCheck = { ok: true; body: string } | { ok: false; reason: string };

const URL_PATTERN = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|tw|io|co|me|cc|tv|xyz|info|app|dev)\b/i;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const TW_ID_PATTERN = /[A-Za-z][12]\d{8}/;
// 西元：1974-07-02、1974/7/2、1974年7月2日；民國：民國63年7月2日
const BIRTH_DATE_PATTERN = /(19|20)\d{2}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}|民國\s*\d{2,3}\s*年\s*\d{1,2}\s*月|(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/;

export function checkGuestbookBody(raw: unknown): GuestbookCheck {
  if (typeof raw !== 'string') return { ok: false, reason: '請輸入留言內容。' };
  const body = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!body) return { ok: false, reason: '請輸入留言內容。' };
  if ([...body].length > GUESTBOOK_MAX_LENGTH) {
    return { ok: false, reason: `留言最多 ${GUESTBOOK_MAX_LENGTH} 字，請精簡一下。` };
  }
  if (EMAIL_PATTERN.test(body)) return { ok: false, reason: '留言是公開的，請不要留下 Email。' };
  if (URL_PATTERN.test(body)) return { ok: false, reason: '留言不能放網址。' };
  if (TW_ID_PATTERN.test(body)) return { ok: false, reason: '留言是公開的，請不要留下身分證字號。' };
  // 生日要排在「長串數字」前面：1974-07-02 去掉連字號會變成八碼，提示才不會講成電話。
  if (BIRTH_DATE_PATTERN.test(body)) {
    return { ok: false, reason: '留言是公開的，請不要留下出生年月日。' };
  }
  if (/\d{8,}/.test(body.replace(/[\s-]/g, ''))) {
    return { ok: false, reason: '留言是公開的，請不要留下電話或長串數字。' };
  }
  return { ok: true, body };
}

/** 後端算好給前端照印的相對時間，例如「3 小時前」。 */
export function guestbookTimeLabel(createdAtIso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(createdAtIso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小時前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  const month = Math.floor(day / 30);
  return month < 12 ? `${month} 個月前` : `${Math.floor(month / 12)} 年前`;
}
