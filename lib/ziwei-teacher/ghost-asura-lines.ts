/**
 * 2026-10-23 ghost-asura：鬼魅老師十二宮解盤改為「阿修羅做法」——後端決定性選句，不呼叫 AI。
 * 選句規則：取本宮實際十四主星，逐顆查 GHOST_PALACE_LINES[宮][星]；
 * 本宮無主星時依古法借對宮主星（borrowedFromOpposite=true），仍查本宮條文。
 * 查無古籍條文的星回傳 sourced:false，前端只顯示「此組合古籍暫無條文」，不補任何文字。
 */
import { GHOST_PALACE_LINES } from './ghost-palace-lines';
import type { PalaceAnalysisContext } from './types';

export interface GhostAsuraLine {
  star: string;
  sourced: boolean;
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
  /** NO_MAJOR_STAR：本宮與對宮都無十四主星，無可選條文。 */
  status: 'OK' | 'NO_MAJOR_STAR';
  lines: GhostAsuraLine[];
}

export function selectGhostAsuraLines(context: PalaceAnalysisContext): GhostAsuraReading {
  const palace = context.selectedPalace;
  const own = palace.majorStars.map((s) => s.name);
  const borrowed = own.length === 0;
  const stars = borrowed ? context.threeHarmony.opposite.majorStars.map((s) => s.name) : own;
  const table = GHOST_PALACE_LINES[palace.palaceId] ?? {};
  const lines: GhostAsuraLine[] = [...new Set(stars)].map((star) => {
    const entry = table[star];
    if (!entry || !entry.sourced || !entry.lines?.length) {
      return { star, sourced: false, lines: [], source: null, sourceLink: null, original: null };
    }
    return { star, sourced: true, lines: entry.lines, source: entry.source ?? null, sourceLink: entry.sourceLink ?? null, original: entry.original ?? null };
  });
  return {
    palaceId: palace.palaceId,
    palaceName: palace.palaceName,
    borrowedFromOpposite: borrowed && stars.length > 0,
    oppositePalaceName: borrowed ? context.threeHarmony.opposite.palaceName : null,
    status: stars.length === 0 ? 'NO_MAJOR_STAR' : 'OK',
    lines,
  };
}
