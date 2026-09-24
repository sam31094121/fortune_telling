import { NextResponse } from 'next/server';
import { customerSafeAiMessage } from '@/lib/ai-error-message';
import { castHexagram, formatHexagramLine } from '@/lib/iching-engine';
import { buildEmpathicFromHexagram, formatGhostDecoding, patternNameOf } from '@/lib/iching-psychology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HorrorBaziReadingRequest = {
  shortName?: unknown;
  age?: unknown;
  previousAge?: unknown;
  nextAge?: unknown;
  dayMaster?: unknown;
  structure?: unknown;
  usefulGod?: unknown;
  avoidGod?: unknown;
  activeLuck?: unknown;
  annualLuck?: unknown;
  elementFocus?: unknown;
  chartSummary?: unknown;
  structureSignal?: unknown;
  dominantTenGods?: unknown;
  missingTenGods?: unknown;
  strengthFactors?: unknown;
  plainSections?: unknown;
  treasureElement?: unknown;
  treasureName?: unknown;
  treasurePower?: unknown;
};

function text(value: unknown, max = 220) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}


function buildLocalHorrorReading(facts: {
  shortName: string; age: string; previousAge: string; nextAge: string;
  dayMaster: string; structure: string; usefulGod: string; avoidGod: string;
  treasureElement: string; treasureName: string; treasurePower: string;
}) {
  const iching = castHexagram(facts.shortName, facts.dayMaster, facts.structure);
  const empathic = buildEmpathicFromHexagram(facts.shortName, iching);
  const pattern = patternNameOf(iching);
  const ghost = formatGhostDecoding(iching);
  const treasure = facts.treasureElement
    ? `五元素封印：${facts.treasureElement}元素・${facts.treasureName || '今日封印練習'}。今天就能做的小事：${facts.treasurePower || '先把一直迴響的念頭寫下一句，再決定要不要行動'}。`
    : '五元素封印：今天先完成一件讓肩頸鬆一點的小事。';
  return (
    `${facts.shortName}，你現在 ${facts.age}。以下以象徵場景呈現易經文化解讀；先靜下來——卦已成：${formatHexagramLine(iching)}，特殊格局「${pattern}」。` +
    `第一道・磁場：${ghost} ${empathic.iKnowYourSurface}` +
    `第二道・詭異：${empathic.iKnowYourInside} 那些還沒散場的舊迴聲，其實是你很早學會的自保方式。` +
    `第三道・因果：若持續舊模式，代價會慢慢累積在決策與關係的摩擦上；若今天調整一步，呼吸與肩頸通常會先鬆開。` +
    `${empathic.absolution} ${treasure}` +
    `（易經文化解讀，供自我反思參考。）`
  ).replace(/\s+/g, ' ').trim();
}

async function withTimeout<T>(task: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('鬼魅解盤逾時')), ms); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let factsForFallback: Parameters<typeof buildLocalHorrorReading>[0] | null = null;
  try {
    const body = await request.json() as HorrorBaziReadingRequest;
    const facts = {
      shortName: text(body.shortName, 8) || '你',
      age: text(body.age, 16) || '年齡待確認',
      previousAge: text(body.previousAge, 16) || '前一年',
      nextAge: text(body.nextAge, 16) || '下一年',
      dayMaster: text(body.dayMaster), structure: text(body.structure), usefulGod: text(body.usefulGod), avoidGod: text(body.avoidGod),
      activeLuck: text(body.activeLuck), annualLuck: text(body.annualLuck), elementFocus: text(body.elementFocus),
      chartSummary: text(body.chartSummary, 320), structureSignal: text(body.structureSignal, 240),
      dominantTenGods: text(body.dominantTenGods, 160), missingTenGods: text(body.missingTenGods, 160),
      strengthFactors: text(body.strengthFactors, 420), plainSections: text(body.plainSections, 1800),
      treasureElement: text(body.treasureElement, 8), treasureName: text(body.treasureName, 80), treasurePower: text(body.treasurePower, 220),
    };
    if (!facts.dayMaster || !facts.structure) {
      return NextResponse.json({ ok: false, message: '命盤核心資料不足，暫不生成鬼魅解盤。' }, { status: 400 });
    }
    factsForFallback = facts;

    return NextResponse.json({
      ok: true, provider: '易經老師', source: 'local-iching',
      reading: buildLocalHorrorReading(facts),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[bazi/horror-reading]', error instanceof Error ? error.message : error);
    if (factsForFallback) {
      return NextResponse.json({
        ok: true,
        provider: '易經老師',
        source: 'local-iching',
        reading: buildLocalHorrorReading(factsForFallback),
        notice: customerSafeAiMessage(error, '雲端老師忙碌，已改用本機鬼魅後備解盤。'),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const message = customerSafeAiMessage(error, '鬼魅老師這一刻比較忙，請稍候一兩分鐘再按一次。');
    return NextResponse.json({ ok: false, message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
