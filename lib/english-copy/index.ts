/**
 * English display-only dictionary, merged. Keys are byte-identical Traditional Chinese source text.
 * One file per page under ./pages. A later file wins on duplicate keys, so keep wording consistent
 * (see the conventions at the top of ./pages/numerology.ts).
 * The display layer looks text up after trimming outer whitespace, so every key here is also stored
 * trimmed. When a key had outer spaces, the same side is trimmed from its value too, because the
 * layer puts the original spaces back around the translation.
 * Display only: never use a translation as calculation input.
 */
import { enNumerologyCopy } from './pages/numerology';
import { enSharedCopy } from './pages/shared';
import { enTarotCopy } from './pages/tarot';
import { enTarotCardsCopy } from './pages/tarot-cards';
import { enBaziCopy } from './pages/bazi';
import { enGrowthCenterCopy } from './pages/growth-center';
import { enNameologyCopy } from './pages/nameology';
import { enZodiacCopy } from './pages/zodiac';
import { enStarBeastsCopy } from './pages/star-beasts';
import { enMusicCopy } from './pages/music';
import { enRedLuanCopy } from './pages/red-luan-heartbeat';
import { enResultCopy } from './pages/result';
import { enMisc1Copy } from './pages/misc-1';
import { enMisc2Copy } from './pages/misc-2';
import { enMisc3Copy } from './pages/misc-3';
import { enBeastGame1Copy } from './pages/beast-game-1';
import { enBeastGame2Copy } from './pages/beast-game-2';
import { enInsight1Copy } from './pages/insight-1';
import { enInsight2Copy } from './pages/insight-2';
import { enInsight3Copy } from './pages/insight-3';
import { enInsight4Copy } from './pages/insight-4';
import { enLeftoversCopy } from './pages/leftovers';

const merged: Record<string, string> = {
  ...enSharedCopy,
  ...enNumerologyCopy,
  ...enTarotCopy,
  ...enTarotCardsCopy,
  ...enBaziCopy,
  ...enGrowthCenterCopy,
  ...enNameologyCopy,
  ...enZodiacCopy,
  ...enStarBeastsCopy,
  ...enMusicCopy,
  ...enRedLuanCopy,
  ...enResultCopy,
  ...enMisc1Copy,
  ...enMisc2Copy,
  ...enMisc3Copy,
  ...enBeastGame1Copy,
  ...enBeastGame2Copy,
  ...enInsight1Copy,
  ...enInsight2Copy,
  ...enInsight3Copy,
  ...enInsight4Copy,
  ...enLeftoversCopy,
};

function withTrimmedKeys(source: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...source };
  for (const [zh, en] of Object.entries(source)) {
    const key = zh.trim();
    if (key === zh || key === '' || key in source) continue;
    let value = en;
    if (/^\s/.test(zh)) value = value.trimStart();
    if (/\s$/.test(zh)) value = value.trimEnd();
    out[key] = value;
  }
  return out;
}

export const englishPageCopy: Record<string, string> = withTrimmedKeys(merged);
export { englishPatterns } from './patterns';
