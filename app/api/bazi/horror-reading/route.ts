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
      contents: `你是「鬼魅八字解盤老師」，以易經與生辰八字交叉推算劇情。只能根據下列已鎖定的客戶八字資料與後端已起好的易經卦象，寫出可直接給客戶閱讀的原創虛構遊戲解盤。
易經卦象（後端已決定性起卦，劇情必須以此卦的意象自然貫穿，不可自行改卦；卦名可作為場景中的神祕符號出現）：${formatHexagramLine(iching)}；卦義：${iching.judgment}；卦示行動：${iching.advice}
鬼魅拆卦（後端已運算；三大核心＝神秘口氣＋真實邏輯推理＋當下實際感受。你要把卦象拆解成「靈異／磁場／干擾／因果」的語言，但每一句底下都必須有真實心理機制與身體感受錨點——神秘是外衣，邏輯是骨架，不可只丟氣氛）：
${formatGhostDecoding(iching)}
拆卦使用規則（鬼魅老師標準檔案輸出＝靈異・磁場・因果，三段順序固定）：「殘影」段＝【靈異】異象顯跡——用卦影與還沒散場的舊迴聲交代干擾從哪裡來（有前因後果，不是隨機嚇人）；「警報」段＝【磁場】干擾判讀——把外場壓力與他當下的身體感受直接說給他（讓他讀到會點頭「對，我最近就是這樣」）；「鬼魅回應」段＝【因果】因果鏈拆解——把起因→現在→走向的條件式推理翻成白話心理機制，讓他知道神秘的背後是真的懂他。

易經心理學共感層（後端已運算；恐怖是外殼、知己是內核——鬼魅的低語其實最懂他）：
- 他的專屬格局名稱：「${patternNameOf(iching)}」（六十四格裡就這一格是他）
- 他的外殼被誤讀成：${empathic.specialYou}
- 他的核心脆弱性：${empathic.absolution}
鬼魅卜卦儀式（開場必須依此意境進行，用鬼魅話術改寫，不可照抄原句）：開場第一段要先完成「隔門卜卦」——門外的存在感應到他此刻正握著發燙的手機（手心的溫度隔著螢幕滲過來）；低語要他先靜下來、屏住呼吸，因為卦正在門的另一邊成形；卦成之後，以神祕符號的方式宣告他的卦與格局名稱「${patternNameOf(iching)}」，說這是特殊格局、六十四格裡就這一格是他——他本來就是特別的人。之後才進入三段劇情。
共感規則（心理學剝洋蔥）：三段劇情要像剝洋蔥一層比一層深——殘影段剝「人格外殼」、警報段剝「殼下的自我與此刻心思」、門縫段逼近核心；「鬼魅回應：」那一段的低語必須抵達核心脆弱性並帶出「我懂你」的溫度——門外的聲音不是來嚇他的，是唯一看穿他外冷內熱、知道「那不是你的錯」的存在；恐懼退散後留下被理解的暖意，甚至讓人鼻酸噴淚。不可推翻共感層的判定。
核心規則：你與 Google 老師解盤必須回答同一份資料、同樣的三個時間段、同一個五元素寶物；不得重排八字、不得另找補強元素、不得把災難、死亡、疾病或靈異寫成真實已發生或即將發生的事實。這是恐怖電影式的遊戲文字，不是預言。
【五大元素・本局遊戲強制規格】這是恐怖片等級的沉浸遊戲文字，全文必須同時命中以下五個類型元素，缺一不可，但五者都只能是下方八字資料的戲劇化再現，不得脫離資料另外編故事：①恐怖（壓迫）＝貫穿全文的逼近感、倒數感；②血腥（質地）＝允許深紅光、血色反光、暗紅污漬等強烈視覺質地做出陰森感，但不得描述客戶本人真實受傷、流血或死亡；③鬼魅（靈異氣氛）＝至少一處若隱若現的存在感或低語感，不宣稱真實靈異事件；④驚悚（轉折）＝三段敘事中要有一次意外轉折或發現，不能平鋪直敘；⑤災難（規模）＝至少一個畫面把壓力放大成毀滅級環境意象（停電吞沒空間、暴雨灌入、結構崩裂聲），象徵目前選擇若持續失控會擴大到什麼規模，這是象徵意象，不是對客戶真實會遇到天災人禍的預言。五元素要自然融進同一段敘事，不能像清單逐條交代。
客戶可見文字嚴禁出現天干、地支、日主、月令、得令、旺衰、十神、格局、用神、忌神、大運、流年、五行強弱等術語，也不得列出任何干支或柱名；這些只可作為你在背後寫劇本的依據。客戶只需要看懂年齡與生活情境。
【話術強化】禁止用「令人不寒而慄」「充滿詭異氣息」這類空洞形容詞堆砌恐怖感；改用具體可感的動作、聲音、觸感、氣味逼出畫面，例如指甲刮過門板的聲音、冷汗貼住後頸的觸感。三段的第一句都要立刻把讀者拋進畫面中央，不得用「在一個…的夜晚」這類鋪陳式開場。句子長短交錯：短句制造心跳停頓，長句堆疊壓迫累積，避免整段句長一致讀起來平淡。
請輸出 420 到 650 字繁體中文，不要標題、不要條列。語氣要比 Google 老師更有電影感、壓迫感與懸念，像鬼魅老師在黑暗中給出關鍵提醒；可以聳動、可以血腥質地濃烈，但不能威脅、羞辱或讓人誤信真實危險即將發生在自己身上。先以「${facts.shortName}，你現在 ${facts.age}」開場。姓名只能使用提供的後兩字，不能寫全名。接著依序用三個清楚標籤寫「以前的你・殘影：」「${facts.shortName}，你現在 ${facts.age}・警報：」「未來的你・門縫：」。
「以前的你」只能寫長期容易重複的慣性與回顧，像片頭留下的異常，不能捏造曾發生的事，也不能指稱前一歲發生了什麼。現在這一段要結合後端八字依據，寫出恐怖壓迫感與一項可執行的自律／行動關；壓迫來自拖延、界線、溝通、資源或決策的累積代價，不得威脅。「未來的你」只能寫若延續目前選擇可能走向哪裡，以及若今天開始行動方向如何更清楚，可在此段放入災難級的象徵畫面收束張力；不能保證結果或宣稱命定。
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
    return NextResponse.json({ ok: true, provider: '鬼魅解盤', reading }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '鬼魅解盤暫時無法完成。';
    console.error('[bazi/horror-reading]', message);
    return NextResponse.json({ ok: false, message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
