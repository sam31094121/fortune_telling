import type { DimensionScores } from './types';

const NAME_TRAIT_MAP: Record<string, Partial<DimensionScores>> = {
  王: { leadership: 70, control: 62, wealth: 60 },
  李: { logic: 62, social: 58, empathy: 56 },
  陳: { execution: 65, security: 60, control: 58 },
  林: { creativity: 64, empathy: 62, attachment: 58 },
  張: { leadership: 66, social: 64, risk: 58 },
  黃: { wealth: 64, execution: 60, security: 61 },
  小: { attachment: 58, empathy: 60, emotion: 56 },
  明: { logic: 68, execution: 62, leadership: 60 },
  美: { empathy: 64, social: 60, creativity: 58 },
  婷: { attachment: 62, emotion: 60, empathy: 63 },
};

function neutralScores(): DimensionScores {
  return {
    emotion: 50,
    logic: 50,
    social: 50,
    leadership: 50,
    security: 50,
    execution: 50,
    creativity: 50,
    empathy: 50,
    risk: 50,
    control: 50,
    wealth: 50,
    attachment: 50,
  };
}

export function getNamePersonalityScores(name: string): DimensionScores {
  const cleanName = name.trim();
  if (!cleanName) return neutralScores();

  const scores = neutralScores();
  let matched = 0;

  for (const char of cleanName) {
    const trait = NAME_TRAIT_MAP[char];
    if (!trait) continue;
    matched += 1;
    for (const key of Object.keys(trait) as Array<keyof DimensionScores>) {
      scores[key] = Math.round(scores[key] * 0.7 + (trait[key] ?? 50) * 0.3);
    }
  }

  return matched > 0 ? scores : neutralScores();
}

export function getNameDescription(name: string): string {
  const cleanName = name.trim();
  if (!cleanName) return '姓名尚未輸入，因此個體差異層尚未展開。';

  const mappedChars = [...cleanName].filter((char) => NAME_TRAIT_MAP[char]);
  if (!mappedChars.length) return `姓名「${cleanName}」帶來的是溫和校正，重點在整體氣質的微調。`;

  return `姓名「${cleanName}」主要把個體差異集中在 ${mappedChars.slice(0, 3).join('、')} 的字義能量上，讓人格輪廓更貼近個人風格。`;
}

export function analyzeNameCharacteristics(name: string) {
  const cleanName = name.trim();
  if (!cleanName) return ['尚未輸入姓名，無法開啟個體差異分析。'];

  const notes = [...cleanName]
    .filter((char) => NAME_TRAIT_MAP[char])
    .map((char) => `「${char}」字帶來額外的個人氣場修飾。`);

  return notes.length ? notes : ['此姓名的校正較溫和，重點落在整體氣質收束。'];
}
