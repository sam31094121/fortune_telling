import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { customerSafeAiMessage } from '@/lib/ai-error-message';
import { castHexagram, formatHexagramLine } from '@/lib/iching-engine';
import { buildEmpathicFromHexagram, patternNameOf } from '@/lib/iching-psychology';

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
    `（本機易經後備解盤：雲端老師忙碌時仍可閱讀，待額度恢復後可再請完整口述。）`
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

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const iching = castHexagram(facts.shortName, facts.dayMaster, facts.structure);
    const empathic = buildEmpathicFromHexagram(facts.shortName, iching);

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        provider: '易經老師（本機後備）',
        source: 'local-fallback',
        reading: buildLocalGoogleReading(facts),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `你是「Google 老師」，以易經與生辰八字交叉解盤。只能根據下列已鎖定的客戶八字資料與後端已起好的易經卦象，用繁體中文產出可直接給客戶閱讀的正式解盤。
易經卦象（後端已決定性起卦，必須在解盤中自然引用印證，不可自行改卦）：${formatHexagramLine(iching)}；卦義：${iching.judgment}；卦示行動：${iching.advice}
易經心理學共感層（後端已運算；整份解盤要像「最懂他的密友」在說話——剝洋蔥式由外而內，最後帶到核心脆弱性，語氣有溫度，不是老師對學生）：
- 他的專屬格局名稱：「${patternNameOf(iching)}」（六十四格裡就這一格是他）
- 他的人格外殼：${empathic.iKnowYourSurface}
- 殼下的他：${empathic.iKnowYourInside}
- 外冷內熱的反差：${empathic.specialYou}
- 核心脆弱性（要溫柔地帶到「那不是你的錯」）：${empathic.absolution}
卜卦儀式（開場必須依此意境、用沉穩導師話術改寫，不可照抄原句）：先請他把手機放穩、找個舒服的姿勢（不得聲稱感應到他的體溫、身體或所在環境）；請他先靜下來、慢慢呼吸，說你要為他起一卦；卦成後鄭重告訴他：這是特殊格局「${patternNameOf(iching)}」，六十四格裡就這一格是他——卦是一面鏡子，不是替他下定論。之後才進入三個年齡段。
共感規則（心理學剝洋蔥）：三個年齡段像剝洋蔥一層比一層深——前一歲剝外殼慣性、現在剝殼下的自我與此刻心思、下一歲逼近核心；至少一處自然呼應上述心理側寫；結尾要有密友的溫度、抵達「那不是你的錯」的暖意，不可推翻共感層的判定，也不可整段照抄。
規則：不得重新排盤、不得改變用神或忌神、不得預言或保證未來、不得把戲劇化內容當事實。名字只可用後兩字。
請直接輸出 360 到 560 字的繁體中文解盤。語氣要像一位沉穩、專業又積極的老師：不恐嚇、不空泛，但清楚鼓勵客戶把今天浮現的正確念頭化成行動。先以「${facts.shortName}，你現在 ${facts.age}」開場，目標是把下方專業八字資料翻成客戶看得懂的白話文。
接著必須依序用三個小段落和明確標籤呈現「${facts.previousAge}：」「${facts.age}（現在）：」「${facts.nextAge}：」。
前一歲只能描述命盤延續的慣性與回顧重點，不能捏造已發生事件；現在這一歲要結合目前年齡、大運與流年，並以台灣常見的人生情境（工作角色、收入與資源、關係溝通、家庭責任、生活節奏）指出最可能需要面對的課題，但不可斷言客戶正在經歷某件事。現在這一段必須特別強化「行動關」：用一句話說清楚此刻最應建立的自律或執行習慣，再給一個今天可完成的小步驟；下一歲要說明這個行動可能累積成的格局與方向，不能保證結果或把未來寫成命定。
在最後另起一段「五元素寶物：」，說明以下寶物是這張命盤五行補強的遊戲任務，並把它翻成一項能練習的能力與今天就能開始的小行動。要清楚寫出兩條路線：收下寶物，是用看得見的遊戲任務降低開始行動的門檻；不收下寶物，也能靠自律與執行力直接做同一項練習。兩條路的核心都是今天願意開始，而不是等到十全十美；今天的一次練習，能先讓明天的行動不同。不得把寶物說成會保證成功、改變命運、帶來超自然效果，也不得用羞愧、威脅或貶低方式逼迫客戶收下。最後一句要是可執行、不強迫、帶有積極力量的提醒，例如把今天浮現而你認為正確的一件事，勇敢完成第一步，讓明天從此不同。
重要：本次「五元素寶物」是 Google 老師與鬼魅解盤共用的唯一行動補強元素。所有今天可做的練習、補強方向與寶物說明，都必須只以提供的寶物元素為準，不可另外指定另一個元素當行動目標。用神只可作為命盤結構的背景依據，不可寫成另一條需要客戶再補的路線。
不得重新推算、不得省略資料已提供的重點、不得寫標題或條列。
姓名：${facts.shortName}
目前年齡：${facts.age}
前一歲：${facts.previousAge}
下一歲：${facts.nextAge}
日主：${facts.dayMaster}
格局：${facts.structure}
用神：${facts.usefulGod}
忌神：${facts.avoidGod}
當前大運：${facts.activeLuck || '核心未提供'}
流年：${facts.annualLuck || '核心未提供'}
五行焦點：${facts.elementFocus || '核心未提供'}
命盤摘要：${facts.chartSummary || '核心未提供'}
格局訊號：${facts.structureSignal || '核心未提供'}
主要十神：${facts.dominantTenGods || '核心未提供'}
十神缺位：${facts.missingTenGods || '未見明顯缺位'}
五行強弱依據：${facts.strengthFactors || '核心未提供'}
既有老師段落：${facts.plainSections || '核心未提供'}
五元素寶物：${facts.treasureElement || '未提供'}元素・${facts.treasureName || '未提供'}；能力提示：${facts.treasurePower || '未提供'}
`,
          config: { temperature: 0.35, maxOutputTokens: 4_000 },
        }),
        35_000,
      );
      const reading = text(response.text, 900).replace(/\s+/g, ' ');
      const chineseCharacters = (reading?.match(/[\u3400-\u9fff]/g) ?? []).length;
      if (!reading || reading.length < 180 || chineseCharacters < 120) {
        throw new Error('回覆過短，未達可顯示的解盤品質。');
      }
      return NextResponse.json({ ok: true, provider: 'Google 老師', source: 'gemini', reading }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (aiError) {
      console.error('[bazi/google-reading] AI unavailable, local fallback', aiError instanceof Error ? aiError.message : aiError);
      return NextResponse.json({
        ok: true,
        provider: '易經老師（本機後備）',
        source: 'local-fallback',
        reading: buildLocalGoogleReading(facts),
        notice: customerSafeAiMessage(aiError, '雲端老師忙碌，已改用本機易經後備解盤。'),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (error) {
    console.error('[bazi/google-reading]', error instanceof Error ? error.message : error);
    if (factsForFallback) {
      return NextResponse.json({
        ok: true,
        provider: '易經老師（本機後備）',
        source: 'local-fallback',
        reading: buildLocalGoogleReading(factsForFallback),
        notice: customerSafeAiMessage(error, '雲端老師忙碌，已改用本機易經後備解盤。'),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const message = customerSafeAiMessage(error, '易經老師這一刻比較忙，請稍候一兩分鐘再按一次。');
    return NextResponse.json({ ok: false, message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
