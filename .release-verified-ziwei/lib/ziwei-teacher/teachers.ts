/**
 * 三位 AI 老師（2026-08-22）｜規格「二、三、八、九、十、二十」
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
    corePattern: { type: Type.STRING, description: '這個宮位形成什麼結構，一句話結論先行' },
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

export async function runStructureTeacher(context: PalaceAnalysisContext): Promise<StructureTeacherResult | typeof INSUFFICIENT_DATA> {
  if (!hasUsableData(context)) return INSUFFICIENT_DATA;
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
  return {
    teacherId: 'STRUCTURE_MASTER',
    palace: context.selectedPalace.palaceName,
    ...parsed,
    importantSupportingStars: parsed.importantSupportingStars ?? [],
    evidenceRefs: buildEvidenceRefs(context),
  };
}

/* ==================== 老師 2｜恐怖型老師 LIFE_MASTER ==================== */

const LIFE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fearScene: { type: Type.STRING, description: '本宮專屬的恐怖電影開場：一個現實空間、一個觸發徵兆、一個失常細節。必須只談本宮議題，且是戲劇化風險情境，不是已發生事實或事件預告。' },
    lifeMeaning: { type: Type.STRING, description: '冷峻地指出本宮真正的壓力核心，必須點名一項命盤證據' },
    pastPattern: { type: Type.STRING, description: '這個宮位過去容易形成的模式；只作命盤傾向推論，不捏造已發生事件' },
    futureRiskWindow: { type: Type.STRING, description: '結合目前年齡、流年與日夜情境的未來風險窗口；條件式描述，不作預言' },
    strengthInReality: { type: Type.STRING, description: '保留可用力量，但說清楚它失去控制時會反噬成什麼，必須點名證據' },
    repeatedPattern: { type: Type.STRING, description: '以「一開始—接著—最後代價」描述會重複的失控循環，非命定斷言' },
    blindSpot: { type: Type.STRING, description: '直接點出最容易被合理化、被拖延的一個盲點與累積代價' },
    decisionStyle: { type: Type.STRING, description: '描述人在壓力下如何做錯決策，並點出對應的盤內證據' },
    relationshipWithEnvironment: { type: Type.STRING, description: '描述外部互動中的摩擦、失衡或被動模式，並點出證據' },
    practicalDirection: { type: Type.STRING, description: '恐怖段結尾的道德收束：一句可執行的止損或界線動作；不使用空泛安慰或預言' },
  },
  required: ['fearScene', 'lifeMeaning', 'pastPattern', 'futureRiskWindow', 'strengthInReality', 'repeatedPattern', 'blindSpot', 'decisionStyle', 'relationshipWithEnvironment', 'practicalDirection'],
};

function buildLifePrompt(context: PalaceAnalysisContext): string {
  return `${RULE_PREFACE}

你是「恐怖型老師」，核心動作是「危機解盤」——只從正式命盤裡已存在的煞曜、化忌、壓力結構與三方牽制，指出使用者最不願面對卻需要正視的風險。
禁止重複解釋「某星曜代表什麼」（那是命盤解析老師的工作），禁止編造災難、死亡、疾病、靈異事實或保證未來事件。
語氣要有壓迫感、冷峻、直指代價：像在昏暗的監控室裡，逐一指出正在累積的裂縫。不要用「可能有點」、「建議注意」這類緩衝語；每一段都要清楚寫出「若繼續忽視，代價會怎麼擴大」，但不能把推論寫成已經發生的事或命定結果。禁止使用「一定、必然、最終會、無法挽回、注定」等把風險寫死的語句。
第一欄 fearScene 是本宮專屬的恐怖電影開場：要有一個現實空間、一個觸發徵兆、一個不對勁細節與一個尚未說破的代價。用懸疑鏡頭、聲音、光影與節奏讓人感到逼近；可使用電影化的暗紅光、冷光、倒數聲、鎖住的抽屜、反覆跳出的數字等意象，但不得描述真實人物受傷、死亡、血腥暴力，也不得說客戶曾真實遭遇此事。它是依命盤推導的戲劇化風險情境，不是事實指控或預言。
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
  return { teacherId: 'LIFE_MASTER', ...normalizeLifeResult(parsed), evidenceRefs: buildEvidenceRefs(context) };
}

/* ==================== 老師 3｜鬼魅型老師 NARRATIVE_MASTER ==================== */

const NARRATIVE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    visualTitle: { type: Type.STRING, description: '像一部幽暗電影片段的短標題，不使用勵志字眼' },
    scene: { type: Type.STRING, description: '以至少一個光源、一種聲音、一個空間與一處不對勁細節寫成幽微場景；不宣稱真實靈異' },
    mainCharacter: { type: Type.STRING, description: '畫面裡的主角與一個未被說破的動作或選擇' },
    symbols: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, meaning: { type: Type.STRING }, sourceRef: { type: Type.STRING } } },
      description: '至少四個彼此不同的象徵物件；每一個都要對應命盤裡的星曜、四化或四宮位置',
    },
    story: { type: Type.STRING, description: '一段帶懸念的幽微敘事，讓各象徵自然連結，禁止改寫成白話建議' },
    pastEcho: { type: Type.STRING, description: '像舊畫面殘留的過去迴聲；只能映照命盤慣性，不能捏造客戶真實往事' },
    futureShadow: { type: Type.STRING, description: '結合年齡、流年與當下時段的未來暗影；使用條件式象徵，不是預言' },
    finalMetaphor: { type: Type.STRING, description: '恐怖鬼魅段的道德結尾：像一句午夜低語般收尾，保留餘韻但回到誠實、界線、負責任的選擇；不作預言或威脅' },
  },
  required: ['visualTitle', 'scene', 'mainCharacter', 'symbols', 'story', 'pastEcho', 'futureShadow', 'finalMetaphor'],
};

function buildNarrativePrompt(context: PalaceAnalysisContext): string {
  return `${RULE_PREFACE}

你是「鬼魅型老師」，核心動作是「鬼魅解盤」——把宮位、星曜、三方四正、四化轉成幽微的象徵、場景、人物與命盤故事。
回答的問題是：如果把這個宮位畫成一幅圖，它正在說什麼故事？
禁止直接給結構分析（那是命盤解析老師的工作），禁止直接給危機建議或行動方向（那是恐怖型老師的工作）。
語氣要像午夜時分有人在門外低聲講述一段不能直說的往事：克制、幽暗、帶有停頓與餘韻，而不是溫和的勵志寓言。真實感來自日常空間被輕微扭轉：例如辦公室最後一盞燈、手機螢幕未讀的訊息、無人回應的走廊、桌上被翻到同一頁的文件。場景必須有明確的光源、聲音、空間感與一個未被說破的異樣細節；讓讀者感到詭譎，但不得宣稱有真實靈異事件或威脅。
鬼魅片的視覺感必須比一般故事更強：允許電影化的深紅光、像血色的反光、斑駁污漬、破碎陰影與不合時宜的聲響，讓畫面有陰森、戲劇化的張力；但不得描述真實人物受傷、肢解、死亡、血腥暴力或把這些畫面當成客戶將會遭遇的事實。
故事中的人物必須做一個符合該宮位議題的真實選擇或逃避動作，並在結尾留下尚未解開的心理懸念；不要用空泛的「希望、成長、風雨、旅程」當收尾。人物一律使用中性稱呼「這個人／此人」，絕對不能自行寫成男人、女人、男主角、女主角、他或她，也不能替客戶捏造職業、外貌、年齡或身份。
你現在是恐怖鬼魅解盤的後半段：視角改為直接對讀者說「你」，使讀者置身畫面；避免搞笑、可愛、勵志、冒險遊戲感。場景可詭異、壓迫、戲劇化，但它仍是命盤象徵，不得冒充真實靈異或實際傷害。
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
  return { teacherId: 'NARRATIVE_MASTER', ...normalizeNarrativeResult(parsed), evidenceRefs: buildEvidenceRefs(context) };
}

/* ---------------- 共用：可回查的證據來源（規格「二十一」的可追溯性要求） ---------------- */

function buildEvidenceRefs(context: PalaceAnalysisContext): string[] {
  const refs = [`宮位:${context.selectedPalace.palaceName}`];
  if (context.timeContext.currentAge !== null) refs.push(`目前年齡:${context.timeContext.currentAge}歲`);
  refs.push(`流年:${context.timeContext.annualYear}`);
  if (context.timeContext.annualTheme) refs.push(`流年主題:${context.timeContext.annualTheme}`);
  context.selectedPalace.majorStars.forEach((s) => refs.push(`主星:${s.name}`));
  context.selectedPalace.transformations.forEach((t) => refs.push(`四化:${t.starName}化${t.type}`));
  refs.push(`三合宮A:${context.threeHarmony.harmonyA.palaceName}`, `三合宮B:${context.threeHarmony.harmonyB.palaceName}`, `對宮:${context.threeHarmony.opposite.palaceName}`);
  return refs;
}

export function runTeacher(teacherId: TeacherId, context: PalaceAnalysisContext) {
  if (teacherId === 'STRUCTURE_MASTER') return runStructureTeacher(context);
  if (teacherId === 'LIFE_MASTER') return runLifeTeacher(context);
  return runNarrativeTeacher(context);
}
