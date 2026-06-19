import { getZodiacSign } from './zodiac';
import type { DimensionScores } from './types';

/**
 * 天模型資料庫 - 生日人格模型庫
 * 
 * 根據生日（星座）生成人格的骨架分數。
 * 這是 35% 的基礎層，不應被後續模型推翻。
 */

interface ZodiacPersonalityProfile {
  zodiac: string;
  description: string;
  scores: DimensionScores;
}

const ZODIAC_PERSONALITY_DB: Record<string, ZodiacPersonalityProfile> = {
  '摩羯座': {
    zodiac: '摩羯座',
    description: '務實、責任感強，對目標有持續的追求',
    scores: {
      emotion: 35,
      logic: 75,
      social: 45,
      leadership: 65,
      security: 80,
      execution: 80,
      creativity: 40,
      empathy: 45,
      risk: 30,
      control: 78,
      wealth: 80,
      attachment: 50,
    },
  },
  '水瓶座': {
    zodiac: '水瓶座',
    description: '理想主義、創新思維，重視自由與獨立',
    scores: {
      emotion: 40,
      logic: 78,
      social: 60,
      leadership: 60,
      security: 40,
      execution: 55,
      creativity: 82,
      empathy: 55,
      risk: 75,
      control: 45,
      wealth: 50,
      attachment: 35,
    },
  },
  '雙魚座': {
    zodiac: '雙魚座',
    description: '夢想家、感受力強，富有同理心與想像力',
    scores: {
      emotion: 78,
      logic: 45,
      social: 65,
      leadership: 40,
      security: 45,
      execution: 45,
      creativity: 80,
      empathy: 82,
      risk: 55,
      control: 35,
      wealth: 40,
      attachment: 78,
    },
  },
  '牡羊座': {
    zodiac: '牡羊座',
    description: '勇敢、直率，充滿行動力與進取心',
    scores: {
      emotion: 65,
      logic: 60,
      social: 72,
      leadership: 80,
      security: 35,
      execution: 85,
      creativity: 70,
      empathy: 48,
      risk: 82,
      control: 50,
      wealth: 65,
      attachment: 55,
    },
  },
  '金牛座': {
    zodiac: '金牛座',
    description: '穩定、踏實，注重物質安全感與舒適',
    scores: {
      emotion: 50,
      logic: 70,
      social: 55,
      leadership: 50,
      security: 85,
      execution: 75,
      creativity: 45,
      empathy: 60,
      risk: 25,
      control: 72,
      wealth: 78,
      attachment: 68,
    },
  },
  '雙子座': {
    zodiac: '雙子座',
    description: '聰慧、好奇，善於溝通與變通',
    scores: {
      emotion: 55,
      logic: 75,
      social: 82,
      leadership: 58,
      security: 40,
      execution: 65,
      creativity: 75,
      empathy: 55,
      risk: 70,
      control: 48,
      wealth: 55,
      attachment: 45,
    },
  },
  '巨蟹座': {
    zodiac: '巨蟹座',
    description: '敏感、細心，家庭與情感導向',
    scores: {
      emotion: 80,
      logic: 55,
      social: 65,
      leadership: 45,
      security: 82,
      execution: 65,
      creativity: 60,
      empathy: 80,
      risk: 30,
      control: 55,
      wealth: 55,
      attachment: 85,
    },
  },
  '獅子座': {
    zodiac: '獅子座',
    description: '自信、慷慨，需要認可與表現',
    scores: {
      emotion: 65,
      logic: 60,
      social: 78,
      leadership: 82,
      security: 50,
      execution: 78,
      creativity: 78,
      empathy: 58,
      risk: 65,
      control: 68,
      wealth: 70,
      attachment: 62,
    },
  },
  '處女座': {
    zodiac: '處女座',
    description: '分析力強、完美主義，注重細節與效率',
    scores: {
      emotion: 45,
      logic: 82,
      social: 50,
      leadership: 55,
      security: 78,
      execution: 82,
      creativity: 50,
      empathy: 55,
      risk: 30,
      control: 80,
      wealth: 65,
      attachment: 50,
    },
  },
  '天秤座': {
    zodiac: '天秤座',
    description: '平衡、優雅，重視人際關係與公平',
    scores: {
      emotion: 65,
      logic: 68,
      social: 82,
      leadership: 62,
      security: 55,
      execution: 60,
      creativity: 70,
      empathy: 75,
      risk: 55,
      control: 50,
      wealth: 60,
      attachment: 70,
    },
  },
  '天蠍座': {
    zodiac: '天蠍座',
    description: '深沉、執著，洞察力強與意志堅定',
    scores: {
      emotion: 75,
      logic: 75,
      social: 50,
      leadership: 75,
      security: 60,
      execution: 80,
      creativity: 68,
      empathy: 60,
      risk: 72,
      control: 82,
      wealth: 72,
      attachment: 80,
    },
  },
  '射手座': {
    zodiac: '射手座',
    description: '樂觀、冒險，追求自由與成長',
    scores: {
      emotion: 60,
      logic: 65,
      social: 78,
      leadership: 68,
      security: 40,
      execution: 65,
      creativity: 75,
      empathy: 65,
      risk: 82,
      control: 42,
      wealth: 60,
      attachment: 50,
    },
  },
};

/**
 * 根據生日獲取人格基礎分數（天模型）
 */
export function getBirthPersonalityScores(birthday: string): DimensionScores {
  const zodiac = getZodiacSign(birthday);
  const profile = ZODIAC_PERSONALITY_DB[zodiac];
  
  if (!profile) {
    // 若找不到，返回中性分數
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

  return profile.scores;
}

/**
 * 獲取生日對應的星座
 */
export function getBirthZodiac(birthday: string): string {
  return getZodiacSign(birthday);
}

/**
 * 獲取星座人格描述
 */
export function getZodiacDescription(birthday: string): string {
  const zodiac = getZodiacSign(birthday);
  const profile = ZODIAC_PERSONALITY_DB[zodiac];
  return profile?.description || '';
}
