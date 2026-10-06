/**
 * 鬼魅阿修羅 — 五元素寶珠系統
 *
 * 五行：木火土金水
 * 顏色：綠紅黃金藍
 * 功能：用戶完成5項任務，寶珠逐個亮起
 */

export interface ElementTask {
  id: string;
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  name: string;
  description: string;
  requirement: string;
  completed: boolean;
  unlockedAt?: number;
}

export interface ElementProgress {
  wood: boolean;
  fire: boolean;
  earth: boolean;
  metal: boolean;
  water: boolean;
  totalCompleted: number;
  allUnlocked: boolean;
  unlockedAt?: number;
}

export interface ElementColor {
  element: string;
  hex: string;
  rgb: string;
  glow: string;
  name: string;
  nameZh: string;
}

export const ELEMENT_COLORS: Record<string, ElementColor> = {
  wood: {
    element: 'wood',
    hex: '#4CAF50',
    rgb: 'rgb(76, 175, 80)',
    glow: 'rgba(76, 175, 80, 0.6)',
    name: 'Wood',
    nameZh: '木'
  },
  fire: {
    element: 'fire',
    hex: '#FF6B6B',
    rgb: 'rgb(255, 107, 107)',
    glow: 'rgba(255, 107, 107, 0.6)',
    name: 'Fire',
    nameZh: '火'
  },
  earth: {
    element: 'earth',
    hex: '#FFD700',
    rgb: 'rgb(255, 215, 0)',
    glow: 'rgba(255, 215, 0, 0.6)',
    name: 'Earth',
    nameZh: '土'
  },
  metal: {
    element: 'metal',
    hex: '#E8E8E8',
    rgb: 'rgb(232, 232, 232)',
    glow: 'rgba(232, 232, 232, 0.6)',
    name: 'Metal',
    nameZh: '金'
  },
  water: {
    element: 'water',
    hex: '#2196F3',
    rgb: 'rgb(33, 150, 243)',
    glow: 'rgba(33, 150, 243, 0.6)',
    name: 'Water',
    nameZh: '水'
  }
};

export const DEFAULT_ELEMENT_TASKS: ElementTask[] = [
  {
    id: 'explore-impressions',
    element: 'wood',
    name: '探索印記',
    description: '探索阿修羅核心印記',
    requirement: '探索3個以上不同的印記',
    completed: false
  },
  {
    id: 'deep-understanding',
    element: 'fire',
    name: '深入理解',
    description: '深入了解印記含義',
    requirement: '查看任意印記的完整詳情',
    completed: false
  },
  {
    id: 'interaction-milestone',
    element: 'earth',
    name: '互動里程碑',
    description: '達到互動成就',
    requirement: '累積10次互動（點擊+懸停）',
    completed: false
  },
  {
    id: 'preference-established',
    element: 'metal',
    name: '偏好確立',
    description: '形成個人偏好',
    requirement: '對同一印記互動5次以上',
    completed: false
  },
  {
    id: 'mastery-unlocked',
    element: 'water',
    name: '掌握解鎖',
    description: '掌握全面理解',
    requirement: '完成以上所有條件',
    completed: false
  }
];

/**
 * 初始化元素進度
 */
export function initializeElementProgress(): ElementProgress {
  return {
    wood: false,
    fire: false,
    earth: false,
    metal: false,
    water: false,
    totalCompleted: 0,
    allUnlocked: false
  };
}

/**
 * 檢查任務完成狀態
 */
export function checkTaskCompletion(
  taskId: string,
  stats: {
    uniqueInteractedCount: number;
    totalInteractions: number;
    maxImpressionInteractions: number;
    hasViewedDetail: boolean;
  }
): boolean {
  switch (taskId) {
    case 'explore-impressions':
      return stats.uniqueInteractedCount >= 3;

    case 'deep-understanding':
      return stats.hasViewedDetail;

    case 'interaction-milestone':
      return stats.totalInteractions >= 10;

    case 'preference-established':
      return stats.maxImpressionInteractions >= 5;

    case 'mastery-unlocked':
      // 需要前4個都完成
      return stats.uniqueInteractedCount >= 3 &&
             stats.hasViewedDetail &&
             stats.totalInteractions >= 10 &&
             stats.maxImpressionInteractions >= 5;

    default:
      return false;
  }
}

/**
 * 更新元素進度
 */
export function updateElementProgress(
  tasks: ElementTask[]
): ElementProgress {
  const progress = initializeElementProgress();
  let completedCount = 0;

  tasks.forEach(task => {
    if (task.completed) {
      (progress as any)[task.element] = true;
      completedCount++;

      if (!task.unlockedAt) {
        task.unlockedAt = Date.now();
      }
    }
  });

  progress.totalCompleted = completedCount;
  progress.allUnlocked = completedCount === 5;

  return progress;
}

/**
 * 獲取元素解鎖序列
 * 按解鎖時間排序
 */
export function getUnlockSequence(tasks: ElementTask[]): ElementTask[] {
  const completedTasks = tasks
    .filter(t => t.completed && t.unlockedAt)
    .sort((a, b) => (a.unlockedAt || 0) - (b.unlockedAt || 0));

  return completedTasks;
}

/**
 * 獲取下一個待完成的任務
 */
export function getNextPendingTask(tasks: ElementTask[]): ElementTask | null {
  return tasks.find(t => !t.completed) || null;
}

/**
 * 計算完成百分比
 */
export function getCompletionPercentage(progress: ElementProgress): number {
  return Math.round((progress.totalCompleted / 5) * 100);
}

/**
 * 獲取元素描述（用於顯示）
 */
export function getElementDescription(element: string): string {
  const descriptions: Record<string, string> = {
    wood: '生長與開始，象徵生命力和新的開始',
    fire: '燃燒與熱情，象徵激情和能量',
    earth: '穩定與承載，象徵基礎和持續',
    metal: '堅硬與純淨，象徵完善和精煉',
    water: '流動與智慧，象徵適應和深度'
  };

  return descriptions[element] || '';
}

/**
 * 獲取全部解鎖時的特殊信息
 */
export function getFullUnlockMessage(): string {
  return '五元素齊聚，阿修羅之力已圓滿！\n您已掌握四柱隱影之全部秘密。';
}

/**
 * 驗證任務狀態一致性
 */
export function validateTaskConsistency(tasks: ElementTask[]): boolean {
  const elements = new Set<string>();

  for (const task of tasks) {
    // 檢查重複元素
    if (elements.has(task.element)) {
      return false;
    }
    elements.add(task.element);

    // 檢查必需字段
    if (!task.id || !task.element || !task.name) {
      return false;
    }
  }

  // 應該有5個元素
  return elements.size === 5;
}

/**
 * 生成寶珠序列動畫參數
 */
export function getOrbAnimationSequence(index: number): {
  delay: number;
  duration: number;
} {
  return {
    delay: index * 100, // 每個寶珠延遲100ms
    duration: 600 // 總動畫時長600ms
  };
}

/**
 * 計算寶珠位置（圓形排列）
 */
export function getOrbPosition(index: number, totalOrbs: number): {
  x: number;
  y: number;
  rotation: number;
} {
  const angle = (index / totalOrbs) * Math.PI * 2 - Math.PI / 2;
  const radius = 120; // 寶珠距離中心的半徑

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    rotation: angle * (180 / Math.PI) + 90
  };
}

/**
 * 獲取寶珠的發光強度
 */
export function getOrbGlowIntensity(completed: boolean): number {
  return completed ? 1 : 0.2;
}

/**
 * 生成完成百分比的文案
 */
export function getProgressMessage(percentage: number): string {
  if (percentage === 0) {
    return '開始您的探索之旅';
  } else if (percentage < 40) {
    return '初步感受阿修羅之力';
  } else if (percentage < 60) {
    return '力量逐漸蘇醒';
  } else if (percentage < 100) {
    return '即將掌握全部秘密';
  } else {
    return '五元素齊聚，圓滿成就';
  }
}
