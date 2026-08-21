export type FineDiningExperienceModule =
  | 'number'
  | 'nameology'
  | 'ziwei'
  | 'bazi'
  | 'zodiac'
  | 'soul_match'
  | 'music'
  | 'tarot'
  | 'growth';

export type FineDiningExperienceState =
  | 'idle'
  | 'order'
  | 'prepare'
  | 'cook'
  | 'quality_check'
  | 'serve'
  | 'chef_summary'
  | 'follow_up'
  | 'completed'
  | 'error';

export type FineDiningStageStatus = 'LOCKED' | 'READY' | 'PROCESSING' | 'PASSED' | 'FAILED';

export type FineDiningStageId =
  | 'STAGE_01_WELCOME'
  | 'STAGE_02_ORDER'
  | 'STAGE_03_PREPARE'
  | 'STAGE_04_COOK'
  | 'STAGE_05_QUALITY_CHECK'
  | 'STAGE_06_SERVE'
  | 'STAGE_07_CHEF_SUMMARY'
  | 'STAGE_08_FOLLOW_UP';

export type FineDiningExperienceStage = {
  id: FineDiningStageId;
  label: string;
  detail: string;
};

export type FineDiningStageView = FineDiningExperienceStage & {
  index: number;
  status: FineDiningStageStatus;
};

export const FINE_DINING_EXPERIENCE_VERSION = 'fine_dining_experience_v2';

export const FINE_DINING_MODULE_LABEL: Record<FineDiningExperienceModule, string> = {
  number: '數字論好壞',
  nameology: 'AI 姓名學',
  ziwei: 'AI 紫微斗數',
  bazi: 'AI 八字命盤',
  zodiac: 'AI 西洋星座',
  soul_match: 'AI 靈魂配對',
  music: 'AI 生成歌曲',
  tarot: 'AI 塔羅牌',
  growth: 'AI 個人成長中心',
};

export const FINE_DINING_STAGES: FineDiningExperienceStage[] = [
  {
    id: 'STAGE_01_WELCOME',
    label: '開始服務',
    detail: '確認本次要完成的單一任務。',
  },
  {
    id: 'STAGE_02_ORDER',
    label: '資料確認',
    detail: '檢查格式、身份與必要資料。',
  },
  {
    id: 'STAGE_03_PREPARE',
    label: '準備分析',
    detail: '建立任務並整理後端運算素材。',
  },
  {
    id: 'STAGE_04_COOK',
    label: 'AI 分析中',
    detail: '後端開始運算，不讓使用者面對空白等待。',
  },
  {
    id: 'STAGE_05_QUALITY_CHECK',
    label: '品質確認',
    detail: '確認結果完整、去重且可在手機閱讀。',
  },
  {
    id: 'STAGE_06_SERVE',
    label: '結果準備完成',
    detail: '前端只顯示真正重要的結果。',
  },
  {
    id: 'STAGE_07_CHEF_SUMMARY',
    label: 'AI 最終判定',
    detail: '整合成一句最核心的今日方向。',
  },
  {
    id: 'STAGE_08_FOLLOW_UP',
    label: '後續提醒',
    detail: '更新成長中心與下一步行動。',
  },
];

export function getFineDiningActiveIndex(state: FineDiningExperienceState) {
  if (state === 'idle') return 0;
  if (state === 'order') return 1;
  if (state === 'prepare') return 2;
  if (state === 'cook') return 3;
  if (state === 'quality_check') return 4;
  if (state === 'serve') return 5;
  if (state === 'chef_summary') return 6;
  return 7;
}

export function getFineDiningStageStatus(
  state: FineDiningExperienceState,
  index: number,
): FineDiningStageStatus {
  const activeIndex = getFineDiningActiveIndex(state);
  if (state === 'error' && index === activeIndex) return 'FAILED';
  if (state === 'completed' || index < activeIndex) return 'PASSED';
  if (index === activeIndex) return state === 'idle' ? 'READY' : 'PROCESSING';
  if (index === activeIndex + 1) return 'READY';
  return 'LOCKED';
}

export function buildFineDiningStageViews(state: FineDiningExperienceState): FineDiningStageView[] {
  return FINE_DINING_STAGES.map((stage, index) => ({
    ...stage,
    index,
    status: getFineDiningStageStatus(state, index),
  }));
}

export function getFineDiningVisibleStages(state: FineDiningExperienceState) {
  const activeIndex = getFineDiningActiveIndex(state);
  const from = Math.max(0, activeIndex - 2);
  const to = Math.min(FINE_DINING_STAGES.length - 1, activeIndex + 1);
  return buildFineDiningStageViews(state).filter((stage) => stage.index >= from && stage.index <= to);
}
