/**
 * 公信力話術守門（2026-09-16 業主定案：大數據、公信力、權威性話術；後端運算交叉比對，前端只負責視覺感官）
 *
 * 1. 後端重算的狀態＝來源閘門算出的狀態；只有 VERIFIED 才能說「已通過交叉比對」。
 * 2. 三核心依口令《易經》順序：① 八字 ② 紫微斗數 ③ 易經。
 * 3. 前端（app、components）不得出現誇大的大數據／準確度說法。
 * 4. 前端不得匯入後端話術運算檔（會把三份登記表打包進網頁）。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
// 先由 npm run test:credibility-wording 以 tsc 編譯到 .credibility-test-build（含三份來源登記 JSON）。
const B = '../.credibility-test-build/lib/';
const { credibilityReport } = require(B + 'credibility-wording');
const { evaluateClaim, indexSources } = require(B + 'iching-source-gate');
const { BANNED_CLAIMS, CORE_ORDER, FRONTEND_COPY, STATUS_WORDING } = require(B + 'credibility-phrases');

let passed = 0;
/** 去掉否定句（不代表／不是／不得宣稱／並非／也不…）後，剩下的肯定說法才檢查誇大。 */
const affirmative = (s) => s.replace(/(不代表|不是|不得宣稱|並非|也不|不做)[^，。；]*/g, '');
const OVERCLAIM = /科學證實|保證|準確率|大數據將/;
const check = (name, fn) => { fn(); passed += 1; console.log(`PASS: ${name}`); };
const REGISTRY_FILES = {
  八字: 'docs/技能戰鬥檔案/八字/來源登記.json',
  紫微斗數: 'docs/技能戰鬥檔案/紫微斗數/來源登記.json',
  易經: 'docs/技能戰鬥檔案/易經/來源登記.json',
};
const report = credibilityReport(new Date('2026-09-16T00:00:00Z'));

check('三核心依口令《易經》順序：① 八字 ② 紫微斗數 ③ 易經', () => {
  assert.deepEqual([...CORE_ORDER], ['八字', '紫微斗數', '易經']);
  assert.deepEqual(report.cores.map((c) => `${c.order}${c.core}`), ['1八字', '2紫微斗數', '3易經']);
});

check('後端重算的每一項狀態都等於來源閘門算出的狀態', () => {
  for (const core of report.cores) {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_FILES[core.core], 'utf8'));
    const index = indexSources(registry);
    assert.equal(core.claims.length, registry.claims.length, `${core.core} 登記項目數不符`);
    for (const claim of core.claims) {
      const source = registry.claims.find((c) => c.claim_id === claim.claimId);
      assert.equal(claim.status, evaluateClaim(source, index).status, `${claim.claimId} 狀態不符`);
    }
    assert.equal(core.sourceCount, registry.sources.length);
  }
});

check('句子不得比狀態說得更滿：只有 VERIFIED 能說「已通過交叉比對」', () => {
  for (const core of report.cores) {
    for (const claim of core.claims) {
      const saysVerified = claim.customerLine.includes(STATUS_WORDING.VERIFIED);
      assert.equal(saysVerified, claim.status === 'VERIFIED', `${claim.claimId}（${claim.status}）句子：${claim.customerLine}`);
      assert.ok(!OVERCLAIM.test(affirmative(claim.customerLine)), `${claim.claimId} 句子含禁用宣稱：${claim.customerLine}`);
    }
  }
  for (const text of Object.values(report.phrases)) assert.ok(!OVERCLAIM.test(affirmative(text)), `核准句含誇大：${text}`);
});

const frontendFiles = execSync('git ls-files app components', { encoding: 'utf8' })
  .split('\n').filter((f) => /\.(tsx?|jsx?)$/.test(f) && !f.startsWith('app/api/') && fs.existsSync(f));

check('前端不得出現誇大的大數據／準確度說法', () => {
  const hits = [];
  for (const file of frontendFiles) {
    // 註解是給工程師的歷史紀錄（例如記下舊說法為何錯），客戶看不到；只掃程式與畫面文字。
    const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    for (const { phrase, reason } of BANNED_CLAIMS) if (text.includes(phrase)) hits.push(`${file}：「${phrase}」（${reason}）`);
  }
  assert.deepEqual(hits, [], `前端仍有誇大說法：\n${hits.join('\n')}`);
});

check('原本誇大的四處已改用核准文案（lib/credibility-phrases.ts）', () => {
  const uses = (file, key) => assert.match(fs.readFileSync(file, 'utf8'), new RegExp(`FRONTEND_COPY\\.${key}`), `${file} 要用 FRONTEND_COPY.${key}`);
  uses('app/page.tsx', 'terminalTitle');
  uses('app/page.tsx', 'nameHint');
  uses('app/match/page.tsx', 'nameHint');
  uses('app/insight/page.tsx', 'accuracyStep');
  uses('app/growth-center/page.tsx', 'longTermMilestone');
  assert.ok(FRONTEND_COPY.accuracyStep.label.includes('資料完整度'));
});

check('三處時辰卡只顯示中性時段，不顯示沒有出處的個性描述（2026-09-17 業主批准）', () => {
  // 各檔時辰卡用的變數名不同；紫微頁另有姓名字義的 item.imagery（不是時辰卡），所以逐檔指定。
  for (const [file, variable] of [['components/UnifiedBirthForm.tsx', 'item'], ['app/insight/page.tsx', 's'], ['components/PersonalityMusicFlow.tsx', 's']]) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes(`{${variable}.imagery}`), false, `${file} 時辰卡仍顯示個性描述`);
    assert.ok(text.includes(`{${variable}.period}`), `${file} 時辰卡要顯示中性時段`);
  }
  const list = fs.readFileSync('lib/shichen-engine.ts', 'utf8');
  assert.equal((list.match(/period: '/g) || []).length, 12, '十二時辰都要有中性時段');
});

check('前端不得匯入後端話術運算檔（只能呼叫 /api/credibility 照印）', () => {
  const offenders = frontendFiles.filter((f) => /from\s+['"](@\/lib|\.\.?\/[^'"]*lib)\/credibility-wording['"]/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
  assert.match(fs.readFileSync('app/api/credibility/route.ts', 'utf8'), /credibilityReport\(\)/);
});

console.log(`credibility wording — PASS ${passed}`);
