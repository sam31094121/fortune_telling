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

export const TAIJI_CORE_CONFIG: Record<1 | 2 | 4 | 8, TaijiCoreConfig> = {
  1: {
    stage: 'taiji',
    event: 'ENTER_TAIJI',
    label: '第一幕｜太極核心甦醒',
    description: '唯一 Taiji Core 啟動，所有功能只從這個核心向外展開。',
    durationMs: 1200,
  },
  2: {
    stage: 'liangyi',
    event: 'ENTER_LIANGYI',
    label: '第二幕｜太極生兩儀',
    description: '陰陽由同一個太極核心自然分化，不建立第二個核心。',
    durationMs: 1600,
  },
  4: {
    stage: 'sixiang',
    event: 'ENTER_SIXIANG',
    label: '第三幕｜兩儀生四象',
    description: '四象由核心圖騰內部長出，外層只保留能量場。',
    durationMs: 2000,
  },
  8: {
    stage: 'bagua',
    event: 'ENTER_BAGUA',
    label: '第四幕｜四象生八卦',
    description: '八卦由唯一 Taiji Core 環繞生成，再交給 Integration Layer。',
    durationMs: 2400,
  },
};

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
