/**
 * 三位 易經老師（2026-08-22）｜規格「二、三、八、九、十、二十」
 *
 * 鐵律：三位老師只能讀 `PalaceAnalysisContext`（已驗證的正式命盤資料），
 * 不得自行安星、改宮位、改四化、猜三方四正、補不存在的星曜。
 * 三位老師視角必須真正不同：
 *   命盤解析老師（STRUCTURE_MASTER）——解析命盤：本宮→主星→三方四正→四化→輔煞→格局總判。
 *   恐怖型老師（LIFE_MASTER）——危機解盤：只從已存在的壓力、煞曜與化忌指出需要正視的風險。
 *   鬼魅型老師（NARRATIVE_MASTER）——鬼魅解盤：把宮位/星曜/四化轉成可回查的幽微場景與隱喻。
 * 三個 prompt 互相明確禁止做對方的事，這是落實「不得互相複製」的第一道防線
 * （規格「十一」的自動語意相似度檢查列入 Phase 2）。
 */

import { GoogleGenAI, Type } from '@google/genai';
import { castHexagram, formatHexagramLine } from '@/lib/iching-engine';
import { formatGhostDecoding, patternNameOf } from '@/lib/iching-psychology';
import type {
  LifeTeacherResult,
  NarrativeTeacherResult,
  PalaceAnalysisContext,
  PalaceId,
  StructureTeacherResult,
  TeacherId,
} from './types';
import { INSUFFICIENT_DATA } from './types';

const MODEL_NAME = 'gemini-2.5-flash';
const TEACHER_TIMEOUT_MS = 20000;

/**
 * TeacherModelRouter（Phase 1 精簡版，規格「十九」）：老師角色不綁死模型品牌——
 * Customer UI 永遠只看到老師角色，實際呼叫哪個模型設定由這裡決定。
 * 目前三位老師都指向同一個 Gemini 模型，但各自有獨立的 config 物件，
 * 之後要換不同供應商，只需要改這裡，不用動 prompt 或 UI。
 */
const TEACHER_MODEL_ROUTE: Record<TeacherId, { model: string; temperature: number }> = {
  STRUCTURE_MASTER: { model: MODEL_NAME, temperature: 0.4 }, // 理性精準，低溫度
  LIFE_MASTER: { model: MODEL_NAME, temperature: 0.7 },
  NARRATIVE_MASTER: { model: MODEL_NAME, temperature: 1.0 }, // 象徵敘事，高溫度才有畫面感
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function safeJsonParse<T>(text: string): T {
  const fenced = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(fenced) as T;
}

/** 客戶看到前，將危機敘事拉回「有條件的風險」，不能把命盤推論寫成命定事件。 */
function normalizeRiskLanguage(text: string): string {
  return text
    .replaceAll('最終會', '若持續忽視，容易')
    .replaceAll('將導致', '容易演變為')
    .replaceAll('必然', '高度需要警覺的')
    .replaceAll('無法挽回', '難以收拾')
    .replaceAll('明確指出', '顯示出')
    .replaceAll('一定會', '容易會');
}

function normalizeLifeResult(result: Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'>): Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'> {
  return Object.fromEntries(
    Object.entries(result).map(([key, value]) => [key, typeof value === 'string' ? normalizeRiskLanguage(value) : value]),
  ) as Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'>;
}

/** 鬼魅老師沒有客戶性別資料可讀；人物稱呼一律保持中性，不能自行指定性別或身份。 */
function normalizeNarrativeIdentity(text: string): string {
  return text
    .replaceAll('男主角', '這個人')
    .replaceAll('女主角', '這個人')
    .replaceAll('男人', '這個人')
    .replaceAll('女人', '這個人')
    .replaceAll('男子', '這個人')
    .replaceAll('女子', '這個人')
    .replaceAll('他們', '那些人')
    .replaceAll('她們', '那些人')
    .replaceAll('他', '這個人')
    .replaceAll('她', '這個人');
}

function normalizeNarrativeResult(result: Omit<NarrativeTeacherResult, 'teacherId' | 'evidenceRefs'>): Omit<NarrativeTeacherResult, 'teacherId' | 'evidenceRefs'> {
  return {
    ...result,
    visualTitle: normalizeNarrativeIdentity(result.visualTitle),
    scene: normalizeNarrativeIdentity(result.scene),
    mainCharacter: normalizeNarrativeIdentity(result.mainCharacter),
    story: normalizeNarrativeIdentity(result.story),
    pastEcho: normalizeNarrativeIdentity(result.pastEcho),
    futureShadow: normalizeNarrativeIdentity(result.futureShadow),
    finalMetaphor: normalizeNarrativeIdentity(result.finalMetaphor),
    symbols: (result.symbols ?? []).map((symbol) => ({
      ...symbol,
      symbol: normalizeNarrativeIdentity(symbol.symbol),
      meaning: normalizeNarrativeIdentity(symbol.meaning),
      sourceRef: normalizeNarrativeIdentity(symbol.sourceRef),
    })),
  };
}

/* ---------------- 共用：把 Context 序列化成老師能讀的固定格式文字 ---------------- */

function renderPalaceBlock(label: string, palace: PalaceAnalysisContext['selectedPalace']) {
  const major = palace.majorStars.map((s) => s.name).join('、') || '（無主星）';
  const supporting = palace.supportingStars.map((s) => s.name).join('、') || '無';
  const malefic = palace.maleficStars.map((s) => s.name).join('、') || '無';
  const trans = palace.transformations.map((t) => `${t.starName}化${{ LU: '祿', QUAN: '權', KE: '科', JI: '忌' }[t.type]}`).join('、') || '無';
  return `【${label}：${palace.palaceName}】\n主星：${major}\n輔星：${supporting}\n煞曜：${malefic}\n四化：${trans}`;
}

function renderContext(context: PalaceAnalysisContext): string {
  return [
    renderPalaceBlock('本宮', context.selectedPalace),
    renderPalaceBlock('三合宮 A', context.threeHarmony.harmonyA),
    renderPalaceBlock('三合宮 B', context.threeHarmony.harmonyB),
    renderPalaceBlock('對宮', context.threeHarmony.opposite),
  ].join('\n\n');
}

/** 每一宮的易經卦象：以宮名＋主星＋流年決定性起卦，三位老師（含鬼魅老師）共用同一卦。 */
function castPalaceHexagram(context: PalaceAnalysisContext) {
  return castHexagram(
    context.selectedPalace.palaceName,
    context.selectedPalace.majorStars.map((s) => s.name).join(','),
    context.timeContext.annualYear,
  );
}

function renderIChing(context: PalaceAnalysisContext): string {
  const gua = castPalaceHexagram(context);
  return `【易經卦象（後端已決定性起卦，解讀時必須引用印證，不可自行改卦）】\n${formatHexagramLine(gua)}\n此盤此宮的解讀格局名稱（引用時必須一字不差，禁止改名、縮寫或自創別名）：「${patternNameOf(gua)}」\n卦義：${gua.judgment}\n卦示行動：${gua.advice}\n卜卦規則（硬性要求，違反即不合格）：三位老師必須共用上方同一個正式卦象，禁止另起第二卦、改卦或自行補卦。客戶可讀內容只需自然呈現一次卦名「${gua.hexagramName}」與格局名稱「${patternNameOf(gua)}」；其餘內容直接解讀本宮、主星、三方四正與四化，不得重複儀式句或宣稱此格局全球唯一。`;
}

function renderTimeContext(context: PalaceAnalysisContext): string {
  const time = context.timeContext;
  return `【隱藏的當下情境層：僅供推理，不得逐字展示給客戶】\n目前年齡：${time.currentAge === null ? '資料不足' : `${time.currentAge} 歲`}\n流年：${time.annualYear}${time.annualLevel ? `・${time.annualLevel}` : ''}${time.annualTheme ? `\n流年主題：${time.annualTheme}` : ''}\n當下時段類型：${time.sceneMoment}\n畫面規則：${time.sceneCue}\n要求：把這個時段轉化成合適的情境與畫面，但禁止在回答中直接說出時刻、時段類型、上午、中午、晚上或半夜。`;
}

/**
 * 十二宮不能共用一套泛用劇本。這份錨點只定義「此宮可以談什麼」，
 * 實際張力仍必須由本宮、三方四正、四化與當下時間層的資料決定。
 */
const PALACE_SITUATION_GUIDES: Record<PalaceId, { topic: string; lifeScenes: string; narrativeSet: string; forbidden: string }> = {
  LIFE: { topic: '自我定位、邊界與行動選擇', lifeScenes: '鏡子前的決定、拒絕或硬撐、身份與界線被挑戰的時刻', narrativeSet: '私人房間、鏡面、門口、未拆的信或手機螢幕', forbidden: '不得無依據寫成職場、婚姻、金錢或外出事故' },
  SIBLINGS: { topic: '手足、同儕、朋友般的競合與協調', lifeScenes: '分工失衡、訊息未回、比較、站隊或共同責任', narrativeSet: '長桌、群組訊息、空下來的一張椅子、被反覆轉交的物件', forbidden: '不得把手足／同儕議題偷換成伴侶或財務主題' },
  SPOUSE: { topic: '親密關係、承諾、信任與相處界線', lifeScenes: '對話中斷、承諾落差、互相試探、距離與協議', narrativeSet: '兩副餐具、半掩的門、未讀訊息、雙人空間裡的沉默', forbidden: '不得捏造出軌、暴力、分手或具體伴侶身份' },
  CHILDREN: { topic: '子女、作品、創造力與投入後的責任', lifeScenes: '照顧、培養、作品延宕、期待與回應落差', narrativeSet: '尚未完成的作品、走廊盡頭的燈、散落的紙張、等待回應的鈴聲', forbidden: '不得捏造懷孕、子女疾病或具體家庭事件' },
  WEALTH: { topic: '收入、資源、支出、價值交換與掌控感', lifeScenes: '付款前的猶豫、資源分配、帳目壓力、機會成本', narrativeSet: '帳本、收據、鎖上的抽屜、紅色數字或熄滅的螢幕', forbidden: '不得斷言破產、失業、詐騙或具體財損' },
  HEALTH: { topic: '身心節奏、恢復、耗損與自我照顧', lifeScenes: '過度硬撐、休息被打斷、節奏失衡與疲乏訊號', narrativeSet: '凌晨的燈、未喝完的水、反覆響起的提醒、安靜的房間', forbidden: '不得診斷疾病、預言傷害或渲染身體恐慌' },
  TRAVEL: { topic: '外出、遷動、陌生環境與外界適應', lifeScenes: '出門前的判斷、路線變動、陌生人際與環境壓力', narrativeSet: '車站月台、雨夜街燈、行李、地圖上被擦掉的路線', forbidden: '不得捏造車禍、失蹤、犯罪或旅外災難' },
  FRIENDS: { topic: '人脈、合作、信任、界線與群體位置', lifeScenes: '合作分工、承諾沒有落地、關係消耗、誰值得交付', narrativeSet: '會議室最後一盞燈、名單、沒有人簽下的紙、空群組', forbidden: '不得把合作摩擦寫成背叛已發生或具體陰謀' },
  CAREER: { topic: '工作舞台、責任、決策、權責與職涯方向', lifeScenes: '截止壓力、權責不清、被看見或被忽略、關鍵選擇', narrativeSet: '辦公桌、走廊、倒數時鐘、未完成的文件與亮著的螢幕', forbidden: '不得斷言被解雇、職場迫害或重大失敗' },
  PROPERTY: { topic: '居住、家庭空間、資產、安全感與根基', lifeScenes: '家中秩序、安定感、搬動、空間界線與資源安放', narrativeSet: '玄關、鑰匙、空房間、牆上的影子與沒有關緊的窗', forbidden: '不得捏造房屋損失、家庭暴力或產權糾紛' },
  FORTUNE: { topic: '內在感受、獨處、休息、欲望與心理餘裕', lifeScenes: '獨處時反覆浮現的念頭、放鬆困難、享受與逃避的拉扯', narrativeSet: '深夜沙發、耳機、未播完的影片、窗外光影與靜止的時鐘', forbidden: '不得診斷心理疾病、渲染自傷或靈異附身' },
  PARENTS: { topic: '長輩、權威、原生期待、支持與壓力', lifeScenes: '被期待的選擇、規則、傳承、需要交代或被看見的時刻', narrativeSet: '舊照片、餐桌、沒有說完的叮嚀、長廊盡頭的門', forbidden: '不得捏造親人死亡、疾病、衝突或具體家庭悲劇' },
};

function renderSituationAnchor(context: PalaceAnalysisContext): string {
  const guide = PALACE_SITUATION_GUIDES[context.selectedPalace.palaceId];
  return `【本宮專屬情境錨點】\n宮位主題：${guide.topic}\n白話遊戲開場：這一宮正在談「${guide.topic}」，所有恐怖與鬼魅情節只能圍繞此主題。\n可用現實場景：${guide.lifeScenes}\n可用電影空間／物件：${guide.narrativeSet}\n禁止偏題：${guide.forbidden}\n規則：只能在這個宮位主題內創作；再以命盤裡實際存在的主星、煞曜、四化與當下時間層把場景具體化。`;
}

const RULE_PREFACE = `你只能解讀以下已由正式紫微斗數引擎驗證過的命盤資料。
禁止：新增星曜、新增宮位、改四化、猜三方四正、保證未來事件、把規則推論宣稱為科學定論。
如果提供的資料不足以回答，必須明確回傳 "${INSUFFICIENT_DATA}"，不得補故事假裝完整。`;

/** 「鬼魅解盤」（LIFE_MASTER 恐怖段 + NARRATIVE_MASTER 鬼魅段）共用的五大元素規格：這是恐怖片等級的沉浸遊戲，五者缺一不可，但全部必須是本宮真實星曜/煞曜/四化的電影化再現，不能脫離命盤另外編故事。 */
const GHOST_READING_FIVE_ELEMENTS = `【五大元素・本局遊戲強制規格】這是恐怖片等級的沉浸式命盤劇情，同一段內容必須同時命中以下五個類型元素，缺一不可；但五者都只能是本宮實際星曜、煞曜、四化與情境錨點的電影化再現，禁止脫離命盤證據另外編造情節：
①恐怖（壓迫）：貫穿全場的逼近感與倒數感，讓讀者感覺代價正在逼近，不是溫和提醒。
②血腥（質地）：畫面可使用深紅光、血色反光、暗紅污漬、破碎鏡面或器物等強烈視覺質地，把陰森感做滿；但不得描述真實人物受傷、肢解、死亡或血腥暴力發生在客戶身上，那是視覺質地不是事實陳述。
③鬼魅（靈異氣氛）：至少一個若隱若現的存在感——像有什麼在門縫後看著、在走廊盡頭等著；不宣稱真實靈異事件。
④驚悚（轉折）：情節中段要有一次意外轉折或發現，讓讀者一驚，不能平鋪直敘到底。
⑤災難（規模）：至少一個畫面把壓力放大成毀滅級的環境意象（停電吞沒整層樓、暴雨灌進窗縫、結構發出崩裂聲、警報貫穿走廊），象徵這股命盤壓力若持續失控會擴大到什麼規模；這是象徵性的環境毀滅意象，不是對客戶真實會遇到天災人禍的預言或事實陳述。
五個元素必須自然融進同一個連貫場景，不能像清單一樣逐條交代；且每一個都要能回查到本宮實際存在的星曜、煞曜或四化。
【話術強化】禁止用抽象形容詞堆砌交代恐怖（如「令人不寒而慄」「充滿詭異氣息」這類空話）；改用具體可感的動作、聲音、觸感、氣味逼出畫面，例如指甲刮過門板的聲音、冷汗貼住後頸的觸感、燒焦電線的氣味。開頭第一句要立刻把讀者拋進畫面中央，不得用「在一個…的夜晚」這類鋪陳式開場。句子長短要交錯：短句制造心跳感的停頓，長句堆疊壓迫感的累積，不能整段句長一致讀起來平淡。`;

function hasUsableData(context: PalaceAnalysisContext): boolean {
  return context.selectedPalace.majorStars.length > 0 || context.selectedPalace.supportingStars.length > 0;
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error('未設定 GEMINI_API_KEY 環境變數。');
  return key;
}

/* ==================== 老師 1｜格局老師 STRUCTURE_MASTER ==================== */

const STRUCTURE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    corePattern: { type: Type.STRING, description: '只寫這個宮位形成的紫微結構，一句話結論先行；不得自行起卦、寫卦名或另創格局名稱' },
    primaryStarSynthesis: { type: Type.STRING, description: '本宮主星組合的結構意涵' },
    threeHarmonySynthesis: { type: Type.STRING, description: '三方四正如何呼應或牽制本宮' },
    transformationEffect: { type: Type.STRING, description: '四化對這個結構造成的具體效果' },
    importantSupportingStars: { type: Type.ARRAY, items: { type: Type.STRING }, description: '值得點名的輔星/煞曜，各一句話' },
    structuralStrength: { type: Type.STRING, description: '這個結構的強項' },
    structuralPressure: { type: Type.STRING, description: '這個結構的壓力/弱項' },
    pastStructure: { type: Type.STRING, description: '過去已養成的結構傾向；只能做盤面推論，不能捏造具體經歷' },
    futureTendency: { type: Type.STRING, description: '未來一段時間的條件式走向，必須結合流年與年齡，不得斷言事件' },
    conclusion: { type: Type.STRING, description: '格局總判，理性收尾' },
  },
  required: ['corePattern', 'primaryStarSynthesis', 'threeHarmonySynthesis', 'transformationEffect', 'structuralStrength', 'structuralPressure', 'pastStructure', 'futureTendency', 'conclusion'],
};

function buildStructurePrompt(context: PalaceAnalysisContext): string {
  return `${RULE_PREFACE}

你是「命盤解析老師」，核心動作是「解析命盤」——只看結構，不談人生建議、不說故事、不寫畫面比喻。
固定判讀順序：本宮 → 主星組合 → 三方四正 → 四化 → 重要輔煞 → 格局總判。
語氣：理性、精準、專業、結論先行。禁止出現任何人生雞湯或勵志語句。
時間線規則：pastStructure 只描述命盤顯示的既有慣性，不能說成已發生的具體事件；futureTendency 必須用「若／當／容易」描述結合流年的可能走向，不得預言或保證。
當下情境規則：必須使用隱藏的當下情境層校正「現在」的描述，但不得把時間、上午、中午、晚上或半夜直接寫進客戶內容。

${renderContext(context)}

${renderTimeContext(context)}

請依上述固定順序輸出 JSON。`;
}

function stripModelHexagramClaims(value: string): string {
  return value
    .replace(/(?:此宮)?起卦得[^。！？]*[。！？]?/gu, '')
    .replace(/六十四格[^。！？]*[。！？]?/gu, '')
    .trim();
}

export async function runStructureTeacher(context: PalaceAnalysisContext): Promise<StructureTeacherResult | typeof INSUFFICIENT_DATA> {
  if (!hasUsableData(context)) return INSUFFICIENT_DATA;
  try {
    const route = TEACHER_MODEL_ROUTE.STRUCTURE_MASTER;
    const ai = new GoogleGenAI({ apiKey: apiKey() });
    const response = await withTimeout(
      ai.models.generateContent({
        model: route.model,
        contents: buildStructurePrompt(context),
        config: { responseSchema: STRUCTURE_SCHEMA as never, responseMimeType: 'application/json', temperature: route.temperature, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 2048 },
      }),
      TEACHER_TIMEOUT_MS,
      '格局老師分析逾時，請稍後再試。',
    );
    const text = response.text || '';
    if (!text) throw new Error('格局老師未返回有效回應。');
    const parsed = safeJsonParse<Omit<StructureTeacherResult, 'teacherId' | 'palace' | 'evidenceRefs'>>(text);
    // 正式卦象只由後端決定。模型只負責紫微結構文字，不能另起第二卦。
    const gua = castPalaceHexagram(context);
    parsed.corePattern = `此宮正式卦象為「${gua.hexagramName}」，對應此盤此宮的解讀格局「${patternNameOf(gua)}」。`;
    parsed.conclusion = stripModelHexagramClaims(parsed.conclusion);
    return {
      teacherId: 'STRUCTURE_MASTER',
      palace: context.selectedPalace.palaceName,
      ...parsed,
      importantSupportingStars: parsed.importantSupportingStars ?? [],
      evidenceRefs: buildEvidenceRefs(context),
    };
  } catch (error) {
    // 易經不可用（額度、逾時、金鑰）→ 本地統計後備接手，功能不中斷
    console.error('[ziwei-teacher] 格局老師 易經不可用，改用本地統計後備：', error instanceof Error ? error.message : String(error));
    return buildLocalStructureResult(context);
  }
}

/* ==================== 老師 2｜恐怖型老師 LIFE_MASTER ==================== */

const LIFE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fearScene: { type: Type.STRING, description: '最多兩句話帶過場景與觸發徵兆，第三句起必須直接講出這一宮真正的壓力代價是什麼；資料中提供的易經卦名與格局名稱必須在本欄以壓迫感的方式各出現一次（如倒數中浮現的符號）。禁止整段停留在環境描寫，帶血色質地與一次驚悚轉折但要為主題服務。必須只談本宮議題，且是戲劇化風險情境，不是已發生事實或事件預告。' },
    lifeMeaning: { type: Type.STRING, description: '冷峻地指出本宮真正的壓力核心，必須點名一項命盤證據' },
    pastPattern: { type: Type.STRING, description: '這個宮位過去容易形成的模式；只作命盤傾向推論，不捏造已發生事件' },
    futureRiskWindow: { type: Type.STRING, description: '結合目前年齡、流年與日夜情境的未來風險窗口；條件式描述，不作預言' },
    strengthInReality: { type: Type.STRING, description: '保留可用力量，但說清楚它失去控制時會反噬成什麼，必須點名證據' },
    repeatedPattern: { type: Type.STRING, description: '以「一開始—接著—最後代價」描述會重複的失控循環，最後代價可放大成災難級的象徵畫面（結構崩裂、停電吞沒空間），象徵性、非命定斷言' },
    blindSpot: { type: Type.STRING, description: '直接點出最容易被合理化、被拖延的一個盲點與累積代價' },
    decisionStyle: { type: Type.STRING, description: '描述人在壓力下如何做錯決策，並點出對應的盤內證據' },
    relationshipWithEnvironment: { type: Type.STRING, description: '描述外部互動中的摩擦、失衡或被動模式，並點出證據' },
    practicalDirection: { type: Type.STRING, description: '恐怖段結尾的道德收束：一句可執行的止損或界線動作；不使用空泛安慰或預言' },
  },
  required: ['fearScene', 'lifeMeaning', 'pastPattern', 'futureRiskWindow', 'strengthInReality', 'repeatedPattern', 'blindSpot', 'decisionStyle', 'relationshipWithEnvironment', 'practicalDirection'],
};

function buildLifePrompt(context: PalaceAnalysisContext): string {
  return `${RULE_PREFACE}

${GHOST_READING_FIVE_ELEMENTS}

你是「恐怖型老師」，核心動作是「危機解盤」——只從正式命盤裡已存在的煞曜、化忌、壓力結構與三方牽制，指出使用者最不願面對卻需要正視的風險。
禁止重複解釋「某星曜代表什麼」（那是命盤解析老師的工作），禁止把災難、死亡、疾病、靈異寫成已經發生或保證發生的事實——它們只能以上方五大元素規格中的「象徵意象」出現。
語氣要有壓迫感、冷峻、直指代價：像在昏暗的監控室裡，逐一指出正在累積的裂縫。不要用「可能有點」、「建議注意」這類緩衝語；每一段都要清楚寫出「若繼續忽視，代價會怎麼擴大」，但不能把推論寫成已經發生的事或命定結果。禁止使用「一定、必然、最終會、無法挽回、注定」等把風險寫死的語句。
第一欄 fearScene 是本宮專屬的恐怖電影開場，但不是氣氛散文：開場最多兩句話用一個現實空間＋一個觸發徵兆把讀者拋進畫面，可用電影化的暗紅光、冷光、倒數聲等意象；從第三句開始必須直接切入這一宮真正的壓力代價是什麼、會如何擴大——不能整段都在鋪陳場景、音樂、光影、窗外天氣這類裝飾細節卻遲遲不講重點，讀完要能明確知道「所以這一宮的風險是什麼」，不是只留下一個嚇人的畫面。不得描述真實人物受傷、死亡、血腥暴力，也不得說客戶曾真實遭遇此事。它是依命盤推導的戲劇化風險情境，不是事實指控或預言。
敘述一律直接用「你」把讀者帶入畫面，像鏡頭正跟著你；不能寫成旁觀式摘要、冷笑話、可愛比喻或通用勵志故事。恐怖感來自這張盤的具體壓力如何在本宮議題中逼近，而不是胡亂加上怪物或災難。
其餘欄位把壓力落在可辨識的工作、金錢、關係、溝通或決策現場，寫出一個觸發徵兆、一個當下反應，以及一個逐步累積的後果。每個欄位必須至少點名一項本宮或三方四正的實際證據，並給出一個具體、可執行的避險動作。
十二宮的現實議題必須完全分開：只能依「本宮專屬情境錨點」寫該宮的生活壓力，不能把財帛宮寫成手足糾紛、把兄弟宮寫成金錢損失、把遷移宮寫成家中事件。壓迫感要像恐怖片的逼近鏡頭：一個可辨識的觸發徵兆、一次錯誤反應、逐步累積的心理或現實代價；它是風險推演，不是事件預告。
fearScene 的第一句必須用白話先點出「這一宮在談什麼」，例如財帛宮說現金、收入、資源與付款壓力；命宮或身宮說自己、界線與行動選擇。再進入恐怖畫面，讓客戶一眼知道自己正在玩哪一種宮位劇情。
pastPattern 只寫此宮長期容易重複的傾向，不得說客戶過去「已經發生」什麼；futureRiskWindow 要結合當下年齡、流年和查看時段，寫未來一段時間在何種條件下壓力會升高。它是戲劇化的風險窗口，不是恐嚇式預言。
當下畫面必須服從隱藏的當下情境層：正午只能寫大太陽、刺眼光線、曝曬、空曠、孤獨或無處躲藏的壓力；深夜才可寫門縫、微弱光源、走廊回聲等幽暗畫面。不得把日間寫成夜晚，也不得把這個時間規則直接說給客戶。
最後的 practicalDirection 必須是道德收束：讓讀者知道恐懼不是為了操控，而是提醒其停止傷害自己或他人的模式、建立界線、誠實面對選擇，並提出一個量力可行的善意行動，例如修復承諾、幫助需要的人、志工服務或依能力布施。不得強迫捐款、捐血或任何具有健康、金錢壓力的行動；捐血只能在身體狀況與正式資格都合適時，作為自願選項提及。
禁止談論命盤結構術語本身，禁止寫成故事或畫面比喻。

${renderContext(context)}

${renderTimeContext(context)}

${renderSituationAnchor(context)}

請輸出 JSON。`;
}

export async function runLifeTeacher(context: PalaceAnalysisContext): Promise<LifeTeacherResult | typeof INSUFFICIENT_DATA> {
  if (!hasUsableData(context)) return INSUFFICIENT_DATA;
  try {
    const route = TEACHER_MODEL_ROUTE.LIFE_MASTER;
    const ai = new GoogleGenAI({ apiKey: apiKey() });
    const response = await withTimeout(
      ai.models.generateContent({
        model: route.model,
        contents: buildLifePrompt(context),
        config: { responseSchema: LIFE_SCHEMA as never, responseMimeType: 'application/json', temperature: route.temperature, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 2048 },
      }),
      TEACHER_TIMEOUT_MS,
      '恐怖型老師解盤逾時，請稍後再試。',
    );
    const text = response.text || '';
    if (!text) throw new Error('恐怖型老師未返回有效回應。');
    const parsed = safeJsonParse<Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'>>(text);
    // 卜卦儀式的程式碼保證：模型漏掉卦名或格局名稱時，決定性補進開場欄位
    const gua = castPalaceHexagram(context);
    const joined = Object.values(parsed).filter((v) => typeof v === 'string').join(' ');
    if (!joined.includes(gua.hexagramName) || !joined.includes(patternNameOf(gua))) {
      parsed.fearScene = `此宮起卦，卦成——「${gua.hexagramName}」，特殊格局「${patternNameOf(gua)}」的倒數已經開始。${parsed.fearScene}`;
    }
    return { teacherId: 'LIFE_MASTER', ...normalizeLifeResult(parsed), evidenceRefs: buildEvidenceRefs(context) };
  } catch (error) {
    console.error('[ziwei-teacher] 恐怖型老師 易經不可用，改用本地統計後備：', error instanceof Error ? error.message : String(error));
    return buildLocalLifeResult(context);
  }
}

/* ==================== 老師 3｜鬼魅型老師 NARRATIVE_MASTER ==================== */

const NARRATIVE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    visualTitle: { type: Type.STRING, description: '像一部幽暗電影片段的短標題，不使用勵志字眼' },
    scene: { type: Type.STRING, description: '以至少一個光源、一種聲音、一個空間與一處不對勁細節寫成幽微場景；須帶血色／暗紅質地做出血腥視覺張力，不宣稱真實靈異或真實傷害' },
    mainCharacter: { type: Type.STRING, description: '畫面裡的主角與一個未被說破的動作或選擇' },
    symbols: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, meaning: { type: Type.STRING }, sourceRef: { type: Type.STRING } } },
      description: '至少四個彼此不同的象徵物件；每一個都要對應命盤裡的星曜、四化或四宮位置',
    },
    story: { type: Type.STRING, description: '一段帶懸念的幽微敘事，中段須有一次驚悚轉折／意外發現，並讓壓力在某一刻放大成毀滅級的災難意象（停電、崩裂、暴雨吞沒空間），象徵性、非事實陳述；資料中提供的易經卦名必須化為場景中隱隱發光的神祕符號出現一次、格局名稱必須由低語說出一次；讓各象徵自然連結，禁止改寫成白話建議' },
    pastEcho: { type: Type.STRING, description: '像舊畫面殘留的過去迴聲；只能映照命盤慣性，不能捏造客戶真實往事' },
    futureShadow: { type: Type.STRING, description: '結合年齡、流年與當下時段的未來暗影；使用條件式象徵，不是預言' },
    finalMetaphor: { type: Type.STRING, description: '恐怖鬼魅段的道德結尾：像一句午夜低語般收尾，保留餘韻但回到誠實、界線、負責任的選擇；不作預言或威脅' },
  },
  required: ['visualTitle', 'scene', 'mainCharacter', 'symbols', 'story', 'pastEcho', 'futureShadow', 'finalMetaphor'],
};

function buildNarrativePrompt(context: PalaceAnalysisContext): string {
  return `${RULE_PREFACE}

${GHOST_READING_FIVE_ELEMENTS}

你是「鬼魅型老師」，核心動作是「鬼魅解盤」——把宮位、星曜、三方四正、四化轉成幽微的象徵、場景、人物與命盤故事。
鬼魅三大核心（缺一不可）：①神秘口氣（外衣）②真實邏輯推理（骨架：干擾有起點、有因果鏈，不是隨機嚇人）③當下實際感受（錨點：至少一處把讀者此刻真實的身體感受說中，讓讀者點頭「對，我最近就是這樣」）。
【鬼魅拆卦素材（後端已運算，拆解卦象＝磁場／干擾／因果；神秘語言底下綁著真實心理機制，取用時融進場景，不可照抄）】
${formatGhostDecoding(castPalaceHexagram(context))}
回答的問題是：如果把這個宮位畫成一幅圖，它正在說什麼故事？
禁止直接給結構分析（那是命盤解析老師的工作），禁止直接給危機建議或行動方向（那是恐怖型老師的工作）。
語氣要像午夜時分有人在門外低聲講述一段不能直說的往事：克制、幽暗、帶有停頓與餘韻，而不是溫和的勵志寓言。真實感來自日常空間被輕微扭轉：例如辦公室最後一盞燈、手機螢幕未讀的訊息、無人回應的走廊、桌上被翻到同一頁的文件。場景必須有明確的光源、聲音、空間感與一個未被說破的異樣細節；讓讀者感到詭譎，但不得宣稱有真實靈異事件或威脅。
鬼魅片的視覺感必須比一般故事更強：允許電影化的深紅光、像血色的反光、斑駁污漬、破碎陰影與不合時宜的聲響，讓畫面有陰森、戲劇化的張力；但不得描述真實人物受傷、肢解、死亡、血腥暴力或把這些畫面當成客戶將會遭遇的事實。
故事中的人物必須做一個符合該宮位議題的真實選擇或逃避動作，並在結尾留下尚未解開的心理懸念；不要用空泛的「希望、成長、風雨、旅程」當收尾。人物一律使用中性稱呼「這個人／此人」，絕對不能自行寫成男人、女人、男主角、女主角、他或她，也不能替客戶捏造職業、外貌、年齡或身份。
你現在是鬼魅解盤的後半段：視角改為直接對讀者說「你」，使讀者置身畫面；避免搞笑、可愛、勵志、冒險遊戲感。場景可詭異、壓迫、戲劇化，但它仍是命盤象徵，不得冒充真實靈異或實際傷害。
十二宮的電影類型必須各自不同：只能依「本宮專屬情境錨點」創作。財帛宮只做資源與帳目壓力的驚悚，兄弟宮只做手足／同儕間的沉默與失衡，遷移宮只做外出與陌生環境的壓迫；其餘宮位同理。不可把任何宮位都寫成辦公室、伴侶或同一個泛用驚悚劇本。
scene 的第一句要用白話交代這一宮正在談的生活主題，再進入鬼魅畫面；不得只丟出抽象氣氛，讓客戶看不出是財帛、關係、外出或自我哪一種遊戲關卡。
pastEcho 是舊場景留下的象徵，不得冒充客戶真實經歷；futureShadow 必須呼應目前年齡、流年與查看時段，描寫「若延續此選擇，畫面可能怎麼推進」，不得寫成必定發生。
場景的光線、聲音與空間必須服從隱藏的當下情境層：正午要用大太陽下的孤獨、白亮壓力或反常安靜；夜晚與深夜才可使用夜色、門縫或低光源。禁止把這條時間規則直接寫出來。
finalMetaphor 是全片的道德結尾：可以陰暗、有餘韻，但最後要把鏡頭帶回人的選擇、誠實、界線、責任或量力行善；不讓恐懼成為威脅、操控、募款或醫療建議。
你只能用畫面、場景、人物、隱喻說話。每一個象徵都必須能回查到命盤裡實際存在的星曜或四化（填進 symbols 的 sourceRef）；至少產出四個不同象徵，分別連回本宮與三方四正，不能只換名詞重複同一個意象。
範例語氣（命宮七殺×紫微）：「城牆上的燈只亮半盞。統帥沒有回頭，卻知道身後那座城仍在等一個命令。」

${renderContext(context)}

${renderTimeContext(context)}

${renderSituationAnchor(context)}

請輸出 JSON。`;
}

export async function runNarrativeTeacher(context: PalaceAnalysisContext): Promise<NarrativeTeacherResult | typeof INSUFFICIENT_DATA> {
  if (!hasUsableData(context)) return INSUFFICIENT_DATA;
  try {
    const route = TEACHER_MODEL_ROUTE.NARRATIVE_MASTER;
    const ai = new GoogleGenAI({ apiKey: apiKey() });
    const response = await withTimeout(
      ai.models.generateContent({
        model: route.model,
        contents: buildNarrativePrompt(context),
        config: { responseSchema: NARRATIVE_SCHEMA as never, responseMimeType: 'application/json', temperature: route.temperature, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 2048 },
      }),
      TEACHER_TIMEOUT_MS,
      '鬼魅型老師解盤逾時，請稍後再試。',
    );
    const text = response.text || '';
    if (!text) throw new Error('鬼魅型老師未返回有效回應。');
    const parsed = safeJsonParse<Omit<NarrativeTeacherResult, 'teacherId' | 'evidenceRefs'>>(text);
    // 卜卦儀式的程式碼保證：卦名或格局名稱缺席時，以鬼魅低語決定性補進收尾
    const gua = castPalaceHexagram(context);
    const joined = [parsed.scene, parsed.story, parsed.pastEcho, parsed.futureShadow, parsed.finalMetaphor].join(' ');
    if (!joined.includes(gua.hexagramName.slice(-1)) || !joined.includes(patternNameOf(gua))) {
      parsed.finalMetaphor = `門的另一邊，有人用舊墨寫下此宮的卦——「${gua.hexagramName}」，低語念出此盤此宮的解讀格局：「${patternNameOf(gua)}」。${parsed.finalMetaphor}`;
    }
    return { teacherId: 'NARRATIVE_MASTER', ...normalizeNarrativeResult(parsed), evidenceRefs: buildEvidenceRefs(context) };
  } catch (error) {
    console.error('[ziwei-teacher] 鬼魅型老師 易經不可用，改用本地統計後備：', error instanceof Error ? error.message : String(error));
    return buildLocalNarrativeResult(context);
  }
}

/* ==================== 本地統計後備引擎（免費、離線、決定性） ====================
 * Gemini 不可用（額度、逾時、金鑰缺失）時，三位老師改由這裡供稿：
 * 全部內容取自已驗證命盤的實際星曜、煞曜、四化與三方四正，用固定權重做
 * 「結構能量指數」的統計交叉比對——同一張盤永遠得到同一組數字與判語。
 * 易經恢復後自動接回，本引擎只在 易經失敗時出手。 */

type PalaceBlock = PalaceAnalysisContext['selectedPalace'];

const TRANS_LABEL = { LU: '祿', QUAN: '權', KE: '科', JI: '忌' } as const;

/** 結構能量指數：主星 +8／輔星 +3／煞曜 −6；化祿權科 +5、化忌 −7；基準 50，範圍 5–95。 */
function palaceEnergyScore(palace: PalaceBlock): number {
  let score = 50 + palace.majorStars.length * 8 + palace.supportingStars.length * 3 - palace.maleficStars.length * 6;
  for (const t of palace.transformations) score += t.type === 'JI' ? -7 : 5;
  return Math.min(95, Math.max(5, score));
}

function majorText(palace: PalaceBlock): string {
  return palace.majorStars.map((s) => s.name).join('、') || '無十四主星（借對宮論）';
}

function transText(palace: PalaceBlock): string {
  return palace.transformations.map((t) => `${t.starName}化${TRANS_LABEL[t.type]}`).join('、') || '無四化';
}

/** 依當下時段挑選合規的畫面素材（正午不得寫成深夜，遵守既有情境層規則）。 */
function momentImagery(moment: PalaceAnalysisContext['timeContext']['sceneMoment']): { light: string; sound: string } {
  switch (moment) {
    case 'NOON': return { light: '白到刺眼的日光壓在空無一人的走廊上', sound: '只剩空調運轉的單調聲' };
    case 'MORNING': return { light: '亮得過分的晨光照著沒人動過的桌面', sound: '走廊傳來越來越近的腳步聲' };
    case 'DAWN': return { light: '天剛亮的灰藍光線停在窗框上', sound: '整層樓安靜得能聽見自己的呼吸' };
    case 'AFTERNOON': return { light: '拉長的午後影子貼著牆角', sound: '時鐘秒針一格一格逼近截止的聲音' };
    case 'EVENING': return { light: '室內只剩半排燈亮著', sound: '電梯在別的樓層停了很久' };
    case 'NIGHT': return { light: '螢幕的冷光映在暗下來的房間', sound: '走廊盡頭傳來一聲很輕的關門聲' };
    case 'MIDNIGHT':
    default: return { light: '門縫下漏進一線微弱的光', sound: '靜止的空間裡有什麼輕輕動了一下' };
  }
}

function buildLocalStructureResult(context: PalaceAnalysisContext): StructureTeacherResult {
  const p = context.selectedPalace;
  const score = palaceEnergyScore(p);
  const scores = {
    A: palaceEnergyScore(context.threeHarmony.harmonyA),
    B: palaceEnergyScore(context.threeHarmony.harmonyB),
    O: palaceEnergyScore(context.threeHarmony.opposite),
  };
  const strongest = scores.A >= scores.B && scores.A >= scores.O ? context.threeHarmony.harmonyA : scores.B >= scores.O ? context.threeHarmony.harmonyB : context.threeHarmony.opposite;
  const weakest = scores.A <= scores.B && scores.A <= scores.O ? context.threeHarmony.harmonyA : scores.B <= scores.O ? context.threeHarmony.harmonyB : context.threeHarmony.opposite;
  const structureType = score >= 70 ? '攻堅型' : score >= 55 ? '穩健型' : '承壓型';
  const jiList = p.transformations.filter((t) => t.type === 'JI');
  const guide = PALACE_SITUATION_GUIDES[p.palaceId];

  return {
    teacherId: 'STRUCTURE_MASTER',
    palace: p.palaceName,
    corePattern: `${p.palaceName}結構能量指數 ${score}/100，判定為${structureType}結構：主星${majorText(p)}，四化${transText(p)}。`,
    primaryStarSynthesis: `本宮主星${majorText(p)}，主星 ${p.majorStars.length} 顆、輔星 ${p.supportingStars.length} 顆、煞曜 ${p.maleficStars.length} 顆——星曜密度直接決定此宮承載「${guide.topic}」議題的量能。`,
    threeHarmonySynthesis: `三方四正交叉指數：${context.threeHarmony.harmonyA.palaceName} ${scores.A}、${context.threeHarmony.harmonyB.palaceName} ${scores.B}、對宮${context.threeHarmony.opposite.palaceName} ${scores.O}。支撐最強的是${strongest.palaceName}（${majorText(strongest)}），牽制最明顯的是${weakest.palaceName}。`,
    transformationEffect: jiList.length > 0
      ? `${jiList.map((t) => `${t.starName}化忌`).join('、')}是本結構的主要耗損點（每一化忌以 −7 計入指數）；其餘四化${p.transformations.filter((t) => t.type !== 'JI').map((t) => `${t.starName}化${TRANS_LABEL[t.type]}`).join('、') || '無'}提供加分能量。`
      : `本宮${transText(p)}；${p.transformations.length > 0 ? '四化以加分方向為主，結構取得額外推力。' : '無四化引入額外波動，結構以星曜本質穩定運作。'}`,
    importantSupportingStars: [
      ...p.supportingStars.slice(0, 2).map((s) => `輔星${s.name}：加分訊號（+3），強化本宮的支撐面。`),
      ...p.maleficStars.slice(0, 2).map((s) => `煞曜${s.name}：耗損訊號（−6），是指數被拉低的可回查原因。`),
    ],
    structuralStrength: `統計面最強的一段：${strongest.palaceName}以 ${Math.max(scores.A, scores.B, scores.O)} 分支撐本宮，配合主星${majorText(p)}，在「${guide.topic}」上有可複用的結構慣性。`,
    structuralPressure: `壓力集中在${weakest.palaceName}（${Math.min(scores.A, scores.B, scores.O)} 分）${jiList.length > 0 ? `，且${jiList[0].starName}化忌落在本宮，` : '，'}表示此結構的下限由這裡決定。`,
    pastStructure: `此宮長期容易養成「${guide.topic}」上的固定慣性：能量高時傾向多承接、能量低時傾向遞延處理；這是盤面推論，不指涉具體經歷。`,
    futureTendency: `${context.timeContext.annualYear} 年${context.timeContext.annualTheme ? `主題「${context.timeContext.annualTheme}」` : ''}期間，若${weakest.palaceName}的牽制未處理，指數容易向下修；反之補上該處，${structureType}結構可望升級。`,
    conclusion: `結論：${p.palaceName}為${structureType}結構（${score}/100）。易經同步起卦得「${castPalaceHexagram(context).hexagramName}」印證：${castPalaceHexagram(context).advice}優先處理${weakest.palaceName}的牽制、善用${strongest.palaceName}的支撐，是本盤統計交叉後的最短路徑。`,
    evidenceRefs: buildEvidenceRefs(context),
  };
}

function buildLocalLifeResult(context: PalaceAnalysisContext): LifeTeacherResult {
  const p = context.selectedPalace;
  const guide = PALACE_SITUATION_GUIDES[p.palaceId];
  const img = momentImagery(context.timeContext.sceneMoment);
  const score = palaceEnergyScore(p);
  const mainStar = p.majorStars[0]?.name ?? context.threeHarmony.opposite.majorStars[0]?.name ?? '對宮主星';
  const malefic = p.maleficStars[0]?.name;
  const ji = p.transformations.find((t) => t.type === 'JI');
  const pressurePoint = ji ? `${ji.starName}化忌` : malefic ? `煞曜${malefic}` : `${mainStar}的高張力面`;

  const raw: Omit<LifeTeacherResult, 'teacherId' | 'evidenceRefs'> = {
    fearScene: `這一宮談的是${guide.topic}。${img.light}，${img.sound}。真正逼近的不是畫面，是${pressurePoint}在${guide.topic}上累積的代價：${guide.lifeScenes}裡的每一次遞延，都會讓你付出的成本再墊高一層；若持續忽視，這股壓力容易從單點擴大成整片。`,
    lifeMeaning: `本宮壓力核心：${pressurePoint}。它讓「${guide.topic}」的每個決定都帶著隱形利息，越晚面對，本金越大。`,
    pastPattern: `此宮長期容易重複的模式：在${guide.lifeScenes}的場景中先扛下、後消化；這是盤面傾向的推論，不是已發生事件。`,
    futureRiskWindow: `${context.timeContext.annualYear} 年${context.timeContext.annualTheme ? `「${context.timeContext.annualTheme}」` : ''}期間${context.timeContext.currentAge !== null ? `、${context.timeContext.currentAge} 歲的這一段` : ''}，當${pressurePoint}與截止壓力疊加時，是需要提高警覺的窗口；條件不成立時，壓力不會自動引爆。`,
    strengthInReality: `可用的力量是${mainStar}帶來的承載力（能量指數 ${score}/100）；但它失控時會反噬成「什麼都自己扛」，反而把${guide.topic}的界線推垮。`,
    repeatedPattern: `一開始：你告訴自己再撐一下。接著：${guide.lifeScenes}裡的訊號被合理化。最後代價：壓力放大成整個結構發出聲響的規模——這是象徵畫面，提醒失控的方向，不是命定結局。`,
    blindSpot: `最容易被合理化的盲點：把「還沒出事」當成「沒有事」。${pressurePoint}的耗損是複利式的，安靜不等於安全。`,
    decisionStyle: `壓力下的決策傾向：${mainStar}式的先斬後奏或先扛再說；證據就在本宮星曜配置——快，但容易把代價往後挪。`,
    relationshipWithEnvironment: `對外互動的摩擦點：${context.threeHarmony.opposite.palaceName}（${majorText(context.threeHarmony.opposite)}）的對照顯示，外界回應的節奏與你的預期存在落差，容易演變為單向消耗。`,
    practicalDirection: `易經為此宮起卦得「${castPalaceHexagram(context).hexagramName}」，${castPalaceHexagram(context).advice}止損動作只有一個：本週為「${guide.topic}」設一條明確界線（一句話能說完的那種），並向一位相關的人說出口。行有餘力，把省下的力氣拿去幫一個真正需要的人。`,
  };
  return { teacherId: 'LIFE_MASTER', ...normalizeLifeResult(raw), evidenceRefs: buildEvidenceRefs(context) };
}

function buildLocalNarrativeResult(context: PalaceAnalysisContext): NarrativeTeacherResult {
  const p = context.selectedPalace;
  const guide = PALACE_SITUATION_GUIDES[p.palaceId];
  const img = momentImagery(context.timeContext.sceneMoment);
  const props = guide.narrativeSet.split('、');
  const mainStar = p.majorStars[0]?.name ?? context.threeHarmony.opposite.majorStars[0]?.name ?? '對宮主星';
  const harmonyStar = context.threeHarmony.harmonyA.majorStars[0]?.name ?? context.threeHarmony.harmonyB.majorStars[0]?.name ?? '三合星曜';
  const oppositeStar = context.threeHarmony.opposite.majorStars[0]?.name ?? '對宮';
  const trans = p.transformations[0];

  const symbols = [
    { symbol: props[0] ?? '半掩的門', meaning: `${guide.topic}裡尚未面對的那一項`, sourceRef: `主星:${mainStar}` },
    { symbol: props[1] ?? '停住的時鐘', meaning: '被遞延的決定在原地累積重量', sourceRef: trans ? `四化:${trans.starName}化${TRANS_LABEL[trans.type]}` : `宮位:${p.palaceName}` },
    { symbol: props[2] ?? '走廊盡頭的燈', meaning: '三方支撐仍亮著，但需要有人走過去', sourceRef: `三合:${harmonyStar}` },
    { symbol: props[3] ?? '玻璃上的倒影', meaning: '對面照回來的，是你遲遲沒有回應的部分', sourceRef: `對宮:${oppositeStar}` },
  ];

  const raw: Omit<NarrativeTeacherResult, 'teacherId' | 'evidenceRefs'> = {
    visualTitle: `${p.palaceName}．${props[0] ?? '未拆的信'}`,
    scene: `這一幕談的是${guide.topic}。${img.light}，${img.sound}；${props[0] ?? '桌上的物件'}就放在那裡，暗紅的反光在邊緣停了一瞬——沒有人碰它，它卻像被翻動過。`,
    mainCharacter: `畫面中央是這個人。這個人伸手又收回，做了一個沒有說破的動作：把${props[1] ?? '那件事'}往旁邊挪了一格，假裝它不存在。`,
    symbols,
    story: `${mainStar}的光落在${props[0] ?? '門口'}，一切看起來如常。直到${props[2] ?? '走廊盡頭'}傳來一下不該有的聲響——這個人回頭，發現${props[1] ?? '時鐘'}不知何時已經停了。就在此刻，整個空間的燈忽然一暗，像要把${guide.topic}裡拖延的一切一次收走；黑下來的不是房間，是選項。${harmonyStar}在遠處仍亮著一盞燈，提示這條線還有支撐——但得有人先動。`,
    pastEcho: `舊畫面的殘影：同樣的${props[0] ?? '物件'}、同樣被放回原位的手。這是命盤慣性的映照，不是真實往事。`,
    futureShadow: `${context.timeContext.annualYear} 年的光線斜過來時，若這個人仍把${props[1] ?? '該面對的事'}往旁邊挪，影子會比現在長一倍；若伸手拆開它，畫面就換場。這是條件式的暗影，不是預言。`,
    finalMetaphor: `牆上有人用舊墨寫過一卦：「${castPalaceHexagram(context).hexagramName}」。午夜的低語只說一句：燈一直都在，門也沒有鎖——誠實地伸手，比任何咒語都靈。`,
  };
  return { teacherId: 'NARRATIVE_MASTER', ...normalizeNarrativeResult(raw), evidenceRefs: buildEvidenceRefs(context) };
}

/* ---------------- 共用：可回查的證據來源（規格「二十一」的可追溯性要求） ---------------- */

function buildEvidenceRefs(context: PalaceAnalysisContext): string[] {
  const refs = [`宮位:${context.selectedPalace.palaceName}`, `易經:${castPalaceHexagram(context).hexagramName}第${castPalaceHexagram(context).changingLine}爻`];
  if (context.timeContext.currentAge !== null) refs.push(`目前年齡:${context.timeContext.currentAge}歲`);
  refs.push(`流年:${context.timeContext.annualYear}`);
  if (context.timeContext.annualTheme) refs.push(`流年主題:${context.timeContext.annualTheme}`);
  context.selectedPalace.majorStars.forEach((s) => refs.push(`主星:${s.name}`));
  context.selectedPalace.transformations.forEach((t) => refs.push(`四化:${t.starName}化${TRANS_LABEL[t.type]}`));
  refs.push(`三合宮A:${context.threeHarmony.harmonyA.palaceName}`, `三合宮B:${context.threeHarmony.harmonyB.palaceName}`, `對宮:${context.threeHarmony.opposite.palaceName}`);
  return refs;
}

export function runTeacher(teacherId: TeacherId, context: PalaceAnalysisContext) {
  if (teacherId === 'STRUCTURE_MASTER') return runStructureTeacher(context);
  if (teacherId === 'LIFE_MASTER') return runLifeTeacher(context);
  return runNarrativeTeacher(context);
}
