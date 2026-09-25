import { NextResponse } from 'next/server';
import { customerSafeAiMessage } from '@/lib/ai-error-message';
import { castHexagram, formatHexagramLine } from '@/lib/iching-engine';
import { buildEmpathicFromHexagram, patternNameOf } from '@/lib/iching-psychology';
import { getBaziTraditionalOutputGate } from '@/lib/bazi-traditional-gate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type GoogleBaziReadingRequest = {
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

function text(value: unknown, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}


function buildLocalGoogleReading(facts: {
  shortName: string; age: string; previousAge: string; nextAge: string;
  dayMaster: string; structure: string; usefulGod: string; avoidGod: string;
  activeLuck: string; annualLuck: string; treasureElement: string; treasureName: string; treasurePower: string;
}) {
  const iching = castHexagram(facts.shortName, facts.dayMaster, facts.structure);
  const empathic = buildEmpathicFromHexagram(facts.shortName, iching);
  const pattern = patternNameOf(iching);
  const treasure = facts.treasureElement
    ? `五元素寶物：${facts.treasureElement}元素・${facts.treasureName || '今日練習'}。今天可做的一小步：${facts.treasurePower || '先完成一件你認定正確的小事'}。收下寶物或直接靠自律執行，核心都是今天願意開始。`
    : '五元素寶物：先以今天能完成的一件小事當練習，不追求完美。';
  return (
    `${facts.shortName}，你現在 ${facts.age}。請先靜下來、慢慢呼吸——這一卦已起定：${formatHexagramLine(iching)}，特殊格局「${pattern}」。` +
    `${empathic.iKnowYourSurface} ${empathic.iKnowYourInside}` +
    `${facts.previousAge}：延續此前的節奏與慣性，回看哪些習慣仍在替你擋風，哪些已開始吃力。` +
    `${facts.age}（現在）：日主${facts.dayMaster}、格局${facts.structure}提示你把力氣放在「用神 ${facts.usefulGod || '已鎖定方向'}」，少在「忌神 ${facts.avoidGod || '耗損處'}」空轉。` +
    `此刻最應建立的自律：把浮現且你認定正確的一件事，拆成今天就能完成的第一步。` +
    `${facts.nextAge}：若這一步有被重複練習，資源與節奏較容易往較穩的方向累積；這是條件式方向，不是保證。` +
    `${empathic.absolution} ${treasure}` +
    `（易經文化解讀，供自我反思參考。）`
  ).replace(/\s+/g, ' ').trim();
}

async function withTimeout<T>(task: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('易經老師解盤逾時')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const traditionalGate = getBaziTraditionalOutputGate(true);
  if (!traditionalGate.interpretationReady) {
    return NextResponse.json(
      { ok: false, code: 'BAZI_TRADITIONAL_INTERPRETATION_BLOCKED', message: traditionalGate.customerMessage },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  let factsForFallback: Parameters<typeof buildLocalGoogleReading>[0] | null = null;
  try {
    const body = await request.json() as GoogleBaziReadingRequest;
    const facts = {
      shortName: text(body.shortName, 8) || '你',
      age: text(body.age, 16) || '年齡待確認',
      previousAge: text(body.previousAge, 16) || '前一年',
      nextAge: text(body.nextAge, 16) || '下一年',
      dayMaster: text(body.dayMaster),
      structure: text(body.structure),
      usefulGod: text(body.usefulGod),
      avoidGod: text(body.avoidGod),
      activeLuck: text(body.activeLuck),
      annualLuck: text(body.annualLuck),
      elementFocus: text(body.elementFocus),
      chartSummary: text(body.chartSummary, 320),
      structureSignal: text(body.structureSignal, 240),
      dominantTenGods: text(body.dominantTenGods, 160),
      missingTenGods: text(body.missingTenGods, 160),
      strengthFactors: text(body.strengthFactors, 420),
      plainSections: text(body.plainSections, 1_800),
      treasureElement: text(body.treasureElement, 8),
      treasureName: text(body.treasureName, 80),
      treasurePower: text(body.treasurePower, 220),
    };
    if (!facts.dayMaster || !facts.structure) {
      return NextResponse.json({ ok: false, message: '命盤核心資料不足，暫不送易經老師解盤。' }, { status: 400 });
    }
    factsForFallback = facts;

    return NextResponse.json({
      ok: true, provider: '易經老師', source: 'local-iching',
      reading: buildLocalGoogleReading(facts),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[bazi/google-reading]', error instanceof Error ? error.message : error);
    if (factsForFallback) {
      return NextResponse.json({
        ok: true,
        provider: '易經老師',
        source: 'local-iching',
        reading: buildLocalGoogleReading(factsForFallback),
        notice: customerSafeAiMessage(error, '雲端老師忙碌，已改用本機易經後備解盤。'),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const message = customerSafeAiMessage(error, '易經老師這一刻比較忙，請稍候一兩分鐘再按一次。');
    return NextResponse.json({ ok: false, message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
