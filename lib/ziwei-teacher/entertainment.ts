/**
 * 娛樂老師（恐怖／鬼魅，2026-08-22）
 *
 * 跟三位專業老師（./teachers.ts）是兩套完全獨立的呼叫路徑，不共用 prompt、不共用 schema、
 * 不混進同一份輸出。這兩位老師被明確授權可以在真實星曜/宮位之外加入虛構的靈異情節，
 * 但角色與場景靈感仍須借用下面提供的真實命盤資料（不是憑空亂編跟命盤無關的內容），
 * 且禁止：宣稱真實命運預測、恐嚇使用者、色情或血腥暴力細節、代入真實他人姓名。
 * 每次輸出固定附上 disclaimer，前端必須原樣顯示，不得拿掉。
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { PalaceAnalysisContext } from './types';
import type { EntertainmentTeacherId, EntertainmentTeacherResult } from './entertainment-types';

const MODEL_NAME = 'gemini-2.5-flash';
const TIMEOUT_MS = 20000;
const DISCLAIMER = '本篇為娛樂虛構創作，靈感借用命盤星曜與宮位，並非命理專業判讀，請勿當真。';

const ROUTE: Record<EntertainmentTeacherId, { temperature: number }> = {
  HORROR: { temperature: 1.0 },
  GHOST: { temperature: 1.1 },
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

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error('未設定 GEMINI_API_KEY 環境變數。');
  return key;
}

const ENTERTAINMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: '故事標題' },
    openingScene: { type: Type.STRING, description: '開場場景，快速帶入氣氛' },
    narrative: { type: Type.STRING, description: '故事主體' },
    chillingTwist: { type: Type.STRING, description: '毛骨悚然的轉折' },
    closingWhisper: { type: Type.STRING, description: '結尾的低語式收尾，留一點餘韻' },
    inspiredBy: { type: Type.ARRAY, items: { type: Type.STRING }, description: '這次故事借用了命盤中哪些星曜或宮位當靈感' },
  },
  required: ['title', 'openingScene', 'narrative', 'chillingTwist', 'closingWhisper'],
};

function buildHorrorPrompt(context: PalaceAnalysisContext): string {
  return `你是「恐怖老師」，負責用懸疑、驚悚的敘事口吻，把使用者的紫微命盤星曜與宮位轉化成一段短篇恐怖故事。

這是娛樂創作：允許加入命盤資料之外的虛構靈異情節、鬼故事橋段，但角色設定與場景意象要借用下面提供的真實星曜／宮位名稱作為靈感（不是照抄命理定義，是拿來當故事素材）。
語氣：懸疑、緊張、毛骨悚然，像深夜恐怖故事節目。
禁止：宣稱這是真實命運預測、恐嚇或詛咒使用者本人、產出色情或血腥暴力細節、代入真實他人姓名。

${renderContext(context)}

請輸出 JSON。`;
}

function buildGhostPrompt(context: PalaceAnalysisContext): string {
  return `你是「鬼魅老師」，用飄忽、詭譎、像鬼魅低語的口吻，把使用者的紫微命盤星曜與宮位轉化成一段靈異故事。

這是娛樂創作：允許加入命盤資料之外的虛構靈異情節，但場景與角色靈感要借用下面提供的真實星曜／宮位名稱作為素材。
語氣：飄渺、詭異、若有似無，像午夜低語，不同於恐怖老師的直接驚悚。
禁止：宣稱這是真實命運預測、恐嚇或詛咒使用者本人、產出色情或血腥暴力細節、代入真實他人姓名。

${renderContext(context)}

請輸出 JSON。`;
}

async function runOne(teacherId: EntertainmentTeacherId, prompt: string, temperature: number): Promise<EntertainmentTeacherResult> {
  const ai = new GoogleGenAI({ apiKey: apiKey() });
  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseSchema: ENTERTAINMENT_SCHEMA as never, responseMimeType: 'application/json', temperature, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 2048 },
    }),
    TIMEOUT_MS,
    '老師故事生成逾時，請稍後再試。',
  );
  const text = response.text || '';
  if (!text) throw new Error('老師未返回有效回應。');
  const parsed = safeJsonParse<Omit<EntertainmentTeacherResult, 'teacherId' | 'disclaimer' | 'inspiredBy'> & { inspiredBy?: string[] }>(text);
  return {
    teacherId,
    ...parsed,
    inspiredBy: parsed.inspiredBy ?? [],
    disclaimer: DISCLAIMER,
  };
}

export async function runEntertainmentTeacher(teacherId: EntertainmentTeacherId, context: PalaceAnalysisContext): Promise<EntertainmentTeacherResult> {
  if (teacherId === 'HORROR') return runOne('HORROR', buildHorrorPrompt(context), ROUTE.HORROR.temperature);
  return runOne('GHOST', buildGhostPrompt(context), ROUTE.GHOST.temperature);
}
