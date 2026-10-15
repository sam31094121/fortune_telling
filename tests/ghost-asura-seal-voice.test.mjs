/**
 * 鬼魅阿修羅｜逐印記阿修羅話術守門（免登入）
 * ============================================================================
 * 自動生成層的 46 個印記，不能再用「吉／動／警」極性模板冒充阿修羅。
 * 這支測試守 features/ghost-asura/skill/sealVoice.ts：
 *   1. 每個有寫的印記都對得上 Skill 條目，並真的被解析器用在客戶看到的話術裡。
 *   2. 每一句都過 lintAsuraVoice（短句 16 字內、不發問、不求認同、不解釋原因、不含糊、不做具體預言、
 *      不威嚇、不空洞誇詞），沒有禁字與術數用語。
 *   3. 一個印記一份：開場句、戰局句、結尾動作不得兩個印記共用同一句。
 *   4. 結尾動作句型要有變化：不得有超過三成的印記用同一個起頭。
 *   5. 覆蓋數只增不減（分批施工，COVERED_AT_LEAST 每批往上調）。
 * 還沒寫的印記會列在報告裡，不算失敗（它們仍用極性模板，下一批補）。
 * ============================================================================
 */
import assert from 'node:assert/strict';
import Module from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-only-'));
const stubFile = path.join(stubDir, 'index.js');
fs.writeFileSync(stubFile, 'module.exports = {};\n');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patched(request, ...rest) {
  if (request === 'server-only') return stubFile;
  return originalResolve.call(this, request, ...rest);
};

const { ASURA_SEAL_VOICE } = await import('../features/ghost-asura/skill/sealVoice.ts');
const { ASURA_SKILL_ENTRIES } = await import('../features/ghost-asura/skill/entries.ts');
const { resolveAsuraInterpretation } = await import('../features/ghost-asura/skill/resolver.ts');
const { lintAsuraVoice } = await import('../lib/server/ghost-asura-voice.ts');
const { ASURA_FORBIDDEN_TERMS } = await import('../lib/asura-display-alias.ts');

/** 分批施工：每完成一批就把這個數字往上調。46 條全部有逐印記話術（第一批前 12 名、第二批 13～24 名、第三批最後 22 條）。 */
const COVERED_AT_LEAST = 46;

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks += 1; };
const BAD = /必定|一定會|註定|大凶|血光|死|保證|證實|準確|無敵|最強|天下第一/;

const ids = Object.keys(ASURA_SEAL_VOICE);
ok(ids.length >= COVERED_AT_LEAST, `覆蓋數只增不減：目前 ${ids.length}，至少要 ${COVERED_AT_LEAST}`);

const fields = ['declaration', 'core', 'battle', 'advice'];
const seen = { declaration: new Map(), battle: new Map(), advice: new Map(), core: new Map() };
const advOpeners = {};

for (const id of ids) {
  const v = ASURA_SEAL_VOICE[id];
  const entry = ASURA_SKILL_ENTRIES[id];
  ok(entry, `${id} 不是 Skill 條目`);
  for (const f of fields) {
    const t = v[f];
    ok(typeof t === 'string' && t.trim().length > 0, `${id}.${f} 空白`);
    const problems = lintAsuraVoice(t);
    ok(problems.length === 0, `${id}.${f} 不合阿修羅話術規範（${problems.join('、')}）：${t}`);
    ok(!BAD.test(t), `${id}.${f} 含禁字：${t}`);
    for (const term of ASURA_FORBIDDEN_TERMS) ok(!t.includes(term), `${id}.${f} 出現術數用語「${term}」：${t}`);
    ok(!seen[f].has(t), `${id}.${f} 與 ${seen[f].get(t)} 重複同一句`);
    seen[f].set(t, id);
  }
  // 真的被解析器用在客戶話術裡（不是寫了沒接上）
  const r = resolveAsuraInterpretation(id, { pillars: ['day'] });
  ok(r.source === 'generated', `${id} 應走生成層`);
  ok(r.meaningStrong === v.declaration, `${id} 開場句沒有接上`);
  ok(r.coreMeaning === v.core && r.meaning.startsWith(v.core), `${id} 解讀本文沒有以阿修羅核心句開頭`);
  ok(r.battleLine === v.battle, `${id} 戰局句沒有接上`);
  ok(r.advice === v.advice, `${id} 結尾動作沒有接上`);
  const opener = v.advice.slice(0, 2);
  advOpeners[opener] = (advOpeners[opener] ?? 0) + 1;
}
// 結尾動作句型要有變化
for (const [opener, n] of Object.entries(advOpeners)) ok(n / ids.length <= 0.3, `結尾動作「${opener}」開頭佔 ${n}/${ids.length}，句型太單一`);

// 報告：還沒寫的印記
const generatedIds = Object.keys(ASURA_SKILL_ENTRIES).filter((id) => resolveAsuraInterpretation(id, { pillars: [] }).source === 'generated');
const pending = generatedIds.filter((id) => !ASURA_SEAL_VOICE[id]);
console.log(`ghost-asura-seal-voice: ${checks} checks passed｜已寫 ${ids.length}／生成層 ${generatedIds.length}｜待寫 ${pending.length} 條：${pending.join('、')}`);
