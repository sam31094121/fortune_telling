import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ELEVENLABS_MUSIC_ENDPOINT = 'https://api.elevenlabs.io/v1/music';
const ELEVENLABS_MUSIC_PLAN_ENDPOINT = 'https://api.elevenlabs.io/v1/music/plan';

interface ServicePackage {
  title?: string;
  render_settings?: {
    bpm?: number;
    key?: string;
    genre?: string;
    target_duration?: string;
    output?: string;
    vocal_language_mix?: string;
  };
  arrangement_prompt?: string;
  vocal_prompt?: string;
  lyrics?: string;
  song_structure?: string[];
  popular_music_dna?: string[];
  global_trend_blend?: string[];
  trend_arrangement_recipe?: string;
  rhythm_strategy?: string;
  trend_safety_note?: string;
  negative_prompt?: string;
}

interface ElevenLabsShellRequest {
  servicePackage?: ServicePackage;
  dryRun?: boolean;
}

interface CompositionPlanSection {
  section_name: string;
  positive_local_styles: string[];
  negative_local_styles: string[];
  duration_ms: number;
  lines: string[];
}

function trimText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function pickLines(lines: string[], start: number, count: number) {
  const picked = lines.slice(start, start + count);
  return picked.length > 0 ? picked : lines.slice(0, Math.min(count, lines.length));
}

function cleanLyricLines(lyrics: string) {
  return lyrics
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[\[【].+[\]】]$/.test(line))
    .slice(0, 28);
}

function buildElevenLabsPrompt(servicePackage: ServicePackage) {
  const title = trimText(servicePackage.title, '三合一原創主題曲');
  const settings = servicePackage.render_settings ?? {};
  const songStructure = Array.isArray(servicePackage.song_structure)
    ? servicePackage.song_structure.filter((item) => typeof item === 'string').join(' / ')
    : '';
  const globalTrendBlend = Array.isArray(servicePackage.global_trend_blend)
    ? servicePackage.global_trend_blend.filter((item) => typeof item === 'string').join(' ')
    : '';
  const popularMusicDna = Array.isArray(servicePackage.popular_music_dna)
    ? servicePackage.popular_music_dna.filter((item) => typeof item === 'string').join(' ')
    : '';

  const prompt = [
    `Create an original full song titled "${title}".`,
    `Genre: ${settings.genre ?? 'global pop fusion'}. BPM: ${settings.bpm ?? 'auto'}. Key: ${settings.key ?? 'auto'}.`,
    `Language mix: ${settings.vocal_language_mix ?? 'Mandarin, English, and Taiwanese blended naturally'}.`,
    `Song structure: ${songStructure || 'intro, verse, pre-chorus, chorus, bridge, final chorus, outro'}.`,
    `Arrangement: ${trimText(servicePackage.arrangement_prompt)}`,
    `Vocal direction: ${trimText(servicePackage.vocal_prompt)}`,
    `Global trend blend: ${globalTrendBlend}`,
    `Popular music DNA: ${popularMusicDna}`,
    `Trend arrangement recipe: ${trimText(servicePackage.trend_arrangement_recipe)}`,
    `Rhythm strategy: ${trimText(servicePackage.rhythm_strategy)}`,
    `Lyrics:\n${trimText(servicePackage.lyrics)}`,
    `Safety: ${trimText(servicePackage.trend_safety_note)} ${trimText(servicePackage.negative_prompt)}`,
  ].filter((line) => line.replace(/^[^:]+:\s*$/, '').trim().length > 0).join('\n\n');

  return limitText(prompt, 4100);
}

function buildLocalCompositionPlanPreview(servicePackage: ServicePackage) {
  const settings = servicePackage.render_settings ?? {};
  const lyrics = cleanLyricLines(trimText(servicePackage.lyrics));
  const globalTrendBlend = Array.isArray(servicePackage.global_trend_blend)
    ? servicePackage.global_trend_blend.filter((item) => typeof item === 'string').slice(0, 6)
    : [];
  const popularMusicDna = Array.isArray(servicePackage.popular_music_dna)
    ? servicePackage.popular_music_dna.filter((item) => typeof item === 'string').slice(0, 6)
    : [];
  const positiveGlobalStyles = [
    settings.genre ?? 'global pop fusion',
    'trilingual vocal song',
    'modern streaming pop',
    'cinematic emotional arrangement',
    'memorable chorus hook',
    ...globalTrendBlend,
    ...popularMusicDna.slice(0, 2),
  ].filter(Boolean);
  const negativeGlobalStyles = [
    'copyrighted melody imitation',
    'specific real singer imitation',
    'messy language switching',
    'robotic vocal delivery',
    'random notes',
    'over-compressed harsh audio',
  ];
  const sections: CompositionPlanSection[] = [
    {
      section_name: 'Intro',
      positive_local_styles: ['airy English motif', 'soft synth pad', 'memorable 8-second hook'],
      negative_local_styles: ['busy drums', 'overcrowded vocals'],
      duration_ms: 8_000,
      lines: [],
    },
    {
      section_name: 'Verse 1',
      positive_local_styles: ['Mandarin storytelling', 'intimate vocal', 'light groove'],
      negative_local_styles: ['too many harmonies', 'chorus-level intensity'],
      duration_ms: 18_000,
      lines: pickLines(lyrics, 0, 4),
    },
    {
      section_name: 'Pre-Chorus',
      positive_local_styles: ['rising tension', 'short English response', 'K-pop style lift'],
      negative_local_styles: ['flat dynamics'],
      duration_ms: 12_000,
      lines: pickLines(lyrics, 4, 3),
    },
    {
      section_name: 'Chorus',
      positive_local_styles: ['trilingual hook', 'global pop clarity', 'Latin-influenced pulse', 'wide harmonies'],
      negative_local_styles: ['unclear hook', 'lyrics too dense'],
      duration_ms: 22_000,
      lines: pickLines(lyrics, 7, 5),
    },
    {
      section_name: 'Bridge',
      positive_local_styles: ['Taiwanese emotional grounding', 'reduced drums', 'warm vocal texture'],
      negative_local_styles: ['sudden unrelated style change'],
      duration_ms: 12_000,
      lines: pickLines(lyrics, 12, 3),
    },
    {
      section_name: 'Final Chorus',
      positive_local_styles: ['full arrangement', 'repeatable signature hook', 'Mandarin English Taiwanese blend'],
      negative_local_styles: ['ending without resolution'],
      duration_ms: 18_000,
      lines: pickLines(lyrics, 7, 5),
    },
  ];

  return {
    positive_global_styles: positiveGlobalStyles,
    negative_global_styles: negativeGlobalStyles,
    target_duration_ms: sections.reduce((sum, section) => sum + section.duration_ms, 0),
    language_plan: settings.vocal_language_mix ?? 'Mandarin 55% · English 25% · Taiwanese 20%',
    sections,
  };
}

function validateServicePackage(servicePackage: unknown) {
  if (!servicePackage || typeof servicePackage !== 'object') return '缺少三合一音樂製作包。';

  const payload = servicePackage as ServicePackage;
  if (!trimText(payload.title)) return '製作包缺少歌曲標題。';
  if (!trimText(payload.arrangement_prompt)) return '製作包缺少編曲 prompt。';
  if (!trimText(payload.vocal_prompt)) return '製作包缺少人聲 prompt。';
  if (!trimText(payload.lyrics)) return '製作包缺少歌詞。';

  return null;
}

export async function POST(request: Request) {
  let body: ElevenLabsShellRequest;

  try {
    body = (await request.json()) as ElevenLabsShellRequest;
  } catch {
    return NextResponse.json({ error: '無法解析請求 JSON。' }, { status: 400 });
  }

  const errMsg = validateServicePackage(body.servicePackage);
  if (errMsg) {
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }

  const servicePackage = body.servicePackage as ServicePackage;
  const apiKeyConfigured = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  const prompt = buildElevenLabsPrompt(servicePackage);
  const localCompositionPlanPreview = buildLocalCompositionPlanPreview(servicePackage);
  const dryRun = body.dryRun !== false;

  return NextResponse.json({
    provider: 'elevenlabs_music',
    status: apiKeyConfigured ? 'shell_ready_key_detected' : 'shell_ready_waiting_for_api_key',
    dry_run: dryRun,
    api_key_configured: apiKeyConfigured,
    external_request_sent: false,
    next_action: apiKeyConfigured
      ? '外殼已準備好；下一步才開啟真正送出生成，這次沒有呼叫 ElevenLabs。'
      : '請先在後端環境變數設定 ELEVENLABS_API_KEY；這次沒有呼叫 ElevenLabs。',
    elevenlabs_target: {
      compose_endpoint: ELEVENLABS_MUSIC_ENDPOINT,
      plan_endpoint: ELEVENLABS_MUSIC_PLAN_ENDPOINT,
      planned_method: 'POST',
      planned_mode: 'prompt_first_or_composition_plan_later',
      model_id: 'music_v2',
      output_format: 'auto',
    },
    local_composition_plan_preview: localCompositionPlanPreview,
    prepared_request_preview: {
      prompt,
      prompt_characters: prompt.length,
      plan_request_body_preview: {
        prompt,
        model_id: 'music_v2',
        music_length_ms: localCompositionPlanPreview.target_duration_ms,
      },
      request_body_preview: {
        prompt,
        model_id: 'music_v2',
        music_length_ms: localCompositionPlanPreview.target_duration_ms,
        force_instrumental: false,
      },
    },
    safety_note:
      '目前是 dry-run 串接外殼：後端只整理 ElevenLabs Music API 所需資料，不會送出外部生成請求，也不會消耗額度。',
  });
}
