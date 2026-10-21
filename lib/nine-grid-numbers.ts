/**
 * 九宮格靈動數字：西元生日 → 九宮格、數字特質、靈動連線
 * ============================================================================
 *
 * 後端運算、前端只顯示：每一句解說都來自技能檔案（docs/技能戰鬥檔案/九宮格靈動數字/九宮格靈動數字.json），
 * 程式只負責「算出來的事實」（數字出現幾次、哪些線亮起）與標出處標籤，不自己寫解說。
 * 來源與公信力：登記 C-NINEGRID-NUMBERS（docs/技能戰鬥檔案/易經/來源登記.json），狀態由 lib/iching-source-gate.ts 算。
 */
import registryData from '../docs/技能戰鬥檔案/易經/來源登記.json';
import { evaluateClaim, indexSources, type SourceRegistry } from './iching-source-gate';
import { elementOfNumber, staticEdges, GRID_ELEMENT_ORDER, type GridElement } from './nameology-number-reading';
import { STATUS_WORDING } from './credibility-phrases';
import { NINEGRID_ARCHIVE, type ArchiveEntry, type Provenance } from './nine-grid-skill-archive';

export type NineGridStatus = 'VERIFIED' | 'CONFLICT' | 'PENDING_POOL';

export interface TextWithLabel { text: string; provenanceLabel: string }

export interface NineGridCell {
  digit: number;
  row: number;
  col: number;
  count: number;
  title: string;
  keywords: string;
}

export interface NineGridDigitReading {
  digit: number;
  title: string;
  keywords: string;
  count: number;
  /** 算出來的事實：這個數字在生日裡出現幾次 */
  countNote: string;
  trait: string;
  caution: string;
  provenanceLabel: string;
}

export interface NineGridLineReading {
  id: string;
  digits: [number, number, number];
  name: string;
  lit: boolean;
  /** 算出來的事實：這條線三個數字有沒有都出現、缺哪一個 */
  fact: string;
  missing: number[];
  text: string;
  provenanceLabel: string;
}

export interface NineGridCredibility {
  status: NineGridStatus;
  headline: string;
  lines: string[];
  sources: { id: string; label: string; citation: string; trust: 'A' | 'B' | 'C' | 'D' }[];
}

export interface NineGridStudy {
  ruleVersion: 'nine-grid-v2';
  input: { birthDate: string; digits: number[]; zeroCount: number; label: string; rule: TextWithLabel };
  layout: { rows: number[][]; note: TextWithLabel };
  cells: NineGridCell[];
  digits: NineGridDigitReading[];
  lines: NineGridLineReading[];
  reading: { countRule: TextWithLabel; lineRule: TextWithLabel };
  /** 算出來的事實摘要（不含解讀） */
  summary: { dominant: number[]; maxCount: number; missing: number[]; litLines: number; text: string };
  guidance: { title: TextWithLabel; steps: TextWithLabel[]; inputHint: TextWithLabel; resultIntro: TextWithLabel };
  evidence: { topic: string; basis: string; provenanceLabel: string; sourceLabels: string[] }[];
  credibility: NineGridCredibility;
  /** 洛書九宮（古籍版，正本）：不依生日而變，來自古籍排法與出處 */
  luoshu: LuoshuStudy;
  /** 五行寶珠連線：生日數字依姓名學慣用法配五行，與易經姓名學的五星連線同一套畫法 */
  fiveStar: FiveStarStudy;
}

export interface FiveStarStudy {
  title: string;
  mapping: TextWithLabel;
  linkRule: TextWithLabel;
  scope: TextWithLabel;
  nodes: { element: GridElement; digits: number[]; count: number; present: boolean }[];
  edges: { from: GridElement; to: GridElement; kind: '生' | '剋'; active: boolean }[];
  /** 算出來的事實：哪些五行有數字、哪些沒有 */
  summary: string;
  legend: { generate: string; control: string };
  elementOfDigit: Record<number, GridElement>;
  /** 五行連線落到九宮格：每條亮起的五行邊，取兩種五行裡距離最近的一對格子（同距取數字小的），前端直接畫在九宮格上 */
  cellLinks: { kind: '生' | '剋'; fromElement: GridElement; toElement: GridElement; fromDigit: number; toDigit: number }[];
}

export interface LuoshuStudy {
  name: string;
  role: string;
  intro: TextWithLabel[];
  layout: { rows: number[][]; axes: { top: string; bottom: string; left: string; right: string }; note: TextWithLabel; mirrorNote: TextWithLabel; sumRule: TextWithLabel; sum: number };
  classics: { id: string; title: string; quote: string; annotation?: string; pageRef: string; gloss: TextWithLabel; sourceLabels: string[] }[];
  /** 算出來的事實：生日數字落在洛書各宮的情形（沒有填生日時為 null） */
  birthOverlay: { birthDate: string; summary: string } | null;
  palaces: { digit: number; count: number; palace: string; trigram: string | null; order: number; speech: TextWithLabel; story: TextWithLabel; scene: (TextWithLabel & { pageRef: string }) | null; image: (TextWithLabel & { pageRef: string }) | null; yao: number[] | null; nature: TextWithLabel | null; natureNote: TextWithLabel | null; direction: TextWithLabel | null; directionNote: TextWithLabel | null }[];
  orderNote: TextWithLabel;
  yaoNote: string;
  crossCheck: TextWithLabel[];
  evidence: { topic: string; basis: string; provenanceLabel: string; sourceLabels: string[] }[];
  notAdopted: { item: string; reason: string }[];
  verifiedAt: string;
  verifiedHow: string;
  credibility: NineGridCredibility;
}

export const provenanceLabel = (provenance: Provenance, statusLine: string) => `${provenance}・${statusLine}`;

export type ParsedBirthDate = { ok: true; birthDate: string; digits: number[]; zeroCount: number } | { ok: false; message: string };

/** 西元生日 YYYY-MM-DD（月日可不補 0）。必須是真實存在的日期、不早於 1900、不晚於今天。 */
export function parseBirthDate(input: unknown, today: Date = new Date()): ParsedBirthDate {
  if (typeof input !== 'string' || !input.trim()) return { ok: false, message: '請先填出生年月日。' };
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input.trim());
  if (!match) return { ok: false, message: '出生日期的格式不對，請重新選一次。' };
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { ok: false, message: '這一天不存在，請檢查年月日。' };
  if (year < 1900) return { ok: false, message: '出生年份請填 1900 年以後。' };
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (date.getTime() > todayUtc) return { ok: false, message: '出生日期不能是未來的日子。' };
  const normalized = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const all = normalized.replace(/-/g, '').split('').map(Number);
  return { ok: true, birthDate: normalized, digits: all.filter((d) => d !== 0), zeroCount: all.filter((d) => d === 0).length };
}

export function buildNineGridCredibility(claimId: string = NINEGRID_ARCHIVE.claimId, lines: ArchiveEntry[] = NINEGRID_ARCHIVE.credibilityLines, labels: Record<string, string> = NINEGRID_ARCHIVE.sourceLabels): NineGridCredibility {
  const registry = registryData as unknown as SourceRegistry;
  const claim = registry.claims.find((c) => c.claim_id === claimId);
  if (!claim) return { status: 'PENDING_POOL', headline: '來源登記尚未建立，僅供自我反思參考。', lines: [], sources: [] };
  const index = indexSources(registry);
  const gate = evaluateClaim(claim, index);
  const sources = [...new Set([...claim.authority_files, ...claim.cross_references])]
    .map((id) => index[id])
    .filter(Boolean)
    .map((s) => ({ id: s.source_id, label: labels[s.source_id] ?? s.author, citation: s.locator, trust: s.trust }));
  return {
    status: gate.status,
    headline: gate.status === 'VERIFIED' ? STATUS_WORDING.VERIFIED : STATUS_WORDING.PENDING_POOL,
    lines: [...lines.map((entry) => entry.text), ...(gate.status === 'VERIFIED' ? [] : gate.reasons.slice(0, 3))],
    sources,
  };
}

export function buildNineGridStudy(parsed: Extract<ParsedBirthDate, { ok: true }>): NineGridStudy {
  const credibility = buildNineGridCredibility();
  const statusLine = STATUS_WORDING[credibility.status];
  const label = (p: Provenance) => provenanceLabel(p, statusLine);
  const withLabel = (entry: { text: string; provenance: Provenance }): TextWithLabel => ({ text: entry.text, provenanceLabel: label(entry.provenance) });

  const counts = new Map<number, number>();
  for (let d = 1; d <= 9; d += 1) counts.set(d, 0);
  for (const d of parsed.digits) counts.set(d, (counts.get(d) ?? 0) + 1);

  const archive = NINEGRID_ARCHIVE;
  const cells: NineGridCell[] = archive.layout.rows.flatMap((row, r) => row.map((digit, c) => {
    const entry = archive.digits[digit - 1];
    return { digit, row: r, col: c, count: counts.get(digit) ?? 0, title: entry.title, keywords: entry.keywords };
  }));

  const digits: NineGridDigitReading[] = archive.digits.map((entry) => {
    const count = counts.get(entry.digit) ?? 0;
    return {
      digit: entry.digit,
      title: entry.title,
      keywords: entry.keywords,
      count,
      countNote: count > 0 ? `生日數字裡 ${entry.digit} 出現 ${count} 次。` : `生日數字裡沒有出現 ${entry.digit}。`,
      trait: entry.trait,
      caution: entry.caution,
      provenanceLabel: label(entry.provenance),
    };
  });

  const lines: NineGridLineReading[] = archive.lines.map((line) => {
    const missing = line.digits.filter((d) => (counts.get(d) ?? 0) === 0);
    const lit = missing.length === 0;
    return {
      id: line.id,
      digits: line.digits,
      name: line.name,
      lit,
      fact: lit ? `${line.digits.join('-')} 三個數字都有出現，這條線亮起。` : `${line.digits.join('-')} 少了 ${missing.join('、')}，這條線沒有亮起。`,
      missing,
      text: line.text,
      provenanceLabel: label(line.provenance),
    };
  });

  const maxCount = Math.max(...counts.values());
  const dominant = [...counts.entries()].filter(([, n]) => n === maxCount && n > 0).map(([d]) => d);
  const missingDigits = [...counts.entries()].filter(([, n]) => n === 0).map(([d]) => d);
  const litLines = lines.filter((l) => l.lit).length;
  const summaryText = `生日 ${parsed.birthDate} 的數字（0 不計）共 ${parsed.digits.length} 個；出現最多次的是 ${dominant.join('、')}（${maxCount} 次）；沒有出現的是 ${missingDigits.length ? missingDigits.join('、') : '無'}；亮起 ${litLines} 條連線。`;

  return {
    ruleVersion: 'nine-grid-v2',
    input: { birthDate: parsed.birthDate, digits: parsed.digits, zeroCount: parsed.zeroCount, label: archive.input.label, rule: withLabel(archive.input.rule) },
    layout: { rows: archive.layout.rows, note: withLabel(archive.layout.note) },
    cells,
    digits,
    lines,
    reading: { countRule: withLabel(archive.reading.countRule), lineRule: withLabel(archive.reading.lineRule) },
    summary: { dominant, maxCount, missing: missingDigits, litLines, text: summaryText },
    guidance: {
      title: withLabel(archive.guidance.title),
      steps: archive.guidance.steps.map(withLabel),
      inputHint: withLabel(archive.guidance.inputHint),
      resultIntro: withLabel(archive.guidance.resultIntro),
    },
    evidence: archive.evidence.map((entry) => ({
      topic: entry.topic,
      basis: entry.text,
      provenanceLabel: label(entry.provenance),
      sourceLabels: entry.source_ids.map((id) => archive.sourceLabels[id] ?? id),
    })),
    credibility,
    luoshu: buildLuoshuStudy(counts, parsed.birthDate),
    fiveStar: buildFiveStarStudy(counts, withLabel),
  };
}

export function buildFiveStarStudy(counts: Map<number, number>, withLabel: (e: { text: string; provenance: Provenance }) => TextWithLabel): FiveStarStudy {
  const fs = NINEGRID_ARCHIVE.fiveStar;
  const elementOfDigit: Record<number, GridElement> = {};
  for (let d = 1; d <= 9; d += 1) elementOfDigit[d] = elementOfNumber(d);
  const nodes = GRID_ELEMENT_ORDER.map((element) => {
    const digits = Object.keys(elementOfDigit).map(Number).filter((d) => elementOfDigit[d] === element && (counts.get(d) ?? 0) > 0);
    return { element, digits, count: digits.reduce((sum, d) => sum + (counts.get(d) ?? 0), 0), present: digits.length > 0 };
  });
  const present = new Set(nodes.filter((n) => n.present).map((n) => n.element));
  const edges = staticEdges().map((edge) => ({ ...edge, active: present.has(edge.from) && present.has(edge.to) }));
  const have = nodes.filter((n) => n.present).map((n) => n.element);
  const lack = nodes.filter((n) => !n.present).map((n) => n.element);
  const summary = `生日數字落在 ${have.length ? have.join('、') : '無'} 五行；沒有數字落到的是 ${lack.length ? lack.join('、') : '無'}；亮起 ${edges.filter((e) => e.active).length} 條連線。`;
  const rows = NINEGRID_ARCHIVE.layout.rows;
  const where = new Map<number, [number, number]>();
  rows.forEach((row, r) => row.forEach((digit, c) => where.set(digit, [r, c])));
  const cellLinks: FiveStarStudy['cellLinks'] = [];
  for (const edge of edges.filter((e) => e.active)) {
    const fromDigits = nodes.find((n) => n.element === edge.from)!.digits;
    const toDigits = nodes.find((n) => n.element === edge.to)!.digits;
    let best: { a: number; b: number; d: number } | null = null;
    for (const a of fromDigits) for (const b of toDigits) {
      const [ar, ac] = where.get(a)!; const [br, bc] = where.get(b)!;
      const d = (ar - br) ** 2 + (ac - bc) ** 2;
      if (!best || d < best.d || (d === best.d && a + b < best.a + best.b)) best = { a, b, d };
    }
    if (best) cellLinks.push({ kind: edge.kind, fromElement: edge.from, toElement: edge.to, fromDigit: best.a, toDigit: best.b });
  }
  return { title: fs.title, mapping: withLabel(fs.mapping), linkRule: withLabel(fs.linkRule), scope: withLabel(fs.scope), nodes, edges, summary, legend: { generate: '實線＝相生', control: '虛線＝相剋' }, elementOfDigit, cellLinks };
}

function luoshuSummary(palaces: { digit: number; palace: string }[], counts: Map<number, number>, birthDate: string) {
  const hit = palaces.filter((p) => (counts.get(p.digit) ?? 0) > 0).map((p) => `${p.palace}${counts.get(p.digit)}`);
  const miss = palaces.filter((p) => (counts.get(p.digit) ?? 0) === 0).map((p) => p.palace);
  return `生日 ${birthDate} 的數字（0 不計）落在洛書的 ${hit.join('、')}；沒有數字的宮是 ${miss.length ? miss.join('、') : '無'}。`;
}

/** 洛書九宮（古籍版）：每一句都來自技能檔案，狀態由來源閘門算。 */
export function buildLuoshuStudy(counts?: Map<number, number>, birthDate?: string): LuoshuStudy {
  const lu = NINEGRID_ARCHIVE.luoshu;
  const credibility = buildNineGridCredibility(lu.claimId, lu.credibilityLines, lu.sourceLabels);
  const statusLine = STATUS_WORDING[credibility.status];
  const wl = (entry: { text: string; provenance: Provenance }): TextWithLabel => ({ text: entry.text, provenanceLabel: provenanceLabel(entry.provenance, statusLine) });
  const opt = (entry?: ArchiveEntry | null) => (entry ? wl(entry) : null);
  const labelsOf = (ids: string[]) => ids.map((id) => lu.sourceLabels[id] ?? id);
  const rows = lu.layout.rows;
  return {
    name: lu.name,
    role: lu.role,
    intro: lu.intro.map(wl),
    layout: { rows, axes: lu.layout.axes, note: wl(lu.layout.note), mirrorNote: wl(lu.layout.mirrorNote), sumRule: wl(lu.layout.sumRule), sum: rows[0][0] + rows[0][1] + rows[0][2] },
    classics: lu.classics.map((c) => ({ id: c.id, title: c.title, quote: c.quote, annotation: c.annotation, pageRef: c.page_ref, gloss: wl(c.gloss), sourceLabels: labelsOf(c.source_ids) })),
    birthOverlay: counts && birthDate ? { birthDate, summary: luoshuSummary(lu.palaces, counts, birthDate) } : null,
    palaces: lu.palaces.map((p) => ({ digit: p.digit, count: counts?.get(p.digit) ?? 0, palace: p.palace, trigram: p.trigram, order: p.order, speech: wl(p.speech), story: wl(p.story), scene: p.scene ? { ...wl(p.scene), pageRef: p.scene.page_ref ?? '' } : null, image: p.image ? { ...wl(p.image), pageRef: p.image.page_ref ?? '' } : null, yao: p.yao ?? null, nature: opt(p.nature), natureNote: opt(p.natureNote), direction: opt(p.direction), directionNote: opt(p.directionNote) })),
    orderNote: wl(lu.orderNote),
    yaoNote: lu.yaoNote,
    crossCheck: lu.crossCheck.map(wl),
    evidence: lu.evidence.map((e) => ({ topic: e.topic, basis: e.text, provenanceLabel: provenanceLabel(e.provenance, statusLine), sourceLabels: labelsOf(e.source_ids) })),
    notAdopted: lu.notAdopted,
    verifiedAt: lu.verifiedAt,
    verifiedHow: lu.verifiedHow,
    credibility,
  };
}

/** 前端在送出前先拿到的引導文字（不需要生日），同樣來自技能檔案。 */
export function buildNineGridGuidance(): NineGridStudy['guidance'] & { credibility: NineGridCredibility } {
  const credibility = buildNineGridCredibility();
  const statusLine = STATUS_WORDING[credibility.status];
  const withLabel = (entry: { text: string; provenance: Provenance }): TextWithLabel => ({ text: entry.text, provenanceLabel: provenanceLabel(entry.provenance, statusLine) });
  const g = NINEGRID_ARCHIVE.guidance;
  return { title: withLabel(g.title), steps: g.steps.map(withLabel), inputHint: withLabel(g.inputHint), resultIntro: withLabel(g.resultIntro), credibility };
}
