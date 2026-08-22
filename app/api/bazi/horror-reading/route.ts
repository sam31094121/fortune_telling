import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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

async function withTimeout<T>(task: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('恐怖鬼魅解盤逾時')), ms); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
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
    if (!facts.dayMaster || !facts.structure) return NextResponse.json({ ok: false, message: '命盤核心資料不足，暫不生成鬼魅解盤。' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, message: '尚未設定 Gemini API 金鑰。' }, { status: 503 });

    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `你是「恐怖鬼魅八字解盤老師」。只能根據下列已鎖定的客戶八字資料，寫出可直接給客戶閱讀的原創虛構遊戲解盤。
核心規則：你與 Google 解盤必須回答同一份資料、同樣的三個時間段、同一個五元素寶物；不得重排八字、不得另找補強元素、不得編造真實事故、靈異事件、死亡、疾病或任何會令客戶相信即將發生的恐怖事。這是恐怖電影式的遊戲文字，不是預言。
客戶可見文字嚴禁出現天干、地支、日主、月令、得令、旺衰、十神、格局、用神、忌神、大運、流年、五行強弱等術語，也不得列出任何干支或柱名；這些只可作為你在背後寫劇本的依據。客戶只需要看懂年齡與生活情境。
請輸出 420 到 650 字繁體中文，不要標題、不要條列。語氣要比 Google 老師更有電影感、壓迫感與懸念，像鬼魅老師在黑暗中給出關鍵提醒；可以聳動，但不能威脅、羞辱或讓人害怕真實危險。先以「${facts.shortName}，你現在 ${facts.age}」開場。姓名只能使用提供的後兩字，不能寫全名。接著依序用三個清楚標籤寫「以前的你・殘影：」「${facts.shortName}，你現在 ${facts.age}・警報：」「未來的你・門縫：」。
「以前的你」只能寫長期容易重複的慣性與回顧，像片頭留下的異常，不能捏造曾發生的事，也不能指稱前一歲發生了什麼。現在這一段要結合後端八字依據，寫出恐怖壓迫感與一項可執行的自律／行動關；壓迫來自拖延、界線、溝通、資源或決策的累積代價，不得威脅。「未來的你」只能寫若延續目前選擇可能走向哪裡，以及若今天開始行動方向如何更清楚；不能保證結果或宣稱命定。
最後另起一段「鬼魅回應：」，直接對讀者說話，像門外的低語回應前面三段八字線索。低語要神祕、聳動、有餘韻，但最後回到人的選擇與行動；要明確點出：若今天有一件你知道該做、卻一直放著的事，現在就勇敢解開第一道封印，讓明天不再照舊。再另起一段「五元素封印：」，只能使用指定寶物，說明收下寶物或直接靠自律執行，兩條路其實是同一件今天就能做的小事。
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
唯一五元素寶物：${facts.treasureElement || '未提供'}元素・${facts.treasureName || '未提供'}；能力提示：${facts.treasurePower || '未提供'}`,
      config: { temperature: 0.6, maxOutputTokens: 4000 },
    }), 35_000);
    const reading = text(response.text, 1300).replace(/\s+/g, ' ');
    const chineseCharacters = (reading.match(/[\u3400-\u9fff]/g) ?? []).length;
    if (!reading || reading.length < 220 || chineseCharacters < 150) throw new Error('鬼魅回覆過短，未達可顯示的解盤品質。');
    return NextResponse.json({ ok: true, provider: 'Google Gemini', reading }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '恐怖鬼魅解盤暫時無法完成。';
    console.error('[bazi/horror-reading]', message);
    return NextResponse.json({ ok: false, message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
