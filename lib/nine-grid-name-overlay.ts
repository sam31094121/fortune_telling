/**
 * 九宮格靈動數字 × 姓名五格：本站交叉對照（非古法）
 * 後端運算：五格數值一律來自既有姓名學引擎（lib/nameology-engine.ts 的 buildNameologyAnalysis().grids），這裡不重算筆畫。
 * 只把五格數值的每一位數字（0 不計）放進同號格子，與生日數字並列對照；不改動生日九宮格的任何輸出。
 * 不含主命數、天賦數、八十一靈動數。
 *
 * 來源標記（NINE_GRID_SOURCE_NOTES）：畫面上每個步驟／關鍵數字旁的「來源」小標，點開只顯示這一則。
 * sourceIds 必須在 docs/技能戰鬥檔案/易經/來源登記.json 找得到（tests/nine-grid-name-overlay.test.mjs 檢查）；
 * 沒有出處的步驟 sourceIds 為空、tier 為 'site'，畫面照實標「本站交叉對照（非古法）」。
 */
import type { NineGridStudy } from './nine-grid-numbers';
import { buildPlaybackGuide, type PlaybackGuide } from './nine-grid-playback';

export interface NameGridValue { key: string; label: string; value: number }
export interface NameCharStroke { char: string; strokeCount: number }

export type NineGridSourceKey = 'strokes' | 'grids' | 'split' | 'birthDigits' | 'layout';
export interface NineGridSourceNote {
  key: NineGridSourceKey;
  title: string;
  text: string;
  /** 'registry'：有登記表出處；'site'：本站交叉對照（非古法），沒有出處 */
  tier: 'registry' | 'site';
  /** 登記表 source_id → 畫面顯示的書目標籤（與技能檔 sourceLabels 一字不差） */
  cites: { id: string; label: string; trust: 'A' | 'B' | 'C' | 'D' }[];
}

export const NAME_OVERLAY_LABEL = '本站交叉對照，非古法';
export const NAME_OVERLAY_NOTE = '姓名五格與九宮格是兩套不同系統；這裡只把五格數字的每一位放進同號格子並列對照。';
/** 卡面一句：本卡排法（文字依 九宮格靈動數字.json layout.note／luoshu.layout.note） */
export const NINE_GRID_LAYOUT_LINE = '本卡用生命靈數排法 3-6-9／2-5-8／1-4-7，不是洛書的 4-9-2';

export const NINE_GRID_SITE_ONLY = '— 本站交叉對照（非古法），無古籍或流派出處';
export const NINE_GRID_DROP_HINT = '同號入宮，點格子看是誰給的';

export const NINE_GRID_SOURCE_NOTES: Record<NineGridSourceKey, NineGridSourceNote> = {
  strokes: {
    key: 'strokes', title: '筆畫', tier: 'registry',
    text: '每字筆畫採臺灣 CNS11643 全字庫總筆畫；不是《康熙字典》筆畫，部首變形的字可能差 1～3 畫。',
    cites: [{ id: 'S-CNS11643-OPENDATA', label: '臺灣 CNS11643 全字庫開放資料：每個字的總筆畫', trust: 'A' }],
  },
  grids: {
    key: 'grids', title: '五格', tier: 'registry',
    text: '天格＝姓＋1、人格＝姓＋名首字、地格＝名字相加、外格＝總格－人格＋1、總格＝全名相加。屬熊崎氏五格剖象法的流派約定；只追到書目紀錄，尚未對照原書。',
    cites: [{ id: 'S-KUMAZAKI-NDL-1939', label: '熊崎健翁《最新姓名学：開運の礎》（1939）— 日本國立國會圖書館書目紀錄', trust: 'A' }],
  },
  split: {
    key: 'split', title: '拆成單一數字', tier: 'site',
    text: '把五格數字拆成一位一位、放進同號格子，0 沒有格子不落入。這一步沒有古籍或流派出處，是本站交叉對照（非古法）。',
    cites: [],
  },
  birthDigits: {
    key: 'birthDigits', title: '生日數字', tier: 'registry',
    text: '用西元出生年月日的每一個數字填入九宮格，0 不計。這是華語通行說法的白話改寫，素材為 D 級、未逐條核對。',
    cites: [
      { id: 'S-NINEGRID-MATERIAL-1', label: '業主提供素材一（AI 彙整的華語媒體內容，D 級，未逐條核對）', trust: 'D' },
      { id: 'S-NINEGRID-MATERIAL-2', label: '業主提供素材二（AI 彙整的華語媒體內容，D 級，未逐條核對）', trust: 'D' },
    ],
  },
  layout: {
    key: 'layout', title: '排法', tier: 'registry',
    text: '生命靈數排法由左至右、由下至上填 1 到 9；兩份素材排法不同，這是本站的選擇，不是公認標準（D 級素材）。洛書 4-9-2 則依《數術記遺》「九宮算」條口訣。',
    cites: [
      { id: 'S-NINEGRID-MATERIAL-1', label: '業主提供素材一（AI 彙整的華語媒體內容，D 級，未逐條核對）', trust: 'D' },
      { id: 'S-SHUSHU-JIYI-WIKISOURCE', label: '《數術記遺》「九宮算」條（漢・徐岳撰，相傳北周・甄鸞注）— 維基文庫電子文本，底本待查核', trust: 'A' },
    ],
  },
};

export interface NineGridNameOverlay {
  playback: PlaybackGuide;
  name: string;
  label: string;
  note: string;
  /** 每字筆畫（來自姓名學引擎 characters[].strokeCount） */
  chars: { char: string; strokes: number }[];
  grids: NameGridValue[];
  /** 每個格拆成的單一數字（含 0；0 不落格） */
  split: { key: string; label: string; value: number; digits: number[] }[];
  /** 依天、人、地、外、總格順序，每一位數字一步；0 沒有格子 */
  drop: { digit: number; gridKey: string; linesLit: string[] }[];
  palaces: { digit: number; nameCount: number }[];
  /** 每個格子是哪幾個格給的（點格子時顯示） */
  contributors: { digit: number; from: { key: string; label: string; value: number }[]; text: string }[];
  /** 生日與姓名都落到的格子 */
  doubleEmphasis: number[];
  lines: { id: string; litByBirth: boolean; litWithName: boolean }[];
}

const CN_COUNT = ['', '一', '兩', '三', '四', '五', '六', '七', '八', '九', '十'];

function contributorText(digit: number, from: { label: string; value: number }[]): string {
  if (!from.length) return '';
  const groups = new Map<string, number>();
  for (const f of from) groups.set(`${f.label} ${f.value}`, (groups.get(`${f.label} ${f.value}`) ?? 0) + 1);
  const parts = [...groups.entries()];
  if (parts.every(([, n]) => n === 1)) return `${parts.map(([k]) => k).join('、')}${parts.length > 1 ? ' 各' : ''}給一個 ${digit}`;
  return parts.map(([k, n]) => `${k} 給${CN_COUNT[n] ?? n}個 ${digit}`).join('；');
}

export function buildNineGridNameOverlay(study: NineGridStudy, name: string, grids: readonly NameGridValue[], chars: readonly NameCharStroke[] = []): NineGridNameOverlay {
  const birth = new Map<number, number>(study.cells.map((c) => [c.digit, c.count]));
  const combined = new Map(birth);
  const nameCount = new Map<number, number>();
  const from = new Map<number, { key: string; label: string; value: number }[]>();
  for (let d = 1; d <= 9; d += 1) { nameCount.set(d, 0); from.set(d, []); }
  const isLit = (digits: readonly number[]) => digits.every((d) => (combined.get(d) ?? 0) > 0);
  const litNow = new Set(study.lines.filter((l) => isLit(l.digits)).map((l) => l.id));

  const drop: NineGridNameOverlay['drop'] = [];
  for (const g of grids) {
    for (const ch of String(g.value)) {
      const digit = Number(ch);
      const linesLit: string[] = [];
      if (digit > 0) {
        nameCount.set(digit, (nameCount.get(digit) ?? 0) + 1);
        combined.set(digit, (combined.get(digit) ?? 0) + 1);
        from.get(digit)?.push({ key: g.key, label: g.label, value: g.value });
        for (const line of study.lines) if (!litNow.has(line.id) && isLit(line.digits)) { litNow.add(line.id); linesLit.push(line.id); }
      }
      drop.push({ digit, gridKey: g.key, linesLit });
    }
  }

  return {
    playback: buildPlaybackGuide(study.cells, grids.map((g) => ({ label: g.label, value: String(g.value), digits: String(g.value).split('').map(Number) })), study.input.birthDate),
    name,
    label: NAME_OVERLAY_LABEL,
    note: NAME_OVERLAY_NOTE,
    chars: chars.map((c) => ({ char: c.char, strokes: c.strokeCount })),
    grids: grids.map((g) => ({ key: g.key, label: g.label, value: g.value })),
    split: grids.map((g) => ({ key: g.key, label: g.label, value: g.value, digits: String(g.value).split('').map(Number) })),
    drop,
    palaces: [...nameCount.entries()].map(([digit, n]) => ({ digit, nameCount: n })),
    contributors: [...from.entries()].map(([digit, f]) => ({ digit, from: f, text: contributorText(digit, f) })),
    doubleEmphasis: [...nameCount.entries()].filter(([d, n]) => n > 0 && (birth.get(d) ?? 0) > 0).map(([d]) => d),
    lines: study.lines.map((l) => ({ id: l.id, litByBirth: l.lit, litWithName: litNow.has(l.id) })),
  };
}
