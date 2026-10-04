/**
 * 鬼魅阿修羅 - 動畫素材與邏輯
 * 鬼魅的感覺 + 阿修羅的氣魄
 *
 * 統一管理：卡片揭示、印記亮起、秘卷成型
 */

/**
 * 動畫配置 - 時序與強度
 */
export const animationConfig = {
  // 卡片揭示動畫
  cardReveal: {
    duration: 1200,        // 毫秒
    delay: 100,            // 初始延遲
    easing: 'ease-out',    // 緩動曲線
  },

  // 印記閃爍動畫
  impressionGlow: {
    duration: 800,
    delay: 200,            // 卡片出現後再亮起
    staggerDelay: 100,     // 印記之間的延遲
    count: 3,              // 重複次數
  },

  // 秘卷成型動畫（下載/分享時）
  scrollFormation: {
    duration: 600,
    delay: 0,
    easing: 'ease-in-out',
  },

  // 整體氣魄衝擊波
  shockwave: {
    duration: 1500,
    delay: 1000,           // 卡片展開到一定程度後觸發
    intensity: 1.2,        // 衝擊波強度倍數
  },
};

/**
 * 卡片揭示動畫 - 從暗到明、鬼魅漸現
 */
export function getCardRevealAnimation(): {
  className: string;
  duration: number;
  delay: number;
} {
  return {
    className: 'asura-card-reveal',
    duration: animationConfig.cardReveal.duration,
    delay: animationConfig.cardReveal.delay,
  };
}

/**
 * 印記點亮動畫 - 逐個閃爍、像被喚醒
 */
export function getImpressionGlowAnimation(index: number): {
  className: string;
  animationDelay: string;
  duration: number;
} {
  const totalDelay =
    animationConfig.cardReveal.delay +
    animationConfig.cardReveal.duration +
    animationConfig.impressionGlow.delay +
    index * animationConfig.impressionGlow.staggerDelay;

  return {
    className: 'asura-impression-glow',
    animationDelay: `${totalDelay}ms`,
    duration: animationConfig.impressionGlow.duration,
  };
}

/**
 * 秘卷成型動畫 - 能量匯聚
 */
export function getScrollFormationAnimation(): {
  className: string;
  duration: number;
} {
  return {
    className: 'asura-scroll-formation',
    duration: animationConfig.scrollFormation.duration,
  };
}

/**
 * 氣魄衝擊波動畫 - 張力十足
 */
export function getShockwaveAnimation(): {
  className: string;
  animationDelay: string;
  duration: number;
} {
  return {
    className: 'asura-shockwave',
    animationDelay: `${animationConfig.shockwave.delay}ms`,
    duration: animationConfig.shockwave.duration,
  };
}

/**
 * 計算動畫時序 - 用於進度指引
 */
export function getTotalAnimationDuration(): number {
  return (
    animationConfig.cardReveal.delay +
    animationConfig.cardReveal.duration +
    animationConfig.impressionGlow.delay +
    (animationConfig.impressionGlow.count - 1) * animationConfig.impressionGlow.staggerDelay +
    animationConfig.impressionGlow.duration
  );
}

/**
 * 動畫事件回調
 */
export type AnimationEventCallback = (stage: 'cardStart' | 'cardComplete' | 'impressionStart' | 'impressionComplete' | 'shockwaveStart') => void;

/**
 * 監聽動畫進度
 */
export function setupAnimationListener(element: HTMLElement, callback: AnimationEventCallback): () => void {
  const handleAnimationStart = (e: AnimationEvent) => {
    if (e.animationName.includes('asuraCardReveal')) {
      callback('cardStart');
    } else if (e.animationName.includes('asuraImpressionGlow')) {
      callback('impressionStart');
    } else if (e.animationName.includes('asuraShockwave')) {
      callback('shockwaveStart');
    }
  };

  const handleAnimationEnd = (e: AnimationEvent) => {
    if (e.animationName.includes('asuraCardReveal')) {
      callback('cardComplete');
    } else if (e.animationName.includes('asuraImpressionGlow')) {
      callback('impressionComplete');
    }
  };

  element.addEventListener('animationstart', handleAnimationStart);
  element.addEventListener('animationend', handleAnimationEnd);

  // 返回卸載函數
  return () => {
    element.removeEventListener('animationstart', handleAnimationStart);
    element.removeEventListener('animationend', handleAnimationEnd);
  };
}
