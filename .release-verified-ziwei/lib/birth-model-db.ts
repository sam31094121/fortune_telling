import { getZodiacSign } from './zodiac';
import type { DimensionScores } from './types';

interface ZodiacPersonalityProfile {
  zodiac: string;
  description: string;
  scores: DimensionScores;
}

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

const ZODIAC_PERSONALITY_DB: Record<string, ZodiacPersonalityProfile> = {
  '摩羯座': {
    zodiac: '摩羯座',
    description: '務實、自律、重視秩序與長期成果。',
    scores: { emotion: 35, logic: 75, social: 45, leadership: 65, security: 80, execution: 80, creativity: 40, empathy: 45, risk: 30, control: 78, wealth: 80, attachment: 50 },
  },
  '水瓶座': {
    zodiac: '水瓶座',
    description: '思維獨立、重視自由、創新感強。',
    scores: { emotion: 40, logic: 78, social: 60, leadership: 60, security: 40, execution: 55, creativity: 82, empathy: 55, risk: 75, control: 45, wealth: 50, attachment: 35 },
  },
  '雙魚座': {
    zodiac: '雙魚座',
    description: '感受力強、同理心高、情感層次豐富。',
    scores: { emotion: 78, logic: 45, social: 65, leadership: 40, security: 45, execution: 45, creativity: 80, empathy: 82, risk: 55, control: 35, wealth: 40, attachment: 78 },
  },
  '牡羊座': {
    zodiac: '牡羊座',
    description: '行動直接、企圖心強、喜歡開路。',
    scores: { emotion: 65, logic: 60, social: 72, leadership: 80, security: 35, execution: 85, creativity: 70, empathy: 48, risk: 82, control: 50, wealth: 65, attachment: 55 },
  },
  '金牛座': {
    zodiac: '金牛座',
    description: '穩定踏實、重視安全感與累積。',
    scores: { emotion: 50, logic: 70, social: 55, leadership: 50, security: 85, execution: 75, creativity: 45, empathy: 60, risk: 25, control: 72, wealth: 78, attachment: 68 },
  },
  '雙子座': {
    zodiac: '雙子座',
    description: '好奇靈活、溝通快速、喜歡變化。',
    scores: { emotion: 55, logic: 75, social: 82, leadership: 58, security: 40, execution: 65, creativity: 75, empathy: 55, risk: 70, control: 48, wealth: 55, attachment: 45 },
  },
  '巨蟹座': {
    zodiac: '巨蟹座',
    description: '情感細膩、重視歸屬、保護欲強。',
    scores: { emotion: 80, logic: 55, social: 65, leadership: 45, security: 82, execution: 65, creativity: 60, empathy: 80, risk: 30, control: 55, wealth: 55, attachment: 85 },
  },
  '獅子座': {
    zodiac: '獅子座',
    description: '自信外放、主場感強、表現欲高。',
    scores: { emotion: 65, logic: 60, social: 78, leadership: 82, security: 50, execution: 78, creativity: 78, empathy: 58, risk: 65, control: 68, wealth: 70, attachment: 62 },
  },
  '處女座': {
    zodiac: '處女座',
    description: '細節導向、理性審慎、執行穩健。',
    scores: { emotion: 45, logic: 82, social: 50, leadership: 55, security: 78, execution: 82, creativity: 50, empathy: 55, risk: 30, control: 80, wealth: 65, attachment: 50 },
  },
  '天秤座': {
    zodiac: '天秤座',
    description: '重視平衡、品味與人際和諧。',
    scores: { emotion: 65, logic: 68, social: 82, leadership: 62, security: 55, execution: 60, creativity: 70, empathy: 75, risk: 55, control: 50, wealth: 60, attachment: 70 },
  },
  '天蠍座': {
    zodiac: '天蠍座',
    description: '洞察力強、意志深、控制感高。',
    scores: { emotion: 75, logic: 75, social: 50, leadership: 75, security: 60, execution: 80, creativity: 68, empathy: 60, risk: 72, control: 82, wealth: 72, attachment: 80 },
  },
  '射手座': {
    zodiac: '射手座',
    description: '自由探索、遠景導向、樂於突破。',
    scores: { emotion: 60, logic: 65, social: 78, leadership: 68, security: 40, execution: 65, creativity: 75, empathy: 65, risk: 82, control: 42, wealth: 60, attachment: 50 },
  },
};

export function getBirthPersonalityScores(birthday: string): DimensionScores {
  const zodiac = getZodiacSign(birthday);
  return ZODIAC_PERSONALITY_DB[zodiac]?.scores ?? neutralScores();
}

export function getBirthZodiac(birthday: string): string {
  return getZodiacSign(birthday);
}

export function getZodiacDescription(birthday: string): string {
  const zodiac = getZodiacSign(birthday);
  return ZODIAC_PERSONALITY_DB[zodiac]?.description ?? '';
}
