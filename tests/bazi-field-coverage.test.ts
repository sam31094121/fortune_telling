/**
 * Professional Field Coverage Test｜System Lock V2 §18
 * 目的：避免 Backend 有專業資料、Frontend 忘記做欄位。禁止靜默遺漏。
 * 方法：Registry 每個欄位宣告的 accessor 字串，必須真實出現在宣告的元件原始碼中（Render Path 證明）。
 */

import * as fs from 'fs';
import * as path from 'path';
import { BAZI_PROFESSIONAL_FIELD_REGISTRY } from '../components/bazi/customer/fieldRegistry';

const COMPONENT_DIR = path.join(process.cwd(), 'components', 'bazi', 'customer');

let pass = 0; let fail = 0;
const sourceCache = new Map<string, string>();
function readSource(file: string): string {
  if (!sourceCache.has(file)) {
    const full = path.join(COMPONENT_DIR, file);
    sourceCache.set(file, fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '');
  }
  return sourceCache.get(file)!;
}

for (const [field, entry] of Object.entries(BAZI_PROFESSIONAL_FIELD_REGISTRY)) {
  const hit = entry.components.some((file) => readSource(file).includes(entry.accessor));
  if (hit) { pass++; }
  else {
    fail++;
    console.error(`FAIL: 專業欄位「${field}」（accessor="${entry.accessor}"）在 ${entry.components.join(', ')} 中找不到 Render Path — 後端有資料，前端漏做`);
  }
}

console.log(`\nBAZI FIELD COVERAGE — PASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exit(1);
console.log('BAZI_FIELD_COVERAGE_CERTIFIED=true');
