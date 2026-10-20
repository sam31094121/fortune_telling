/**
 * 易經姓名學技能檔案讀取層
 * ============================================================================
 *
 * 正式檔：docs/技能戰鬥檔案/姓名學/姓名學.json
 * 新人導讀：docs/技能戰鬥檔案/姓名學/新人檔案.md
 * 來源登記：docs/技能戰鬥檔案/易經/來源登記.json（C-NAMEOLOGY-GRIDS）；來源閘門：lib/iching-source-gate.ts
 *
 * 業主定案（2026-10-20）：檔案 → 技能 → 話術 → 後端運算 → 前端美化。
 * 客人讀得到的解說只能來自正式檔，程式不得自己寫；每一句都要標出處層級與來源編號。禁止造假。
 * 直接匯入 JSON（網頁與伺服器都讀得到），不使用伺服器專用的檔案模組。
 */
import archiveJson from '../docs/技能戰鬥檔案/姓名學/姓名學.json';

export type Provenance = '引自來源' | '流派意象改寫' | '本站自撰';

export interface ArchiveEntry {
  text: string;
  provenance: Provenance;
  source_ids: string[];
  /** 「引自來源」才需要：頁碼或可追溯位置 */
  page_ref?: string;
  note?: string;
}

export interface NumberItem { n: number; keyword: string; reading: string; caution: string }

export type InputTierId = 'NAME_GENDER' | 'NAME_GENDER_BIRTH' | 'FULL';

export interface NameologyArchive {
  id: string;
  name: string;
  version: string;
  claimId: string;
  principle: string;
  provenanceLevels: Record<Provenance, { meaning: string; requires: string[]; note: string }>;
  forbiddenWords: string[];
  sourceLabels: Record<string, string>;
  strokeConcept: { title: string; paragraphs: ArchiveEntry[]; strokeNote: ArchiveEntry };
  gridRoles: Record<'sky' | 'person' | 'earth' | 'outer' | 'total', ArchiveEntry & { title: string }>;
  evidence: (ArchiveEntry & { topic: string })[];
  credibilityLines: ArchiveEntry[];
  numbers: { provenance: Provenance; source_ids: string[]; note: string; items: NumberItem[] };
  /** 分層入口：姓名＋性別即可運算；生日、時辰選填，有填才多解鎖後面的層 */
  inputTiers: Record<InputTierId, { label: string; note: ArchiveEntry }> & { rule: string; locked: { bazi: ArchiveEntry; iching: ArchiveEntry } };
}

export const NAMEOLOGY_ARCHIVE = archiveJson as unknown as NameologyArchive;

const PROVENANCES: Provenance[] = ['引自來源', '流派意象改寫', '本站自撰'];

/** 客人讀得到的每一句（含 81 數理的每一筆）與它的出處層級、來源編號。 */
export function listArchiveSentences(archive: NameologyArchive = NAMEOLOGY_ARCHIVE): { where: string; text: string; provenance: Provenance; source_ids: string[]; page_ref?: string }[] {
  const out: { where: string; text: string; provenance: Provenance; source_ids: string[]; page_ref?: string }[] = [];
  const add = (where: string, e: ArchiveEntry) => out.push({ where, text: e.text, provenance: e.provenance, source_ids: e.source_ids, page_ref: e.page_ref });
  archive.strokeConcept.paragraphs.forEach((e, i) => add(`筆畫概念#${i + 1}`, e));
  add('筆畫採用說明', archive.strokeConcept.strokeNote);
  (Object.keys(archive.gridRoles) as (keyof NameologyArchive['gridRoles'])[]).forEach((k) => add(`格角色:${k}`, archive.gridRoles[k]));
  archive.evidence.forEach((e) => add(`依據:${e.topic}`, e));
  archive.credibilityLines.forEach((e, i) => add(`公信力說明#${i + 1}`, e));
  (['NAME_GENDER', 'NAME_GENDER_BIRTH', 'FULL'] as const).forEach((k) => add(`分層說明:${k}`, archive.inputTiers[k].note));
  add('解鎖提示:八字對照', archive.inputTiers.locked.bazi);
  add('解鎖提示:易經卦', archive.inputTiers.locked.iching);
  for (const item of archive.numbers.items) {
    for (const field of ['keyword', 'reading', 'caution'] as const) {
      out.push({ where: `數理${item.n}:${field}`, text: item[field], provenance: archive.numbers.provenance, source_ids: archive.numbers.source_ids });
    }
  }
  return out;
}

/**
 * 檔案驗收：沒有出處就不能進檔。回傳問題清單（空陣列＝合格）。
 * - 層級必須是三種之一；來源編號不得為空且都要在登記表找得到
 * - 「引自來源」必須有 page_ref；沒有頁碼就不得標引自來源
 * - 不得含吉凶定論與恐嚇字眼
 */
export function validateNameologyArchive(registrySourceIds: string[], archive: NameologyArchive = NAMEOLOGY_ARCHIVE): string[] {
  const problems: string[] = [];
  const known = new Set(registrySourceIds);
  for (const s of listArchiveSentences(archive)) {
    if (!PROVENANCES.includes(s.provenance)) problems.push(`${s.where} 出處層級不合法：${s.provenance}`);
    if (!s.source_ids.length) problems.push(`${s.where} 沒有來源編號`);
    for (const id of s.source_ids) if (!known.has(id)) problems.push(`${s.where} 來源 ${id} 不在登記表`);
    if (s.provenance === '引自來源' && !s.page_ref) problems.push(`${s.where} 標「引自來源」卻沒有頁碼或可追溯位置`);
    for (const word of archive.forbiddenWords) if (s.text.includes(word)) problems.push(`${s.where} 含禁用字眼「${word}」`);
  }
  for (const id of Object.keys(archive.sourceLabels)) if (!known.has(id)) problems.push(`來源標籤 ${id} 不在登記表`);
  if (archive.numbers.items.length !== 81) problems.push(`數理必須 81 筆，現在 ${archive.numbers.items.length}`);
  archive.numbers.items.forEach((item, index) => { if (item.n !== index + 1) problems.push(`數理順序錯：第 ${index + 1} 筆是 ${item.n}`); });
  return problems;
}
