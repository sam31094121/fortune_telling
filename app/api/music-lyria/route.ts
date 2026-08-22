import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createRequestId, friendlyErrorResponse } from '@/lib/api-stability';

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

interface VoiceProfile {
  workflowStatus: string;
  consentAccepted: boolean;
  recorded: boolean;
  localOnly: boolean;
  selfDialogueConcept: string;
  sample: null | {
    durationSeconds: number;
    qualityScore: number;
    averageVolume: number;
    dynamicRange: number;
    brightness: number;
    tempoPulse: number;
    inferredCharacteristics: string[];
    recordedAt: string;
  };
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
  voiceProfile?: VoiceProfile;
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
  const { subjectName, fusionSong, productionPlan, musicParameters, voiceProfile } = body;
  const lyrics = fusionSong.fusion_lyrics
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 28)
    .join('\n');
  const voiceCalibrationRule = voiceProfile?.recorded && voiceProfile.sample
    ? [
        'Voice summary calibration:',
        '- The user authorized an own-voice recording, but only a local summary is provided.',
        '- Use this summary to shape phrasing, breath spacing, emotional pressure, and self-dialogue rhythm.',
        `- Summary: duration=${voiceProfile.sample.durationSeconds}s, quality=${voiceProfile.sample.qualityScore}, tempoPulse=${voiceProfile.sample.tempoPulse}, traits=${voiceProfile.sample.inferredCharacteristics.join(', ')}.`,
        '- Do not claim voice cloning, voice copying, or raw voice upload. This is voice-summary calibration only.',
      ].join('\n')
    : 'No voice-summary calibration is available; do not mention own-voice generation or voice cloning.';


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

Vocal quality target:
- Lead with a magnetic, close and three-dimensional vocal tone: rich chest resonance and a focused midrange that stays present over the arrangement.
- Keep Mandarin diction crisp and forward; every key lyric must be intelligible without sounding shouted or nasal.
- Give the chorus controlled penetration through resonance, supported breath and dynamic lift—not harshness, distortion or excessive volume.
- Shape each phrase with a natural breath, clear consonants, a stable pitch center and an emotional release at the end of the chorus line.
- Preserve warm low frequencies, open high-frequency air and clean transients; avoid muddy low-mids, thin vocals, flat delivery and over-compression.
- Deliver a clean studio-vocal finish: no audible hiss, clipping, crackle, muddiness, unstable pitch, swallowed words, accidental distortion or distracting background artifacts.
- Keep the lead vocal clearly separated from the backing track, with enough space and headroom for the words, breath and emotional detail to remain clean on phone speakers and headphones.
- Use professional singing technique: grounded breath support, intentional phrasing, clean consonant attacks and unhurried breath placement in the verses.
- Build the pre-chorus with measured dynamic growth, then connect chest and head registers smoothly in the chorus with stable pitch, sustained notes and controlled vibrato.
- Use tasteful ad-libs and wide supporting harmonies only at the emotional peak; keep the lead melody clear and never over-sing every phrase.
- Do not reuse one fixed vocal delivery: adapt technique, register, phrasing, ornamentation and intensity to this song's genre, BPM, lyric emotion and arrangement arc.
- Let quiet, intimate songs use close phrasing and space; let powerful songs use fuller chest resonance and a wider chorus; let healing songs use lighter head-voice release and restrained vibrato.
- Treat the lyric as a lived emotional story, never as words being read over a beat. Find the turning point in the lyric and let the vocal performance move toward it.
- Give the opening an intimate, held-back feeling; let the pre-chorus show a believable lift in resolve; make the chorus feel like earned release, not a sudden generic volume increase.
- Place meaningful words slightly forward with natural pauses, gentle vocal colour changes and emotionally appropriate breath. Avoid a flat, even delivery or identical emphasis on every line.
- Let the final phrase land with warmth and resolution, leaving a human aftertaste rather than an abrupt, synthetic finish.

${voiceCalibrationRule}

Tiandiren language / layer balance:
${productionPlan.language_distribution || 'Heaven layer English identity, Earth layer Mandarin phrasing, Human layer Taiwanese emotional landing.'}

Lyrics source:
${lyrics}

Important rules:
- This must be a newly generated personalized song preview for this user's profile, not a shared demo, fixed template, or generic stock loop.
- If voice calibration exists, it is only a local summary for phrasing and emotion; do not present the output as cloned from the user's real voice.
- Generate exactly one unified 30-second song preview, not three separate songs.
- Make it immediately playable, emotional, modern, and hook-forward.
- Prioritize a magnetic lead vocal with clear diction and a chorus that cuts through the music with warmth and controlled power.
- Prioritize emotional interpretation: the listener should hear a real journey from tension to release, with phrasing that makes the lyric feel personal and believable.
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
  const requestId = createRequestId();
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '系統正在重新同步，請稍候再試。', 503);
  }

  let body: MusicLyriaRequest;
  try {
    body = (await request.json()) as MusicLyriaRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '無法解析請求 JSON。', 400);
  }

  const error = validatePayload(body);
  if (error) {
    return friendlyErrorResponse(requestId, 'INVALID_INPUT', error, 400);
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
      return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '系統正在重新同步，請稍候再試。', 502);
    }

    return NextResponse.json({
      audioBase64,
      mimeType: mimeType === 'audio/mp3' ? 'audio/mpeg' : mimeType,
      filename: `天宿人格主題曲-${sanitizeFilename(body.subjectName || body.fusionSong.fusion_title)}.mp3`,
      lyricsText,
      promptPreview,
    });
  } catch (err) {
    console.error('[music-lyria] generation failed', requestId, err instanceof Error ? err.message : String(err));
    const googleError = normalizeSdkError(err);
    const message = googleError.message || (err instanceof Error ? err.message : String(err));
    return friendlyErrorResponse(
      requestId,
      googleError.httpStatus === 400 ? 'INVALID_INPUT' : 'TEMPORARILY_UNAVAILABLE',
      mapLyriaError(message, googleError.status),
      googleError.httpStatus === 400 ? 400 : 502,
    );
  }
}
