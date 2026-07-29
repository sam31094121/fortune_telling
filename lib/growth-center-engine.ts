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

type ModuleMeta = {
  id: GrowthModuleId;
  title: string;
  shortTitle: string;
  href: string;
  defaultElement: GrowthElement;
  evidence: string;
};

type ElementTheme = {
  label: string;
  shortLabel: string;
  theme: string;
  summary: string;
  action: string[];
  affirmation: string[];
  reason: string;
  colors: Array<{ colorName: string; hex: string; usage: string[] }>;
};

export const GROWTH_MODULES: ModuleMeta[] = [
  {
    id: 'nameology',
    title: 'AI 姓名學',
    shortTitle: '姓名學',
    href: '/nameology',
    defaultElement: 'WIND',
    evidence: '姓名學提供表達方式、外在人設與溝通節奏。',
  },
  {
    id: 'ziwei',
    title: '紫微斗數',
    shortTitle: '紫微',
    href: '/insight',
    defaultElement: 'SPACE',
    evidence: '紫微斗數提供人生主軸、宮位重點與長期方向。',
  },
  {
    id: 'number',
    title: '數字論吉凶',
    shortTitle: '數字',
    href: '/numerology',
    defaultElement: 'FIRE',
    evidence: '數字論吉凶提供行動節奏、壓力點與即時調整方向。',
  },
  {
    id: 'soul_match',
    title: '靈魂配對',
    shortTitle: '配對',
    href: '/match',
    defaultElement: 'WATER',
    evidence: '靈魂配對提供關係互動、情緒流動與相處修正方向。',
  },
  {
    id: 'music',
    title: 'AI 生成一首歌',
    shortTitle: '音樂',
    href: '/music',
    defaultElement: 'EARTH',
    evidence: 'AI 音樂提供自我整理、情緒落地與內在穩定訊號。',
  },
  {
    id: 'bazi',
    title: 'AI 八字命盤',
    shortTitle: '八字',
    href: '/bazi',
    defaultElement: 'EARTH',
    evidence: '八字命盤提供出生能量、日主狀態與基礎五行結構。',
  },
];

const MODULE_INDEX = new Map(GROWTH_MODULES.map((item, index) => [item.id, index]));
const MODULE_BY_ID = new Map(GROWTH_MODULES.map((item) => [item.id, item]));
const ELEMENT_ORDER: GrowthElement[] = ['EARTH', 'WATER', 'FIRE', 'WIND', 'SPACE'];

const ELEMENT_THEME: Record<GrowthElement, ElementTheme> = {
  EARTH: {
    label: '地元素',
    shortLabel: '地',
    theme: '穩定落地',
    summary: '地元素代表穩定、承接、累積與生活秩序。',
    action: [
      '本週一定先完成一件最小但具體的事，把想法落到行動表。',
      '每天固定整理一個生活角落，讓狀態回到可控與穩定。',
      '把正在拖延的事項拆成三步，今天一定完成第一步。',
    ],
    affirmation: [
      '我一定可以把混亂整理成秩序，並用穩定行動改變現在。',
      '我一定會從一件小事開始，慢慢建立更踏實的自己。',
      '我一定能把心定下來，讓結果從每天的累積開始改變。',
    ],
    reason: '目前最需要補強的是穩定度與落地感，先讓生活節奏穩住，後面的努力才一定接得住。',
    colors: [
      { colorName: '岩土棕', hex: '#7A4E2D', usage: ['手機桌布', '手鍊搭配', '工作筆記'] },
      { colorName: '暖砂金', hex: '#B58A5A', usage: ['錢包配色', '穿搭點綴', '行程標記'] },
      { colorName: '深木褐', hex: '#8A5A44', usage: ['辦公桌物件', '日記封面', '日常配件'] },
    ],
  },
  WATER: {
    label: '水元素',
    shortLabel: '水',
    theme: '情緒流動',
    summary: '水元素代表情緒、理解、關係流動與柔軟調整。',
    action: [
      '本週一定留十分鐘寫下真實感受，先理解自己再回應別人。',
      '遇到衝突時先停三秒再說話，讓情緒流動而不是直接爆開。',
      '主動完成一次溫和溝通，把沒有說清楚的地方說清楚。',
    ],
    affirmation: [
      '我一定能穩定情緒，也一定能用更柔軟的方式改變關係。',
      '我一定會先聽懂自己的心，再做出更成熟的選擇。',
      '我一定能讓卡住的情緒流動起來，關係也會跟著改變。',
    ],
    reason: '目前最需要補強的是情緒流動與溝通彈性，水元素補上後，關係與判斷一定會更順。',
    colors: [
      { colorName: '深海藍', hex: '#123A5A', usage: ['手機桌布', '睡前提示', '水晶手鍊'] },
      { colorName: '靛青藍', hex: '#263C88', usage: ['會議筆記', '穿搭配件', '聊天背景'] },
      { colorName: '湖水青', hex: '#1F7A8C', usage: ['行事曆', '運動水瓶', '桌面小物'] },
    ],
  },
  FIRE: {
    label: '火元素',
    shortLabel: '火',
    theme: '行動突破',
    summary: '火元素代表行動力、表達、熱情、曝光與突破。',
    action: [
      '本週一定公開完成一個行動，不再只停留在想法裡。',
      '每天選一件最重要的事先做二十分鐘，讓火元素直接啟動。',
      '主動表達一次需求或想法，讓別人清楚知道你的方向。',
    ],
    affirmation: [
      '我一定會開始行動，行動一定會讓局面產生改變。',
      '我一定能把猶豫轉成突破，讓自己的能量被看見。',
      '我一定敢說、敢做、敢推進，新的結果一定會出現。',
    ],
    reason: '目前最需要補強的是行動力與表達力，火元素補上後，停滯感一定會被推開。',
    colors: [
      { colorName: '赤焰紅', hex: '#8B1E2D', usage: ['手機桌布', '重點標籤', '手鍊主色'] },
      { colorName: '曜石紅', hex: '#B3261E', usage: ['穿搭點綴', '工作提醒', '社群封面'] },
      { colorName: '暖橘火', hex: '#C65A1E', usage: ['運動配件', '行動清單', '桌面小物'] },
    ],
  },
  WIND: {
    label: '風元素',
    shortLabel: '風',
    theme: '溝通變通',
    summary: '風元素代表溝通、學習、變通、創意與資訊流動。',
    action: [
      '本週一定學一個新方法，讓原本卡住的事有新的入口。',
      '把複雜想法寫成三句話，練習讓別人一聽就懂。',
      '主動更新一次溝通方式，用更輕盈的節奏處理問題。',
    ],
    affirmation: [
      '我一定可以換一種說法，讓事情開始流動並產生改變。',
      '我一定能學得更快、轉得更順，也一定能找到新路。',
      '我一定會用清楚的表達，讓機會更容易靠近。',
    ],
    reason: '目前最需要補強的是溝通與變通，風元素補上後，卡住的資訊與人際一定會重新流動。',
    colors: [
      { colorName: '松葉綠', hex: '#1F6B45', usage: ['手機桌布', '學習筆記', '手鍊點綴'] },
      { colorName: '青風綠', hex: '#168A78', usage: ['簡報配色', '聊天背景', '桌面小物'] },
      { colorName: '霧森林', hex: '#2F6F4E', usage: ['穿搭配件', '閱讀清單', '工作標籤'] },
    ],
  },
  SPACE: {
    label: '空元素',
    shortLabel: '空',
    theme: '視野整理',
    summary: '空元素代表視野、格局、留白、直覺與人生方向。',
    action: [
      '本週一定空出一段時間檢查方向，刪掉一件不再重要的事。',
      '每天保留五分鐘安靜思考，讓真正重要的答案浮出來。',
      '重新排列優先順序，先做最能改變未來走向的那一件事。',
    ],
    affirmation: [
      '我一定能看見更大的方向，也一定能做出更清楚的選擇。',
      '我一定會把不必要的雜訊放下，讓真正重要的事留下。',
      '我一定能整理視野，讓人生的下一步更清楚。',
    ],
    reason: '目前最需要補強的是視野與取捨，空元素補上後，方向感與判斷一定會更清楚。',
    colors: [
      { colorName: '月霧銀', hex: '#D9E2EC', usage: ['手機桌布', '靜心角落', '手鍊亮點'] },
      { colorName: '星灰藍', hex: '#8E99A8', usage: ['筆記封面', '穿搭配件', '工作桌面'] },
      { colorName: '晨光白', hex: '#C7CED8', usage: ['行事曆', '房間小物', '冥想提示'] },
    ],
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
  const known = new Set(GROWTH_MODULES.map((item) => item.id));
  const result = Array.from(new Set((input ?? []).filter((item): item is GrowthModuleId => known.has(item))));
  return result.sort((a, b) => (MODULE_INDEX.get(a) ?? 0) - (MODULE_INDEX.get(b) ?? 0));
}

function moduleElementScore(modules: GrowthModuleId[]) {
  const score = Object.fromEntries(ELEMENT_ORDER.map((element) => [element, 0])) as Record<GrowthElement, number>;
  modules.forEach((moduleId) => {
    const meta = MODULE_BY_ID.get(moduleId);
    if (!meta) return;
    score[meta.defaultElement] += 2;
  });
  if (modules.includes('bazi') && modules.includes('number')) score['FIRE'] += 1;
  if (modules.includes('soul_match') && modules.includes('nameology')) score['WATER'] += 1;
  if (modules.includes('ziwei') && modules.includes('music')) score['SPACE'] += 1;
  return score;
}

function inferPrimaryElement(modules: GrowthModuleId[], seed: string, explicit?: GrowthElement | null) {
  if (explicit) return explicit;
  if (modules.length === 0) return pick(ELEMENT_ORDER, seed, 'empty-primary');
  const score = moduleElementScore(modules);
  const sorted = ELEMENT_ORDER
    .map((element) => ({ element, value: score[element], tie: Number.parseInt(hashText(`${seed}:${element}`).slice(0, 4), 16) }))
    .sort((a, b) => b.value - a.value || a.tie - b.tie);
  return sorted[0].element;
}

function inferSecondaryElement(primary: GrowthElement, modules: GrowthModuleId[], seed: string, explicit?: GrowthElement | null) {
  if (explicit && explicit !== primary) return explicit;
  const score = moduleElementScore(modules);
  const sorted = ELEMENT_ORDER
    .filter((element) => element !== primary)
    .map((element) => ({ element, value: score[element], tie: Number.parseInt(hashText(`${seed}:secondary:${element}`).slice(0, 4), 16) }))
    .sort((a, b) => b.value - a.value || a.tie - b.tie);
  return sorted[0]?.element ?? pick(ELEMENT_ORDER.filter((element) => element !== primary), seed, 'secondary');
}

function buildProgressMessage(completed: number) {
  if (completed === 0) return '目前尚未完成分析。先完成任一張卡片，AI 個人成長中心就會開始建立你的專屬方向。';
  if (completed >= 6) return '六張卡片已全部完成，系統已進入完整交叉整理狀態，本週行動與每月能量色會依你的資料固定更新。';
  if (completed >= 3) return `已完成 ${completed}/6 張卡片，系統已具備交叉整理基礎。再補齊剩下卡片，個人成長方向一定會更精準。`;
  return `已完成 ${completed}/6 張卡片，系統已開始建立個人輪廓。建議再完成下一張卡片，讓資料更完整。`;
}

export function buildGrowthCenter(input: GrowthCenterInput): GrowthCenterResult {
  const now = input.now ?? new Date();
  const completedModules = normalizeModules(input.completedModules);
  const missingModules = GROWTH_MODULES.map((item) => item.id).filter((id) => !completedModules.includes(id));
  const identity = input.userId || input.anonymousProfileId || 'anonymous';
  const profileId = hashText(identity).slice(0, 16);
  const analysisHash = input.analysisHash || hashText(completedModules.join('|') || 'empty').slice(0, 16);
  const wk = weekKey(now);
  const mk = monthKey(now);
  const seed = hashText([identity, wk, mk, completedModules.join(','), analysisHash, 'growth_center_v1'].join('|'));
  const primaryElement = inferPrimaryElement(completedModules, seed, input.primaryElement);
  const secondaryElement = inferSecondaryElement(primaryElement, completedModules, seed, input.secondaryElement);
  const avoidElement = input.avoidElement ?? null;
  const themeData = ELEMENT_THEME[primaryElement];
  const secondaryTheme = ELEMENT_THEME[secondaryElement];
  const color = pick(themeData.colors, seed, 'monthly-color');
  const completed = completedModules.length;
  const nextModule = GROWTH_MODULES.find((item) => !completedModules.includes(item.id)) ?? null;
  const unlockLevel = completed === 0 ? 'empty' : completed >= 6 ? 'complete' : completed >= 3 ? 'cross_module' : 'basic';

  const weeklyReport = {
    weekKey: wk,
    coreTheme: themeData.theme,
    primaryAction: pick(themeData.action, seed, 'weekly-action'),
    affirmation: pick(themeData.affirmation, seed, 'weekly-affirmation'),
    evidence: completedModules.map((moduleId) => MODULE_BY_ID.get(moduleId)?.evidence ?? `${moduleId} 已完成。`),
    nextUpdateAt: nextMondayTaipei(now),
  };

  const monthlyEnergyColor = {
    monthKey: mk,
    element: primaryElement,
    colorName: color.colorName,
    hex: color.hex,
    reason: themeData.reason,
    usage: color.usage,
    message: `本月主色是 ${color.colorName}，對應${themeData.label}。請把它用在手機桌布、手鍊搭配或每日提醒，讓${themeData.theme}一定被看見、被執行。`,
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
        message: buildProgressMessage(completed),
      },
      weeklyReport,
      monthlyEnergyColor,
      fiveElement: {
        primaryElement,
        secondaryElement,
        avoidElement,
        confidence: completed >= 3 ? 'high' : completed >= 1 ? 'medium' : 'low',
        summary: completed === 0
          ? '目前資料不足，系統會先等待你完成第一張分析卡片，再判定本週最需要補強的五元素。'
          : `本次統整判定：第一補強一定是${themeData.label}，第二輔助是${secondaryTheme.label}。${themeData.summary}補強後，${themeData.theme}一定會成為本週最重要的改變入口。`,
      },
      nextStep: {
        moduleId: nextModule?.id ?? null,
        title: nextModule ? `下一步完成：${nextModule.title}` : '六張卡片已完成，請回到個人成長中心查看本週行動。',
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
  const known = new Set(GROWTH_MODULES.map((item) => item.id));
  return value.split(',').map((item) => item.trim()).filter((item): item is GrowthModuleId => known.has(item as GrowthModuleId));
}
