'use client';

/**
 * 紅鸞心動・結尾的三個下一步（2026-09-03）
 *
 * 客戶讀完「幾月會碰到誰」之後，原本只剩返回首頁——高潮之後直接收盤子。
 * 這裡提供三件事：把月份放進自己的行事曆、把結果分享出去、換個人再算一次。
 *
 * 全部在瀏覽器本機完成：行事曆用標準 .ics（不需要通知權限，也不需要後端排程），
 * 分享優先用系統分享面板、沒有就退回複製。任何一項失敗都只回報失敗，不擋畫面。
 */

export type RedLuanReminder = {
  name: string;
  /** 該月起始日，YYYY-MM-DD。 */
  startsOn: string;
  /** 該月結束日，YYYY-MM-DD。 */
  endsOn: string;
  /** 例如「這個月你的桃花最旺」。 */
  monthLine: string;
  /** 例如「中等身材、短髮乾淨的男生」。 */
  typeHeadline: string;
  /** 還有幾天；0 代表已經在這個月裡面。 */
  daysAway: number;
  /** 最主要的人選，例如「醫師、會計」。分享時最抓眼球的就是這一段。 */
  topCandidate: string;
  /** 卡片網址，分享一定要帶——沒有連結，收到的人無從嘗試。 */
  url: string;
  /** 這個人還沒填時辰，卦象仍鎖著。行事曆提醒時順便叫他回來補。 */
  hexagramLocked?: boolean;
};

/**
 * 分享連結上的落地標記。
 *
 * 只帶這一個固定字串，不帶姓名、生日或任何個人資料——網址會被轉貼、被記錄，
 * 任何個人欄位都不該出現在上面。收到的人只是需要一句銜接，不需要對方的資料。
 */
export const RED_LUAN_SHARE_MARK = 'from=share';

function withShareMark(url: string) {
  if (!url) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${RED_LUAN_SHARE_MARK}`;
}

/** 未來一年的其中一個機會月。引擎早就算好了，只是以前沒放進行事曆。 */
export type RedLuanReminderMonth = {
  startsOn: string;
  endsOn: string;
  monthLine: string;
  kind: 'SOUL_RESONANCE' | 'BENEFACTOR' | 'BOTH';
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** YYYY-MM-DD → YYYYMMDD（.ics 的全天事件格式）。 */
function icsDate(iso: string) {
  return iso.replace(/-/g, '');
}

/** 全天事件的 DTEND 是排他的，所以要往後推一天。 */
function nextDay(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

/** 台北時區的今天，YYYY-MM-DD。 */
function taipeiToday() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Taipei',
  }).format(new Date());
}

function shiftDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** .ics 規格：逗號、分號、反斜線要跳脫，換行寫成 \n。 */
function escapeText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * 一個機會月 = 一個全天事件。
 *
 * 兩件事一定要對，否則提醒等於沒設：
 *   1. 已經開始的月份，起始日在過去——行事曆不會回頭提醒，所以改掛在明天。
 *   2. 還沒到的月份維持「前一天提醒」，客戶才來得及安排。
 */
function buildRedLuanEvent(month: RedLuanReminderMonth, reminder: RedLuanReminder, today: string) {
  const alreadyStarted = month.startsOn < today;
  const eventDate = alreadyStarted ? shiftDays(today, 1) : month.startsOn;
  const kindWord = month.kind === 'BENEFACTOR' ? '貴人月' : '紅鸞心動';
  const summary = escapeText(alreadyStarted
    ? `${kindWord}・${month.monthLine}（進行中・到 ${month.endsOn}）`
    : `${kindWord}・${month.monthLine}`);
  // 提醒跳出來時，客戶多半忘了細節——所以整段內容都要在這裡，包含回卡片的路。
  const description = escapeText([
    `${month.monthLine}（${month.startsOn} 到 ${month.endsOn}）。`,
    `容易來電的類型：${reminder.typeHeadline}${reminder.topCandidate ? `，常出現在${reminder.topCandidate}` : ''}。`,
    '',
    '吸力會很明顯，差的只是你有沒有先開口。先想好要說什麼，當下就不會愣住。',
    // 沒填時辰的人，卦象一直鎖著。一年七次提醒是唯一還碰得到他的機會，每一次都該講一句。
    ...(reminder.hexagramLocked ? ['', '補上出生時辰，還能解鎖你的卦象與紫微夫妻宮。'] : []),
    ...(reminder.url ? ['', `重看你的紅鸞：${reminder.url}`] : []),
  ].join('\n'));
  return [
    'BEGIN:VEVENT',
    `UID:red-luan-${icsDate(month.startsOn)}@taiji-fortune`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;VALUE=DATE:${icsDate(eventDate)}`,
    `DTEND;VALUE=DATE:${nextDay(eventDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    // 進行中的月份掛在明天，就用當天早上九點提醒；還沒到的維持前一天。
    alreadyStarted ? 'TRIGGER:PT9H' : 'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

/**
 * 引擎算得出未來一年的每一個機會月，以前卻只把其中一個放進行事曆——
 * 等於一整年只跟客戶接觸一次。帶入 months 就會整年一次寫進去。
 */
export function buildRedLuanIcs(reminder: RedLuanReminder, months?: RedLuanReminderMonth[]) {
  const today = taipeiToday();
  const list: RedLuanReminderMonth[] = months && months.length > 0
    ? months
    : [{ startsOn: reminder.startsOn, endsOn: reminder.endsOn, monthLine: reminder.monthLine, kind: 'SOUL_RESONANCE' }];
  // 同一個起始月只留一筆：桃花與貴人同月時，行事曆不該出現兩條一樣的提醒。
  const unique = list.filter((month, index) => list.findIndex((item) => item.startsOn === month.startsOn) === index);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//taiji-fortune//red-luan//ZH-TW',
    'CALSCALE:GREGORIAN',
    ...unique.flatMap((month) => buildRedLuanEvent(month, reminder, today)),
    'END:VCALENDAR',
  ].join('\r\n');
}

/** 下載行事曆檔。回傳是否成功，呼叫端只負責顯示狀態。 */
export function downloadRedLuanReminder(reminder: RedLuanReminder, months?: RedLuanReminderMonth[]) {
  try {
    const blob = new Blob([buildRedLuanIcs(reminder, months)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `紅鸞心動-${reminder.startsOn}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 分享文字。最抓人的是具體性——月份、剩幾天、對方是哪一型、做什麼的。
 * 一定要帶連結：沒有連結，收到的人讀完只能羨慕，無從自己試一次。
 */
export function buildRedLuanShareText(reminder: RedLuanReminder, monthCount?: number) {
  const [year, month] = [Number(reminder.startsOn.slice(0, 4)), Number(reminder.startsOn.slice(5, 7))];
  const when = reminder.daysAway === 0 ? '就是這個月' : `還有 ${reminder.daysAway} 天`;
  const who = reminder.topCandidate
    ? `${reminder.typeHeadline}（${reminder.topCandidate}那一型）`
    : reminder.typeHeadline;
  return [
    `我的紅鸞心動算出來了：${year} 年 ${month} 月，${when}。`,
    `會跟我來電的是${who}。`,
    ...(monthCount && monthCount > 1 ? [`未來一年我還有 ${monthCount} 次機會月。`] : []),
    '',
    // 帶落地標記：朋友點進來時，畫面才知道要先講一句銜接的話，而不是丟一張空表單給他。
    `你也算算自己的 👉 ${withShareMark(reminder.url)}`,
  ].join('\n');
}

/** 優先用系統分享面板，沒有就複製到剪貼簿。回傳實際用了哪一種。 */
export async function shareRedLuanReading(reminder: RedLuanReminder, monthCount?: number): Promise<'shared' | 'copied' | 'failed'> {
  const text = buildRedLuanShareText(reminder, monthCount);
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      // url 另外帶：分享面板會把它變成可點的預覽卡，而不是純文字裡的一段網址。
      await navigator.share({ title: '桃花・紅鸞心動', text, url: withShareMark(reminder.url) });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
