import { createHash } from 'crypto';

export type GrowthModuleId = 'nameology' | 'ziwei' | 'number' | 'soul_match' | 'music' | 'bazi';
export type GrowthElement = 'EARTH' | 'WATER' | 'FIRE' | 'WIND' | 'SPACE';

export type GrowthCenterInput = {
  userId?: string | null;
  anonymousProfileId?: string | null;
  completedModules?: GrowthModuleId[];
  primaryElement?: GrowthElement | null;
  secondaryElement?: GrowthElement | null;
  avoidElement?: GrowthElement | null;
  analysisHash?: string | null;
  now?: Date;
};

export type GrowthCenterResult = {
  success: true;
  data: {
    profileId: string;
    progress: {
      completed: number;
      total: 6;
      completedModules: GrowthModuleId[];
      missingModules: GrowthModuleId[];
      unlockLevel: 'empty' | 'basic' | 'cross_module' | 'complete';
      message: string;
    };
    weeklyReport: {
      weekKey: string;
      coreTheme: string;
      primaryAction: string;
      affirmation: string;
      evidence: string[];
      nextUpdateAt: string;
    };
    monthlyEnergyColor: {
      monthKey: string;
      element: GrowthElement;
      colorName: string;
      hex: string;
      reason: string;
      usage: string[];
      message: string;
    };
    fiveElement: {
      primaryElement: GrowthElement;
      secondaryElement: GrowthElement;
      avoidElement: GrowthElement | null;
      confidence: 'low' | 'medium' | 'high';
      summary: string;
    };
    nextStep: {
      moduleId: GrowthModuleId | null;
      title: string;
      href: string;
    };
    updatedAt: string;
    nextMonthlyUpdateAt: string;
    generationVersion: 'growth_center_v1';
    personalizationSeed: string;
  };
};

const MODULES: Array<{ id: GrowthModuleId; title: string; href: string }> = [
  { id: 'nameology', title: 'AI 姓名學', href: '/nameology' },
  { id: 'ziwei', title: 'AI 紫微斗數', href: '/insight' },
  { id: 'number', title: '數字論吉凶', href: '/numerology' },
  { id: 'soul_match', title: '雙人靈魂配對', href: '/match' },
  { id: 'music', title: '專屬生命音樂', href: '/music' },
  { id: 'bazi', title: 'AI 八字命盤', href: '/bazi' },
];

const ELEMENT_LABEL: Record<GrowthElement, string> = {
  EARTH: '地元素',
  WATER: '水元素',
  FIRE: '火元素',
  WIND: '風元素',
  SPACE: '空元素',
};

const ELEMENT_THEME: Record<GrowthElement, {
  theme: string;
  action: string[];
  affirmation: string[];
  reason: string;
  colors: Array<{ colorName: string; hex: string }>;
}> = {
  EARTH: {
    theme: '穩定執行',
    action: ['本週固定三天，在同一時間完成最重要的一件事。', '本週把一個承諾落成清楚時間表。', '本週先完成一件能穩住生活節奏的小事。'],
    affirmation: ['本週要穩定執行。每天向前一步，結果就會跟著改變。', '本週先穩住節奏。穩定完成，就是力量開始累積。', '本週把承諾落地。做到一次，信任就增加一次。'],
    reason: '本月需要強化穩定、承擔與落實。',
    colors: [{ colorName: '大地棕', hex: '#7A4E2D' }, { colorName: '米棕色', hex: '#B58A5A' }, { colorName: '沉穩陶土色', hex: '#8A5A44' }],
  },
  WATER: {
    theme: '調整溝通',
    action: ['本週先完整聽完一次對方的想法，再說出自己的重點。', '本週把一個卡住的問題換成更清楚的問法。', '本週留十分鐘整理情緒，再回應重要訊息。'],
    affirmation: ['本週要調整溝通。先聽清楚，再說清楚。', '本週把情緒整理好，關係與判斷就會更順。', '本週讓溝通變柔軟。話說對了，局面就會開始改變。'],
    reason: '本月需要強化溝通、洞察與情緒流動。',
    colors: [{ colorName: '深藍色', hex: '#123A5A' }, { colorName: '靛藍色', hex: '#263C88' }, { colorName: '湖水藍', hex: '#1F7A8C' }],
  },
  FIRE: {
    theme: '主動完成',
    action: ['本週先完成一件拖延最久的任務。', '本週主動說出一次自己的真實想法。', '本週把一個想法立刻拆成今天能做的第一步。'],
    affirmation: ['本週不要再等待。完成第一步，後面的路才會打開。', '本週的重點就是行動。先完成，力量才會開始累積。', '本週要提高表達。說出重點，行動就會跟上。'],
    reason: '本月需要強化行動、表達與推進。',
    colors: [{ colorName: '深紅色', hex: '#8B1E2D' }, { colorName: '朱紅色', hex: '#B3261E' }, { colorName: '暖橘色', hex: '#C65A1E' }],
  },
  WIND: {
    theme: '持續學習',
    action: ['本週安排一個可持續七天的小學習計畫。', '本週把新想法整理成一張簡單路線圖。', '本週主動連結一位能一起成長的人。'],
    affirmation: ['本週要持續學習。方向清楚，成長就會加速。', '本週把想法整理成路線。路線出來，行動就有力量。', '本週開始延伸自己。每天多一點，格局就會變大。'],
    reason: '本月需要強化成長、規劃與延伸。',
    colors: [{ colorName: '森林綠', hex: '#1F6B45' }, { colorName: '青綠色', hex: '#168A78' }, { colorName: '松葉綠', hex: '#2F6F4E' }],
  },
  SPACE: {
    theme: '建立界線',
    action: ['本週先寫下三條清楚界線，並停止一件不必要的消耗。', '本週把一個拖延的決定切成可執行步驟。', '本週用更精準的文字表達自己的標準。'],
    affirmation: ['本週要建立界線。停下消耗，專注真正重要的事。', '本週把標準說清楚。界線清楚，能量就會回來。', '本週做出決定。決定一清楚，行動就會變快。'],
    reason: '本月需要強化界線、決策與專注。',
    colors: [{ colorName: '銀白色', hex: '#D9E2EC' }, { colorName: '霧灰色', hex: '#8E99A8' }, { colorName: '冷白銀', hex: '#C7CED8' }],
  },
};

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function pick<T>(items: T[], seed: string, salt: string) {
  const n = Number.parseInt(hashText(`${seed}:${salt}`).slice(0, 8), 16);
  return items[n % items.length];
}

function taipeiDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')) };
}

function weekKey(now: Date) {
  const { year, month, day } = taipeiDateParts(now);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${weekYear}-W${String(weekNo).padStart(2, '0')}`;
}

function monthKey(now: Date) {
  const { year, month } = taipeiDateParts(now);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function nextMondayTaipei(now: Date) {
  const { year, month, day } = taipeiDateParts(now);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const dayNum = localDate.getUTCDay() || 7;
  localDate.setUTCDate(localDate.getUTCDate() + (8 - dayNum));
  return `${localDate.toISOString().slice(0, 10)}T00:00:00+08:00`;
}

function nextMonthTaipei(now: Date) {
  const { year, month } = taipeiDateParts(now);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+08:00`;
}

function normalizeModules(input?: GrowthModuleId[]) {
  const known = new Set(MODULES.map((item) => item.id));
  const result = Array.from(new Set((input ?? []).filter((item): item is GrowthModuleId => known.has(item))));
  return result.sort((a, b) => MODULES.findIndex((item) => item.id === a) - MODULES.findIndex((item) => item.id === b));
}

function inferPrimaryElement(modules: GrowthModuleId[], seed: string, explicit?: GrowthElement | null) {
  if (explicit) return explicit;
  if (modules.includes('soul_match')) return pick(['WATER', 'FIRE', 'EARTH'] as GrowthElement[], seed, 'match-element');
  if (modules.includes('bazi')) return pick(['FIRE', 'WATER', 'EARTH', 'SPACE', 'WIND'] as GrowthElement[], seed, 'bazi-element');
  if (modules.includes('number')) return pick(['SPACE', 'FIRE', 'WATER'] as GrowthElement[], seed, 'number-element');
  return pick(['FIRE', 'EARTH', 'WATER', 'WIND', 'SPACE'] as GrowthElement[], seed, 'fallback-element');
}

export function buildGrowthCenter(input: GrowthCenterInput): GrowthCenterResult {
  const now = input.now ?? new Date();
  const completedModules = normalizeModules(input.completedModules);
  const missingModules = MODULES.map((item) => item.id).filter((id) => !completedModules.includes(id));
  const identity = input.userId || input.anonymousProfileId || 'anonymous';
  const profileId = hashText(identity).slice(0, 16);
  const analysisHash = input.analysisHash || hashText(completedModules.join('|') || 'empty').slice(0, 16);
  const wk = weekKey(now);
  const mk = monthKey(now);
  const seed = hashText([identity, wk, mk, completedModules.join(','), analysisHash, 'growth_center_v1'].join('|'));
  const primaryElement = inferPrimaryElement(completedModules, seed, input.primaryElement);
  const secondaryElement = input.secondaryElement || pick((Object.keys(ELEMENT_THEME) as GrowthElement[]).filter((item) => item !== primaryElement), seed, 'secondary');
  const avoidElement = input.avoidElement ?? null;
  const themeData = ELEMENT_THEME[primaryElement];
  const color = pick(themeData.colors, seed, 'monthly-color');
  const completed = completedModules.length;
  const nextModule = MODULES.find((item) => !completedModules.includes(item.id)) ?? null;
  const unlockLevel = completed === 0 ? 'empty' : completed >= 6 ? 'complete' : completed >= 3 ? 'cross_module' : 'basic';

  const progressMessage = completed === 0
    ? '請先完成一項分析，AI 才能建立您的個人成長指引。'
    : completed >= 6
      ? '六項探索已完成，已解鎖完整 AI 個人成長報告。'
      : completed >= 3
        ? `您的探索進度：${completed}／6。已解鎖跨模組成長總覽。`
        : `您的探索進度：${completed}／6。再完成一項分析，即可補充更多個人化判斷依據。`;

  const weeklyReport = {
    weekKey: wk,
    coreTheme: themeData.theme,
    primaryAction: pick(themeData.action, seed, 'weekly-action'),
    affirmation: pick(themeData.affirmation, seed, 'weekly-affirmation'),
    evidence: completedModules.map((moduleId) => {
      const title = MODULES.find((item) => item.id === moduleId)?.title ?? moduleId;
      return `${title} 已完成，納入本週行動判定。`;
    }),
    nextUpdateAt: nextMondayTaipei(now),
  };

  const monthlyEnergyColor = {
    monthKey: mk,
    element: primaryElement,
    colorName: color.colorName,
    hex: color.hex,
    reason: themeData.reason,
    usage: ['衣著配件', '手機桌布', '工作用品'],
    message: `本月把${color.colorName}融入日常配件，提醒自己保持${themeData.theme}。`,
  };

  return {
    success: true,
    data: {
      profileId,
      progress: {
        completed,
        total: 6,
        completedModules,
        missingModules,
        unlockLevel,
        message: progressMessage,
      },
      weeklyReport,
      monthlyEnergyColor,
      fiveElement: {
        primaryElement,
        secondaryElement,
        avoidElement,
        confidence: completed >= 3 ? 'high' : completed >= 1 ? 'medium' : 'low',
        summary: completed === 0
          ? '尚未取得分析資料，完成任一項分析後即可建立五元素補強方向。'
          : `AI 判定：您目前第一補強順位是${ELEMENT_LABEL[primaryElement]}，第二順位是${ELEMENT_LABEL[secondaryElement]}。`,
      },
      nextStep: {
        moduleId: nextModule?.id ?? null,
        title: nextModule ? `下一步：完成${nextModule.title}` : '下一步：查看完整個人成長報告',
        href: nextModule?.href ?? '/growth-center',
      },
      updatedAt: now.toISOString(),
      nextMonthlyUpdateAt: nextMonthTaipei(now),
      generationVersion: 'growth_center_v1',
      personalizationSeed: seed.slice(0, 16),
    },
  };
}

export function parseGrowthModules(value: string | null): GrowthModuleId[] {
  if (!value) return [];
  const known = new Set(MODULES.map((item) => item.id));
  return value.split(',').map((item) => item.trim()).filter((item): item is GrowthModuleId => known.has(item as GrowthModuleId));
}
