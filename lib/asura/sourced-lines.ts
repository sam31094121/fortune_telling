/**
 * 2026-10-23 ai-to-asura：共用「阿修羅做法」選句器（由 lib/ziwei-teacher/ghost-asura-lines.ts 的模板抽出）。
 * 規則：後端只從 docs/技能戰鬥檔案/ 五術技能檔「一字不改」挑出含關鍵字的原句，附檔名與行號；
 * 找不到就回 sourced:false，呼叫端必須顯示明確狀態「暫時無法取得」，不得補寫、不得呼叫 AI。
 * 僅供伺服器端使用（讀檔）。
 */
import 'server-only';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const ASURA_UNAVAILABLE_MESSAGE = '暫時無法取得';
export const ASURA_UNAVAILABLE_CODE = 'ASURA_UNAVAILABLE';

/** 五術技能檔目錄（docs/技能戰鬥檔案/ 底下的資料夾名）。 */
export type AsuraSkillMethod =
  | '九宮格靈動數字' | '八字' | '姓名學' | '易經' | '易經神煞' | '神煞異君' | '紫微斗數' | '阿修羅' | '鬼魅阿修羅';

export interface SourcedSkillLine {
  text: string;
  /** 相對專案根目錄的檔案路徑 */
  file: string;
  /** 1-based 行號 */
  line: number;
}

export type SourcedLinesResult =
  | { sourced: true; lines: SourcedSkillLine[] }
  | { sourced: false; status: typeof ASURA_UNAVAILABLE_CODE; message: typeof ASURA_UNAVAILABLE_MESSAGE; reason: string };

export class AsuraUnavailableError extends Error {
  readonly code = ASURA_UNAVAILABLE_CODE;
  constructor(readonly reason: string) {
    super(ASURA_UNAVAILABLE_MESSAGE);
    this.name = 'AsuraUnavailableError';
  }
}

export function asuraUnavailable(reason: string): Extract<SourcedLinesResult, { sourced: false }> {
  return { sourced: false, status: ASURA_UNAVAILABLE_CODE, message: ASURA_UNAVAILABLE_MESSAGE, reason };
}

const SKILL_ROOT = path.join(process.cwd(), 'docs', '技能戰鬥檔案');
const TEXT_EXT = /\.(md|txt|json)$/i;
const fileCache = new Map<string, string[]>();

function listFiles(dir: string): string[] {
  let out: string[] = [];
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = path.join(dir, name);
    try {
      const st = statSync(full);
      if (st.isDirectory()) out = out.concat(listFiles(full));
      else if (TEXT_EXT.test(name)) out.push(full);
    } catch { /* 略過讀不到的檔 */ }
  }
  return out.sort();
}

function readLines(file: string): string[] {
  const hit = fileCache.get(file);
  if (hit) return hit;
  let lines: string[] = [];
  try { lines = readFileSync(file, 'utf8').split(/\r?\n/); } catch { lines = []; }
  fileCache.set(file, lines);
  return lines;
}

/**
 * 從指定技能檔挑出同時包含全部 keywords 的原句（逐字、不改寫）。
 * 空關鍵字、找不到檔、找不到句子 → sourced:false（暫時無法取得）。
 */
export function findSkillLines(methods: AsuraSkillMethod[], keywords: string[], limit = 3): SourcedLinesResult {
  const terms = keywords.map((k) => k.trim()).filter(Boolean);
  if (terms.length === 0) return asuraUnavailable('NO_KEYWORD');
  const lines: SourcedSkillLine[] = [];
  const seen = new Set<string>();
  for (const method of methods) {
    for (const file of listFiles(path.join(SKILL_ROOT, method))) {
      readLines(file).forEach((raw, index) => {
        if (lines.length >= limit) return;
        const text = raw.trim();
        if (!text || seen.has(text) || !terms.every((term) => text.includes(term))) return;
        seen.add(text);
        lines.push({ text, file: path.relative(process.cwd(), file).split(path.sep).join('/'), line: index + 1 });
      });
      if (lines.length >= limit) break;
    }
    if (lines.length >= limit) break;
  }
  return lines.length > 0 ? { sourced: true, lines } : asuraUnavailable('NO_SOURCED_LINE');
}
