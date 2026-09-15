#!/usr/bin/env node
/**
 * 守門：紫微頁前端只顯示，不自己產生結論（米其林審查 2026-09-15）。
 *
 * 1. 命宮塔羅選牌、老師完整判讀、年齡，必須由 /api/insight-analyze 算好送來。
 *    app/insight/page.tsx 不得再定義或呼叫這些運算。
 * 2. 客戶看得到的字不得出現內部用語（後端、前端、規則模型、英文代號…）。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/insight/page.tsx', 'utf8');
const route = readFileSync('app/api/insight-analyze/route.ts', 'utf8');
const lib = readFileSync('lib/ziwei-teacher-synthesis.ts', 'utf8');
const teachers = readFileSync('lib/ziwei-teacher/teachers.ts', 'utf8');

let pass = 0;
const check = (title, fn) => { fn(); pass += 1; console.log(`PASS ${title}`); };

check('前端不定義也不呼叫選牌、合盤、算年齡', () => {
  for (const name of ['pickDestinyTarotCard', 'buildZiweiTeacherSynthesis', 'buildZiweiTeacherTarotBridge', 'ageFromBirthDate', 'ageOnDate', 'buildZiweiCustomerReadings']) {
    assert.ok(!new RegExp(`\\b${name}\\s*\\(`).test(page), `page.tsx 仍在呼叫或定義 ${name}`);
  }
  assert.ok(!/\bTAROT_CARDS\b/.test(page), 'page.tsx 不應再直接讀塔羅牌庫來選牌');
});

check('後端 API 送出老師合盤、命宮塔羅、年齡', () => {
  assert.match(route, /buildZiweiCustomerReadings\(\{/);
  assert.match(lib, /export function buildZiweiCustomerReadings\(/);
  for (const field of ['teacherSynthesisByPalace', 'destinyTarot', 'subjectAge']) {
    assert.ok(lib.includes(field), `lib 缺少 ${field}`);
    assert.ok(page.includes(`result?.${field}`), `page.tsx 沒有從 API 結果讀 ${field}`);
  }
});

check('紫微頁沒有內部用語', () => {
  // 「易經卜卦判定」只能出現在真的有起卦的地方；紫微頁的宮位範本冒用過這個名義（2026-09-15）。
  const banned = ['TEACHER TAROT BRIDGE', 'ZI WEI TIME CHECK', '老師專用', '規則模型統計訊號', '讓客戶看懂', '後端交叉驗證', '後端命盤資料', '不由前端推測', '後端正式命盤資料', '後端目前尚未提供', '易經卜卦判定'];
  for (const word of banned) assert.ok(!page.includes(word), `page.tsx 仍有「${word}」`);
});

check('老師後備文字沒有統計術語', () => {
  for (const word of ['結構能量指數', '統計面最強', '星曜密度', '本盤統計交叉', '交叉指數', '計入指數']) {
    assert.ok(!teachers.includes(word), `teachers.ts 仍有「${word}」`);
  }
});

console.log(`PASS ${pass} / FAIL 0`);
console.log('ZIWEI_DISPLAY_ONLY_CERTIFIED=true');
