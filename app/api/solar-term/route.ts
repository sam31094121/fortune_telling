import { NextResponse } from 'next/server';
import { Solar } from 'lunar-typescript';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 太極圖・二十四節氣 API（2026-08-28）
 * 只針對首頁太極卡：以既有曆法引擎（lunar-typescript，與八字引擎同一套素材）
 * 確定性取得「今天所在的節氣」與「下一個節氣」。不重排八字、不做任何推測。
 * 2026-11-17：不再附卦象（SOLAR_TERM_HASH）——節氣名稱＋年份映射到卦象不是官方曆法也不是正統起卦；
 * 節氣本身來自曆法函式庫，與卦象分開，卦象那一段停用。
 */
export async function GET() {
  try {
    const now = new Date();
    const solar = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), 0);
    const lunar = solar.getLunar();
    const prevJieQi = lunar.getPrevJieQi(true);
    const nextJieQi = lunar.getNextJieQi(true);

    const currentName = prevJieQi.getName();

    return NextResponse.json({
      ok: true,
      current: {
        name: currentName,
        since: prevJieQi.getSolar().toYmd(),
      },
      next: {
        name: nextJieQi.getName(),
        at: nextJieQi.getSolar().toYmd(),
      },
      lunarDate: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    },{ headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[solar-term]', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ ok: false, message: '節氣資料暫時無法取得。' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
