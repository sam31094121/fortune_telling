/**
 * 鬼魅阿修羅 — 修羅斷語（易經卦意，翻成修羅的句式；命宮交給本性卡）
 * ============================================================================
 * 業主定案 2026-10-19：只針對阿修羅這張卡；話術一律用現有素材，不自編、不造假。
 *
 * 本檔沒有任何自撰的命理話術表。每一句的內容都來自既有、可追溯的素材：
 *   斷語  ← 易經引擎已輸出的卦意行動語（data/iching-hexagrams.json 經 lib/iching-engine.ts 取回，
 *           在起卦結果 specialStars.iching.hexagram.advice 內）。
 *   動位  ← 同一段引擎輸出裡的「落在下卦／上卦、關鍵在…」（引擎自己的八卦動作語）。
 *   戰局  ← 阿修羅頁自己算好的欄位（computeGhostAsuraDisplay 的 columns），與頁面清單同一個集合。
 * 這裡只做「句式」轉換：把文言長句切成修羅的短句陳述（阿修羅話術規範：短句、不討好、無廢話），
 * 去掉開頭的轉折連接詞；素材裡含阿修羅禁字的子句（例：「把自己勒死」）整句略過；不增字義、不換主題、不加預測。
 *
 * 八字：只做第一關交叉驗證，不參與文字（業主鎖定，見 ghost-asura-persona.ts 13:29）。
 * 紫微命宮、十四主星、小星（強弱、空宮借對宮）：只由阿修羅「本性」卡走一條證據鏈，本檔不再另寫。
 * 四柱核對沒過或易經未起卦：整段回 null（停在核對關，不拿不完整的盤下結論）。
 *
 * 零命理術語：輸出不含干支、星名、卦名全名、宮位等任何原始資料（測試會擋）。
 * 來源登記 C-SHENSHA-ICHING（本派整理的白話卦意，狀態由來源閘門算，不寫成已通過交叉比對）。
 */
import 'server-only';
import type { DualChartResult } from '@/lib/dual-chart';
import type { AsuraDisplay } from '@/lib/ghost-asura-display-contract';

export const ASURA_VOICE_CONTRACT = 'asura-three-core-voice/v1';

export interface AsuraVoiceLine { label: string; text: string }
export interface AsuraThreeCoreVoice {
  contract: typeof ASURA_VOICE_CONTRACT;
  heading: string;
  lines: AsuraVoiceLine[];
  note: string;
}

/** 測試與稽核用：這段話術依據了哪些事實。不經 API 送出。 */
export interface AsuraVoiceFacts {
  /** 引擎卦意行動語原文（「主題：行動…」） */
  adviceBase: string;
  /** 引擎動位提示：前半局（下卦）或後半局（上卦）；解析不到為 null */
  half: '前半局' | '後半局' | null;
  /** 引擎給的關鍵動作語；解析不到為 null */
  action: string | null;
  awakenedKinds: number;
  focusHeads: string[];
}

/** 阿修羅話術禁字（同 tests/ghost-asura-customer-output.test.mjs）：含禁字的子句整句略過，不改字、不補字。 */
const FORBIDDEN = /必定|一定會|註定|大凶|血光|必然|死/;

/** 文言長句 → 修羅短句：以「：」「，」切開，去掉開頭的轉折連接詞「但」；含禁字的子句整句略過；內容一字不增。 */
export function asuraShortSentences(text: string): string {
  const parts = text.split('：').join('，').split('，').map((p) => p.trim().replace(/^但/, '').trim()).filter((p) => p && !FORBIDDEN.test(p));
  return parts.length ? `${parts.join('。')}。` : '';
}

interface IChingViewLike { state?: string; hexagram?: { advice?: string } }

/** 取事實；任何一層不成立回 null。純讀取，不改任何命盤資料。 */
export function deriveAsuraVoiceFacts(result: DualChartResult, display: Pick<AsuraDisplay, 'columns'>): AsuraVoiceFacts | null {
  const iching = (result as unknown as { specialStars?: { iching?: IChingViewLike } }).specialStars?.iching;
  if (!iching || iching.state !== 'READY') return null;
  const advice = iching.hexagram?.advice;
  if (typeof advice !== 'string' || advice.trim() === '') return null;
  // 引擎輸出格式：「{卦意行動語}（動爻第N爻，落在下卦X／上卦X，關鍵在{動作語}）。」
  const cut = advice.indexOf('（動爻');
  const adviceBase = (cut >= 0 ? advice.slice(0, cut) : advice).trim();
  if (!adviceBase) return null;
  const tail = cut >= 0 ? advice.slice(cut) : '';
  const half = tail.includes('落在下卦') ? '前半局' : tail.includes('落在上卦') ? '後半局' : null;
  const keyPart = tail.split('關鍵在')[1];
  const action = keyPart ? keyPart.split('）')[0].trim() || null : null;

  // 與阿修羅頁同一個集合：直接取頁面欄位；醒著的種類數＝頁面「覺醒 N 種」，力道最重的柱＝印記最多的欄。
  const columns = display.columns ?? [];
  const kinds = new Set(columns.flatMap((col) => col.seals.map((seal) => seal.id)));
  const max = Math.max(0, ...columns.map((col) => col.seals.length));
  const focusHeads = max > 0 ? columns.filter((col) => col.seals.length === max).map((col) => col.heading) : [];
  return { adviceBase, half, action, awakenedKinds: kinds.size, focusHeads };
}

function battleLine(f: AsuraVoiceFacts): string {
  if (f.awakenedKinds === 0 || f.focusHeads.length === 0) return '盤上沒有醒著的印記。路，你自己鋪。';
  return `醒著的印記有 ${f.awakenedKinds} 種，力道壓在${f.focusHeads.join('、')}。`;
}

export function composeAsuraThreeCoreVoice(f: AsuraVoiceFacts, options: { hourAssumed?: boolean } = {}): AsuraThreeCoreVoice {
  const where = f.half && f.action ? `變數落在${f.half}。關鍵在${f.action}。` : f.half ? `變數落在${f.half}。` : '';
  return {
    contract: ASURA_VOICE_CONTRACT,
    heading: '修羅斷語',
    lines: [
      { label: '斷語', text: `${asuraShortSentences(f.adviceBase)}${where}` },
      { label: '戰局', text: battleLine(f) },
    ],
    note: options.hourAssumed ? '出生時刻未說，以夜半起算；斷語只當自我反思，不當預言。' : '斷語是文化象徵與自我反思，不是預言，也不替你做決定。',
  };
}

/** 後端入口：同一條鏈算好的命盤 → 修羅斷語；任一層沒成立回 null。 */
export function buildAsuraThreeCoreVoice(result: DualChartResult, display: Pick<AsuraDisplay, 'columns'>, options: { hourAssumed?: boolean } = {}): AsuraThreeCoreVoice | null {
  const facts = deriveAsuraVoiceFacts(result, display);
  return facts ? composeAsuraThreeCoreVoice(facts, options) : null;
}
