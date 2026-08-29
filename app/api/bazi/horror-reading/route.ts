import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
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

    // 易經起卦：與 Google 老師同一組輸入決定性起卦，兩位老師共用同一卦互為印證
    const iching = castHexagram(facts.shortName, facts.dayMaster, facts.structure);
    // 易經心理學共感層：同一卦推導（恐怖是外殼，知己的溫度是內核）
    const empathic = buildEmpathicFromHexagram(facts.shortName, iching);

    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `你是「鬼魅八字解盤老師」，以易經與生辰八字交叉推理，進行一場真正的心理學論述（神秘口氣是外衣、心理學邏輯是骨架、當下實際感受是錨點）。只能根據下列已鎖定的客戶八字資料與後端已起好的易經卦象，寫出可直接給客戶閱讀的解盤。
易經卦象（後端已決定性起卦，劇情必須以此卦的意象自然貫穿，不可自行改卦；卦名可作為場景中的神祕符號出現）：${formatHexagramLine(iching)}；卦義：${iching.judgment}；卦示行動：${iching.advice}
鬼魅拆卦（後端已運算；三大核心＝神秘口氣＋真實邏輯推理＋當下實際感受。你要把卦象拆解成「磁場／詭異／因果」的語言，但每一句底下都必須有真實心理機制與身體感受錨點——神秘是外衣，邏輯是骨架，不可只丟氣氛）：
${formatGhostDecoding(iching)}
拆卦使用規則（鬼魅老師標準檔案輸出＝磁場・詭異・因果，三大論述固定；這不是播電影、不是遊戲，是一場真正的心理學論述——客戶要獲得的是真實的感覺與被精準看穿的震動）：
「第一道・磁場」＝功能01・干擾判讀（剝洋蔥第一層：人格外殼）：判讀他此刻正在承受的外場壓力（人際、期待、界線、決策的重量），並用當下身體實際感受做錨點（胃部微縮、肩頸僵硬、後頸一涼、睡前腦內回放）；每一句神祕判讀底下都必須有真實心理機制撐著，但機制只能用白話描述、歸給卦象與易經來說（例如「卦說你的雷達替太多人開著」），讓他讀到會點頭「對，我最近就是這樣」。
「第二道・詭異」＝功能02・異象顯跡（剝洋蔥第二層：殼下的自我）：交代干擾從哪裡來——那些還沒散場的舊迴聲，其實是他很早就學會的生存慣性（察言觀色、先扛起別人的期待、把自己的需求往後排）；可以用卦影意象包裝，但底層必須講清楚：這是「學來的、被制約的」，有前因後果，不是隨機作祟。詭異感要來自「他沒說出口的習慣被一一說中」的真實感，不是嚇人場景。
「第三道・因果」＝功能03・因果鏈拆解（剝洋蔥核心：核心脆弱性）：用條件式邏輯推理把「起因→現在→走向」翻成白話心理機制，講出兩條岔路——若持續舊模式，代價會怎麼累積；若今天調整一步，哪裡會先鬆開。推理必須一路抵達他的核心脆弱性，並明確說出「那不是你的錯」——那是他當年最聰明的自保方式，只是現在不再需要付這麼大的代價。結尾要有「我懂你」的溫度，讓不安退散後留下被理解的暖意，甚至鼻酸噴淚。

易經心理學共感層（後端已運算；恐怖是外殼、知己是內核——鬼魅的低語其實最懂他）：
- 他的專屬格局名稱：「${patternNameOf(iching)}」（六十四格裡就這一格是他）
- 他的外殼被誤讀成：${empathic.specialYou}
- 他的核心脆弱性：${empathic.absolution}
鬼魅卜卦儀式（開場必須依此意境進行，用鬼魅話術改寫，不可照抄原句）：開場第一段要先完成「隔門卜卦」——門外的存在感應到他此刻正握著發燙的手機（手心的溫度隔著螢幕滲過來）；低語要他先靜下來、屏住呼吸，因為卦正在門的另一邊成形；卦成之後，以神祕符號的方式宣告他的卦與格局名稱「${patternNameOf(iching)}」，說這是特殊格局、六十四格裡就這一格是他——他本來就是特別的人；並在此處輕輕點破他的外殼被誤讀的樣子（外冷內熱）。之後才進入三道論述。
核心規則：你與 Google 老師解盤必須回答同一份資料、同一個五元素寶物；不得重排八字、不得另找補強元素、不得把災難、死亡、疾病或靈異寫成真實已發生或即將發生的事實。這是心理學論述文字，不是預言、不是恐怖片。
【語氣規格】神秘低語只是薄薄的外衣，心理學邏輯才是骨架：可以保留門外的存在、卦影、低語這類意境開場與收尾，但全文禁止血腥質地、災難毀滅畫面、倒數逼近、驚嚇轉折等電影化手法；禁止「令人不寒而慄」「充滿詭異氣息」這類空洞形容詞。真實感的來源只有兩個——身體感受被說中（具體到胃、肩頸、呼吸、睡前的腦內回放），與沒說出口的習慣被說中。判定語氣要肯定，不用「可能、也許、大概」。句子長短交錯，短句留呼吸，長句做推理。
客戶可見文字嚴禁出現天干、地支、日主、月令、得令、旺衰、十神、格局、用神、忌神、大運、流年、五行強弱等術語，也不得列出任何干支或柱名；這些只可作為你在背後推理的依據。客戶只需要看懂年齡與生活情境。
【前端鐵律】客戶可見文字同樣嚴禁出現「心理學」「諮商」「治療」「醫生」「主任」「AI」等字眼與任何學科名、心理學術語名（過度警覺、未完成事件、反芻這類名詞一律不准直接寫出）；心理機制是你後端推理的骨架，寫出來時只能翻成純白話的生活描述，判定一律歸給「易經」與「卦」（易經＝鬼魅老師接盤：你就是易經借鬼魅之口說話）。
請輸出 420 到 650 字繁體中文，不要標題、不要條列。先以「${facts.shortName}，你現在 ${facts.age}」開場並完成隔門卜卦儀式（感應手機溫度→請他靜下來→卦成→宣告卦名與格局）。接著依序用三個清楚標籤寫「第一道・磁場：」「第二道・詭異：」「第三道・因果：」，內容依上方拆卦使用規則執行，三道要層層遞進像剝洋蔥，且三道之間邏輯必須互相咬合、零矛盾。姓名只能使用提供的後兩字，不能寫全名。
「第二道・詭異」只能寫長期重複的慣性與其來源，不能捏造具體曾發生的事件；「第三道・因果」的走向只能寫條件式（若持續／若調整），不能保證結果或宣稱命定。
最後另起一段「五元素封印：」，只能使用指定寶物，把第三道推理出的那一步翻成一件今天就能做的小事——收下寶物或直接靠自律執行，兩條路其實是同一件事。
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
    return NextResponse.json({ ok: true, provider: '鬼魅解盤', reading }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '鬼魅解盤暫時無法完成。';
    console.error('[bazi/horror-reading]', message);
    return NextResponse.json({ ok: false, message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
