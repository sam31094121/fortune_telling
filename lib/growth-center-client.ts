'use client';

import type { GrowthElement, GrowthModuleId } from './growth-center-engine';
import { isMemberGrowthTarget } from './identity-split-client';

const MODULE_STORAGE_KEY = 'tdh_growth_completed_modules_v1';
const PROFILE_STORAGE_KEY = 'tdh_growth_profile_id_v1';
const ELEMENT_STORAGE_KEY = 'tdh_growth_elements_v1';

const MODULES = new Set<GrowthModuleId>(['nameology', 'ziwei', 'number', 'soul_match', 'music', 'bazi', 'zodiac']);

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Some in-app browsers restrict localStorage. Growth Center still degrades safely.
  }
}

export function getAnonymousProfileId() {
  if (typeof window === 'undefined') return 'anonymous';
  try {
    const existing = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (existing) return existing;
    const next = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(PROFILE_STORAGE_KEY, next);
    return next;
  } catch {
    return 'anonymous';
  }
}

export function getCompletedGrowthModules() {
  const raw = readJson<string[]>(MODULE_STORAGE_KEY, []);
  return Array.from(new Set(raw.filter((item): item is GrowthModuleId => MODULES.has(item as GrowthModuleId))));
}

export function markGrowthModuleCompleted(moduleId: GrowthModuleId, element?: GrowthElement | null) {
  if (!MODULES.has(moduleId)) return false;
  if (!isMemberGrowthTarget()) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tdh-growth-progress-skipped', {
        detail: { moduleId, reason: 'guest_analysis' },
      }));
    }
    return false;
  }
  const modules = getCompletedGrowthModules();
  const wasCompleted = modules.includes(moduleId);
  if (!wasCompleted) modules.push(moduleId);
  writeJson(MODULE_STORAGE_KEY, modules);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tdh-growth-progress-updated', {
      detail: { moduleId, completedModules: modules, completed: modules.length, newlyCompleted: !wasCompleted },
    }));
  }
  if (element) {
    const elements = readJson<Record<string, GrowthElement>>(ELEMENT_STORAGE_KEY, {});
    elements[moduleId] = element;
    writeJson(ELEMENT_STORAGE_KEY, elements);
  }
  return true;
}

export function getGrowthElements() {
  return readJson<Record<string, GrowthElement>>(ELEMENT_STORAGE_KEY, {});
}

export function buildGrowthCenterQuery() {
  const modules = getCompletedGrowthModules();
  const elements = getGrowthElements();
  const params = new URLSearchParams();
  params.set('anonymousProfileId', getAnonymousProfileId());
  params.set('completedModules', modules.join(','));
  const firstElement = modules.map((moduleId) => elements[moduleId]).find(Boolean);
  if (firstElement) params.set('primaryElement', firstElement);
  params.set('analysisHash', modules.map((moduleId) => `${moduleId}:${elements[moduleId] ?? 'none'}`).join('|'));
  return params;
}
