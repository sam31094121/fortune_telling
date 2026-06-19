import type { BloodType, DimensionScores } from './types';

/**
 * 地模型資料庫 - 血型行為模型庫
 * 
 * 根據血型生成人格調整分數。
 * 血型層不推翻生日骨架，而是補充與調整表現方式。
 */

interface BloodTypePersonalityProfile {
  bloodType: BloodType;
  description: string;
  scores: DimensionScores;
}

const BLOOD_TYPE_PERSONALITY_DB: Record<Exclude<BloodType, ''>, BloodTypePersonalityProfile> = {
  'A': {
    bloodType: 'A',
    description: '細心、有序，容易顧慮他人感受',
    scores: {
      emotion: 65,
      logic: 70,
      social: 65,
      leadership: 55,
      security: 75,
      execution: 70,
      creativity: 55,
      empathy: 72,
      risk: 35,
      control: 72,
      wealth: 60,
      attachment: 68,
    },
  },
  'B': {
    bloodType: 'B',
    description: '隨性、樂觀，容易切換焦點',
    scores: {
      emotion: 58,
      logic: 60,
      social: 75,
      leadership: 62,
      security: 48,
      execution: 65,
      creativity: 72,
      empathy: 60,
      risk: 70,
      control: 50,
      wealth: 58,
      attachment: 55,
    },
  },
  'AB': {
    bloodType: 'AB',
    description: '多面、靈活，冷靜又有深度',
    scores: {
      emotion: 52,
      logic: 75,
      social: 68,
      leadership: 60,
      security: 58,
      execution: 68,
      creativity: 70,
      empathy: 65,
      risk: 60,
      control: 65,
      wealth: 62,
      attachment: 58,
    },
  },
  'O': {
    bloodType: 'O',
    description: '直率、坦誠，容易跟人親近',
    scores: {
      emotion: 60,
      logic: 65,
      social: 78,
      leadership: 72,
      security: 55,
      execution: 75,
      creativity: 65,
      empathy: 68,
      risk: 72,
      control: 60,
      wealth: 68,
      attachment: 65,
    },
  },
};

/**
 * 根據血型獲取人格分數調整（地模型）
 */
export function getBloodTypePersonalityScores(bloodType: Exclude<BloodType, ''>): DimensionScores {
  const profile = BLOOD_TYPE_PERSONALITY_DB[bloodType];
  
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
 * 獲取血型人格描述
 */
export function getBloodTypeDescription(bloodType: Exclude<BloodType, ''>): string {
  const profile = BLOOD_TYPE_PERSONALITY_DB[bloodType];
  return profile?.description || '';
}
