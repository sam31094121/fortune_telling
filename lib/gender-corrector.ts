import { DIMENSION_KEYS, type DimensionAdjustments, type Gender } from './types';

export function generateGenderAdjustments(gender: Gender): DimensionAdjustments {
  if (gender === 'male') {
    return {
      emotion: -2,
      logic: 3,
      social: 0,
      leadership: 4,
      security: -1,
      execution: 3,
      creativity: 1,
      empathy: -2,
      risk: 2,
      control: 3,
      wealth: 2,
      attachment: -2,
    };
  }

  return {
    emotion: 2,
    logic: -1,
    social: 2,
    leadership: 0,
    security: 1,
    execution: 0,
    creativity: 1,
    empathy: 3,
    risk: -1,
    control: -2,
    wealth: 0,
    attachment: 2,
  };
}

export function getPresentationPrefix(dimensionKey: string, gender: Gender): string {
  const maleMap: Record<string, string> = {
    emotion: '在外在表現上較克制，',
    logic: '判斷時更偏向理性切入，',
    social: '與人互動時節奏直接，',
    leadership: '面對局勢時更容易站到前線，',
    security: '對穩定的需求傾向內收，',
    execution: '行動推進感更明顯，',
    creativity: '創意呈現偏向務實落地，',
    empathy: '同理表現偏向內斂，',
    risk: '面對風險時相對更敢嘗試，',
    control: '掌控感需求更直接，',
    wealth: '對成果回報的意識更鮮明，',
    attachment: '情感依附表現較慢熱，',
  };

  const femaleMap: Record<string, string> = {
    emotion: '情緒感知更細膩，',
    logic: '理性中保留更多直覺彈性，',
    social: '在人際互動中更重視回應感，',
    leadership: '領導風格偏向協調整合，',
    security: '安全感需求表現更明確，',
    execution: '執行節奏偏向穩定推進，',
    creativity: '創意表現更柔和細膩，',
    empathy: '同理反應更容易被看見，',
    risk: '面對風險時會先感受再評估，',
    control: '掌控需求偏向柔性調整，',
    wealth: '對價值與回報的考量更平衡，',
    attachment: '情感依附表現較明顯，',
  };

  return (gender === 'male' ? maleMap : femaleMap)[dimensionKey] ?? '';
}

export function getGenderCorrectionExplanation(gender: Gender, topAdjustments: Array<{ key: string; value: number }>) {
  const label = gender === 'male' ? '男性' : '女性';
  const focus = topAdjustments.slice(0, 3).map((item) => item.key).join('、');
  return `${label}校正主要是讓外在表現更貼近真實生活中的呈現方式，這次影響較明顯的面向落在 ${focus || '整體氣質'}。`;
}

export function zeroAdjustments(): DimensionAdjustments {
  return Object.fromEntries(DIMENSION_KEYS.map((key) => [key, 0])) as DimensionAdjustments;
}
