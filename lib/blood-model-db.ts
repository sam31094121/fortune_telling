import type { BloodType, DimensionScores } from './types';

interface BloodTypePersonalityProfile {
  bloodType: BloodType;
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

const BLOOD_TYPE_PERSONALITY_DB: Record<Exclude<BloodType, ''>, BloodTypePersonalityProfile> = {
  A: {
    bloodType: 'A',
    description: '細膩穩定，重視秩序、責任與安全感。',
    scores: { emotion: 65, logic: 70, social: 65, leadership: 55, security: 75, execution: 70, creativity: 55, empathy: 72, risk: 35, control: 72, wealth: 60, attachment: 68 },
  },
  B: {
    bloodType: 'B',
    description: '自由直接，重視節奏感與自我空間。',
    scores: { emotion: 58, logic: 60, social: 75, leadership: 62, security: 48, execution: 65, creativity: 72, empathy: 60, risk: 70, control: 50, wealth: 58, attachment: 55 },
  },
  AB: {
    bloodType: 'AB',
    description: '理性與感性並存，帶有獨特觀察力與邊界感。',
    scores: { emotion: 52, logic: 75, social: 68, leadership: 60, security: 58, execution: 68, creativity: 70, empathy: 65, risk: 60, control: 65, wealth: 62, attachment: 58 },
  },
  O: {
    bloodType: 'O',
    description: '推進力強，外在表現大方而有承壓力。',
    scores: { emotion: 60, logic: 65, social: 78, leadership: 72, security: 55, execution: 75, creativity: 65, empathy: 68, risk: 72, control: 60, wealth: 68, attachment: 65 },
  },
};

export function getBloodTypePersonalityScores(bloodType: Exclude<BloodType, ''>): DimensionScores {
  return BLOOD_TYPE_PERSONALITY_DB[bloodType]?.scores ?? neutralScores();
}

export function getBloodTypeDescription(bloodType: Exclude<BloodType, ''>): string {
  return BLOOD_TYPE_PERSONALITY_DB[bloodType]?.description ?? '';
}
