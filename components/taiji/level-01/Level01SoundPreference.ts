import type { TaijiSoundVariant } from '@/lib/taiji/experience-types';

/**
 * 匿名聲音偏好學習：禁止事先寫死「大數據最喜歡」。
 * 每支裝置先被隨機分到 4 個候選聲音之一，累積真實互動資料，
 * 樣本數不夠前絕不宣布贏家；夠了才用完成率/靜音率/回放率/下一步轉換率評出目前表現最好的一個。
 * 純本機 localStorage 累積（不上傳、不收麥克風、不收敏感資料）；
 * 這代表贏家目前只反映「這支裝置自己」的重複造訪資料，不是跨使用者大數據——
 * 要做到真正跨使用者統計，需要另外接一個像 lib/visitor-counter.ts 那樣的後端聚合表。
 */

export const TAIJI_SOUND_VARIANTS: readonly TaijiSoundVariant[] = ['SOFT_WOOD', 'WARM_BELL', 'AIR_CHIME', 'LOW_RESONANCE'];

const STORAGE_KEY = 'tdh_taiji_sound_preference_v1';
// 每個候選聲音至少要有這麼多次「被分配到」的紀錄，才允許進入贏家評估；
// 資料不夠寧可保持隨機分配，也不假稱有結論。
const MIN_SAMPLE_SIZE = 40;

export interface Level01SoundVariantStats {
  assigned: number;
  completedInteraction: number;
  mutedImmediately: number;
  replayed: number;
  nextStepCompleted: number;
}

interface Level01SoundPreferenceStore {
  deviceVariant: TaijiSoundVariant | null;
  stats: Record<TaijiSoundVariant, Level01SoundVariantStats>;
  winner: TaijiSoundVariant | null;
}

function isVariant(value: unknown): value is TaijiSoundVariant {
  return typeof value === 'string' && (TAIJI_SOUND_VARIANTS as readonly string[]).includes(value);
}

function emptyStats(): Level01SoundVariantStats {
  return { assigned: 0, completedInteraction: 0, mutedImmediately: 0, replayed: 0, nextStepCompleted: 0 };
}

function emptyStore(): Level01SoundPreferenceStore {
  const stats = {} as Record<TaijiSoundVariant, Level01SoundVariantStats>;
  for (const variant of TAIJI_SOUND_VARIANTS) stats[variant] = emptyStats();
  return { deviceVariant: null, stats, winner: null };
}

function readStore(): Level01SoundPreferenceStore {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Level01SoundPreferenceStore> | null;
    const base = emptyStore();
    if (!parsed || typeof parsed !== 'object') return base;
    for (const variant of TAIJI_SOUND_VARIANTS) {
      const incoming = parsed.stats?.[variant];
      if (incoming) base.stats[variant] = { ...emptyStats(), ...incoming };
    }
    return {
      deviceVariant: isVariant(parsed.deviceVariant) ? parsed.deviceVariant : null,
      stats: base.stats,
      winner: isVariant(parsed.winner) ? parsed.winner : null,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Level01SoundPreferenceStore) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 偏好學習是加分功能；儲存被擋掉時，儀式聲音仍然正常播放，只是這次不記錄。
  }
}

export class Level01SoundPreferenceEngine {
  private store: Level01SoundPreferenceStore;

  constructor() {
    this.store = readStore();
  }

  /** 已經有贏家就大家聽贏家；沒有的話維持這支裝置原本分配到的那一個，不要每次重洗。 */
  resolveVariant(): TaijiSoundVariant {
    if (this.store.winner) return this.store.winner;
    if (!this.store.deviceVariant) {
      const index = Math.floor(Math.random() * TAIJI_SOUND_VARIANTS.length);
      this.store.deviceVariant = TAIJI_SOUND_VARIANTS[index];
      this.store.stats[this.store.deviceVariant].assigned += 1;
      writeStore(this.store);
    }
    return this.store.deviceVariant;
  }

  recordEvent(event: {
    variant: TaijiSoundVariant;
    completedInteraction?: boolean;
    mutedImmediately?: boolean;
    replayed?: boolean;
    nextStepCompleted?: boolean;
  }) {
    const stats = this.store.stats[event.variant];
    if (!stats) return;
    if (event.completedInteraction) stats.completedInteraction += 1;
    if (event.mutedImmediately) stats.mutedImmediately += 1;
    if (event.replayed) stats.replayed += 1;
    if (event.nextStepCompleted) stats.nextStepCompleted += 1;
    writeStore(this.store);
    this.reevaluate();
  }

  private reevaluate() {
    if (this.store.winner) return;
    const entries = TAIJI_SOUND_VARIANTS.map((variant) => [variant, this.store.stats[variant]] as const);
    if (entries.some(([, stats]) => stats.assigned < MIN_SAMPLE_SIZE)) return;
    const scored = entries.map(([variant, stats]) => {
      const completionRate = stats.completedInteraction / stats.assigned;
      const muteRate = stats.mutedImmediately / stats.assigned;
      const replayRate = stats.replayed / stats.assigned;
      const nextStepRate = stats.nextStepCompleted / stats.assigned;
      const score = completionRate * 0.4 + nextStepRate * 0.35 + replayRate * 0.15 - muteRate * 0.4;
      return { variant, score };
    });
    scored.sort((a, b) => b.score - a.score);
    this.store.winner = scored[0].variant;
    writeStore(this.store);
  }

  snapshot(): Level01SoundPreferenceStore {
    return { deviceVariant: this.store.deviceVariant, stats: { ...this.store.stats }, winner: this.store.winner };
  }
}
