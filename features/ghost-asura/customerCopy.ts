/** 阿修羅專用文字映射。只處理呈現，不改原始名称、判定、柱位或來源。 */
import { APPROVED_BY_ORIGINAL_NAME } from './registry';
import type { GhostAsuraTranslatedItem } from './types';

/**
 * 成語保護：原名（血刃、羊刃…）會在整段文字裡被換成印記名，但成語裡剛好含有原名時，換了就變錯字。
 * 例：「兵不血刃」曾被換成「兵不赤血刃印」（2026-10-15 在客戶頁發現）。
 * 這裡列的成語整段原樣保留，不做名稱替換。新增成語時加在這裡，test:ghost-asura-customer-output 會檢查。
 */
export const PROTECTED_IDIOMS: readonly string[] = ['兵不血刃'];
const IDIOM_PATTERN = new RegExp(`(${PROTECTED_IDIOMS.join('|')})`, 'g');

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
  const swap = (segment: string) => segment.replace(pattern, value =>
    displayNames.has(value) ? value : names.get(value) ?? value);
  // split 帶括號：奇數位是被保護的成語，原樣放回；偶數位才做名稱替換。
  return (text: string) => text.split(IDIOM_PATTERN).map((segment, index) => (index % 2 === 1 ? segment : swap(segment))).join('');
}
