/**
 * 太極掛載守門｜純函式，可被健檢與 CI 直接餵參數驗證
 * ============================================================================
 *
 * 為什麼要抽出來（2026-09-04 客訴）：
 *
 * iPhone 打開首頁，其他東西都正常，只有太極那一塊是空白。原因是守門邏輯
 * 用「硬體數字」猜裝置等級，而那兩個數字在 Safari 上都不可信：
 *
 *   navigator.deviceMemory          Safari 完全不支援 → 永遠 undefined
 *   navigator.hardwareConcurrency   Safari 出於指紋防護，對「所有 iPhone」
 *                                   一律只回報 4（iPhone 15 Pro Max 也是 4）
 *
 * 更麻煩的是：這個 bug 完全躲過了全部 19 項螢幕健檢。因為健檢只檢查
 * 「首頁回不回 HTTP 200」與「原始碼裡有沒有那幾個字串」——頁面一直是 200、
 * 原始碼一直都在，只是元件根本沒掛載。**檢查「頁面活著」不等於檢查「客戶看得到」。**
 *
 * 所以把判定抽成不依賴瀏覽器的純函式：健檢可以直接餵 iPhone 的實際回報值，
 * 斷言它必須放行。這樣同類問題以後在健檢就會被抓到，不必等客戶反映。
 */

export interface TaijiDeviceSignals {
  /** 瀏覽器是否支援 WebGL（webgl2 或 webgl 任一）。 */
  webgl: boolean;
  /** 客戶是否要求減少動態效果。 */
  reducedMotion: boolean;
  /** navigator.userAgent；用於辨識 Apple 行動裝置。 */
  userAgent: string;
  /** navigator.platform；iPadOS 會偽裝成 MacIntel。 */
  platform?: string;
  /** navigator.maxTouchPoints；iPadOS 的 MacIntel 需靠這個區分。 */
  maxTouchPoints?: number;
  /** navigator.hardwareConcurrency。Safari 對所有 iPhone 一律回報 4。 */
  hardwareConcurrency?: number;
  /** navigator.deviceMemory。Safari 完全不支援，永遠 undefined。 */
  deviceMemory?: number;
}

/**
 * 是否為 Apple 行動裝置。
 *
 * iPadOS 13 起 Safari 的 userAgent 會偽裝成桌機 Mac，必須再靠
 * platform === 'MacIntel' 且有觸控點來補判。
 */
export function isAppleMobileDevice(signals: Pick<TaijiDeviceSignals, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
  if (/iPad|iPhone|iPod/.test(signals.userAgent ?? '')) return true;
  return signals.platform === 'MacIntel' && (signals.maxTouchPoints ?? 0) > 1;
}

/**
 * 太極 3D 是否可以掛載。
 *
 * 只擋兩件事：瀏覽器沒有 WebGL、或客戶自己要求減少動態。
 * **不得再用硬體數字擋掉整個裝置**——真正的效能降級在 TaijiSystem 內部
 * （DPR 上限、粒子預算、離屏停 frameloop）。依太極憲章，省效能要從材質與
 * 剔除下手，不是把整個核心關掉。
 */
export function canMountTaiji3D(signals: TaijiDeviceSignals): boolean {
  if (!signals.webgl) return false;
  if (signals.reducedMotion) return false;
  return true;
}

/**
 * 這台裝置是否該被視為低功耗（畫質降級用，不影響是否掛載）。
 *
 * Apple 行動裝置一律排除：Safari 回報的核心數與記憶體不可信，
 * 而 iPhone 的 GPU 實際上優於多數 Android 旗艦。
 */
export function isLowPowerDevice(signals: TaijiDeviceSignals): boolean {
  if (isAppleMobileDevice(signals)) return false;
  const cores = signals.hardwareConcurrency ?? 4;
  const memory = signals.deviceMemory ?? 4;
  return cores <= 4 || memory <= 4;
}

/** 這台裝置是否享有高畫質手機檔次。 */
export function isStrongPhoneDevice(signals: TaijiDeviceSignals): boolean {
  if (isAppleMobileDevice(signals)) return true;
  const cores = signals.hardwareConcurrency ?? 4;
  const memory = signals.deviceMemory ?? 4;
  return cores >= 8 && memory >= 6;
}

/** 健檢與 CI 用的機型樣本。每一台都必須看得到太極。 */
export const TAIJI_DEVICE_FIXTURES: Array<{ name: string; signals: TaijiDeviceSignals }> = [
  {
    // Safari 不支援 deviceMemory；iPhone 全系列一律回報 4 核。
    name: 'iPhone Safari（全系列）',
    signals: {
      webgl: true,
      reducedMotion: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      hardwareConcurrency: 4,
      deviceMemory: undefined,
    },
  },
  {
    // iPadOS 13+ 的 Safari userAgent 偽裝成桌機 Mac。
    name: 'iPad Safari（UA 偽裝成 MacIntel）',
    signals: {
      webgl: true,
      reducedMotion: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
      hardwareConcurrency: 4,
      deviceMemory: undefined,
    },
  },
  {
    name: 'Android 中階',
    signals: {
      webgl: true,
      reducedMotion: false,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
      hardwareConcurrency: 8,
      deviceMemory: 4,
    },
  },
  {
    name: '桌機 Chrome',
    signals: {
      webgl: true,
      reducedMotion: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0,
      hardwareConcurrency: 16,
      deviceMemory: 8,
    },
  },
];
