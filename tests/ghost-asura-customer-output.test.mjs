/**
 * 鬼魅阿修羅客戶頁輸出守門（不需登入、不需啟動伺服器）
 * ============================================================================
 * 為什麼有這支：客戶頁 API 加了密碼鎖之後，原本靠打 API 的測試全部被 401 擋掉，
 * 等於「改這張卡的文字」沒有任何自動護欄。這支直接呼叫後端運算函式
 * （與 /api/ghost-asura/reading 同一條路徑，只是繞過密碼層），
 * 掃客戶真正會看到的每一個字：禁字、佔位字、空白、契約。
 * 密碼鎖本身由 test:locked-cards 守，這裡不碰、不繞過它保護的 API。
 * ============================================================================
 */
import assert from 'node:assert/strict';
import Module from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// 'server-only' 只是 Next 的編譯期標記，本機沒有安裝；測試時以空模組代替。
const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-only-'));
const stubFile = path.join(stubDir, 'index.js');
fs.writeFileSync(stubFile, 'module.exports = {};\n');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patched(request, ...rest) {
  if (request === 'server-only') return stubFile;
  return originalResolve.call(this, request, ...rest);
};

const { computeGhostAsuraDisplay, normalizeAsuraInput } = await import('../lib/server/ghost-asura-display.ts');
const { ASURA_WORDINGS } = await import('../features/ghost-asura/wordings.ts');
const { ASURA_WORDINGS_CORE } = await import('../lib/ghost-asura-wordings-core.ts');
const { COMPLETE_ASURA_DICTIONARY } = await import('../lib/ghost-asura-complete-dictionary.ts');

const BAD_WORDS = /必定|一定會|註定|大凶|血光|死/;
const PLACEHOLDER = /此域暫無可用判讀|尚待確認|待校核|undefined|null|\[object/;
const SANCTIONED_STATUS = new Set(['待校核', '此域暫無可用判讀']);
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks += 1; };

function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

// 鎖定命盤（含客訴判準盤 1974-07-02 03:30 與小暑後對照組）＋時辰未知
const CASES = [
  { birthDate: '1974-06-28', birthTime: '18:00', gender: 'male' },
  { birthDate: '1974-07-02', birthTime: '03:30', gender: 'female' },
  { birthDate: '1974-07-08', birthTime: '12:00', gender: 'female' },
  { birthDate: '1974-06-28', timeUnknown: true, gender: 'male' },
];

for (const body of CASES) {
  const label = `${body.birthDate} ${body.birthTime ?? '時辰未知'} ${body.gender}`;
  const normalized = normalizeAsuraInput({ ...body, calendarType: 'solar', timezone: 'Asia/Taipei' });
  const input = normalized?.value ?? normalized;
  const out = await computeGhostAsuraDisplay(input);
  ok(out?.contract === 'ghost-asura-display/v1', `${label}：輸出契約不對`);
  const seals = (out.columns ?? []).flatMap((c) => c.seals ?? []);
  ok(seals.length > 0, `${label}：沒有任何印記，客戶會看到空白頁`);
  for (const s of seals) {
    for (const key of ['name', 'declaration', 'meaning', 'clash']) {
      ok(typeof s[key] === 'string' && s[key].trim().length > 0, `${label}：${s.id}.${key} 空白`);
      ok(!PLACEHOLDER.test(s[key]), `${label}：印記 ${s.id}.${key} 出現佔位字`);
    }
  }
  const { audit, ...shown } = out; // audit 是稽核資料，不上畫面
  for (const text of collectStrings(shown)) {
    ok(!/兵不赤/.test(text), `${label}：成語被名稱替換改壞：${text.slice(0, 60)}`);
    const bad = BAD_WORDS.exec(text);
    ok(!bad, `${label}：畫面出現禁字「${bad?.[0]}」：${text.slice(0, 60)}`);
    // 這兩句單獨成一個字串，是畫面上刻意保留的誠實狀態字（stats.label、戰場分域查無證據時），不是佔位字外洩；
    // 夾在句子裡或出現在印記話術裡才算外洩（印記另有下方逐欄嚴格檢查）。
    if (SANCTIONED_STATUS.has(text.trim())) continue;
    ok(!PLACEHOLDER.test(text), `${label}：佔位字外洩：${text.slice(0, 60)}`);
  }
}

// 手寫話術庫本身：每條四欄齊全、無禁字（來源層，免得壞字等到組出頁面才被發現）
for (const [name, w] of Object.entries(ASURA_WORDINGS)) {
  for (const key of ['shortDeclaration', 'coreWarning', 'battleSignificance', 'verdict']) {
    ok(typeof w[key] === 'string' && w[key].trim().length > 0, `話術庫 ${name}.${key} 空白`);
    const bad = BAD_WORDS.exec(w[key]);
    ok(!bad, `話術庫 ${name}.${key} 含禁字「${bad?.[0]}」`);
  }
}

// 一份來源：features/ghost-asura/wordings.ts 是客戶頁話術的正本；core（雙命盤頁卡片用）與 dictionary（技能層用）
// 凡是同名的條目，四欄必須逐字一致，不許各改各的（2026-10-15 同步 13 條後立下）。
for (const [name, w] of Object.entries(ASURA_WORDINGS)) {
  const core = ASURA_WORDINGS_CORE[name];
  if (core) for (const k of ['shortDeclaration', 'coreWarning', 'battleSignificance', 'verdict']) ok(core[k] === w[k], `core 與正本不一致：${name}.${k}`);
  const dict = COMPLETE_ASURA_DICTIONARY[name];
  if (dict) {
    ok(dict.meaningStrong === w.shortDeclaration, `dictionary 與正本不一致：${name}.meaningStrong`);
    ok(dict.coreMeaning === w.coreWarning, `dictionary 與正本不一致：${name}.coreMeaning`);
    ok(dict.battleSignificance === w.battleSignificance, `dictionary 與正本不一致：${name}.battleSignificance`);
    ok(dict.advice === w.verdict, `dictionary 與正本不一致：${name}.advice`);
  }
}

// 翻譯層引用「core 檔第幾行有這個詞」，改文字不能讓被引用的詞消失。
const coreLines = fs.readFileSync('lib/ghost-asura-wordings-core.ts', 'utf8').replace(/\r\n/g, '\n').split('\n');
const layer = fs.readFileSync('lib/server/ghost-asura-translation-layer.ts', 'utf8');
let cited = 0;
for (const m of layer.matchAll(/word: '([^']+)', wordSource: 'lib\/ghost-asura-wordings-core\.ts:(\d+)'/g)) {
  cited += 1;
  ok((coreLines[Number(m[2]) - 1] ?? '').includes(m[1]), `翻譯層引用失效：「${m[1]}」不在 core 第 ${m[2]} 行`);
}
ok(cited > 0, '應至少有一筆引用（避免正則失效而空轉）');

// 成語保護：原名（血刃…）整段替換會把成語弄成錯字（曾把「兵不血刃」顯示成「兵不赤血刃印」）。
const { createAsuraCustomerCopy, PROTECTED_IDIOMS } = await import('../features/ghost-asura/customerCopy.ts');
const copy = createAsuraCustomerCopy([]);
for (const idiom of PROTECTED_IDIOMS) ok(copy(idiom) === idiom, `成語被改壞：${idiom} → ${copy(idiom)}`);
ok(copy('目光與心意皆為兵器，兵不血刃亦能制敵。') === '目光與心意皆為兵器，兵不血刃亦能制敵。', '魅力引力的成語要原樣');
ok(copy('這一刀是血刃。') !== '這一刀是血刃。', '成語以外的原名仍要正常替換（保護不能放過頭）');
const everyWording = JSON.stringify(Object.values(ASURA_WORDINGS));
ok(!everyWording.includes('兵不赤血刃印'), '話術庫裡不得有被改壞的成語');
// 客戶實際看到的每個字也不得出現這個錯字（4 張鎖定命盤都已掃過，這裡用字面再擋一次）
ok(PROTECTED_IDIOMS.every((i) => !i.includes('赤')), '成語表本身不得含替換後的名稱');

console.log(`ghost-asura-customer-output: ${checks} checks passed（${CASES.length} 張鎖定命盤＋話術庫，免登入）`);
