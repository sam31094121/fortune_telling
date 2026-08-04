/**
 * 太極核心憲章（不可違反）：
 * 1. 太極為首頁唯一核心，不得消失、不得被取代、不得離開畫面中心。
 * 2. 所有元素只能由太極自然演化，禁止突然出現或切換。
 * 3. 所有功能必須由太極核心引擎（本檔案）控制。
 * 4. 禁止多套狀態系統並存。
 * 5. 禁止重複動畫與重複元件。
 * 6. 新增功能不得修改核心，只能掛載擴充（extend，not modify）。
 * 7. 手機優先，需維持 60 FPS 與 GPU 加速（只用 transform/opacity，避免逐幀重排）。
 * 8. 任何與以上規則衝突的舊實作，一律停用重構，不得保留並存。
 */
export type TaijiCoreStage = 'idle' | 'chaos' | 'taiji' | 'liangyi' | 'sixiang' | 'bagua' | 'five_elements' | 'tiandiren' | 'ai_core' | 'integration_layer';
export type TaijiVisualStage = Extract<TaijiCoreStage, 'idle' | 'taiji' | 'liangyi' | 'sixiang' | 'bagua'>;
export type TaijiCoreEvent =
  | 'ENTER_CHAOS'
  | 'ENTER_TAIJI'
  | 'ENTER_LIANGYI'
  | 'ENTER_SIXIANG'
  | 'ENTER_BAGUA'
  | 'ENTER_FIVE_ELEMENTS'
  | 'ENTER_TIANDIREN'
  | 'ENTER_AI_CORE'
  | 'ENTER_INTEGRATION_LAYER'
  | 'ENTER_FUNCTION';

export type TaijiCoreConfig = {
  stage: TaijiVisualStage;
  event: TaijiCoreEvent;
  label: string;
  description: string;
  durationMs: number;
};

export type TaijiCinemaPhase = 'taiji-core' | 'liangyi' | 'sixiang' | 'bagua';

export type TaijiCinemaSegment = TaijiCoreConfig & {
  tap: number;
  phase: TaijiCinemaPhase;
  layer: '1-taiji-core' | '2-five-star-orbit' | '3-space-glow';
  hue: number;
  rotationDeg: number;
  scale: number;
  glow: number;
};

export type TaijiCoreSnapshot = {
  engine: 'Taiji Core Engine';
  version: 'taiji_core_engine_v5';
  store: 'Taiji Store';
  stage: TaijiVisualStage;
  event: TaijiCoreEvent;
  pipeline: readonly TaijiCoreStage[];
  integrationLayer: {
    role: 'handoff-only';
    rule: string;
  };
  functionMountRule: string;
};

export const TAIJI_CORE_PIPELINE: readonly TaijiCoreStage[] = [
  'chaos',
  'taiji',
  'liangyi',
  'sixiang',
  'bagua',
  'five_elements',
  'tiandiren',
  'ai_core',
  'integration_layer',
];

export const TAIJI_CINEMA_SEGMENT_COUNT = 24;
export const TAIJI_CINEMA_SEGMENT_DURATION_MS = 6000;

export const TAIJI_CORE_CONFIG: Record<1 | 2 | 4 | 8, TaijiCoreConfig> = {
  1: {
    stage: 'taiji',
    event: 'ENTER_TAIJI',
    label: '第一幕｜太極核心甦醒',
    description: '唯一 Taiji Core 啟動，所有功能只從這個核心向外展開。',
    durationMs: TAIJI_CINEMA_SEGMENT_DURATION_MS,
  },
  2: {
    stage: 'liangyi',
    event: 'ENTER_LIANGYI',
    label: '第二幕｜太極生兩儀',
    description: '陰陽由同一個太極核心自然分化，不建立第二個核心。',
    durationMs: TAIJI_CINEMA_SEGMENT_DURATION_MS,
  },
  4: {
    stage: 'sixiang',
    event: 'ENTER_SIXIANG',
    label: '第三幕｜兩儀生四象',
    description: '四象由核心圖騰內部長出，外層只保留能量場。',
    durationMs: TAIJI_CINEMA_SEGMENT_DURATION_MS,
  },
  8: {
    stage: 'bagua',
    event: 'ENTER_BAGUA',
    label: '第四幕｜四象生八卦',
    description: '八卦由唯一 Taiji Core 環繞生成，再交給 Integration Layer。',
    durationMs: TAIJI_CINEMA_SEGMENT_DURATION_MS,
  },
};

const CINEMA_PHASES: readonly TaijiCinemaPhase[] = ['taiji-core', 'liangyi', 'sixiang', 'bagua'];

const PHASE_META: Record<TaijiCinemaPhase, Pick<TaijiCinemaSegment, 'stage' | 'event' | 'layer'>> = {
  'taiji-core': {
    stage: 'taiji',
    event: 'ENTER_TAIJI',
    layer: '1-taiji-core',
  },
  liangyi: {
    stage: 'liangyi',
    event: 'ENTER_LIANGYI',
    layer: '2-five-star-orbit',
  },
  sixiang: {
    stage: 'sixiang',
    event: 'ENTER_SIXIANG',
    layer: '3-space-glow',
  },
  bagua: {
    stage: 'bagua',
    event: 'ENTER_BAGUA',
    layer: '3-space-glow',
  },
};

const SEGMENT_TITLES = [
  '太極核心｜無極入鏡',
  '兩儀初判｜陰陽開軸',
  '四象定位｜東西南北成場',
  '八卦啟門｜乾坤立序',
  '太極核心｜玄光內聚',
  '兩儀星軌｜五星三百六十五度巡航',
  '四象交會｜青赤白黑分明',
  '八卦展輪｜空間光幕打開',
  '太極核心｜鏡面回旋',
  '兩儀換位｜陰陽互根',
  '四象流轉｜能量四柱升起',
  '八卦護場｜八門合圓',
  '太極核心｜內外同頻',
  '兩儀升維｜五星合相',
  '四象映照｜四方光位歸正',
  '八卦立體｜天地人入中宮',
  '太極核心｜黑白返真',
  '兩儀校準｜動靜平衡',
  '四象成脈｜光柱定位',
  '八卦周天｜三百六十五度歸環',
  '太極核心｜歸中蓄勢',
  '兩儀終圈｜五星封印',
  '四象八卦｜萬象合流',
  '太極回歸｜二十四段圓滿',
] as const;

export const TAIJI_CINEMA_SEGMENTS: readonly TaijiCinemaSegment[] = Array.from({ length: TAIJI_CINEMA_SEGMENT_COUNT }, (_, index) => {
  const tap = index + 1;
  const phase = CINEMA_PHASES[index % CINEMA_PHASES.length];
  const meta = PHASE_META[phase];
  const round = Math.floor(index / CINEMA_PHASES.length);
  const hue = (tap * 37 + round * 11) % 360;

  return {
    tap,
    phase,
    ...meta,
    label: `第 ${tap} 段｜${SEGMENT_TITLES[index]}`,
    description: '一段 6 秒完整演化：太極核心定形，陰陽兩儀開軸，四象分位，八卦入環；五星沿 365 度軌道巡航，空間光場只輔助、不遮蔽核心。',
    durationMs: TAIJI_CINEMA_SEGMENT_DURATION_MS,
    hue,
    rotationDeg: tap * 15 + round * 5,
    scale: 1 + (round % 3) * 0.018 + (phase === 'bagua' ? 0.028 : 0),
    glow: 0.72 + (tap % 6) * 0.045,
  };
});

/**
 * 24 段點擊音波：每一下頻率都不同，但整體是一條連貫的上升音階，
 * 錨定在傳統上被認為對人體有穩定/共鳴作用的 9 個 Solfeggio 頻率
 * （174、285、396、417、528、639、741、852、963 Hz），中間用平滑遞增
 * 的頻率銜接，讓 24 下聽起來像同一首完整的曲子，而不是 24 個隨機音效。
 * 第 24 下正好落在 963Hz（Solfeggio 傳統中對應「圓滿／合一」），呼應
 * TAIJI_CINEMA_SEGMENTS 裡第 24 段的標題「太極回歸｜二十四段圓滿」。
 */
export const TAIJI_TAP_FREQUENCIES_HZ: readonly number[] = [
  174, 210, 240, 285, 320, 349,
  396, 417, 440, 480, 512, 528,
  550, 583, 618, 639, 672, 705,
  741, 777, 810, 852, 908, 963,
];

/**
 * 每一下疊加的等時波動（isochronic pulse）速率，模擬腦波誘導：
 * 前段（太極核心甦醒）落在 theta 頻段（放鬆／冥想），中段爬升到
 * alpha 頻段（放鬆但清醒），最後幾下進入低 beta 頻段（專注／甦醒），
 * 整條曲線跟著 24 段的敘事節奏一起走。
 */
export const TAIJI_TAP_PULSE_HZ: readonly number[] = Array.from(
  { length: TAIJI_CINEMA_SEGMENT_COUNT },
  (_, index) => Number((6 + (13 - 6) * (index / (TAIJI_CINEMA_SEGMENT_COUNT - 1))).toFixed(2)),
);

export function getTaijiTapTone(tapCount: number): { frequency: number; pulseHz: number } {
  const index = (Math.max(1, tapCount) - 1) % TAIJI_CINEMA_SEGMENT_COUNT;
  return { frequency: TAIJI_TAP_FREQUENCIES_HZ[index], pulseHz: TAIJI_TAP_PULSE_HZ[index] };
}

export function buildTaijiCoreSnapshot(stage: TaijiVisualStage): TaijiCoreSnapshot {
  const event = stage === 'bagua'
    ? 'ENTER_BAGUA'
    : stage === 'sixiang'
      ? 'ENTER_SIXIANG'
      : stage === 'liangyi'
        ? 'ENTER_LIANGYI'
        : stage === 'taiji'
          ? 'ENTER_TAIJI'
          : 'ENTER_CHAOS';

  return {
    engine: 'Taiji Core Engine',
    version: 'taiji_core_engine_v5',
    store: 'Taiji Store',
    stage,
    event,
    pipeline: TAIJI_CORE_PIPELINE,
    integrationLayer: {
      role: 'handoff-only',
      rule: 'Taiji Core only emits direction and stage state. Integration Layer reads completed module results and must not re-run cards.',
    },
    functionMountRule: 'All homepage feature cards mount after Taiji Core. No feature card may create a second homepage core.',
  };
}

export function getTaijiCinemaSegmentForTap(tapCount: number): TaijiCinemaSegment {
  const normalizedTap = ((Math.max(1, tapCount) - 1) % TAIJI_CINEMA_SEGMENT_COUNT) + 1;
  return TAIJI_CINEMA_SEGMENTS[normalizedTap - 1];
}

export function getTaijiCoreConfigForTap(tapCount: number, limitToLiangyi: boolean): TaijiCoreConfig | null {
  if (tapCount === 1) return TAIJI_CORE_CONFIG[1];
  if (tapCount === 2) return TAIJI_CORE_CONFIG[2];
  if (!limitToLiangyi && tapCount === 4) return TAIJI_CORE_CONFIG[4];
  if (!limitToLiangyi && tapCount === 8) return TAIJI_CORE_CONFIG[8];
  return null;
}

export function getTaijiLuckyAuraLevel(args: { mantraLevel: 0 | 3 | 6 | 12 | 24; tapCount: number; stage: TaijiVisualStage }) {
  const { mantraLevel, tapCount, stage } = args;
  if (mantraLevel === 24 || tapCount >= 24) return 24;
  if (mantraLevel === 12 || tapCount >= 12) return 12;
  if (stage === 'bagua' || tapCount >= 8) return 8;
  if (mantraLevel === 6 || tapCount >= 6) return 6;
  if (mantraLevel === 3 || tapCount >= 3) return 3;
  return 0;
}