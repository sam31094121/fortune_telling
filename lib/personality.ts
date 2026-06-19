import type { DimensionKey } from './types';

export const DIMENSION_META: Array<{
  key: DimensionKey;
  label: string;
  shortLabel: string;
  tone: 'sky' | 'earth' | 'human' | 'love';
  description: string;
}> = [
  { 
    key: 'emotion', 
    label: '情緒敏感度', 
    shortLabel: '情緒', 
    tone: 'love',
    description: '感受情緒與人際氣氛的敏銳度'
  },
  { 
    key: 'logic', 
    label: '理性程度', 
    shortLabel: '理性', 
    tone: 'sky',
    description: '思考時依賴邏輯與證據的程度'
  },
  { 
    key: 'social', 
    label: '社交需求', 
    shortLabel: '社交', 
    tone: 'human',
    description: '對人際互動與交流的需求度'
  },
  { 
    key: 'leadership', 
    label: '領導傾向', 
    shortLabel: '領導', 
    tone: 'human',
    description: '主動帶方向與掌控局勢的傾向'
  },
  { 
    key: 'risk', 
    label: '冒險傾向', 
    shortLabel: '冒險', 
    tone: 'sky',
    description: '面對未知與不確定性時的嘗試欲望'
  },
  { 
    key: 'execution', 
    label: '執行力', 
    shortLabel: '執行', 
    tone: 'earth',
    description: '將想法與計畫轉變為行動的能力'
  },
  { 
    key: 'creativity', 
    label: '創造力', 
    shortLabel: '創造', 
    tone: 'sky',
    description: '想像與提出新視角的能力'
  },
  { 
    key: 'empathy', 
    label: '同理心', 
    shortLabel: '同理', 
    tone: 'love',
    description: '感同身受與接納他人情緒的能力'
  },
  { 
    key: 'control', 
    label: '控制傾向', 
    shortLabel: '控制', 
    tone: 'human',
    description: '對掌握與規劃事物的偏好程度'
  },
  { 
    key: 'security', 
    label: '安全感需求', 
    shortLabel: '安全', 
    tone: 'earth',
    description: '對穩定與可預測性的需求程度'
  },
  { 
    key: 'wealth', 
    label: '財富動機', 
    shortLabel: '財富', 
    tone: 'earth',
    description: '對成果與資源累積的驅動力'
  },
  { 
    key: 'attachment', 
    label: '情感依附', 
    shortLabel: '依附', 
    tone: 'love',
    description: '在關係中的投入與依附深度'
  },
];
