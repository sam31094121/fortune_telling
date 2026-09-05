/**
 * 神獸決鬥・戰鬥演出素材對照
 * ============================================================================
 *
 * 業主定調：「要更強烈的遊戲感儀式，可以去找現有的素材，把它組合起來。」
 * 以及「要讓客戶感覺兩隻（怪獸）真的在打架。」
 *
 * 所以這裡不做新素材，只把專案裡已經有的東西接起來：
 *
 *   public/audio/taiji/  太極第一層用的 CC0 音效（風雷水火地都有）
 *   public/audio/taiji/lightning-*.png  撞擊閃光圖
 *   六十張神獸的 thumbnail  卡片本人
 *
 * 五元素剛好對得上既有音效，不是硬湊：
 *   風 → 龍捲風／颱風        地 → 地裂
 *   水 → 潮湧                火 → 火焰劈啪／點燃
 *   空 → 乾雷／雷擊          （空屬金，雷從空中來）
 *
 * 【這支檔案不決定任何結果】
 *
 * 規格第十二條：動畫不得決定戰鬥結果。
 * 這裡只有「哪個元素配哪個聲音、配哪張圖」的對照表——
 * 播什麼、播多久，都不會改變任何一個數字。
 */

export type BattleElement = 'SPACE' | 'AIR' | 'WATER' | 'FIRE' | 'EARTH';

export interface ElementFx {
  /** 出招音效。用既有的太極音效庫，不另外找。 */
  attack: string;
  /** 卡片衝出去時的顏色（做拖影與閃光用）。 */
  glow: string;
  /** 元素的中文字，畫面上顯示用。 */
  label: string;
}

const AUDIO_BASE = '/audio/taiji';

export const ELEMENT_FX: Record<BattleElement, ElementFx> = {
  AIR: { attack: `${AUDIO_BASE}/tornado-wind.m4a`, glow: 'rgba(110, 231, 183, 0.85)', label: '風' },
  SPACE: { attack: `${AUDIO_BASE}/dry-thunder.mp3`, glow: 'rgba(226, 232, 240, 0.9)', label: '空' },
  WATER: { attack: `${AUDIO_BASE}/tide-surge.flac`, glow: 'rgba(125, 211, 252, 0.85)', label: '水' },
  FIRE: { attack: `${AUDIO_BASE}/cc0-fire-crackle.ogg`, glow: 'rgba(253, 164, 175, 0.9)', label: '火' },
  EARTH: { attack: `${AUDIO_BASE}/earth-rift.mp3`, glow: 'rgba(252, 211, 77, 0.85)', label: '地' },
};

/** 撞擊的共用音效與閃光圖。兩張卡撞在一起時放。 */
export const CLASH_FX = {
  impact: `${AUDIO_BASE}/cc0-cannon-hit.ogg`,
  heavyImpact: `${AUDIO_BASE}/loud-thunder.mp3`,
  /** 翻牌的輕音，逐張揭牌時每翻一張放一次。 */
  flip: `${AUDIO_BASE}/cc0-ignition.flac`,
  sprite: `${AUDIO_BASE}/lightning-impact-cc0.png`,
} as const;

/**
 * 一個很小的音效播放器。
 *
 * 刻意做得保守：
 *   · 預設關閉。沒有人希望一進頁面就被聲音嚇到，客戶要自己打開。
 *   · 播不出來就靜靜跳過（很多行動瀏覽器在沒有使用者手勢前不准播）。
 *   · 尊重 prefers-reduced-motion：那些人通常也不想要突發音效。
 *
 * 它不會 await、不會擋住任何流程——聲音失敗絕不能影響遊戲進行。
 */
export function createSoundPlayer(): {
  play: (src: string, volume?: number) => void;
  setEnabled: (on: boolean) => void;
  enabled: () => boolean;
} {
  let enabled = false;
  const cache = new Map<string, HTMLAudioElement>();

  const reducedMotion = () => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  };

  return {
    setEnabled(on: boolean) { enabled = on; },
    enabled: () => enabled,
    play(src: string, volume = 0.45) {
      if (!enabled || typeof window === 'undefined' || reducedMotion()) return;
      try {
        let audio = cache.get(src);
        if (!audio) {
          audio = new Audio(src);
          audio.preload = 'auto';
          cache.set(src, audio);
        }
        audio.currentTime = 0;
        audio.volume = volume;
        // 播放被拒絕（未經手勢、格式不支援）就算了，不能讓遊戲卡住。
        void audio.play().catch(() => {});
      } catch {
        /* 音效永遠是加分項，壞掉不影響遊戲。 */
      }
    },
  };
}

/**
 * 逐張揭牌的順序。
 *
 * 業主定調：「打輸或打贏的概念，可以一張一張地翻牌，不要一次就六張牌一起翻。
 * 要同時『我翻一張，對方翻一張』的概念。」
 *
 * 所以順序是交替的：我的前鋒 → 對方前鋒 → 我的中軍 → 對方中軍 → …
 * 一張一張對上去，客戶看得出誰對上誰。
 */
export const REVEAL_ORDER: Array<{ side: 'player' | 'opponent'; index: number }> = [
  { side: 'player', index: 0 },
  { side: 'opponent', index: 0 },
  { side: 'player', index: 1 },
  { side: 'opponent', index: 1 },
  { side: 'player', index: 2 },
  { side: 'opponent', index: 2 },
];

/** 每翻一張之間的間隔（毫秒）。減少動態時直接全開，不折磨人。 */
export const REVEAL_INTERVAL_MS = 620;
