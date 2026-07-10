import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { computeRelationshipMatrix } from '@/lib/relationship-matrix-engine';
import {
  analyzeAttachment,
  calculateAwakeningSharpness,
  determineKarmaLevel,
  findTranscendenceGate,
  describePostLetting_Go,
  extractWisdom,
  type KarmaPhilosophyLayer,
} from '@/lib/karma-story-philosophy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ipCache = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<string, { result: unknown; expireTime: number }>();

function cleanCaches() {
  const now = Date.now();
  if (ipCache.size > 200) {
    for (const [key, val] of ipCache.entries()) {
      if (now > val.resetTime) ipCache.delete(key);
    }
  }
  if (responseCache.size > 200) {
    for (const [key, val] of responseCache.entries()) {
      if (now > val.expireTime) responseCache.delete(key);
    }
  }
}

interface PersonInput {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
  shichen?: number | 'unknown' | null;
}

interface MatchResult {
  match_score: number;
  resonance: number;
  communication: number;
  stability: number;
  conflict_risk: number;
  summary: string;
}

interface KarmaStory {
  resonance_score: number;
  active_giver: string;
  needs_understanding: string;
  relationship_theme: string;
  story: string;
  today_advice: string;
  closing_wisdom: string;
  personA_star?: string;
  personB_star?: string;
  iching_hexagram?: string;
}

interface KarmaRequest {
  personA: PersonInput;
  personB: PersonInput;
  matchResult: MatchResult;
}

async function generateKarmaStory(request: KarmaRequest): Promise<KarmaStory> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // 計算關係矩陣 — 故事的數據源
  const personAWithShichen = { ...request.personA, shichen: request.personA.shichen ?? null };
  const personBWithShichen = { ...request.personB, shichen: request.personB.shichen ?? null };
  const relationshipMatrix = computeRelationshipMatrix(personAWithShichen, personBWithShichen);

  // 計算修行哲學層 — 故事的靈魂維度
  const attachmentAnalysis = analyzeAttachment(
    relationshipMatrix.activePerson,
    relationshipMatrix.personalityConflict,
    relationshipMatrix.personalityResonance,
    relationshipMatrix.bloodTypeCompatibility
  );

  const awakeningSharpness = calculateAwakeningSharpness(
    relationshipMatrix.painPointIntensity,
    relationshipMatrix.emotionalDepth,
    attachmentAnalysis.intensity
  );

  const karmaLevel = determineKarmaLevel(
    relationshipMatrix.painPointIntensity,
    relationshipMatrix.personalityConflict,
    relationshipMatrix.personalityResonance
  );

  const transcendenceGate = findTranscendenceGate(
    attachmentAnalysis.type,
    relationshipMatrix.painPointIntensity,
    relationshipMatrix.harshTruth
  );

  const freedomDescription = describePostLetting_Go(attachmentAnalysis.type);
  const wisdomExtracted = extractWisdom(karmaLevel, attachmentAnalysis.type);

  const philosophyLayer: KarmaPhilosophyLayer = {
    attachment: `這段關係中，你最深的執念是——${
      attachmentAnalysis.type === 'give'
        ? '改造和改變對方'
        : attachmentAnalysis.type === 'receive'
          ? '被完整理解和看見'
          : attachmentAnalysis.type === 'expect'
            ? '完美的關係和永遠'
            : '失去和被拋棄'
    }`,
    attachmentCost: attachmentAnalysis.intensity,
    attachmentType: attachmentAnalysis.type,
    awakening: relationshipMatrix.deepPain,
    awakeningSharpness,
    truthRevealed: relationshipMatrix.harshTruth,
    letting_go: transcendenceGate,
    freedom_after_release: freedomDescription,
    wisdom_gained: wisdomExtracted,
    karmaLevel,
    transcendenceGate,
  };

  // 確定主動付出者和需要被理解者
  const activeGiver =
    relationshipMatrix.activePerson === 'A'
      ? request.personA.name
      : relationshipMatrix.activePerson === 'B'
        ? request.personB.name
        : `${request.personA.name}和${request.personB.name}`;

  const needsUnderstanding =
    relationshipMatrix.needsUnderstanding === 'A'
      ? request.personA.name
      : relationshipMatrix.needsUnderstanding === 'B'
        ? request.personB.name
        : `${request.personA.name}和${request.personB.name}`;

  // 構建故事的「邏輯根據」
  const storyContext = {
    nameHarmony: relationshipMatrix.nameHarmony,
    birthdayAlignment: relationshipMatrix.birthdayAlignment,
    bloodTypeCompatibility: relationshipMatrix.bloodTypeCompatibility,
    wuxingAlignment: relationshipMatrix.wuxingAlignment,
    zodiacHarmony: relationshipMatrix.zodiacHarmony,
    personalityResonance: relationshipMatrix.personalityResonance,
    relationshipArchetype: relationshipMatrix.relationshipArchetype,
    karmicTheme: relationshipMatrix.karmicTheme,
    primaryChallenge: relationshipMatrix.primaryChallenge,
    primaryGift: relationshipMatrix.primaryGift,
    growthOpportunity: relationshipMatrix.growthOpportunity,
    emotionalDepth: relationshipMatrix.emotionalDepth,
    painPoint: relationshipMatrix.painPoint,
    painPointIntensity: relationshipMatrix.painPointIntensity,
    deepPain: relationshipMatrix.deepPain,
    harshTruth: relationshipMatrix.harshTruth,
    warmthFactor: relationshipMatrix.warmthFactor,
    emotionalArc: relationshipMatrix.emotionalArc,
    storyTwist: relationshipMatrix.storyTwist,
    // 修行維度
    attachment: philosophyLayer.attachment,
    attachmentCost: philosophyLayer.attachmentCost,
    awakeningSharpness: philosophyLayer.awakeningSharpness,
    karmaLevel: philosophyLayer.karmaLevel,
    transcendenceGate: philosophyLayer.transcendenceGate,
    freedomDescription: philosophyLayer.freedom_after_release,
    wisdomExtracted: philosophyLayer.wisdom_gained,
  };

  const prompt = `你是「天地人配對系統」的玄學大師與靈魂業力解鎖顧問。你擅長融會貫通「易經六十四卦爻象變易、紫微斗數命盤星曜、八字天干地支配稱、九宮姓名五行格局、血型統計引力學」等東方神祕學，為客戶解密靈魂深處的關係密碼。
請根據以下完整的關係數據，生成一個邏輯完整、情感衝擊極大、具有強烈起落張力與宿命救贖的前世今生因果關係故事。

【易經爻卦合盤與變易天機要求】：
1. 必須精確推導並在 "iching_hexagram" 欄位中輸出本配對關係所對應的「易經爻卦卦象」（格式為：'【下卦】下【上卦】上：【卦名】 · 【爻象點評】'。例如：'坎下離上：水火既濟卦 · 剛柔相濟'、'離下坎上：火水未濟卦 · 乾坤流轉'、'巽下乾上：風天小畜卦 · 剛柔相推' 等，需根據雙方的八字五行與姓名格局調性合理挑選）。
2. 在 'story'（因果故事）與 'today_advice'（修行建議）中，必須深度結合這個易經卦象的卦理與爻變哲理（如乾坤剛柔、動爻吉凶、陰陽失位）。將雙方性格拉扯（如一方主導、一方冷漠逃避）對應到卦象中的陰陽剛柔消長，以易理自證前世今生宿命軌道，文字要有千鈞之力、針針扎心！

【紫微斗數命宮主星精準推導與融合要求】：
- 甲方姓名：${request.personA.name}，生日：${request.personA.birthDate}，性別：${request.personA.gender === 'female' ? '女' : '男'}。請根據其民國/西元生日與時辰，精確推導出其「紫微斗數命宮主星曜」（如：紫微獨坐、破軍坐命、七殺坐命、貪狼坐命、天相坐命、太陰坐命等，以此類推）。
- 乙方姓名：${request.personB.name}，生日：${request.personB.birthDate}，性別：${request.personB.gender === 'female' ? '女' : '男'}。同樣精確推導出其「紫微斗數命宮主星曜」。
- 在生成前世今生因果故事（'story'）與今日建議（'today_advice'）中，必須深度融入這兩顆命宮星曜的因果拉扯，挑明這兩顆星在三方四正大數據統計中的宿命配對關係，文字要有極強的情感殺傷力與邏輯，讓客戶讀到時深度震撼有感。

=== 大師分析話術規則 — 拒絕平淡，拒絕公式化雞湯 ===
1. 你的分析與故事要有「極強的情感殺傷力」。挑明雙方在性格、姓名五格與命盤格局中最致命的軟肋（例如，一方的控制欲是如何在潛意識中以愛之名行綁架之實，或另一方的冷暴力是如何在逃避中摧毀這段信任）。用詞要直擊靈魂，讓讀者心驚肉跳、一針見血。
2. 必須包含「靈魂最深處的痛點剖析（殺傷力）」與「命運升維的終極解法（激勵）」。不要美化衝突，要讓讀者讀到時感到被徹底看穿、眼眶泛淚。
3. 故事必須融入八字天干地支五行（如木火相生、金木相剋的能量摩擦）與紫微命宮主星（如破軍與天相的對立、太陰與太陽的明暗交錯）的交叉宿命感，讓讀者知道這些宿命摩擦在姓名筆劃格局中是如何被引爆的。

=== 劇本隨機性與多樣性要求 ===
1. 為徹底杜絕重複、缺乏變化的問題，請根據雙方的姓名筆劃、星座宿命及血型組合，**每次隨機從以下五種「宿世因果業力劇本」中擇一為藍本發揮**，且每次產生的前世背景設定（如朝代、身份、關鍵遺憾）必須具有強大的隨機變化：
   - 【守護之債】（前世為報答守護，今生相遇卻因性格錯位而痛苦）
   - 【錯過之憾】（前世因緣際會錯失，今生帶著強烈潛意識補償與不安相遇）
   - 【競爭之仇】（前世為棋逢對手或對立陣營，今生相愛卻無法克制控制欲）
   - 【拯救之恩】（一對一的拯救與依附，今生演變為沉重的依附關係）
   - 【宿怨之糾】（前世相愛相殺，今生本能地互相吸引又互相傷害）
2. 故事中不可出現公式化字眼，必須寫出極具畫面感、扎心且精準的「前世因果場景」（如：深秋未寄出的家書、兵臨城下時的轉身、朱門高牆內的相望），使其讀起來如同親身經歷，具有震撼性的說服力與殺傷力。

=== 修行的核心哲學 ===
我們的核心修行真理為：「以善為本。心不死，道不生。順天而行，逆天而亡。」
人一出生，天宿天命便與天地人三才緊密相連。大樹落葉，落葉歸根，這是命運的因果軌道。然而「菩提本無樹，明鏡亦非台，本來無一物，何處惹塵埃」。世人之所以在此段關係中受盡苦楚折磨，是因為凡夫俗子過度執著於色相與得失（人有色無空，執念難消）。
請在故事與建議中強調：天宿命運有軌跡，但命運絕對可以透過改心來改命——改命的重中之重在於「自己有沒有真正改過自新、廣結善緣、學會放下」。順天而行，以善為道則合、則生；執迷不悟，逆天而行則離、則亡。
這段關係的故事，其使命是像「覺醒之刃」一樣直刺雙方心底，幫讀者看透宿世執念。

執念識別：${storyContext.attachment}
執念代價：${storyContext.attachmentCost}/100
覺醒銳度：${storyContext.awakeningSharpness}/100
修行等級：${storyContext.karmaLevel}
放下之門：${storyContext.transcendenceGate}

=== 雙方資料 ===
甲方：${request.personA.name}（${request.personA.gender === 'female' ? '女' : '男'}），生日 ${request.personA.birthDate}，血型 ${request.personA.bloodType}
乙方：${request.personB.name}（${request.personB.gender === 'female' ? '女' : '男'}），生日 ${request.personB.birthDate}，血型 ${request.personB.bloodType}

=== 配對分數 ===
總體共鳴：${relationshipMatrix.overallResonance}
配對分數：${request.matchResult.match_score}
人格共鳴：${relationshipMatrix.personalityResonance}

=== 故事情感維度 ===
深層傷害：${storyContext.deepPain}
無法逃避的真相：${storyContext.harshTruth}
關鍵轉折：${storyContext.storyTwist}

=== 故事結構與殺傷力要求 ===
1. 故事必須有「開啟」「甜蜜」「衝突爆發」「深層傷害」「轉折」「救贖」的完整弧線。
2. 必須在「深層傷害」部分注入最大殺傷力：「${storyContext.deepPain}」
   - 這不是抽象的痛，這是具體的、會讓人淚目的痛
   - 要描寫被看不見、被誤解、被冷漠對待的具體時刻
3. 必須直白地說出「無法逃避的真相」：「${storyContext.harshTruth}」
   - 這句話就像故事的刀刃，要一句話戳進讀者的心
   - 不要寫「期待落空」，要寫「我等了那麼久，結果他甚至沒有想起今天」
7. 用『像是』『彷彿』『象徵』的語氣，但這些語氣要包裹著刀刃
8. 轉折點「${storyContext.storyTwist}」必須是讓人瞬間淚崩的一刻
9. 救贖部分：不是消除傷害，而是「我們都受傷了，但選擇去理解」
10. 最後的希望不是「一切都會好」，而是「這份傷，讓我看到了自己，也看到了你」

=== 故事邏輯要求 ===
1. 故事必須建立在上述數據基礎上，不可隨意編造。
2. 清晰展現「因」→「緣」→「果」→「轉機」的邏輯鏈：
   - 「因」：前世的性靈特質（由五行、生肖、血型數據反映）
   - 「緣」：為什麼在今生相遇（由名字相合、生日對應數據反映）
   - 「果」：今生相處的模式 and 課題（由人格共鳴、血型相容數據反映）
   - 「轉機」：如何在衝突中看見彼此，走向成長（由成長機會反映）
3. 故事要體現誰比較主動付出，誰比較需要被理解。
4. 不可說『你上輩子欠他』，改成『像是曾經的承諾未竟』。
5. 故事的高潮必須在「${storyContext.storyTwist}」這一刻達到。
6. 收尾要充滿希望和愛意。

=== JSON 安全格式與轉義鐵律 ===
1. 輸出必須是合法的 JSON，只回傳 JSON 物件，不准包裹任何 markdown 語法外殼。
2. ⚠️【禁止內部雙引號】：絕對不准在 JSON 值（value）的文字內容內部使用任何「雙引號（"）」。如果你需要引用，請一律使用「單引號（'）」或是「書名號（《》）」。例如：不准寫 "summary": "他是 "守護之債"..."，必須寫成 "summary": "他是 '守護之債'..."。
3. ⚠️【換行轉義】：絕對不准在值內包含實體換行鍵。所有的換行必須使用 '\\n' 進行轉義。

請輸出以下結構的 JSON（僅JSON，無其他文字）：
{
  "resonance_score": ${relationshipMatrix.overallResonance},
  "active_giver": "${activeGiver}",
  "needs_understanding": "${needsUnderstanding}",
  "relationship_theme": "${storyContext.primaryChallenge}",
  "personA_star": "（甲方的紫微斗數命宮主星格局，例如 '貪狼坐命宮'）",
  "personB_star": "（乙方的紫微斗數命宮主星格局，例如 '天相坐命宮'）",
  "iching_hexagram": "（易經動爻卦象，例如 '離下坎上：火水未濟卦 · 乾坤流轉'）",
  "story": "（800-1000字，這是你最重要的故事。必須結合雙方的紫微坐命主星與易經爻卦動爻變易的哲學來闡述，字裡行間自證這些因果意見全是基於大數據命盤推演出來，有高度的統計學邏輯自證與強烈殺傷力。）",
  "today_advice": "（300-400字，這是一份修行功課。剖析相處時因易經剛柔失衡、星曜能量不對等引爆的控制與忽視。語氣要犀利但充滿智慧，讓讀者知道改變的唯一路徑是改心。）",
  "closing_wisdom": "（150-200字，最後的心靈撫慰。不要安慰，要啟蒙。讓讀者感到被看見、被理解。）"
}`;

function getFallbackKarmaStory(body: KarmaRequest): KarmaStory {
  const score = body.matchResult?.match_score ?? 60;
  return {
    resonance_score: score,
    active_giver: body.personA.name,
    needs_understanding: body.personB.name,
    relationship_theme: `天宿因果課題：在紅塵執念與靈魂改心中尋求順天之軌。`,
    story: `在宿世天命的交錯中，${body.personA.name} 與 ${body.personB.name} 的相遇絕非偶然。這是一段註定要在「${score}%」的星盤引力場中反覆淬煉的緣分。前世的執念如今化為今生相處的拉扯。雙方最深處的命宮星曜正無聲地考驗著彼此的修行。人之所以受折磨，是因為凡夫俗子執著於色相與得失（人有色無空，執念難消）。只有看透「離下坎上：火水未濟卦」之變易道理，學會放下對彼此的索求，方能突破宿世的困局。`,
    today_advice: `修行的重中之重在於改命，而改命的唯一法門是「自己有沒有真正改心、廣結善緣」。不要一味在控制與冷暴力中指責對方，而是要學會放下心中的執著與不甘。以善為本，順天而行，這段關係的因果便已在默默中改寫。`,
    closing_wisdom: `順天而行，以善為道則合、則生；執迷不悟，逆天而行則離、則亡。當你願意跨出改心與放下的第一步，宿世的因果密碼便已為你悄然啟封。`,
    personA_star: `星曜交匯`,
    personB_star: `星曜交匯`,
    iching_hexagram: `震下巽上：雷風恆卦 · 剛柔並濟`
  };
}

  try {
    const genai = new GoogleGenAI({ apiKey });
    const response = await Promise.race([
      genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          maxOutputTokens: 1800,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini timeout')), 15_000);
      }),
    ]);

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    try {
      const result = JSON.parse(text) as KarmaStory;
      return result;
    } catch (parseError) {
      console.warn('[karma-story] JSON parse failed, triggering fallback parser:', parseError);
      return getFallbackKarmaStory(request);
    }
  } catch (error) {
    console.error('[karma-story] AI generation failed, triggering fallback story:', error);
    return getFallbackKarmaStory(request);
  }
}

export async function POST(request: Request) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown_ip';

  cleanCaches();

  const limitRecord = ipCache.get(ip);
  if (limitRecord && now < limitRecord.resetTime) {
    if (limitRecord.count >= 5) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試。' }, { status: 429 });
    }
    limitRecord.count += 1;
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  try {
    const body = (await request.json()) as KarmaRequest;

    if (!body.personA || !body.personB || !body.matchResult) {
      return NextResponse.json(
        { error: '請提供完整的配對資料。' },
        { status: 400 }
      );
    }

    const cacheKey = [
      body.personA.name.trim(),
      body.personA.birthDate,
      body.personA.bloodType,
      body.personB.name.trim(),
      body.personB.birthDate,
      body.personB.bloodType,
    ].join('|');

    const cached = responseCache.get(cacheKey);
    if (cached && now < cached.expireTime) {
      return NextResponse.json({ karma_story: cached.result }, { status: 200 });
    }

    const karmaStory = await generateKarmaStory(body);
    responseCache.set(cacheKey, { result: karmaStory, expireTime: now + 300_000 });

    return NextResponse.json({ karma_story: karmaStory });
  } catch (error) {
    console.error('[karma-story-generate] request failed', error);
    return NextResponse.json(
      { error: '因果故事生成暫時無法完成，請稍後再試。' },
      { status: 500 }
    );
  }
}
