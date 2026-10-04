/**
 * 鬼魅阿修羅 - 高級 3D 效果系統
 * 卡片深度翻轉、光線反射、陰影強化
 *
 * Phase 5：終極視覺升級
 */

/**
 * 高級 3D 配置
 */
export const advanced3DConfig = {
  // 卡片深度翻轉
  cardFlip: {
    duration: 1600,        // 更長的翻轉時間
    perspective: 1200,     // 3D 透視距離
    rotationX: 15,         // X 軸旋轉（度數）
    rotationY: 8,          // Y 軸旋轉（度數）
    intensity: 1.3,        // 翻轉強度
  },

  // 光線反射效果
  lightReflection: {
    enabled: true,
    intensity: 0.8,        // 反射強度
    angle: 45,             // 光線角度
    frequency: 2.5,        // 閃爍頻率
    duration: 2000,        // 持續時間
  },

  // 陰影深化
  shadowEnhance: {
    blurRadius: 24,        // 陰影模糊半徑
    offsetX: 0,
    offsetY: 12,
    spreadRadius: 8,
    opacity: 0.4,
    color: 'rgba(0, 0, 0, 0.5)',
  },

  // 浮起漸變
  floatingGradient: {
    enabled: true,
    animation: 'floatingGlow',  // 動畫名稱
    duration: 3000,             // 整個循環時間
    intensity: 0.6,
  },
};

/**
 * 卡片深度翻轉 - 從平面到立體
 */
export function getAdvancedCardFlipAnimation(): string {
  return `
    animation: advancedCardFlip ${advanced3DConfig.cardFlip.duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  `;
}

/**
 * 光線反射效果 - 高光閃爍
 */
export function getLightReflectionAnimation(): string {
  return `
    animation: lightReflectionGlow ${advanced3DConfig.lightReflection.duration}ms ease-in-out infinite;
  `;
}

/**
 * 陰影強化 - 深度感提升
 */
export function getEnhancedShadowStyle(): React.CSSProperties {
  return {
    boxShadow: `
      ${advanced3DConfig.shadowEnhance.offsetX}px ${advanced3DConfig.shadowEnhance.offsetY}px ${advanced3DConfig.shadowEnhance.blurRadius}px ${advanced3DConfig.shadowEnhance.spreadRadius}px ${advanced3DConfig.shadowEnhance.color},
      0 0 32px rgba(212, 175, 55, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `,
    transition: 'box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };
}

/**
 * 計算動態陰影（基於滑鼠位置）
 */
export function getDynamicShadowStyle(mouseX: number, mouseY: number, elementRect: DOMRect): React.CSSProperties {
  const centerX = elementRect.left + elementRect.width / 2;
  const centerY = elementRect.top + elementRect.height / 2;

  const angleRad = Math.atan2(mouseY - centerY, mouseX - centerX);
  const distance = Math.hypot(mouseX - centerX, mouseY - centerY);

  const shadowOffsetX = Math.cos(angleRad) * Math.min(distance / 50, 8);
  const shadowOffsetY = Math.sin(angleRad) * Math.min(distance / 50, 8);

  return {
    boxShadow: `
      ${shadowOffsetX}px ${shadowOffsetY}px 28px 4px rgba(0, 0, 0, 0.35),
      0 0 48px rgba(212, 175, 55, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15)
    `,
  };
}

/**
 * 浮起漸變光暈 - 連續光圈
 */
export function getFloatingGradientAnimation(): string {
  return `
    animation: floatingGradientAura ${advanced3DConfig.floatingGradient.duration}ms ease-in-out infinite;
    background: radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.4), transparent 70%);
  `;
}
