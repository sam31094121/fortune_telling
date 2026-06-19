import type { DimensionScores } from './types';

/**
 * 人模型資料庫 - 姓名語意模型庫
 * 
 * 根據姓名生成人格分數。
 * 姓名是最後的個性化調整器，深化特定維度。
 */

interface NameCharacteristicProfile {
  name: string;
  description: string;
  scores: DimensionScores;
}

/**
 * 簡化的姓名特性分析
 * 實際應用中應該使用更複雜的語言模型來分析
 * 這裡根據常見漢字的寓意來生成調整分數
 */

// 按首字分類的常用姓氏與名字特性
const NAME_CHARACTERISTICS_DB: Record<string, NameCharacteristicProfile> = {
  // 示例：根據常見特性模式
  '賢': {
    name: '（含賢字）',
    description: '代表智慧與道德，傾向理性與同理',
    scores: {
      emotion: 45,
      logic: 72,
      social: 65,
      leadership: 65,
      security: 65,
      execution: 70,
      creativity: 65,
      empathy: 75,
      risk: 45,
      control: 60,
      wealth: 55,
      attachment: 60,
    },
  },
  '剛': {
    name: '（含剛字）',
    description: '代表堅定與力量，傾向執行與控制',
    scores: {
      emotion: 48,
      logic: 68,
      social: 58,
      leadership: 75,
      security: 70,
      execution: 82,
      creativity: 55,
      empathy: 50,
      risk: 68,
      control: 78,
      wealth: 72,
      attachment: 50,
    },
  },
  '美': {
    name: '（含美字）',
    description: '代表美感與和諧，傾向社交與創意',
    scores: {
      emotion: 62,
      logic: 58,
      social: 75,
      leadership: 60,
      security: 55,
      execution: 65,
      creativity: 78,
      empathy: 72,
      risk: 55,
      control: 52,
      wealth: 58,
      attachment: 68,
    },
  },
  '心': {
    name: '（含心字）',
    description: '代表誠心與感受，傾向情感與同理',
    scores: {
      emotion: 75,
      logic: 55,
      social: 70,
      leadership: 50,
      security: 60,
      execution: 62,
      creativity: 68,
      empathy: 80,
      risk: 50,
      control: 50,
      wealth: 50,
      attachment: 78,
    },
  },
  '華': {
    name: '（含華字）',
    description: '代表光彩與成就，傾向領導與財富',
    scores: {
      emotion: 58,
      logic: 65,
      social: 70,
      leadership: 75,
      security: 62,
      execution: 75,
      creativity: 70,
      empathy: 60,
      risk: 65,
      control: 70,
      wealth: 75,
      attachment: 55,
    },
  },
};

/**
 * 根據名字分析人格調整分數（人模型）
 * 
 * 實現原理：掃描名字中的漢字特徵，生成相應的人格調整
 */
export function getNamePersonalityScores(name: string): DimensionScores {
  const cleanName = name.trim();
  
  if (!cleanName) {
    return getNeutralScores();
  }

  // 掃描名字中是否包含特徵字
  const scores = getNeutralScores();
  let matchCount = 0;

  for (const char of cleanName) {
    if (NAME_CHARACTERISTICS_DB[char]) {
      const profile = NAME_CHARACTERISTICS_DB[char];
      for (const key in profile.scores) {
        const k = key as keyof DimensionScores;
        scores[k] = scores[k] * 0.7 + profile.scores[k] * 0.3;
      }
      matchCount++;
    }
  }

  // 如果沒有匹配特徵字，則返回中性分數
  if (matchCount === 0) {
    return getNeutralScores();
  }

  // 將分數四捨五入到整數
  for (const key in scores) {
    const k = key as keyof DimensionScores;
    scores[k] = Math.round(scores[k]);
  }

  return scores;
}

/**
 * 根據名字生成人格描述
 */
export function getNameDescription(name: string): string {
  const cleanName = name.trim();
  
  if (!cleanName) {
    return '姓名為人格的最後校正器。';
  }

  const mentions: string[] = [];

  for (const char of cleanName) {
    if (NAME_CHARACTERISTICS_DB[char]) {
      const profile = NAME_CHARACTERISTICS_DB[char];
      mentions.push(profile.description);
    }
  }

  if (mentions.length === 0) {
    return `名字「${cleanName}」深化了你獨特的人格輪廓。`;
  }

  // 返回前 2 個特徵
  const description = mentions.slice(0, 2).join('，');
  return `名字「${cleanName}」中的特性表明：${description}。`;
}

/**
 * 獲取中性的人格分數（所有維度 50）
 */
function getNeutralScores(): DimensionScores {
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

/**
 * 計算姓名的複合特性分數
 * 這是一個簡化版本，真實應用應使用更複雜的語言模型
 */
export function analyzeNameCharacteristics(name: string) {
  const cleanName = name.trim();
  const characteristics: string[] = [];

  // 檢查名字長度
  if (cleanName.length === 1) {
    characteristics.push('名字簡潔，體現直接的人格特質');
  } else if (cleanName.length === 2) {
    characteristics.push('名字凝鍊，代表集中的人格焦點');
  } else {
    characteristics.push('名字豐富，代表多層次的人格特質');
  }

  // 掃描特徵字
  for (const char of cleanName) {
    if (NAME_CHARACTERISTICS_DB[char]) {
      characteristics.push(`「${char}」字暗示${NAME_CHARACTERISTICS_DB[char].description}`);
    }
  }

  return characteristics;
}
