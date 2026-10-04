/**
 * 鬼魅阿修羅 — 穩定延伸命名
 *
 * 未登錄但後端已驗證的項：依技能「延伸語系」＋ stableHash 產生一致名稱。
 * 禁止 Math.random；同輸入永遠同輸出。
 */

import {
  ASURA_FAMILIES,
  classifyAsuraFamily,
  stableHash,
} from './language';

export const GHOST_ASURA_EXTENSION_VERSION = 'GHOST_ASURA_EXT_2026_10_04_V2';

const FALLBACK_GLYPHS = ['印', '契', '魂', '痕', '門', '界', '域', '影'] as const;

function sanitizeSeedKey(originalName: string, ruleId?: string): string {
  const trimmed = (originalName || '').trim();
  if (trimmed && trimmed !== '未知神煞' && trimmed !== '—' && trimmed !== '-') {
    return trimmed;
  }
  if (ruleId && ruleId.trim()) return `rule:${ruleId.trim()}`;
  return 'rule:unknown';
}

/**
 * 以語系家族＋穩定 hash 產生阿修羅名；必要時加 hash 字元避開碰撞。
 */
export function extendAsuraName(input: {
  originalName: string;
  ruleId?: string;
  namingVersion?: string;
  usedNames?: Set<string>;
}): { displayName: string; family: string } {
  if (input.ruleId?.trim()) {
    // New IDs get a stable provisional label, never a borrowed approved meaning.
    // Two independent hashes reduce collisions; the guard still rejects collisions.
    // Do not use usedNames/order or editable originalName to determine identity.
    const key = input.ruleId.trim();
    const token = stableHash(`${GHOST_ASURA_EXTENSION_VERSION}|${key}`).toString(36)
      + stableHash(`${key}|${GHOST_ASURA_EXTENSION_VERSION}`).toString(36);
    const displayName = `玄域之印·${token}`;
    input.usedNames?.add(displayName);
    return { displayName, family: 'UNCLASSIFIED' };
  }
  const seedKey = sanitizeSeedKey(input.originalName, input.ruleId);
  const family = classifyAsuraFamily(seedKey);
  const grammar = ASURA_FAMILIES[family];
  const version = input.namingVersion ?? GHOST_ASURA_EXTENSION_VERSION;
  const seed = stableHash(`${seedKey}|${version}|${input.ruleId ?? ''}`);

  const prefix = grammar.prefixes[seed % grammar.prefixes.length];
  const suffix = grammar.suffixes[seed % grammar.suffixes.length];
  let displayName = `${prefix}${suffix}`;

  if (input.usedNames) {
    let offset = 0;
    while (input.usedNames.has(displayName)) {
      offset += 1;
      const nextSeed = seed + offset;
      const nextPrefix = grammar.prefixes[nextSeed % grammar.prefixes.length];
      const nextSuffix = grammar.suffixes[nextSeed % grammar.suffixes.length];
      const glyph = FALLBACK_GLYPHS[nextSeed % FALLBACK_GLYPHS.length];
      // 前 家族組合用完後，加穩定尾碼字元避免碰撞／拋錯
      displayName =
        offset <= grammar.prefixes.length * grammar.suffixes.length
          ? `${nextPrefix}${nextSuffix}`
          : `${nextPrefix}${glyph}${nextSuffix}`;
      if (offset > 500) {
        displayName = `${nextPrefix}${glyph}${String(nextSeed % 97)}`;
        break;
      }
    }
    input.usedNames.add(displayName);
  }

  return { displayName, family };
}
