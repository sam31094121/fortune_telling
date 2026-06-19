import type { DimensionKey } from './types';

export const DIMENSION_META: Array<{
  key: DimensionKey;
  label: string;
  shortLabel: string;
  tone: 'sky' | 'earth' | 'human' | 'love';
}> = [
  { key: 'emotion_sensitivity', label: '情緒敏感度', shortLabel: '情緒', tone: 'love' },
  { key: 'logic', label: '理性程度', shortLabel: '理性', tone: 'sky' },
  { key: 'social_need', label: '社交需求', shortLabel: '社交', tone: 'human' },
  { key: 'leadership', label: '領導傾向', shortLabel: '領導', tone: 'human' },
  { key: 'risk_tendency', label: '冒險傾向', shortLabel: '冒險', tone: 'sky' },
  { key: 'execution', label: '執行能力', shortLabel: '執行', tone: 'earth' },
  { key: 'creativity', label: '創造能力', shortLabel: '創造', tone: 'sky' },
  { key: 'empathy', label: '同理能力', shortLabel: '同理', tone: 'love' },
  { key: 'control', label: '控制慾', shortLabel: '控制', tone: 'human' },
  { key: 'security_need', label: '安全感需求', shortLabel: '安全感', tone: 'earth' },
  { key: 'wealth_motivation', label: '財富動機', shortLabel: '財富', tone: 'earth' },
  { key: 'attachment', label: '感情依附', shortLabel: '依附', tone: 'love' },
];
