/** 阿修羅專用文字映射。只處理呈現，不改原始名称、判定、柱位或來源。 */
import { APPROVED_BY_ORIGINAL_NAME } from './registry';
import type { GhostAsuraTranslatedItem } from './types';

export function createAsuraCustomerCopy(items: GhostAsuraTranslatedItem[]) {
  const names = new Map(Object.entries(APPROVED_BY_ORIGINAL_NAME)
    .map(([original, entry]) => [original, entry.displayName]));
  for (const item of items) {
    if (item.originalName && item.originalName !== '未知神煞') {
      names.set(item.originalName, item.displayName);
    }
  }
  // 最長詞優先；已有稱號先保護，避免「天德護印」被再次轉譯。
  const displayNames = new Set([...names.values(), ...items.map(item => item.displayName)]);
  const phrases = [...new Set([...names.keys(), ...displayNames])]
    .filter(Boolean).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(phrases.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return (text: string) => text.replace(pattern, value =>
    displayNames.has(value) ? value : names.get(value) ?? value);
}
