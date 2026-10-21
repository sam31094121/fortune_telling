/**
 * 九宮格靈動數字技能檔案讀取層
 * ============================================================================
 *
 * 正式檔：docs/技能戰鬥檔案/九宮格靈動數字/九宮格靈動數字.json
 * 新人導讀：docs/技能戰鬥檔案/九宮格靈動數字/新人檔案.md
 * 來源登記：docs/技能戰鬥檔案/易經/來源登記.json（C-NINEGRID-NUMBERS）；來源閘門：lib/iching-source-gate.ts
 *
 * 檔案 → 技能 → 話術 → 後端運算 → 前端美化。客人讀得到的解說只能來自正式檔，程式不得自己寫；
 * 每一句都標出處層級與來源編號。禁止造假。直接匯入 JSON（網頁與伺服器都讀得到）。
 */
import archiveJson from '../docs/技能戰鬥檔案/九宮格靈動數字/九宮格靈動數字.json';

export type Provenance = '引自來源' | '流派意象改寫' | '本站自撰';

export interface ArchiveEntry {
  text: string;
  provenance: Provenance;
  source_ids: string[];
  /** 「引自來源」才需要：頁碼或可追溯位置 */
  page_ref?: string;
}

export interface DigitEntry {
  digit: number;
  title: string;
  keywords: string;
  trait: string;
  caution: string;
  provenance: Provenance;
  source_ids: string[];
}

export interface LineEntry {
  id: string;
  digits: [number, number, number];
  name: string;
  text: string;
  provenance: Provenance;
  source_ids: string[];
}

export interface NineGridArchive {
  id: string;
  name: string;
  version: string;
  claimId: string;
  principle: string;
  forbiddenWords: string[];
  /** 素材自稱、本站查不到佐證的行銷說法：不得出現在客人看的內容 */
  forbiddenClaims: string[];
  sourceLabels: Record<string, string>;
  guidance: { title: ArchiveEntry; steps: ArchiveEntry[]; inputHint: ArchiveEntry; resultIntro: ArchiveEntry };
  input: { label: string; rule: ArchiveEntry };
  layout: { rows: number[][]; note: ArchiveEntry };
  reading: { countRule: ArchiveEntry; lineRule: ArchiveEntry };
  digits: DigitEntry[];
  lines: LineEntry[];
  pendingLines: { id: string; digits: number[]; name: string; only_in: string; note: string }[];
  evidence: (ArchiveEntry & { topic: string })[];
  credibilityLines: ArchiveEntry[];
}

export const NINEGRID_ARCHIVE = archiveJson as unknown as NineGridArchive;

const PROVENANCES: Provenance[] = ['引自來源', '流派意象改寫', '本站自撰'];

/** 客人讀得到的每一句與它的出處層級、來源編號。 */
export function listNineGridSentences(archive: NineGridArchive = NINEGRID_ARCHIVE): { where: string; text: string; provenance: Provenance; source_ids: string[]; page_ref?: string }[] {
  const out: { where: string; text: string; provenance: Provenance; source_ids: string[]; page_ref?: string }[] = [];
  const add = (where: string, e: ArchiveEntry) => out.push({ where, text: e.text, provenance: e.provenance, source_ids: e.source_ids, page_ref: e.page_ref });
  add('引導:標題', archive.guidance.title);
  archive.guidance.steps.forEach((e, i) => add(`引導:步驟${i + 1}`, e));
  add('引導:輸入提示', archive.guidance.inputHint);
  add('引導:結果說明', archive.guidance.resultIntro);
  add('輸入規則', archive.input.rule);
  add('排法說明', archive.layout.note);
  add('讀法:次數', archive.reading.countRule);
  add('讀法:連線', archive.reading.lineRule);
  for (const d of archive.digits) {
    for (const field of ['title', 'keywords', 'trait', 'caution'] as const) {
      out.push({ where: `數字${d.digit}:${field}`, text: d[field], provenance: d.provenance, source_ids: d.source_ids });
    }
  }
  for (const l of archive.lines) {
    out.push({ where: `連線${l.id}:name`, text: l.name, provenance: l.provenance, source_ids: l.source_ids });
    out.push({ where: `連線${l.id}:text`, text: l.text, provenance: l.provenance, source_ids: l.source_ids });
  }
  archive.evidence.forEach((e) => add(`依據:${e.topic}`, e));
  archive.credibilityLines.forEach((e, i) => add(`公信力說明#${i + 1}`, e));
  return out;
}

/**
 * 檔案驗收：沒有出處就不能進檔。回傳問題清單（空陣列＝合格）。
 * - 層級必須是三種之一；來源編號不得為空且都要在登記表找得到
 * - 「引自來源」必須有 page_ref
 * - 不得含吉凶定論、恐嚇字眼，也不得含素材自稱而查不到佐證的行銷說法
 * - 九宮格必須是 1–9 各出現一次的 3×3；連線的三個數字都要落在同一直、橫或斜線上
 */
export function validateNineGridArchive(registrySourceIds: string[], archive: NineGridArchive = NINEGRID_ARCHIVE): string[] {
  const problems: string[] = [];
  const known = new Set(registrySourceIds);
  for (const s of listNineGridSentences(archive)) {
    if (!PROVENANCES.includes(s.provenance)) problems.push(`${s.where} 出處層級不合法：${s.provenance}`);
    if (!s.source_ids.length) problems.push(`${s.where} 沒有來源編號`);
    for (const id of s.source_ids) if (!known.has(id)) problems.push(`${s.where} 來源 ${id} 不在登記表`);
    if (s.provenance === '引自來源' && !s.page_ref) problems.push(`${s.where} 標「引自來源」卻沒有頁碼或可追溯位置`);
    for (const word of archive.forbiddenWords) if (s.text.includes(word)) problems.push(`${s.where} 含禁用字眼「${word}」`);
    for (const claim of archive.forbiddenClaims) if (s.text.includes(claim)) problems.push(`${s.where} 含查不到佐證的說法「${claim}」`);
  }
  for (const id of Object.keys(archive.sourceLabels)) if (!known.has(id)) problems.push(`來源標籤 ${id} 不在登記表`);

  const rows = archive.layout.rows;
  const flat = rows.flat().slice().sort((a, b) => a - b);
  if (rows.length !== 3 || rows.some((row) => row.length !== 3) || flat.join('') !== '123456789') problems.push('九宮格必須是 1 到 9 各出現一次的 3×3');
  if (archive.digits.length !== 9 || archive.digits.some((d, i) => d.digit !== i + 1)) problems.push('數字特質必須是 1 到 9 共 9 筆且依序');

  const position = new Map<number, [number, number]>();
  rows.forEach((row, r) => row.forEach((digit, c) => position.set(digit, [r, c])));
  for (const line of archive.lines) {
    const cells = line.digits.map((d) => position.get(d));
    if (cells.some((c) => !c)) { problems.push(`連線 ${line.id} 的數字不在九宮格裡`); continue; }
    const [a, b, c] = cells as [number, number][];
    const sameRow = a[0] === b[0] && b[0] === c[0];
    const sameCol = a[1] === b[1] && b[1] === c[1];
    const diag = [a, b, c].every(([r, col]) => r === col) || [a, b, c].every(([r, col]) => r + col === 2);
    if (!(sameRow || sameCol || diag)) problems.push(`連線 ${line.id}（${line.digits.join('-')}）在這個排法下不在同一條直線上`);
  }
  return problems;
}
