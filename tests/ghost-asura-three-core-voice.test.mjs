/**
 * 鬼魅阿修羅「修羅斷語」守門（只用現有素材，不自編）
 * ============================================================================
 * 守的事：
 *  1. 沒有任何自撰話術表：本檔原始碼不得再有日干、64 卦、命宮主星的自寫句子。
 *  2. 斷語內容＝卦意知識庫（data/iching-hexagrams.json）原文，只換句式；用獨立算法逐盤核對。
 *  3. 動位（前半局／後半局）與關鍵動作語＝引擎自己的卦象結構；用獨立的八卦表逐盤核對。
 *  4. 戰局句＝阿修羅頁自己的欄位（醒著種數、力道最重的柱），逐盤與頁面一致。
 *  5. 輸出零命理術語、零禁字、零干支、不洩漏卦名全名。
 *  6. 四柱核對沒過／易經沒起卦：整段 null，不補、不猜。
 *  7. 端點同源與長度限制；前端不運算、不自己組句。
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
const { buildAsuraThreeCoreVoice, deriveAsuraVoiceFacts, asuraShortSentences } = voiceMod;
const KNOWLEDGE = JSON.parse(fs.readFileSync('data/iching-hexagrams.json', 'utf8')).hexagrams;

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks += 1; };

const BAD = /必定|一定會|註定|大凶|血光|必然|死/;
const JARGON = /八字|紫微|斗數|宮位|主星|神煞|四化|廟旺|五行|易經|卦|爻|干支|四柱|命宮|日主|日干|天干|地支|十神|大運|流年/;
const GANZHI = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/;

// 引擎八卦動作語（測試用的獨立對照表，來源 lib/iching-engine.ts TRIGRAMS；以天澤火雷風水山地的自然象為鍵）
const ACTION_OF = { 天: '主動開局、承擔決定', 澤: '開口對話、以和為進', 火: '把事情攤在檯面上看清楚', 雷: '立即行動、先動再修', 風: '循序滲透、以柔化阻', 水: '審慎渡險、以智取不以力取', 山: '先停、劃界線、守住不該動的', 地: '順勢承接、先養底盤' };

// 1. 沒有自撰話術表
for (const gone of ['ASURA_STEM_VOICE', 'ASURA_HEXAGRAM_VOICE', 'ASURA_CHANGING_LINE_VOICE', 'ASURA_LIFE_STAR_VOICE', 'HEXAGRAM_NAMES']) ok(!(gone in voiceMod), `不得再有自撰話術表：${gone}`);
const src = fs.readFileSync('lib/server/asura-three-core-voice.ts', 'utf8').split('\n').filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); }).join('\n');
const STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];
for (const star of STARS) ok(!src.includes(star), `本檔不得自寫命宮主星話術：${star}`);
ok(!/heavenlyStem|palaces|majorStars|minorStars|MING/.test(src), '本檔不讀日干也不讀命宮（八字只做驗證、命宮只走本性卡）');

// 2. 素材本身可用：64 卦都有「主題：行動語」、無術語、無禁字
ok(Object.keys(KNOWLEDGE).length === 64, '卦意知識庫 64 筆');
for (const [k, v] of Object.entries(KNOWLEDGE)) {
  ok(v.advice.includes('：') && v.advice.length <= 40, `第 ${k} 筆格式`);
  ok(!JARGON.test(v.advice) && !GANZHI.test(v.advice), `第 ${k} 筆行動語無術語：${v.advice}`);
  ok(!BAD.test(asuraShortSentences(v.advice)) && asuraShortSentences(v.advice).length >= 6, `第 ${k} 筆轉成修羅短句後無禁字、仍有內容`);
}
for (const [nature, action] of Object.entries(ACTION_OF)) ok(!JARGON.test(action) && !BAD.test(action), `八卦動作語乾淨：${nature}`);
ok(asuraShortSentences('天行健：主動開創，把握主導權，但戒亢龍有悔，勿衝過頭') === '天行健。主動開創。把握主導權。戒亢龍有悔。勿衝過頭。', '句式轉換：只切句、去開頭「但」，不增字');
ok(asuraShortSentences('') === '', '空字串回空');
ok(asuraShortSentences('節制有度：立規矩控節奏，但別節到把自己勒死') === '節制有度。立規矩控節奏。', '含禁字的子句整句略過，其餘原樣');

// 3. 隨機盤端到端
let seed = 20261019; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const pick = (n) => Math.floor(rnd() * n);
const independentShort = (advice) => { const parts = advice.replace('：', '，').split('，').map((s) => s.trim()).map((s) => (s.startsWith('但') ? s.slice(1).trim() : s)).filter((s) => s && !BAD.test(s)); return `${parts.join('。')}。`; };
const usedHex = new Set(); const usedActions = new Set(); const halves = new Set();
for (let i = 0; i < 250; i += 1) {
  const raw = { birthDate: `${1920 + pick(100)}-${String(1 + pick(12)).padStart(2, '0')}-${String(1 + pick(28)).padStart(2, '0')}`, birthTime: `${String(1 + pick(21)).padStart(2, '0')}:${String(pick(60)).padStart(2, '0')}`, gender: rnd() < 0.5 ? 'male' : 'female' };
  const ni = normalizeAsuraInput(raw); delete ni.hourAssumed; delete ni.identityTarget;
  const result = calculateDualChart(ni);
  const page = computeGhostAsuraDisplay(raw);
  const facts = deriveAsuraVoiceFacts(result, page);
  ok(facts !== null, `四柱核對通過的盤要有事實：${raw.birthDate} ${raw.birthTime}`);
  const voice = buildAsuraThreeCoreVoice(result, page);
  ok(voice && voice.lines.length === 2 && voice.lines.map((l) => l.label).join() === '斷語,戰局', '兩句：斷語、戰局');
  const hex = result.specialStars.iching.hexagram;
  usedHex.add(hex.kingWen);
  // 斷語＝知識庫原文只換句式
  const know = KNOWLEDGE[String(hex.kingWen)];
  ok(know && know.advice, `卦 ${hex.kingWen} 在知識庫內`);
  const text = voice.lines[0].text;
  ok(text.startsWith(independentShort(know.advice)), `斷語內容＝知識庫原文只換句式：卦 ${hex.kingWen}｜${text}`);
  // 動位＝引擎卦象結構（獨立八卦表核對）
  const name = hex.name;
  const [upper, lower] = name[1] === '為' ? [name[2], name[2]] : [name[0], name[1]];
  ok(ACTION_OF[upper] && ACTION_OF[lower], `卦名可拆出上下卦：${name}`);
  const lowHalf = hex.changingLine <= 3;
  const expectHalf = lowHalf ? '前半局' : '後半局';
  const expectAction = ACTION_OF[lowHalf ? lower : upper];
  ok(text.endsWith(`變數落在${expectHalf}。關鍵在${expectAction}。`), `動位與關鍵動作語和卦象結構一致：${name} 第${hex.changingLine}爻 → ${expectHalf}／${expectAction}`);
  halves.add(expectHalf); usedActions.add(expectAction);
  // 與阿修羅頁不矛盾
  const pageAwake = Number(page.stats.find((x) => x.label === '印記覺醒').value);
  ok(facts.awakenedKinds === pageAwake, `醒著種數與頁面統計一致：${facts.awakenedKinds} vs ${pageAwake}`);
  const pageMax = Math.max(0, ...page.columns.map((c) => c.seals.length));
  const pageFocus = pageMax > 0 ? page.columns.filter((c) => c.seals.length === pageMax).map((c) => c.heading) : [];
  ok(JSON.stringify(pageFocus) === JSON.stringify(facts.focusHeads), `力道最重的柱與頁面一致：${pageFocus} vs ${facts.focusHeads}`);
  ok(voice.lines[1].text === (pageAwake === 0 ? '盤上沒有醒著的印記。路，你自己鋪。' : `醒著的印記有 ${pageAwake} 種，力道壓在${pageFocus.join('、')}。`), '戰局句＝頁面事實');
  // 零術語、不洩漏卦名全名
  const wire = JSON.stringify(voice);
  ok(!BAD.test(wire) && !JARGON.test(wire) && !GANZHI.test(wire), '輸出零禁字、零術語、零干支');
  ok(!wire.includes(name), `不洩漏卦名全名：${name}`);
  ok(wire === JSON.stringify(buildAsuraThreeCoreVoice(result, page)), '同盤同輸出（不隨機）');
}
ok(usedHex.size >= 20, `覆蓋夠廣（卦 ${usedHex.size}）`);
ok(halves.size === 2 && usedActions.size >= 6, `前後半局與八卦動作語都覆蓋到（動作語 ${usedActions.size} 種）`);

// 4. 沒成立就 null；格式缺漏時不補、不猜
const EMPTY_PAGE = { columns: [] };
const ADVICE = '天行健：主動開創，把握主導權，但戒亢龍有悔，勿衝過頭（動爻第2爻，落在下卦乾，關鍵在主動開局、承擔決定）。';
const fake = (iching) => ({ specialStars: { iching } });
ok(buildAsuraThreeCoreVoice(fake({ state: 'BLOCKED' }), EMPTY_PAGE) === null, '易經 BLOCKED → null');
ok(buildAsuraThreeCoreVoice({ specialStars: {} }, EMPTY_PAGE) === null, '沒有易經層 → null');
ok(buildAsuraThreeCoreVoice(fake({ state: 'READY', hexagram: {} }), EMPTY_PAGE) === null, '沒有卦意 → null');
const full = buildAsuraThreeCoreVoice(fake({ state: 'READY', hexagram: { advice: ADVICE } }), EMPTY_PAGE);
ok(full && full.lines[0].text === '天行健。主動開創。把握主導權。戒亢龍有悔。勿衝過頭。變數落在前半局。關鍵在主動開局、承擔決定。', '完整格式：只換句式');
ok(full.lines[1].text.includes('沒有醒著的印記'), '無醒著的印記：照實說，不編造');
const noTail = buildAsuraThreeCoreVoice(fake({ state: 'READY', hexagram: { advice: '先捨後得：主動削減不必要的，換取更關鍵的' } }), EMPTY_PAGE);
ok(noTail && noTail.lines[0].text === '先捨後得。主動削減不必要的。換取更關鍵的。', '沒有動位提示時只留卦意，不補、不猜');
ok(buildAsuraThreeCoreVoice(fake({ state: 'READY', hexagram: { advice: ADVICE } }), EMPTY_PAGE, { hourAssumed: true }).note.includes('夜半'), '時辰未說：後端提示夜半起算');

// 5. 端點與前端
const route = fs.readFileSync('app/api/ghost-asura/three-core-voice/route.ts', 'utf8');
ok(/sameOrigin\(request\)/.test(route), '端點檢查同源');
ok(/text\.length > 2048/.test(route), '端點限制輸入長度');
ok(/buildAsuraThreeCoreVoice/.test(route) && !/Math\.random/.test(route), '端點走後端函式、不含隨機');
for (const f of ['features/ghost-asura/components/AsuraVoiceCard.tsx'].filter((x) => fs.existsSync(x))) {
  const code = fs.readFileSync(f, 'utf8');
  ok(!/Math\.random|from '@\/lib\/server|calculateDualChart|asuraShortSentences/.test(code), `${f} 不運算、不匯入後端函式`);
  ok(!/[，。；][^`'"<>{}]*[，。；]/.test(code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/aria-label="[^"]*"/g, '')), `${f} 不自己組中文句子`);
}

console.log(`ghost-asura-three-core-voice: ${checks} checks passed（斷語＝卦意知識庫原文只換句式、動位對八卦表、${usedHex.size} 種卦、零自撰話術表）`);
