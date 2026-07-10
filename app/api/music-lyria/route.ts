import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LYRIA_MODEL = 'lyria-3-clip-preview';

interface FusionSong {
  fusion_title: string;
  fusion_concept: string;
  fusion_lyrics: string[];
  fusion_style: string;
}

interface ProductionPlan {
  arrangement_prompt?: string;
  vocal_prompt?: string;
  generation_prompt: string;
  language_distribution?: string;
  trend_safety_note?: string;
}

interface MusicParameters {
  bpm: number;
  key: string;
  genre: string;
  mood: string[];
  instrument: string[];
  vocal_style: string;
  lyric_theme: string[];
}

interface MusicLyriaRequest {
  subjectName?: string;
  fusionSong: FusionSong;
  productionPlan: ProductionPlan;
  musicParameters: MusicParameters;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function validatePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return '請提供有效的音樂生成資料。';

  const body = payload as Partial<MusicLyriaRequest>;
  if (!body.fusionSong || typeof body.fusionSong !== 'object') return '缺少融合歌曲資料。';
  if (!body.productionPlan || typeof body.productionPlan !== 'object') return '缺少製作計畫資料。';
  if (!body.musicParameters || typeof body.musicParameters !== 'object') return '缺少音樂參數資料。';

  if (typeof body.fusionSong.fusion_title !== 'string' || !body.fusionSong.fusion_title.trim()) {
    return '融合歌曲缺少標題。';
  }
  if (typeof body.fusionSong.fusion_concept !== 'string') return '融合歌曲概念格式無效。';
  if (!isStringArray(body.fusionSong.fusion_lyrics)) return '融合歌曲歌詞格式無效。';
  if (typeof body.fusionSong.fusion_style !== 'string') return '融合歌曲風格格式無效。';

  if (typeof body.productionPlan.generation_prompt !== 'string' || !body.productionPlan.generation_prompt.trim()) {
    return '製作計畫缺少生成指令。';
  }

  if (!Number.isFinite(body.musicParameters.bpm)) return 'BPM 格式無效。';
  if (typeof body.musicParameters.key !== 'string') return 'Key 格式無效。';
  if (typeof body.musicParameters.genre !== 'string') return 'Genre 格式無效。';
  if (!isStringArray(body.musicParameters.mood)) return 'Mood 格式無效。';
  if (!isStringArray(body.musicParameters.instrument)) return 'Instrument 格式無效。';
  if (typeof body.musicParameters.vocal_style !== 'string') return 'Vocal style 格式無效。';
  if (!isStringArray(body.musicParameters.lyric_theme)) return 'Lyric theme 格式無效。';

  return null;
}

function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || '人格主題曲';
}

function buildLyriaPrompt(body: MusicLyriaRequest) {
  const { subjectName, fusionSong, productionPlan, musicParameters } = body;
  const lyrics = fusionSong.fusion_lyrics
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 28)
    .join('\n');

  return limitText(`
Create a polished 30-second MP3 preview for one original Tiandiren personality theme song.

Personalized for: ${subjectName?.trim() || 'this individual user'}
Song title: ${fusionSong.fusion_title}
Core concept: ${fusionSong.fusion_concept}
Style: ${fusionSong.fusion_style}

Music settings:
- Genre: ${musicParameters.genre}
- BPM: ${Math.round(musicParameters.bpm)}
- Key: ${musicParameters.key}
- Mood: ${musicParameters.mood.join(', ')}
- Instruments: ${musicParameters.instrument.join(', ')}
- Vocal style: ${musicParameters.vocal_style}
- Lyric themes: ${musicParameters.lyric_theme.join(', ')}

Arrangement direction:
${productionPlan.arrangement_prompt || productionPlan.generation_prompt}

Vocal direction:
${productionPlan.vocal_prompt || musicParameters.vocal_style}

Tiandiren language / layer balance:
${productionPlan.language_distribution || 'Heaven layer English identity, Earth layer Mandarin phrasing, Human layer Taiwanese emotional landing.'}

Lyrics source:
${lyrics}

Important rules:
- This must be a newly generated personalized song preview for this user's profile, not a shared demo, fixed template, or generic stock loop.
- Generate exactly one unified 30-second song preview, not three separate songs.
- Make it immediately playable, emotional, modern, and hook-forward.
- Include vocals only if the model can render them naturally; otherwise prioritize a high-quality instrumental arrangement.
- Do not imitate any real singer, copyrighted melody, protected lyrics, or specific existing song.
- ${productionPlan.trend_safety_note || 'Use general global pop arrangement logic only.'}
`.trim(), 3900);
}

function pickString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function extractContentBlocks(value: unknown, textParts: string[]) {
  let audioBase64 = '';
  let mimeType = 'audio/mpeg';

  if (!Array.isArray(value)) return { audioBase64, mimeType };

  for (const block of value) {
    if (!block || typeof block !== 'object') continue;
    const record = block as Record<string, unknown>;

    if (record.type === 'audio' && typeof record.data === 'string') {
      audioBase64 = record.data;
      mimeType = pickString(record.mime_type) || pickString(record.mimeType) || mimeType;
    }

    if (record.type === 'text' && typeof record.text === 'string') {
      textParts.push(record.text);
    }

    const inlineData = (record.inlineData || record.inline_data) as Record<string, unknown> | undefined;
    if (inlineData && typeof inlineData.data === 'string') {
      audioBase64 = inlineData.data;
      mimeType = pickString(inlineData.mimeType) || pickString(inlineData.mime_type) || mimeType;
    }
  }

  return { audioBase64, mimeType };
}

function extractLyriaResult(interaction: unknown) {
  const record = interaction as Record<string, unknown>;

  const directAudio = record.output_audio as Record<string, unknown> | undefined;
  const directAudioData = pickString(directAudio?.data);
  if (directAudioData) {
    return {
      audioBase64: directAudioData,
      mimeType: pickString(directAudio?.mime_type) || pickString(directAudio?.mimeType) || 'audio/mpeg',
      lyricsText: pickString(record.output_text),
    };
  }

  let audioBase64 = '';
  let mimeType = 'audio/mpeg';
  const textParts: string[] = [];

  const outputText = pickString(record.output_text);
  if (outputText) textParts.push(outputText);

  const outputs = Array.isArray(record.outputs) ? record.outputs : [];

  for (const output of outputs) {
    if (!output || typeof output !== 'object') continue;
    const content = output as Record<string, unknown>;

    if (content.type === 'audio' && typeof content.data === 'string') {
      audioBase64 = content.data;
      mimeType = pickString(content.mime_type) || pickString(content.mimeType) || mimeType;
    }
    if (content.type === 'text' && typeof content.text === 'string') {
      textParts.push(content.text);
    }

    const parts = Array.isArray(content.parts) ? content.parts : [];
    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const partRecord = part as Record<string, unknown>;
      const inlineData = (partRecord.inlineData || partRecord.inline_data) as Record<string, unknown> | undefined;
      if (inlineData && typeof inlineData.data === 'string') {
        audioBase64 = inlineData.data;
        mimeType = pickString(inlineData.mimeType) || pickString(inlineData.mime_type) || mimeType;
      }
      if (typeof partRecord.text === 'string') textParts.push(partRecord.text);
    }
  }

  const steps = Array.isArray(record.steps) ? record.steps : [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const stepRecord = step as Record<string, unknown>;
    const extracted = extractContentBlocks(stepRecord.content, textParts);
    if (extracted.audioBase64) {
      audioBase64 = extracted.audioBase64;
      mimeType = extracted.mimeType;
    }
  }

  return {
    audioBase64,
    mimeType,
    lyricsText: textParts.join('\n\n').trim(),
  };
}

function normalizeSdkError(err: unknown) {
  if (!err || typeof err !== 'object') {
    return { status: '', message: String(err), code: undefined, httpStatus: undefined };
  }

  const record = err as Record<string, unknown>;
  const errorBody = record.error as Record<string, unknown> | undefined;
  const nestedError = errorBody?.error as Record<string, unknown> | undefined;
  const message =
    pickString(nestedError?.message) ||
    pickString(errorBody?.message) ||
    (err instanceof Error ? err.message : String(err));
  const status = pickString(nestedError?.status) || pickString(errorBody?.status);
  const code =
    typeof nestedError?.code === 'number' ? nestedError.code :
      typeof errorBody?.code === 'number' ? errorBody.code :
        undefined;
  const httpStatus = typeof record.status === 'number' ? record.status : code;

  return { status, message, code, httpStatus };
}

function mapLyriaError(message: string, status = '') {
  const lower = message.toLowerCase();
  const lowerStatus = status.toLowerCase();

  if (
    lowerStatus.includes('permission') ||
    lowerStatus.includes('failed_precondition') ||
    lowerStatus.includes('not_found') ||
    lower.includes('permission') ||
    lower.includes('permission_denied') ||
    lower.includes('failed_precondition') ||
    lower.includes('not_found') ||
    lower.includes('not found') ||
    lower.includes('billing') ||
    lower.includes('allowlist') ||
    lower.includes('access')
  ) {
    return 'Lyria 模型目前不可用，請確認 Gemini API / billing / model access。';
  }

  return 'Lyria 30 秒 MP3 生成失敗，請稍後再試。';
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: '尚未設定 GEMINI_API_KEY，無法產生 Lyria MP3。' }, { status: 500 });
  }

  let body: MusicLyriaRequest;
  try {
    body = (await request.json()) as MusicLyriaRequest;
  } catch {
    return NextResponse.json({ error: '無法解析請求 JSON。' }, { status: 400 });
  }

  const error = validatePayload(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const promptPreview = buildLyriaPrompt(body);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: LYRIA_MODEL,
      input: promptPreview,
      stream: false,
    });

    const { audioBase64, mimeType, lyricsText } = extractLyriaResult(interaction);

    if (!audioBase64) {
      return NextResponse.json({
        error: 'Lyria 沒有回傳可播放的 MP3 音檔。',
        detail: '回傳中沒有 output_audio，也沒有 steps[].content[] audio block。',
        promptPreview,
      }, { status: 502 });
    }

    return NextResponse.json({
      audioBase64,
      mimeType: mimeType === 'audio/mp3' ? 'audio/mpeg' : mimeType,
      filename: `天宿人格主題曲-${sanitizeFilename(body.subjectName || body.fusionSong.fusion_title)}.mp3`,
      lyricsText,
      promptPreview,
    });
  } catch (err) {
    console.error('[music-lyria] generation failed', err);
    const googleError = normalizeSdkError(err);
    const message = googleError.message || (err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      error: mapLyriaError(message, googleError.status),
      detail: message,
      googleStatus: googleError.status || undefined,
      promptPreview,
    }, { status: googleError.httpStatus === 400 ? 400 : 502 });
  }
}
