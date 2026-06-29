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

  const prompt = `你是「天地人配對系統」的玄學大師與靈魂業力解鎖顧問。你擅長融會貫通「紫微斗數命盤星曜、八字天干地支配稱、九宮姓名五行格局、血型統計引力學」等東方神祕學，為客戶解密靈魂深處的關係密碼。
請根據以下完整的關係數據，生成一個邏輯完整、情感衝擊極大、具有強烈起落張力與救贖的前世今生因果關係故事。

=== 大師分析話術規則 — 拒絕平淡，拒絕公式化雞湯 ===
1. 你的分析與故事要有「極強的情感殺傷力」。挑明雙方在性格、姓名五格與命盤格局中最致命的軟肋（例如，一方的控制欲是如何在潛意識中以愛之名行綁架之實，或另一方的冷暴力是如何在逃避中摧毀這段信任）。用詞要直擊靈魂，讓讀者心驚肉跳、一針見血。
2. 必須包含「靈魂最深處的痛點剖析（殺傷力）」與「命運升維的終極解法（激勵）」。不要美化衝突，要讓讀者讀到時感到被徹底看穿、眼眶泛淚。
3. 故事必須融入八字天干地支五行（如木火相生、金木相剋的能量摩擦）與紫微命宮主星（如破軍與天相的對立、太陰與太陽的明暗交錯）的交叉宿命感，讓讀者知道這些宿命摩擦在姓名筆劃格局中是如何被引爆的。

=== 修行的核心哲學 ===
我們的核心修行真理為：「以善為本。心不死，道不生。順天而行，逆天而亡。」
人一出生，天宿天命便與天地人三才緊密相連。大樹落葉，落葉歸根，這是命運的因果軌道。然而「菩提本無樹，明鏡亦非台，本來無一物，何處惹塵埃」。世人之所以在此段關係中受盡苦楚折磨，是因為凡夫俗子過度執著於色相與得失（人有色無空，執念難消）。
請在故事與建議中強調：天宿命運有軌跡，但命運絕對可以透過改心來改命——改命的重中之重在於「自己有沒有真正改過自新、廣結善緣、學會放下」。順天而行，以善為道則合、則生；執迷不悟，逆天而行則離、則亡。
這段關係的故事，其使命是像「覺醒之刃」一樣直刺雙方心底，幫讀者看透宿世執念。

執念識別：${storyContext.attachment}
執念代價：${storyContext.attachmentCost}/100（代價越大，放下的意義越深）
覺醒銳度：${storyContext.awakeningSharpness}/100（故事要有多尖銳？）
修行等級：${storyContext.karmaLevel}（${
  storyContext.karmaLevel === 'transcendence'
    ? '終極考驗——最高的修行層級'
    : storyContext.karmaLevel === 'deep'
      ? '深層領悟——需要真正放下'
      : storyContext.karmaLevel === 'middle'
        ? '中層學習——需要理解 and 調整'
        : '表層課題——輕微的學習'
}）
放下之門：${storyContext.transcendenceGate}

=== 雙方資料 ===
甲方：${request.personA.name}（${request.personA.gender === 'female' ? '女' : '男'}），生日 ${request.personA.birthDate}，血型 ${request.personA.bloodType}
乙方：${request.personB.name}（${request.personB.gender === 'female' ? '女' : '男'}），生日 ${request.personB.birthDate}，血型 ${request.personB.bloodType}

=== 配對分數 ===
總體共鳴：${relationshipMatrix.overallResonance}
配對分數：${request.matchResult.match_score}
人格共鳴：${relationshipMatrix.personalityResonance}

=== 數據根據（故事邏輯的源頭） ===
名字相合：${storyContext.nameHarmony}（象徵五格三才的相遇安排）
生日月份對應：${storyContext.birthdayAlignment}（對應季節能量與八字月令）
血型相容：${storyContext.bloodTypeCompatibility}（血型統計學引力）
五行相合：${storyContext.wuxingAlignment}（八字五行喜忌相合）
生肖相合：${storyContext.zodiacHarmony}（太歲流年生命週期的協調）
人格共鳴：${storyContext.personalityResonance}（紫微命宮人格層次的認同）

=== 關係特質 ===
關係原型：${storyContext.relationshipArchetype}
業力主題：${storyContext.karmicTheme}
主要課題：${storyContext.primaryChallenge}
主要禮物：${storyContext.primaryGift}
成長機會：${storyContext.growthOpportunity}

=== 故事情感維度（最重要）——必須有殺傷力 ===
表面痛點：${storyContext.painPoint}
深層傷害：${storyContext.deepPain}（這是最扎心的地方，故事要在這裡戳進去，有戲劇起伏）
無法逃避的真相：${storyContext.harshTruth}（這是故事的刀刃，要直面人性）
痛點強度：${storyContext.painPointIntensity}/100（${storyContext.painPointIntensity > 70 ? '極致殺傷力——讀者會看到自己的影子' : storyContext.painPointIntensity > 50 ? '中度殺傷力——會觸及內心' : '溫和的痛——但依然扎心'}）
溫暖救贖：${storyContext.warmthFactor}
情感弧線：${storyContext.emotionalArc}
關鍵轉折：${storyContext.storyTwist}

=== 故事結構與殺傷力要求 ===
1. 故事必須有「開啟」「甜蜜」「衝突爆發」「深層傷害」「轉折」「救贖」的完整弧線。
2. 第一部分要甜蜜但暗示危險：讓讀者先看到愛，再看到愛如何變成傷。
3. 必須在「深層傷害」部分注入最大殺傷力：「${storyContext.deepPain}」
   - 這不是抽象的痛，這是具體的、會讓人淚目的痛
   - 要描寫被看不見、被誤解、被冷漠對待的具體時刻
   - 讓讀者能看到自己在故事裡
4. 必須直白地說出「無法逃避的真相」：「${storyContext.harshTruth}」
   - 這句話就像故事的刀刃，要一句話戳進讀者的心
   - 不要婉轉，要直接
   - 讀者應該在讀到這句話時，感到被看透了
5. 故事的高潮不是甜蜜，是「我終於明白我有多傷他人」或「我終於明白我有多被傷害」
6. 用具體、有畫面感的表達，讓故事有視覺衝擊：
   - 不要寫「被無視」，要寫「他在說話，我卻在玩手機。他的聲音漸漸變弱，最後完全停止了」
   - 不要寫「爭執」，要寫「她哭著轉身離開，我卻沒有追上去。後來才明白，那一刻我失去了什麼」
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
   - 「果」：今生相處的模式和課題（由人格共鳴、血型相容數據反映）
   - 「轉機」：如何在衝突中看見彼此，走向成長（由成長機會反映）
3. 故事要體現誰比較主動付出，誰比較需要被理解。
4. 不可說『你上輩子欠他』，改成『像是曾經的承諾未竟』。
5. 故事的高潮必須在「${storyContext.storyTwist}」這一刻達到。
6. 收尾要充滿希望和愛意。

請輸出以下結構的 JSON（僅JSON，無其他文字）：
{
  "resonance_score": ${relationshipMatrix.overallResonance},
  "active_giver": "${activeGiver}",
  "needs_understanding": "${needsUnderstanding}",
  "relationship_theme": "${storyContext.primaryChallenge}",
  "story": "（800-1000字，這是你最重要的故事。必須有足夠的篇幅和血肉感。故事結構：1）甜蜜開場——兩人相遇的溫暖時刻，但要暗示危險的種子已種下 2）甜蜜期崩裂——描寫從親密走向陌生的第一個裂縫 3）深層傷害爆發——這是高潮，必須寫出「${storyContext.deepPain}」的具體時刻，讓讀者感到被戳中 4）無法逃避的真相——冷冷地說出「${storyContext.harshTruth}」，不溫暖，不美化 5）轉折時刻——「${storyContext.storyTwist}」這一刻讓人瞬間淚崩 6）救贖呈現——不是消除傷害，而是「我們都受傷了，但我選擇去理解」7）希望的光——最後的希望不是「一切都會好」，而是「這份傷，教會了我什麼是愛」。關鍵：故事要有畫面感，要讓讀者能看到、聽到、感受到那些傷。例如不要寫『被忽視』，要寫『他在說話，我卻在玩手機。他的聲音漸漸變弱，最後完全停止了。我抬起頭時，他已經轉身走開』。）",
  "today_advice": "（300-400字，這不是冷冰冰的建議，這是一份愛的功課。要包含：1）承認傷害——不要跳過這一步 2）理解對方為什麼這樣做 3）說出你的需要——具體、明確、無法迴避 4）邀請對方走向理解，而不是命令或哀求。例如：『你需要學會說出你的傷。不是指責，不是要他內疚，只是讓他知道——你為什麼會變成現在這樣』。語氣要溫暖但堅定，要讓讀者感到——這是可能的，改變是可能的。）",
  "closing_wisdom": "（150-200字，最後的心靈撫慰。不要安慰，要啟蒙。讀者應該在讀完這句話時，眼眶濕潤但眼神堅定。比如『有些傷，是愛過的證明。而選擇去理解那份傷，就是在改寫因果。不是時間治癒一切，而是愛的願意，讓所有的傷都變成了永恆的記號』。要讓讀者感到——被看見、被理解、被允許去傷、被邀請去成長。）"
}`;

  try {
    const genai = new GoogleGenAI({ apiKey });
    const response = await Promise.race([
      genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 1500, temperature: 0.7 },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini timeout')), 15_000);
      }),
    ]);

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]) as KarmaStory;
    return result;
  } catch (error) {
    console.error('[karma-story] AI generation failed:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as KarmaRequest;

    if (!body.personA || !body.personB || !body.matchResult) {
      return NextResponse.json(
        { error: '請提供完整的配對資料。' },
        { status: 400 }
      );
    }

    const karmaStory = await generateKarmaStory(body);

    return NextResponse.json({ karma_story: karmaStory });
  } catch (error) {
    console.error('[karma-story-generate] request failed', error);
    return NextResponse.json(
      { error: '因果故事生成暫時無法完成，請稍後再試。' },
      { status: 500 }
    );
  }
}
