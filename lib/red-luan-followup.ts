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

/** .ics 規格：逗號、分號、反斜線要跳脫，換行寫成 \n。 */
function escapeText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildRedLuanIcs(reminder: RedLuanReminder) {
  const summary = escapeText(`紅鸞心動・${reminder.monthLine}`);
  const description = escapeText(
    `${reminder.monthLine}。\n容易來電的類型：${reminder.typeHeadline}。\n\n吸力會很明顯，差的只是你有沒有先開口。先想好要說什麼，當下就不會愣住。`,
  );
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//taiji-fortune//red-luan//ZH-TW',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:red-luan-${icsDate(reminder.startsOn)}@taiji-fortune`,
    `DTSTAMP:${icsDate(reminder.startsOn)}T000000Z`,
    `DTSTART;VALUE=DATE:${icsDate(reminder.startsOn)}`,
    `DTEND;VALUE=DATE:${nextDay(reminder.endsOn)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** 下載行事曆檔。回傳是否成功，呼叫端只負責顯示狀態。 */
export function downloadRedLuanReminder(reminder: RedLuanReminder) {
  try {
    const blob = new Blob([buildRedLuanIcs(reminder)], { type: 'text/calendar;charset=utf-8' });
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

export function buildRedLuanShareText(reminder: RedLuanReminder) {
  const [year, month] = [Number(reminder.startsOn.slice(0, 4)), Number(reminder.startsOn.slice(5, 7))];
  return `我的紅鸞心動算出來了：${year} 年 ${month} 月，${reminder.monthLine}。容易來電的是${reminder.typeHeadline}。`;
}

/** 優先用系統分享面板，沒有就複製到剪貼簿。回傳實際用了哪一種。 */
export async function shareRedLuanReading(reminder: RedLuanReminder): Promise<'shared' | 'copied' | 'failed'> {
  const text = buildRedLuanShareText(reminder);
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: '桃花・紅鸞心動', text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
