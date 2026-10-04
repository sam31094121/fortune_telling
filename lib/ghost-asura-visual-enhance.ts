/**
 * 鬼魅阿修羅 - 視覺效果增強系統
 * Phase 6：粒子系統升級 + 漸變優化
 */

export const visualEnhanceConfig = {
  // 粒子系統升級
  particleEnhance: {
    enabled: true,
    colorVariation: 0.3,
    densityMultiplier: 1.5,
    trailEffect: true,
    glowIntensity: 1.2,
  },

  // 漸變優化
  gradientOptimize: {
    radialGradientStops: ['0%', '40%', '100%'],
    colorStops: ['rgba(212, 175, 55, 0.8)', 'rgba(212, 175, 55, 0.4)', 'transparent'],
    animation: 'gradientFlow',
    duration: 4000,
  },

  // 頁面加載動畫
  pageLoadAnimation: {
    enabled: true,
    duration: 800,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    staggerDelay: 50,
  },
};

/**
 * 增強粒子顏色變化
 */
export function getEnhancedParticleColor(): string {
  const baseColor = 212; // Asura Gold
  const variation = Math.random() * 40 - 20;
  return `hsl(${baseColor + variation}, 70%, 60%)`;
}

/**
 * 漸變流動動畫樣式
 */
export function getGradientFlowStyle(): React.CSSProperties {
  return {
    background: 'conic-gradient(from 0deg, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0), rgba(212, 175, 55, 0.3))',
    animation: 'gradientFlow 4s linear infinite',
  };
}

/**
 * 頁面元素進場動畫延遲計算
 */
export function getStaggeredAnimationDelay(index: number): React.CSSProperties {
  return {
    animationDelay: `${index * visualEnhanceConfig.pageLoadAnimation.staggerDelay}ms`,
  };
}
