/**
 * 鬼魅阿修羅 - 交互體驗升級
 * Phase 8：手勢支持 + 無障礙完善
 */

export const interactionEnhanceConfig = {
  // 手勢支持
  gestures: {
    enabled: true,
    swipe: {
      enabled: true,
      minDistance: 50,
      maxTime: 300,
    },
    pinch: {
      enabled: true,
      minDistance: 50,
    },
    longPress: {
      enabled: true,
      duration: 500,
    },
    doubleTap: {
      enabled: true,
      delay: 300,
    },
  },

  // 無障礙功能
  accessibility: {
    enabled: true,
    screenReaderOptimized: true,
    keyboardNavigable: true,
    focusVisible: true,
    ariaLive: 'polite',
    ariaAnnounce: true,
  },

  // 深色模式優化
  darkModeOptimize: {
    enabled: true,
    contrastRatio: 4.5,  // WCAG AA 標準
    reducedMotion: true,  // 尊重用戶偏好
  },

  // 觸覺反饋（振動）
  hapticFeedback: {
    enabled: true,
    intensity: 'medium',  // light, medium, strong
    patterns: {
      tap: [10],
      success: [20, 10, 20],
      error: [50, 30, 50],
    },
  },
};

/**
 * 計算手勢識別參數
 */
export function getGestureParams(type: 'swipe' | 'pinch' | 'longPress' | 'doubleTap') {
  return interactionEnhanceConfig.gestures[type];
}

/**
 * 觸發觸覺反饋
 */
export function triggerHapticFeedback(pattern: 'tap' | 'success' | 'error'): void {
  if (!interactionEnhanceConfig.hapticFeedback.enabled) return;

  if ('vibrate' in navigator) {
    navigator.vibrate(interactionEnhanceConfig.hapticFeedback.patterns[pattern]);
  }
}

/**
 * 獲取深色模式樣式
 */
export function getDarkModeOptimizedStyle(): React.CSSProperties {
  return {
    filter: 'contrast(1.1)', // 提升對比度
    colorScheme: 'dark',
  };
}

/**
 * 檢查是否應遵守 prefers-reduced-motion
 */
export function shouldReduceMotion(): boolean {
  if (!interactionEnhanceConfig.darkModeOptimize.reducedMotion) return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * ARIA 公告文本
 */
export function announceToScreenReader(message: string): void {
  if (!interactionEnhanceConfig.accessibility.ariaAnnounce) return;

  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', interactionEnhanceConfig.accessibility.ariaLive as any);
  announcement.textContent = message;
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';

  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 1000);
}
