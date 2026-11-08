import { NextResponse } from 'next/server';
import { formatHexagramLine } from '@/lib/iching-engine';
import { buildEmpathicFromHexagram, patternNameOf } from '@/lib/iching-psychology';
import { verifiedBaziReading } from '@/lib/bazi-verified-reading';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { shortName, bazi, iching, chartFingerprint, outputGate } = await verifiedBaziReading(await request.json());
    if (!outputGate.interpretationReady) {
      return NextResponse.json(
        { ok: false, code: 'BAZI_TRADITIONAL_INTERPRETATION_BLOCKED', message: '命盤來源核對未完成，暫不提供解讀。' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const empathic = buildEmpathicFromHexagram(shortName, iching);
    const reading = `${shortName}，本次已核對四柱：${bazi.year}、${bazi.month}、${bazi.day}、${bazi.hour}。日主${bazi.dayMaster}${bazi.dayMasterElement}。`
      + `依本次生辰起卦：${formatHexagramLine(iching)}，卦象表達「${patternNameOf(iching)}」。`
      + `${empathic.iKnowYourSurface} ${empathic.iKnowYourInside} ${empathic.absolution}`
      + '（易經文化解讀，供自我反思參考。）';
    return NextResponse.json({ ok: true, provider: '易經老師', source: 'local-iching', chartFingerprint, reading }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, code: 'THREE_IN_ONE_LOCKED', message: '出生資料或命盤核對未完成，暫不提供解讀，請重新排盤。' }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  }
}
