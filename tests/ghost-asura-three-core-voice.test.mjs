/**
 * 鬼魅阿修羅「三核心修羅口吻」守門（八字 → 紫微 → 易經，一個聲音）
 * ============================================================================
 * 守的事：
 *  1. 話術表齊全：10 日干、14 命宮主星、64 卦、6 動位，每句都有、不重複。
 *  2. 卦的序號與引擎一致（引擎給的卦名 === 我們表上同序號的卦名），不會對錯卦。
 *  3. 輸出零命理術語、零禁字（必定、註定、大凶、血光…），也不洩漏干支、星名、卦名。
 *  4. 八字那一句用「獨立算的日干」核對（不引用產品程式）；易經那一句核對引擎卦號；紫微那一句核對命宮。
 *  5. 四柱核對沒過／易經沒起卦：整段 null，不補、不猜。
 *  6. 端點與前端：同源檢查、不含 Math.random、前端不自己組句。
 * 不需登入、不需啟動伺服器；直接呼叫後端函式（與端點同一條路徑）。
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
Module._resolveFilename = function patched(request, ...rest) { return request === 'server-only' ? stubFile : originalResolve.call(this, request, ...rest); };

const voiceMod = await import('../lib/server/asura-three-core-voice.ts');
const { normalizeAsuraInput, computeGhostAsuraDisplay } = await import('../lib/server/ghost-asura-display.ts');
const { calculateDualChart } = await import('../lib/dual-chart.ts');
const { castHexagramFromBirth } = await import('../lib/iching-engine.ts');
const { ASURA_STEM_VOICE, ASURA_LIFE_STAR_VOICE, ASURA_HEXAGRAM_VOICE, ASURA_CHANGING_LINE_VOICE, HEXAGRAM_NAMES, buildAsuraThreeCoreVoice, deriveAsuraVoiceFacts } = voiceMod;

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks += 1; };

const BAD = /必定|一定會|註定|大凶|血光|必然|死/;
const JARGON = /八字|紫微|斗數|宮位|主星|神煞|四化|廟旺|五行|易經|卦|爻|干支|四柱|命宮|日主|日干|天干|地支|十神|大運|流年/;
const GANZHI = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/;

// 1. 表齊全
ok(Object.keys(ASURA_STEM_VOICE).length === 10, '10 個日干');
ok(Object.keys(ASURA_LIFE_STAR_VOICE).length === 14, '14 顆主星');
ok(ASURA_HEXAGRAM_VOICE.length === 64 && HEXAGRAM_NAMES.length === 64, '64 卦話術與卦名');
ok(ASURA_CHANGING_LINE_VOICE.length === 6, '6 個動位');
const tables = [Object.values(ASURA_STEM_VOICE), Object.values(ASURA_LIFE_STAR_VOICE), ASURA_HEXAGRAM_VOICE, ASURA_CHANGING_LINE_VOICE];
for (const table of tables) {
  ok(new Set(table).size === table.length, '話術不重複');
  for (const line of table) {
    ok(typeof line === 'string' && line.length >= 8 && line.length <= 60, `長度合理：${line}`);
    ok(!BAD.test(line), `無禁字：${line}`);
    ok(!JARGON.test(line), `無命理術語：${line}`);
    ok(!GANZHI.test(line), `無干支：${line}`);
  }
}
const stars = Object.keys(ASURA_LIFE_STAR_VOICE);
for (const table of tables) for (const line of table) {
  for (const star of stars) ok(!line.includes(star), `話術不洩漏星名 ${star}：${line}`);
  for (const name of HEXAGRAM_NAMES) ok(!line.includes(name), `話術不洩漏卦名 ${name}：${line}`);
}

// 2. 卦序號與引擎一致（掃一大片生辰，凡引擎給過的序號都核對）
const seen = new Map();
for (let y = 1920; y < 2020; y += 1) for (let mo = 1; mo <= 12; mo += 1) for (let d = 1; d <= 28; d += 5) for (let h = 0; h < 12; h += 2) {
  const r = castHexagramFromBirth(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, h);
  seen.set(r.kingWen, r.hexagramName);
}
ok(seen.size >= 30, `掃到足夠多的卦（${seen.size}）`);
for (const [kingWen, name] of seen) ok(HEXAGRAM_NAMES[kingWen - 1] === name, `序號 ${kingWen} 引擎=${name}、我們=${HEXAGRAM_NAMES[kingWen - 1]}`);

// 4. 隨機盤端到端
const SIXTY_ANCHOR = { date: Date.UTC(1974, 6, 2), index: 40 }; // 1974-07-02 = 甲辰（四柱鎖定判準，tests/bazi-core.test.ts）
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const independentDayStem = (iso) => { const [y, m, d] = iso.split('-').map(Number); const days = Math.round((Date.UTC(y, m - 1, d) - SIXTY_ANCHOR.date) / 86400000); return STEMS[(((SIXTY_ANCHOR.index + days) % 60) + 60) % 60 % 10]; };
ok(independentDayStem('1974-07-02') === '甲', '獨立日干錨點');
let seed = 20261019; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const pick = (n) => Math.floor(rnd() * n);
let nonNull = 0; const usedStars = new Set(); const usedHex = new Set();
for (let i = 0; i < 250; i += 1) {
  const raw = { birthDate: `${1920 + pick(100)}-${String(1 + pick(12)).padStart(2, '0')}-${String(1 + pick(28)).padStart(2, '0')}`, birthTime: `${String(1 + pick(21)).padStart(2, '0')}:${String(pick(60)).padStart(2, '0')}`, gender: rnd() < 0.5 ? 'male' : 'female' };
  const ni = normalizeAsuraInput(raw); delete ni.hourAssumed; delete ni.identityTarget;
  const result = calculateDualChart(ni);
  const page = computeGhostAsuraDisplay(raw);
  const facts = deriveAsuraVoiceFacts(result, page);
  ok(facts !== null, `四柱核對通過的盤要有事實：${raw.birthDate} ${raw.birthTime}`);
  const voice = buildAsuraThreeCoreVoice(result, page);
  ok(voice && voice.lines.length === 4, '四句：本色、鋒芒、斷語、戰局');
  nonNull += 1;
  ok(facts.dayStem === independentDayStem(raw.birthDate), `日干與獨立算法一致 ${raw.birthDate}：${facts.dayStem}`);
  ok(voice.lines[0].text === ASURA_STEM_VOICE[facts.dayStem], '八字那句＝日干話術');
  const ming = result.ziwei.palaces.filter((p) => p.key === 'MING');
  ok(ming.length === 1, '命宮唯一');
  for (const s of facts.lifeStars) { ok(ming[0].majorStars.includes(s), '主星來自命宮'); usedStars.add(s); }
  ok(facts.lifeStars.every((s) => voice.lines[1].text.includes(ASURA_LIFE_STAR_VOICE[s])) || facts.lifeStars.length > 2, '紫微那句＝命宮主星話術');
  const hex = result.specialStars.iching.hexagram;
  ok(HEXAGRAM_NAMES[facts.kingWen - 1] === hex.name, `卦序號對應引擎卦名：${facts.kingWen}／${hex.name}`);
  ok(voice.lines[2].text.startsWith(ASURA_HEXAGRAM_VOICE[facts.kingWen - 1]), '易經那句＝該卦話術');
  ok(voice.lines[2].text.endsWith(ASURA_CHANGING_LINE_VOICE[facts.changingLine - 1]), '動位話術');
  usedHex.add(facts.kingWen);
  // 與阿修羅頁不矛盾：戰局句的「醒著 N 種」＝頁面統計的覺醒種數，力道最重的柱＝頁面欄位印記最多的柱
  const pageAwake = Number(page.stats.find((x) => x.label === '印記覺醒').value);
  ok(facts.awakenedKinds === pageAwake, `醒著種數與頁面統計一致：${facts.awakenedKinds} vs ${pageAwake}（${raw.birthDate} ${raw.birthTime}）`);
  const pageMax = Math.max(0, ...page.columns.map((c) => c.seals.length));
  const pageFocus = pageMax > 0 ? page.columns.filter((c) => c.seals.length === pageMax).map((c) => c.heading) : [];
  ok(JSON.stringify(pageFocus) === JSON.stringify(facts.focusHeads), `力道最重的柱與頁面一致：${pageFocus} vs ${facts.focusHeads}`);
  ok(voice.lines[3].text === (pageAwake === 0 ? '盤上沒有醒著的印記。路，你自己鋪。' : `醒著的印記有 ${pageAwake} 種，力道壓在${pageFocus.join('、')}。`), '戰局句＝頁面事實');
  const wire = JSON.stringify(voice);
  ok(!BAD.test(wire) && !JARGON.test(wire) && !GANZHI.test(wire), '輸出零禁字、零術語、零干支');
  ok(JSON.stringify(voice) === JSON.stringify(buildAsuraThreeCoreVoice(result, page)), '同盤同輸出（不隨機）');
  ok(voice.lines.every((l) => l.label && l.text.trim()), '每句都有標籤與內容');
}
ok(nonNull === 250, '250 張盤全數成立');
ok(usedStars.size >= 10 && usedHex.size >= 20, `覆蓋夠廣（主星 ${usedStars.size}、卦 ${usedHex.size}）`);

// 5. 沒成立就 null
const EMPTY_PAGE = { columns: [] };
const fakeBlocked = { core: { pillars: { day: { heavenlyStem: '甲' } } }, ziwei: { palaces: [{ key: 'MING', majorStars: ['武曲'], majorStarDetails: [] }] }, specialStars: { iching: { state: 'BLOCKED' } } };
ok(buildAsuraThreeCoreVoice(fakeBlocked, EMPTY_PAGE) === null, '易經 BLOCKED → null');
ok(buildAsuraThreeCoreVoice({ ...fakeBlocked, specialStars: {} }, EMPTY_PAGE) === null, '沒有易經層 → null');
const fakeReady = (over) => ({ core: { pillars: { day: { heavenlyStem: '甲' } } }, ziwei: { palaces: [{ key: 'MING', majorStars: [], majorStarDetails: [] }] }, specialStars: { iching: { state: 'READY', hexagram: { kingWen: 1, changingLine: 1 }, ...over } } });
ok(buildAsuraThreeCoreVoice(fakeReady({ hexagram: { kingWen: 65, changingLine: 1 } }), EMPTY_PAGE) === null, '卦號超出 → null');
ok(buildAsuraThreeCoreVoice(fakeReady({ hexagram: { kingWen: 1, changingLine: 7 } }), EMPTY_PAGE) === null, '動位超出 → null');
const noStar = buildAsuraThreeCoreVoice(fakeReady({}), EMPTY_PAGE);
ok(noStar && noStar.lines[1].text.includes('沒有一顆星') && noStar.lines[3].text.includes('沒有醒著的印記'), '無主星、無醒著的印記：照實說，不編造');
ok(buildAsuraThreeCoreVoice(fakeReady({}), EMPTY_PAGE, { hourAssumed: true }).note.includes('夜半'), '時辰未說：後端提示夜半起算');

// 6. 端點與前端
const route = fs.readFileSync('app/api/ghost-asura/three-core-voice/route.ts', 'utf8');
ok(/sameOrigin\(request\)/.test(route), '端點檢查同源');
ok(/text\.length > 2048/.test(route), '端點限制輸入長度');
ok(/buildAsuraThreeCoreVoice/.test(route) && !/Math\.random/.test(route), '端點走後端函式、不含隨機');
const frontFiles = ['features/ghost-asura/components/AsuraVoiceCard.tsx'].filter((f) => fs.existsSync(f));
for (const f of frontFiles) {
  const code = fs.readFileSync(f, 'utf8');
  ok(!/Math\.random|from '@\/lib\/server|calculateDualChart|ASURA_HEXAGRAM_VOICE|ASURA_STEM_VOICE/.test(code), `${f} 不運算、不匯入後端話術表`);
  ok(!/[，。；][^`'"<>{}]*[，。；]/.test(code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/aria-label="[^"]*"/g, '')), `${f} 不自己組中文句子`);
}

console.log(`ghost-asura-three-core-voice: ${checks} checks passed（八字日干獨立核對、${usedHex.size} 種卦、${usedStars.size} 種主星、零術語）`);
