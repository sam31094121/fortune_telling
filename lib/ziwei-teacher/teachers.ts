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
  return `【當下時間層】\n目前年齡：${time.currentAge === null ? '資料不足' : `${time.currentAge} 歲`}\n流年：${time.annualYear}${time.annualLevel ? `・${time.annualLevel}` : ''}${time.annualTheme ? `\n流年主題：${time.annualTheme}` : ''}\n查看時段：${time.readingPeriodLabel}`;
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
    conclusion: { type: Type.STRING, description: '格局總判，理性收尾' },
  },
  required: ['corePattern', 'primaryStarSynthesis', 'threeHarmonySynthesis', 'transformationEffect', 'structuralStrength', 'structuralPressure', 'conclusion'],
};

function buildStructurePrompt(context: PalaceAnalysisContext): string {
  return `${RULE_PREFACE}

你是「命盤解析老師」，核心動作是「解析命盤」——只看結構，不談人生建議、不說故事、不寫畫面比喻。
固定判讀順序：本宮 → 主星組合 → 三方四正 → 四化 → 重要輔煞 → 格局總判。
語氣：理性、精準、專業、結論先行。禁止出現任何人生雞湯或勵志語句。

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
    lifeMeaning: { type: Type.STRING, description: '冷峻地指出本宮真正的壓力核心，必須點名一項命盤證據' },
    strengthInReality: { type: Type.STRING, description: '保留可用力量，但說清楚它失去控制時會反噬成什麼，必須點名證據' },
    repeatedPattern: { type: Type.STRING, description: '以「一開始—接著—最後代價」描述會重複的失控循環，非命定斷言' },
    blindSpot: { type: Type.STRING, description: '直接點出最容易被合理化、被拖延的一個盲點與累積代價' },
    decisionStyle: { type: Type.STRING, description: '描述人在壓力下如何做錯決策，並點出對應的盤內證據' },
    relationshipWithEnvironment: { type: Type.STRING, description: '描述外部互動中的摩擦、失衡或被動模式，並點出證據' },
    practicalDirection: { type: Type.STRING, description: '一句可執行的止損動作；不使用空泛安慰或預言' },
  },
  required: ['lifeMeaning', 'strengthInReality', 'repeatedPattern', 'blindSpot', 'decisionStyle', 'relationshipWithEnvironment', 'practicalDirection'],
};

function buildLifePrompt(context: PalaceAnalysisContext): string {
  return `${RULE_PREFACE}

你是「恐怖型老師」，核心動作是「危機解盤」——只從正式命盤裡已存在的煞曜、化忌、壓力結構與三方牽制，指出使用者最不願面對卻需要正視的風險。
禁止重複解釋「某星曜代表什麼」（那是命盤解析老師的工作），禁止編造災難、死亡、疾病、靈異事實或保證未來事件。
語氣要有壓迫感、冷峻、直指代價：像在昏暗的監控室裡，逐一指出正在累積的裂縫。不要用「可能有點」、「建議注意」這類緩衝語；每一段都要清楚寫出「若繼續忽視，代價會怎麼擴大」，但不能把推論寫成已經發生的事或命定結果。
真實感來自具體生活畫面，不是虛構恐嚇：把壓力落在可辨識的工作、金錢、關係、溝通或決策現場，寫出一個觸發徵兆、一個當下反應，以及一個逐步累積的後果。每個欄位必須至少點名一項本宮或三方四正的實際證據，並給出一個具體、可執行的避險動作。
禁止談論命盤結構術語本身，禁止寫成故事或畫面比喻。

${renderContext(context)}

${renderTimeContext(context)}

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
  return { teacherId: 'LIFE_MASTER', ...parsed, evidenceRefs: buildEvidenceRefs(context) };
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
    finalMetaphor: { type: Type.STRING, description: '像一句午夜低語般收尾，克制、詭譎、有餘韻，不作預言或威脅' },
  },
  required: ['visualTitle', 'scene', 'mainCharacter', 'symbols', 'story', 'finalMetaphor'],
};

function buildNarrativePrompt(context: PalaceAnalysisContext): string {
  return `${RULE_PREFACE}

你是「鬼魅型老師」，核心動作是「鬼魅解盤」——把宮位、星曜、三方四正、四化轉成幽微的象徵、場景、人物與命盤故事。
回答的問題是：如果把這個宮位畫成一幅圖，它正在說什麼故事？
禁止直接給結構分析（那是命盤解析老師的工作），禁止直接給危機建議或行動方向（那是恐怖型老師的工作）。
語氣要像午夜時分有人在門外低聲講述一段不能直說的往事：克制、幽暗、帶有停頓與餘韻，而不是溫和的勵志寓言。真實感來自日常空間被輕微扭轉：例如辦公室最後一盞燈、手機螢幕未讀的訊息、無人回應的走廊、桌上被翻到同一頁的文件。場景必須有明確的光源、聲音、空間感與一個未被說破的異樣細節；讓讀者感到詭譎，但不得宣稱有真實靈異事件或威脅。
故事中的人物必須做一個符合該宮位議題的真實選擇或逃避動作，並在結尾留下尚未解開的心理懸念；不要用空泛的「希望、成長、風雨、旅程」當收尾。
你只能用畫面、場景、人物、隱喻說話。每一個象徵都必須能回查到命盤裡實際存在的星曜或四化（填進 symbols 的 sourceRef）；至少產出四個不同象徵，分別連回本宮與三方四正，不能只換名詞重複同一個意象。
範例語氣（命宮七殺×紫微）：「城牆上的燈只亮半盞。統帥沒有回頭，卻知道身後那座城仍在等一個命令。」

${renderContext(context)}

${renderTimeContext(context)}

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
  return { teacherId: 'NARRATIVE_MASTER', ...parsed, evidenceRefs: buildEvidenceRefs(context) };
}

/* ---------------- 共用：可回查的證據來源（規格「二十一」的可追溯性要求） ---------------- */

function buildEvidenceRefs(context: PalaceAnalysisContext): string[] {
  const refs = [`宮位:${context.selectedPalace.palaceName}`];
  if (context.timeContext.currentAge !== null) refs.push(`目前年齡:${context.timeContext.currentAge}歲`);
  refs.push(`流年:${context.timeContext.annualYear}`, `當下時段:${context.timeContext.readingPeriodLabel}`);
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
