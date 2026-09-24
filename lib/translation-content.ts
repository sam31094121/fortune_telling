/** SRT is parsed locally; timestamps never go through a translation model. */
export type SubtitleCue = { index: string; timing: string; text: string };
export const TRANSLATION_TEXT_LIMIT = 5000;
export const SUBTITLE_CUE_LIMIT = 50;

export function parseSrt(input: string): SubtitleCue[] {
  if (input.length > 50000) throw new Error('字幕檔太大，請分段匯入。');
  const normalized = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) throw new Error('請貼上字幕內容。');
  const blocks = normalized.split(/\n[ \t]*\n+/);
  if (blocks.length > SUBTITLE_CUE_LIMIT) throw new Error('每次最多翻譯 50 段字幕，請分段處理。');
  const seen = new Set<string>();
  const cues = blocks.map(block => {
    const [index, timing, ...lines] = block.split('\n');
    const match = timing?.match(/^(\d{2,}):([0-5]\d):([0-5]\d),(\d{3}) --> (\d{2,}):([0-5]\d):([0-5]\d),(\d{3})$/);
    if (!/^\d+$/.test(index) || !match || !lines.join('\n').trim() || seen.has(index)) {
      throw new Error('請使用有效的 SRT 字幕，保留編號、時間軸和字幕文字。');
    }
    const ms = (offset: number) => ((Number(match[offset]) * 60 + Number(match[offset + 1])) * 60 + Number(match[offset + 2])) * 1000 + Number(match[offset + 3]);
    if (ms(5) <= ms(1)) throw new Error('字幕結束時間必須晚於開始時間。');
    seen.add(index);
    return { index, timing, text: lines.join('\n') };
  });
  if (cues.reduce((total, cue) => total + cue.text.length, 0) > TRANSLATION_TEXT_LIMIT) {
    throw new Error('字幕文字每次最多 5,000 字，請分段處理。');
  }
  return cues;
}

export function renderTranslatedSrt(cues: SubtitleCue[], translated: string[], bilingual = false) {
  if (cues.length !== translated.length || translated.some(text => typeof text !== 'string' || !text.trim() || /\r?\n[ \t]*\r?\n/.test(text))) {
    throw new Error('翻譯結果不完整或格式錯誤，尚未產生字幕檔。');
  }
  return cues.map((cue, i) => `${cue.index}\n${cue.timing}\n${bilingual ? cue.text + '\n' : ''}${translated[i].replace(/\r\n?/g, '\n')}`).join('\n\n') + '\n';
}
