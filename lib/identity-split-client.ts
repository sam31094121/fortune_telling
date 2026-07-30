'use client';

export type AnalysisIdentityTarget = 'self' | 'guest';

export const IDENTITY_TARGET_STORAGE_KEY = 'tdh_analysis_identity_target_v1';
export const IDENTITY_TARGET_UPDATED_EVENT = 'tdh-identity-target-updated';

export const IDENTITY_TARGET_LABEL: Record<AnalysisIdentityTarget, string> = {
  self: '\u6211\u81ea\u5df1',
  guest: '\u89aa\u670b\u597d\u53cb',
};

export function getAnalysisIdentityTarget(): AnalysisIdentityTarget | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(IDENTITY_TARGET_STORAGE_KEY);
    return value === 'self' || value === 'guest' ? value : null;
  } catch {
    return null;
  }
}

export function setAnalysisIdentityTarget(target: AnalysisIdentityTarget) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IDENTITY_TARGET_STORAGE_KEY, target);
  } catch {
    // Some in-app browsers restrict localStorage. The current page state still works.
  }

  window.dispatchEvent(new CustomEvent(IDENTITY_TARGET_UPDATED_EVENT, {
    detail: { target },
  }));
}

export function isMemberGrowthTarget() {
  return getAnalysisIdentityTarget() === 'self';
}

export function getIdentityRequiredMessage() {
  return '\u8acb\u5148\u9078\u64c7\u672c\u6b21\u5206\u6790\u5c0d\u8c61\uff1a\u6211\u81ea\u5df1\u6216\u89aa\u670b\u597d\u53cb\u3002';
}
