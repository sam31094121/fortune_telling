/**
 * 日本語表示専用辞書（統合版）。キーは画面上の繁体字中国語原文と一字一句同じです。
 * 1ページ1ファイル（./pages）。重複するキーは後ろのファイルが優先されます。
 * 表示翻訳層は前後の空白を除いた文字列で辞書を引くため、空白つきのキーも空白なしで登録します。
 * 表示専用：訳文を計算の入力に使わないでください。
 */
import { jaNumerologyCopy } from './pages/numerology';
import { jaSharedCopy } from './pages/shared';
import { jaTarotCopy } from './pages/tarot';
import { jaTarotCardsCopy } from './pages/tarot-cards';
import { jaBaziCopy } from './pages/bazi';
import { jaGrowthCenterCopy } from './pages/growth-center';
import { jaNameologyCopy } from './pages/nameology';
import { jaZodiacCopy } from './pages/zodiac';
import { jaStarBeastsCopy } from './pages/star-beasts';
import { jaMusicCopy } from './pages/music';
import { jaRedLuanHeartbeatCopy } from './pages/red-luan-heartbeat';
import { jaResultCopy } from './pages/result';
import { jaMisc1Copy } from './pages/misc-1';
import { jaMisc2Copy } from './pages/misc-2';
import { jaMisc3Copy } from './pages/misc-3';
import { jaBeastGame1Copy } from './pages/beast-game-1';
import { jaBeastGame2Copy } from './pages/beast-game-2';
import { jaInsight1Copy } from './pages/insight-1';
import { jaInsight2Copy } from './pages/insight-2';
import { jaInsight3Copy } from './pages/insight-3';
import { jaInsight4Copy } from './pages/insight-4';
import { jaLeftoversCopy } from './pages/leftovers';
import { jaGeneratedCopy } from './pages/generated';

const merged: Record<string, string> = {
  ...jaNumerologyCopy,
  ...jaSharedCopy,
  ...jaTarotCopy,
  ...jaTarotCardsCopy,
  ...jaBaziCopy,
  ...jaGrowthCenterCopy,
  ...jaNameologyCopy,
  ...jaZodiacCopy,
  ...jaStarBeastsCopy,
  ...jaMusicCopy,
  ...jaRedLuanHeartbeatCopy,
  ...jaResultCopy,
  ...jaMisc1Copy,
  ...jaMisc2Copy,
  ...jaMisc3Copy,
  ...jaBeastGame1Copy,
  ...jaBeastGame2Copy,
  ...jaInsight1Copy,
  ...jaInsight2Copy,
  ...jaInsight3Copy,
  ...jaInsight4Copy,
  ...jaLeftoversCopy,
  ...jaGeneratedCopy,
};

function withTrimmedKeys(source: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...source };
  for (const [zh, ja] of Object.entries(source)) {
    const key = zh.trim();
    if (key === zh || key === '' || key in source) continue;
    let value = ja;
    if (/^s/.test(zh)) value = value.trimStart();
    if (/s$/.test(zh)) value = value.trimEnd();
    out[key] = value;
  }
  return out;
}

export const japanesePageCopy: Record<string, string> = withTrimmedKeys(merged);
export { japanesePatterns } from './patterns';
