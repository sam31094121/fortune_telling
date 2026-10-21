/**
 * 九宮格靈動數字技能檔案讀取層（洛書九宮古籍版＋生命靈數通行版）
 * ============================================================================
 *
 * 正式檔：docs/技能戰鬥檔案/九宮格靈動數字/九宮格靈動數字.json
 * 新人導讀：docs/技能戰鬥檔案/九宮格靈動數字/新人檔案.md
 * 來源登記：docs/技能戰鬥檔案/易經/來源登記.json（通行版 C-NINEGRID-NUMBERS、古籍版 C-LUOSHU-JIUGONG）；來源閘門：lib/iching-source-gate.ts
 *
 * 檔案 → 技能 → 話術 → 後端運算 → 前端美化。客人讀得到的解說只能來自正式檔，程式不得自己寫；
 * 每一句都標出處層級與來源編號；「引自來源」的每一句必須附篇章，且能在登記表的來源備註裡逐字找到。禁止造假。
 * 直接匯入 JSON（網頁與伺服器都讀得到）。
 */
import archiveJson from '../docs/技能戰鬥檔案/九宮格靈動數字/九宮格靈動數字.json';

export type Provenance = '引自來源' | '流派意象改寫' | '本站自撰';

export interface ArchiveEntry {
  text: string;
  provenance: Provenance;
  source_ids: string[];
  /** 「引自來源」才需要：篇章或可追溯位置 */
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

export interface ClassicEntry {
  id: string;
  title: string;
  quote: string;
  annotation?: string;
  provenance: Provenance;
  source_ids: string[];
  page_ref: string;
  gloss: ArchiveEntry;
}

export interface PalaceEntry {
  digit: number;
  palace: string;
  trigram: string | null;
  order: number;
  /** 點宮位時先顯示的白話話術（只複述已核對的原文） */
  speech: ArchiveEntry;
  /** 延伸話術：依來源原文的白話，只複述不另解讀 */
  story: ArchiveEntry;
  /** 延伸話術所依的原文，逐字 */
  scene?: ArchiveEntry;
  /** 說卦傳第十一章的取象（乾為天…），原文逐字 */
  image?: ArchiveEntry;
  /** 卦畫：由下往上三爻，1 陽 0 陰 */
  yao?: [number, number, number];
  nature: ArchiveEntry | null;
  natureNote?: ArchiveEntry;
  direction: ArchiveEntry | null;
  directionNote?: ArchiveEntry;
}

export interface LuoshuArchive {
  name: string;
  role: string;
  claimId: string;
  verifiedAt: string;
  verifiedHow: string;
  intro: ArchiveEntry[];
  layout: { rows: number[][]; axes: { top: string; bottom: string; left: string; right: string }; note: ArchiveEntry; mirrorNote: ArchiveEntry; sumRule: ArchiveEntry };
  classics: ClassicEntry[];
  palaces: PalaceEntry[];
  orderNote: ArchiveEntry;
  yaoNote: string;
  crossCheck: ArchiveEntry[];
  evidence: (ArchiveEntry & { topic: string })[];
  notAdopted: { item: string; reason: string }[];
  credibilityLines: ArchiveEntry[];
  sourceLabels: Record<string, string>;
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
  editions: { id: string; name: string; role: string; claimId: string; note: string }[];
  guidance: { title: ArchiveEntry; steps: ArchiveEntry[]; inputHint: ArchiveEntry; resultIntro: ArchiveEntry };
  input: { label: string; rule: ArchiveEntry };
  layout: { rows: number[][]; note: ArchiveEntry };
  reading: { countRule: ArchiveEntry; lineRule: ArchiveEntry };
  digits: DigitEntry[];
  lines: LineEntry[];
  pendingLines: { id: string; digits: number[]; name: string; only_in: string; note: string }[];
  evidence: (ArchiveEntry & { topic: string })[];
  credibilityLines: ArchiveEntry[];
  luoshu: LuoshuArchive;
  fiveStar: { title: string; mapping: ArchiveEntry; linkRule: ArchiveEntry; scope: ArchiveEntry };
}

export const NINEGRID_ARCHIVE = archiveJson as unknown as NineGridArchive;

const PROVENANCES: Provenance[] = ['引自來源', '流派意象改寫', '本站自撰'];

type Sentence = { where: string; text: string; provenance: Provenance; source_ids: string[]; page_ref?: string };

/** 客人讀得到的每一句與它的出處層級、來源編號。 */
export function listNineGridSentences(archive: NineGridArchive = NINEGRID_ARCHIVE): Sentence[] {
  const out: Sentence[] = [];
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

  add('五行連線:配法', archive.fiveStar.mapping);
  add('五行連線:連線規則', archive.fiveStar.linkRule);
  add('五行連線:範圍', archive.fiveStar.scope);
  const lu = archive.luoshu;
  lu.intro.forEach((e, i) => add(`洛書:簡介#${i + 1}`, e));
  add('洛書:排法說明', lu.layout.note);
  add('洛書:鏡像說明', lu.layout.mirrorNote);
  add('洛書:和為十五', lu.layout.sumRule);
  for (const c of lu.classics) {
    out.push({ where: `洛書古籍:${c.id}:引文`, text: c.quote, provenance: c.provenance, source_ids: c.source_ids, page_ref: c.page_ref });
    if (c.annotation) out.push({ where: `洛書古籍:${c.id}:注文`, text: c.annotation, provenance: c.provenance, source_ids: c.source_ids, page_ref: c.page_ref });
    add(`洛書古籍:${c.id}:白話`, c.gloss);
  }
  for (const p of lu.palaces) {
    add(`洛書宮${p.digit}:話術`, p.speech);
    add(`洛書宮${p.digit}:延伸話術`, p.story);
    if (p.scene) add(`洛書宮${p.digit}:延伸原文`, p.scene);
    if (p.image) add(`洛書宮${p.digit}:取象`, p.image);
    if (p.nature) add(`洛書宮${p.digit}:性情`, p.nature);
    if (p.natureNote) add(`洛書宮${p.digit}:性情說明`, p.natureNote);
    if (p.direction) add(`洛書宮${p.digit}:方位`, p.direction);
    if (p.directionNote) add(`洛書宮${p.digit}:方位說明`, p.directionNote);
  }
  add('洛書:宮位數字', lu.orderNote);
  lu.crossCheck.forEach((e, i) => add(`洛書:對照#${i + 1}`, e));
  lu.evidence.forEach((e) => add(`洛書依據:${e.topic}`, e));
  lu.credibilityLines.forEach((e, i) => add(`洛書公信力說明#${i + 1}`, e));
  return out;
}

/** 檢查 3×3 是否為 1–9 各一次、且每行每列兩條對角線的和都相同的幻方。 */
export function magicSum(rows: number[][]): number | null {
  const flat = rows.flat().slice().sort((a, b) => a - b);
  if (rows.length !== 3 || rows.some((row) => row.length !== 3) || flat.join('') !== '123456789') return null;
  const sums = [
    ...rows.map((row) => row[0] + row[1] + row[2]),
    ...[0, 1, 2].map((c) => rows[0][c] + rows[1][c] + rows[2][c]),
    rows[0][0] + rows[1][1] + rows[2][2],
    rows[0][2] + rows[1][1] + rows[2][0],
  ];
  return sums.every((s) => s === sums[0]) ? sums[0] : null;
}

/**
 * 檔案驗收：沒有出處就不能進檔。回傳問題清單（空陣列＝合格）。
 * - 層級必須是三種之一；來源編號不得為空且都要在登記表找得到
 * - 「引自來源」必須有篇章（page_ref），且這句原文要能在登記表「該來源的備註」裡逐字找到
 * - 不得含吉凶定論、恐嚇字眼，也不得含素材自稱而查不到佐證的行銷說法
 * - 通行版九宮格必須是 1–9 各出現一次的 3×3、連線在同一直線；洛書九宮必須是和為 15 的幻方、宮位依序 1–9
 * registry 可傳來源編號清單（只檢查存在），或傳「來源編號 → 備註」的對照（同時檢查引文逐字可查）。
 */
export function validateNineGridArchive(registry: string[] | Record<string, string>, archive: NineGridArchive = NINEGRID_ARCHIVE): string[] {
  const problems: string[] = [];
  const notes = Array.isArray(registry) ? null : registry;
  const known = new Set(Array.isArray(registry) ? registry : Object.keys(registry));
  for (const s of listNineGridSentences(archive)) {
    if (!PROVENANCES.includes(s.provenance)) problems.push(`${s.where} 出處層級不合法：${s.provenance}`);
    if (!s.source_ids.length) problems.push(`${s.where} 沒有來源編號`);
    for (const id of s.source_ids) if (!known.has(id)) problems.push(`${s.where} 來源 ${id} 不在登記表`);
    if (s.provenance === '引自來源') {
      if (!s.page_ref) problems.push(`${s.where} 標「引自來源」卻沒有篇章或可追溯位置`);
      if (notes && !s.source_ids.some((id) => (notes[id] ?? '').includes(s.text))) problems.push(`${s.where} 標「引自來源」，但這句原文在登記表來源備註裡找不到：${s.text}`);
    }
    for (const word of archive.forbiddenWords) if (s.text.includes(word)) problems.push(`${s.where} 含禁用字眼「${word}」`);
    for (const claim of archive.forbiddenClaims) if (s.text.includes(claim)) problems.push(`${s.where} 含查不到佐證的說法「${claim}」`);
  }
  for (const id of [...Object.keys(archive.sourceLabels), ...Object.keys(archive.luoshu.sourceLabels)]) if (!known.has(id)) problems.push(`來源標籤 ${id} 不在登記表`);

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

  const lu = archive.luoshu;
  if (magicSum(lu.layout.rows) !== 15) problems.push('洛書九宮必須是每行每列每斜線和為 15 的 3×3 幻方');
  if (lu.palaces.length !== 9 || lu.palaces.some((p, i) => p.digit !== i + 1 || p.order !== i + 1)) problems.push('洛書宮位必須是 1 到 9 共 9 筆，且順序數字等於宮位數字');
  const yaoSet = new Set(lu.palaces.filter((p) => p.yao).map((p) => (p.yao as number[]).join('')));
  if (yaoSet.size !== 8 || lu.palaces.some((p) => p.yao && p.yao.some((y) => y !== 0 && y !== 1))) problems.push('八卦卦畫必須是 8 種不同的三爻');
  const nonCenter = lu.palaces.filter((p) => p.digit !== 5);
  if (nonCenter.some((p) => !p.trigram || !p.nature)) problems.push('除中宮外，每一宮都要有八卦與說卦傳的性情');
  if (!lu.classics.length || lu.classics.some((c) => c.provenance !== '引自來源' || !c.page_ref)) problems.push('洛書古籍引文必須標引自來源並附篇章');
  return problems;
}
