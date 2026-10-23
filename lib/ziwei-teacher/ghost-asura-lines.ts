/**
 * 2026-10-23 ghost-asura：鬼魅老師十二宮解盤改為「阿修羅做法」——後端決定性選句，不呼叫 AI。
 * 2026-10-23 ai-to-asura：只回傳有古籍條文的星；查無條文的星不產生空白提示格。
 * 選句規則：取本宮實際十四主星，逐顆查 GHOST_PALACE_LINES[宮][星]；
 * 本宮無主星時依古法借對宮主星（borrowedFromOpposite=true），仍查本宮條文。
 * 整宮一句條文都沒有時回傳明確狀態（NO_MAJOR_STAR / NO_SOURCED_LINES），前端只顯示一則宮位提示，不補任何文字。
 */
import { GHOST_PALACE_LINES } from './ghost-palace-lines';
import type { PalaceAnalysisContext } from './types';

export interface GhostAsuraLine {
  star: string;
  sourced: true;
  lines: string[];
  source: string | null;
  sourceLink: string | null;
  original: string | null;
}

export interface GhostAsuraReading {
  palaceId: PalaceAnalysisContext['selectedPalace']['palaceId'];
  palaceName: string;
  borrowedFromOpposite: boolean;
  oppositePalaceName: string | null;
  /** NO_MAJOR_STAR：本宮與對宮都無十四主星；NO_SOURCED_LINES：有主星但古籍皆無此宮星條文。 */
  status: 'OK' | 'NO_MAJOR_STAR' | 'NO_SOURCED_LINES';
  /** 本宮有星但查無條文、因此未顯示的主星（只供除錯與報告，不顯示）。 */
  omittedStars: string[];
  lines: GhostAsuraLine[];
}

export function selectGhostAsuraLines(context: PalaceAnalysisContext): GhostAsuraReading {
  const palace = context.selectedPalace;
  const own = palace.majorStars.map((s) => s.name);
  const borrowed = own.length === 0;
  const stars = [...new Set(borrowed ? context.threeHarmony.opposite.majorStars.map((s) => s.name) : own)];
  const table = GHOST_PALACE_LINES[palace.palaceId] ?? {};
  const lines: GhostAsuraLine[] = [];
  const omittedStars: string[] = [];
  for (const star of stars) {
    const entry = table[star];
    if (!entry || !entry.sourced || !entry.lines?.length) { omittedStars.push(star); continue; }
    lines.push({ star, sourced: true, lines: entry.lines, source: entry.source ?? null, sourceLink: entry.sourceLink ?? null, original: entry.original ?? null });
  }
  return {
    palaceId: palace.palaceId,
    palaceName: palace.palaceName,
    borrowedFromOpposite: borrowed && stars.length > 0,
    oppositePalaceName: borrowed ? context.threeHarmony.opposite.palaceName : null,
    status: stars.length === 0 ? 'NO_MAJOR_STAR' : lines.length === 0 ? 'NO_SOURCED_LINES' : 'OK',
    omittedStars,
    lines,
  };
}
