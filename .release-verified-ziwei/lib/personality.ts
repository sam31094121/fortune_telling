import type { DimensionKey } from './types';

export const DIMENSION_META: Array<{
  key: DimensionKey;
  label: string;
  shortLabel: string;
  tone: 'sky' | 'earth' | 'human' | 'love';
  description: string;
}> = [
  { key: 'emotion', label: '情緒敏感度', shortLabel: '情緒', tone: 'love', description: '感受情緒與氣場變化的敏銳程度。' },
  { key: 'logic', label: '理性程度', shortLabel: '理性', tone: 'sky', description: '做決策時依靠邏輯與分析的比例。' },
  { key: 'social', label: '社交需求', shortLabel: '社交', tone: 'human', description: '從人際互動中獲得能量的需求強度。' },
  { key: 'leadership', label: '領導傾向', shortLabel: '領導', tone: 'human', description: '主動帶方向與承擔主責的傾向。' },
  { key: 'risk', label: '冒險傾向', shortLabel: '冒險', tone: 'sky', description: '面對不確定性時願意嘗試與突破的程度。' },
  { key: 'execution', label: '執行能力', shortLabel: '執行', tone: 'earth', description: '把想法穩定落實成行動與結果的能力。' },
  { key: 'creativity', label: '創造能力', shortLabel: '創造', tone: 'sky', description: '提出新觀點與新方法的活躍程度。' },
  { key: 'empathy', label: '同理能力', shortLabel: '同理', tone: 'love', description: '理解他人情緒與需求的能力。' },
  { key: 'control', label: '控制慾', shortLabel: '控制', tone: 'human', description: '對秩序、規劃與掌控感的重視程度。' },
  { key: 'security', label: '安全感需求', shortLabel: '安全感', tone: 'earth', description: '對穩定、可預期與保護感的需求。' },
  { key: 'wealth', label: '財富動機', shortLabel: '財富', tone: 'earth', description: '對資源累積、成果回報與物質成就的動機。' },
  { key: 'attachment', label: '感情依附', shortLabel: '依附', tone: 'love', description: '在關係中投入情感與建立連結的深度。' },
];
