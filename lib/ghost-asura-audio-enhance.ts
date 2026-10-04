/**
 * 鬼魅阿修羅 - 音效系統增強
 * Phase 7：環境音樂 + 層次化反饋
 */

export const audioEnhanceConfig = {
  // 背景環境音樂
  ambientMusic: {
    enabled: true,
    loop: true,
    volume: 0.3,
    fadeInDuration: 2000,
    fadeOutDuration: 1000,
    url: 'https://assets.example.com/ambient-asura-mystical.mp3',
  },

  // 分層音效
  tieredAudio: {
    cardReveal: {
      primary: 0.6,
      secondary: 0.3,  // 低頻層
      accent: 0.2,     // 高頻層
    },
    impressionGlow: {
      primary: 0.5,
      harmonic: 0.25,  // 泛音層
    },
  },

  // 音量自適應
  volumeAdapt: {
    enabled: true,
    responsiveToTime: true,  // 根據時間調整
    peakHours: [20, 21, 22], // 晚間增強
    peakMultiplier: 1.2,
  },

  // 空間音頻（3D 音效）
  spatialAudio: {
    enabled: true,
    panAmount: 30,  // 左右聲道分離度（度數）
  },
};

/**
 * 計算層次化音量
 */
export function getTieredAudioVolume(
  soundType: 'cardReveal' | 'impressionGlow',
  layer: 'primary' | 'secondary' | 'accent' | 'harmonic'
): number {
  const config = audioEnhanceConfig.tieredAudio[soundType] as any;
  return config?.[layer] ?? 0.5;
}

/**
 * 計算自適應音量（時間相關）
 */
export function getAdaptiveVolume(baseVolume: number): number {
  if (!audioEnhanceConfig.volumeAdapt.enabled) return baseVolume;

  const now = new Date();
  const hour = now.getHours();

  if (audioEnhanceConfig.volumeAdapt.peakHours.includes(hour)) {
    return baseVolume * audioEnhanceConfig.volumeAdapt.peakMultiplier;
  }

  return baseVolume;
}

/**
 * 空間音頻全景化
 */
export function getSpatialAudioPan(position: 'left' | 'center' | 'right'): number {
  if (!audioEnhanceConfig.spatialAudio.enabled) return 0;

  const panAmount = audioEnhanceConfig.spatialAudio.panAmount;
  return position === 'left' ? -panAmount : position === 'right' ? panAmount : 0;
}
