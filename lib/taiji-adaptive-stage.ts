'use client';

import { getCompletedGrowthModules, getGrowthElements } from './growth-center-client';
import type { GrowthElement } from './growth-center-engine';

export type TaijiEvolutionStage = 'idle' | 'taiji' | 'liangyi' | 'sixiang' | 'bagua';

export type TaijiAdaptiveDecision = {
  stage: TaijiEvolutionStage;
  reason: string;
  highlightElement: GrowthElement | null;
};

const FIRST_VISIT_KEY = 'tdh_taiji_first_visit_v1';
const ELEMENT_ORDER: GrowthElement[] = ['EARTH', 'WATER', 'FIRE', 'AIR', 'SPACE'];

function hasVisitedBefore(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const seen = window.localStorage.getItem(FIRST_VISIT_KEY);
    if (seen) return true;
    window.localStorage.setItem(FIRST_VISIT_KEY, String(Date.now()));
    return false;
  } catch {
    return true;
  }
}

function findWeakestElement(elements: Record<string, GrowthElement>): GrowthElement | null {
  const values = Object.values(elements);
  if (values.length === 0) return null;
  const counts = Object.fromEntries(ELEMENT_ORDER.map((element) => [element, 0])) as Record<GrowthElement, number>;
  values.forEach((element) => { counts[element] += 1; });
  return ELEMENT_ORDER.reduce((weakest, element) => (counts[element] < counts[weakest] ? element : weakest), ELEMENT_ORDER[0]);
}

/**
 * 易經依會員今天的成長狀態，決定首頁太極今天從哪個階段開始演化：
 * 首次造訪固定從太極開始；完成的分析越多，起始階段越後面；
 * 已完成模組的五元素分布，決定要優先點亮哪個元素（缺哪個元素，哪個先亮）。
 */
export function decideTaijiEntryStage(): TaijiAdaptiveDecision {
  const isFirstVisit = !hasVisitedBefore();
  const completed = getCompletedGrowthModules();
  const elements = getGrowthElements();
  const highlightElement = findWeakestElement(elements);

  if (isFirstVisit || completed.length === 0) {
    return { stage: 'idle', reason: '首次造訪，從太極開始。', highlightElement };
  }
  if (completed.length >= 6) {
    return { stage: 'bagua', reason: '最近完成很多分析任務，直接展開八卦。', highlightElement };
  }
  if (completed.length >= 3) {
    return { stage: 'sixiang', reason: '已完成多項分析，四象已展開。', highlightElement };
  }
  return { stage: 'liangyi', reason: '已完成第一項分析，陰陽開始分化。', highlightElement };
}
