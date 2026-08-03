'use client';

export type AnalysisIdentityTarget = 'self' | 'guest';

export const IDENTITY_TARGET_STORAGE_KEY = 'tdh_analysis_identity_target_v1';
export const IDENTITY_TARGET_UPDATED_EVENT = 'tdh-identity-target-updated';

export const IDENTITY_TARGET_LABEL: Record<AnalysisIdentityTarget, string> = {
  self: '我自己',
  guest: '親朋好友',
};

let memoryIdentityTarget: AnalysisIdentityTarget | null = null;

function normalizeIdentityTarget(value: unknown): AnalysisIdentityTarget | null {
  return value === 'self' || value === 'guest' ? value : null;
}

export function getAnalysisIdentityTarget(): AnalysisIdentityTarget | null {
  if (typeof window === 'undefined') return memoryIdentityTarget;
  try {
    const value = normalizeIdentityTarget(window.localStorage.getItem(IDENTITY_TARGET_STORAGE_KEY));
    if (value) memoryIdentityTarget = value;
    return value ?? memoryIdentityTarget;
  } catch {
    return memoryIdentityTarget;
  }
}

export function setAnalysisIdentityTarget(target: AnalysisIdentityTarget) {
  memoryIdentityTarget = target;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IDENTITY_TARGET_STORAGE_KEY, target);
  } catch {
    // LINE and other in-app browsers may block storage; keep this page session alive in memory.
  }

  window.dispatchEvent(new CustomEvent(IDENTITY_TARGET_UPDATED_EVENT, {
    detail: { target },
  }));
}

export function isMemberGrowthTarget() {
  return getAnalysisIdentityTarget() === 'self';
}

export function getIdentityRequiredMessage() {
  return '請先選擇本次分析對象：我自己或親朋好友。';
}