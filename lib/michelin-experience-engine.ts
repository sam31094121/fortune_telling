export type MichelinExperienceModule =
  | 'number'
  | 'nameology'
  | 'ziwei'
  | 'bazi'
  | 'zodiac'
  | 'soul_match'
  | 'music'
  | 'tarot'
  | 'growth';

export type MichelinExperienceState =
  | 'idle'
  | 'validating'
  | 'queued'
  | 'processing'
  | 'integrating'
  | 'completed'
  | 'error';

export type MichelinExperienceStep = {
  id: 'welcome' | 'confirm' | 'prepare' | 'integrate' | 'serve';
  course: string;
  title: string;
  detail: string;
};

export const MICHELIN_EXPERIENCE_VERSION = 'michelin_experience_v1';

export const MICHELIN_EXPERIENCE_MODULE_LABEL: Record<MichelinExperienceModule, string> = {
  number: '數字論吉凶',
  nameology: 'AI 姓名學',
  ziwei: 'AI 紫微斗數',
  bazi: 'AI 八字命盤',
  zodiac: 'AI 西洋星座',
  soul_match: 'AI 靈魂配對',
  music: 'AI 生成歌曲',
  tarot: 'AI 塔羅牌',
  growth: 'AI 個人成長中心',
};

export const MICHELIN_EXPERIENCE_STEPS: MichelinExperienceStep[] = [
  {
    id: 'welcome',
    course: '第一道',
    title: '歡迎入席',
    detail: 'AI 服務已啟動，只先確認這次要完成的一件事。',
  },
  {
    id: 'confirm',
    course: '第二道',
    title: '資料確認',
    detail: '格式、身份與必要資料確認完成後才進入下一道。',
  },
  {
    id: 'prepare',
    course: '第三道',
    title: 'AI 開始分析',
    detail: '後端開始運算，不讓會員面對空白等待。',
  },
  {
    id: 'integrate',
    course: '第四道',
    title: 'AI 深度整合',
    detail: '把規則、證據與五元素整理成可閱讀的重點。',
  },
  {
    id: 'serve',
    course: '第五道',
    title: '專屬結果上桌',
    detail: '最後只呈現最重要的判定與下一步。',
  },
];

export function getMichelinExperienceActiveIndex(state: MichelinExperienceState) {
  if (state === 'idle') return 0;
  if (state === 'validating') return 1;
  if (state === 'queued' || state === 'processing') return 2;
  if (state === 'integrating') return 3;
  return 4;
}

export function getMichelinExperienceStatus(
  state: MichelinExperienceState,
  index: number,
) {
  const activeIndex = getMichelinExperienceActiveIndex(state);
  if (state === 'error' && index === activeIndex) return 'ERROR';
  if (state === 'completed' || index < activeIndex) return 'PASS';
  if (index === activeIndex) return 'NOW';
  return 'NEXT';
}
