import { DIMENSION_KEYS, type DimensionAdjustments, type Gender } from './types';

/**
 * 性別校正模組 V5.0
 * 
 * 核心原則：
 * - 性別不能改變人格本質（數值）
 * - 性別只改變「表現方式」
 * - 性別不進入權重總分
 */

export interface GenderCorrectionProfile {
  adjustments: DimensionAdjustments;
  presentationPhrasePrefixes: Record<string, string>;
}

/**
 * 生成性別校正值
 * 
 * 男性校正：某些維度強化直接性、競爭性
 * 女性校正：某些維度強化協調性、關係性
 */
export function generateGenderAdjustments(gender: Gender): DimensionAdjustments {
  if (gender === 'male') {
    return {
      emotion: -2,          // 更穩定的表現（但內在不變）
      logic: 3,             // 更傾向展現理性面
      social: 0,
      leadership: 4,        // 更直接的領導風格
      security: -1,
      execution: 3,         // 更快速果決
      creativity: 1,
      empathy: -2,          // 表面上感受力較少顯露
      risk: 2,              // 更易展現冒險傾向
      control: 3,           // 更強調掌控
      wealth: 2,            // 更明顯的成就動機
      attachment: -2,       // 情感表達較克制
    };
  } else {
    // gender === 'female'
    return {
      emotion: 2,           // 更自在地表現情緒敏感
      logic: -1,            // 更平衡地結合直覺
      social: 2,            // 更投入關係與互動
      leadership: 0,        // 領導轉向協調方式
      security: 1,
      execution: 0,
      creativity: 1,
      empathy: 3,           // 更主動展現同理心
      risk: -1,             // 表現上更謹慎
      control: -2,          // 更接納靈活與變化
      wealth: 0,
      attachment: 2,        // 更自在地表現情感投入
    };
  }
}

/**
 * 根據性別生成表現方式描述前綴
 * 
 * 用於 AI 生成文案時，同樣的維度分數，用不同的方式表達
 */
export function getPresentationPrefix(dimensionKey: string, gender: Gender): string {
  const malePhrasesMap: Record<string, string> = {
    emotion: '你能冷靜處理，但',
    logic: '你傾向理性判斷，',
    social: '你在人際中',
    leadership: '你傾向直接主導，',
    security: '你',
    execution: '你會迅速行動，',
    creativity: '你的想法',
    empathy: '你更重視事實與效率，',
    risk: '你敢於挑戰現狀，',
    control: '你習慣掌握全局，',
    wealth: '你對成就與回報有清晰目標，',
    attachment: '你在感情上較為理性，',
  };

  const femalePhrasesMap: Record<string, string> = {
    emotion: '你對情緒很敏感，',
    logic: '你會理性思考，但同時也聽直覺，',
    social: '你很在意人際連結，',
    leadership: '你傾向以協調方式帶領，',
    security: '你',
    execution: '你會穩健地執行，',
    creativity: '你的想法',
    empathy: '你能感同身受，',
    risk: '你在嘗試新事物前會評估，',
    control: '你需要一定的秩序，但也接納變化，',
    wealth: '你在意回報，但同時也重視生活平衡，',
    attachment: '你在關係中投入很深，',
  };

  const phrasesMap = gender === 'male' ? malePhrasesMap : femalePhrasesMap;
  return phrasesMap[dimensionKey] || '你';
}

/**
 * 性別校正的文字說明
 * 
 * 說明性別如何改變人格的「表現方式」而非「本質」
 */
export function getGenderCorrectionExplanation(gender: Gender, topAdjustments: Array<{ key: string; value: number }>): string {
  const genderLabel = gender === 'male' ? '男性' : '女性';
  const explanation = gender === 'male'
    ? '在男性文化背景下，你的人格傾向用更直接、競爭導向的方式表現。但這是表現風格，不是人格本質的改變。'
    : '在女性文化背景下，你的人格傾向用更協調、關係導向的方式表現。但這是表現風格，不是人格本質的改變。';

  return explanation;
}
