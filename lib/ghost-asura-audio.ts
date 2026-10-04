/**
 * 鬼魅阿修羅 - 音效系統
 * 卡片展開、印記點亮、分享下載等關鍵時刻的沉浸式音效
 */

// 音效庫配置（使用 Howler.js CDN）
export const audioAssets = {
  // 卡片展開 - 冷冽鬼魅風
  cardReveal: {
    url: 'https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js',
    sound: {
      src: ['https://assets.example.com/sounds/card-reveal-mystical.mp3'],
      volume: 0.6,
      duration: 1200,
    },
  },

  // 印記點亮 - 神秘啟動聲
  impressionGlow: {
    src: ['https://assets.example.com/sounds/impression-light-up.mp3'],
    volume: 0.4,
    duration: 800,
  },

  // 分享成功 - 清脆提示
  shareSuccess: {
    src: ['https://assets.example.com/sounds/share-success-chime.mp3'],
    volume: 0.5,
    duration: 400,
  },

  // 下載成功 - 滿足音效
  downloadSuccess: {
    src: ['https://assets.example.com/sounds/download-complete.mp3'],
    volume: 0.5,
    duration: 500,
  },

  // 衝擊波 - 氣魄釋放
  shockwave: {
    src: ['https://assets.example.com/sounds/shockwave-impact.mp3'],
    volume: 0.7,
    duration: 1500,
  },
};

/**
 * 動態加載 Howler.js 並初始化音效
 */
export async function initializeAudio(): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js';
    script.onload = () => {
      console.log('✅ Howler.js loaded, audio system ready');
      resolve();
    };
    script.onerror = () => {
      console.warn('⚠️ Failed to load Howler.js, audio disabled');
      resolve(); // 音效失敗不應中斷應用
    };
    document.head.appendChild(script);
  });
}

/**
 * 播放卡片展開音效（1.2s 冷冽鬼魅感）
 */
export function playCardRevealSound(): void {
  playSound('cardReveal');
}

/**
 * 播放印記點亮音效（逐個調用，間隔 100ms）
 * @param index - 印記索引
 */
export function playImpressionGlowSound(index: number): void {
  const delay = 200 + index * 100; // 卡片展開後延遲
  setTimeout(() => {
    playSound('impressionGlow');
  }, delay);
}

/**
 * 播放分享成功音效
 */
export function playShareSuccessSound(): void {
  playSound('shareSuccess');
}

/**
 * 播放下載完成音效
 */
export function playDownloadSuccessSound(): void {
  playSound('downloadSuccess');
}

/**
 * 播放衝擊波音效（氣魄十足）
 */
export function playShockwaveSound(): void {
  playSound('shockwave');
}

/**
 * 內部函數：通用播放邏輯
 * @param soundKey - 音效鍵值
 */
function playSound(soundKey: keyof typeof audioAssets): void {
  if (typeof window === 'undefined') return; // SSR 安全檢查

  try {
    // 檢查 Howler.js 是否已加載
    if (!(window as any).Howl) {
      console.warn(`Howler.js not available, skipping sound: ${soundKey}`);
      return;
    }

    const soundConfig = audioAssets[soundKey];
    if (!soundConfig || !soundConfig.src) {
      console.warn(`Sound config not found: ${soundKey}`);
      return;
    }

    // 建立並播放音效（使用 Howler.js）
    const sound = new (window as any).Howl({
      src: soundConfig.src,
      volume: soundConfig.volume ?? 0.5,
      preload: false,
      autoplay: true,
    });

    sound.play();
  } catch (err) {
    console.error(`Failed to play sound ${soundKey}:`, err);
  }
}

/**
 * 禁用所有音效（用於設定頁或用戶偏好）
 */
export function muteAllSounds(): void {
  if ((window as any).Howler) {
    (window as any).Howler.volume(0);
  }
}

/**
 * 恢復音效（默認音量）
 */
export function unmuteAllSounds(): void {
  if ((window as any).Howler) {
    (window as any).Howler.volume(1);
  }
}

/**
 * 設定全局音量（0-1）
 * @param volume - 音量等級 0-1
 */
export function setGlobalVolume(volume: number): void {
  if ((window as any).Howler) {
    (window as any).Howler.volume(Math.max(0, Math.min(1, volume)));
  }
}
