/**
 * 鬼魅阿修羅｜話術含金量守門
 * 句庫完整、口氣規則、相似度、確定性、依客戶資料挑句、未接構面不外流、無資料不頂替。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import library from '../docs/技能戰鬥檔案/鬼魅阿修羅/候選話術-100句.json';
import { createBaziCore, type BaziBirthInput } from '../lib/bazi/engine';
import {
  pickGoldWording, matchDimensions, WIRED_DIMENSIONS, EXCESS_SHARE_THRESHOLD,
} from '../lib/ghost-asura-gold-wording';

let pass = 0;
const ok = (label: string, fn: () => void) => { fn(); pass++; console.log(`  ✓ ${label}`); };

const entries = library.entries as Array<{ id: string; stem: string; dimension: string; line: string; source: string[] }>;

/** 不得宣稱的字（須與 話術含金量技能.md〈5.2〉一致；新增禁語兩邊一起改） */
const OVERCLAIM = ['必定', '註定', '保證', '準確度', '大數據證明', '科學已證實', '國家認證'];

// 與 lib/server/ghost-asura-voice.ts 的 lintAsuraVoice 同規則（該檔 server-only，無法直接匯入）
const HOLLOW = ['無敵', '最強', '天下第一', '所向披靡', '無人能擋', '宇宙', '神級', '天選之人', '穩贏', '必勝'];
function lint(text: string): string[] {
  const p: string[] = [];
  if (/[?？]/.test(text)) p.push('不發問');
  if (/[!！]/.test(text)) p.push('不用驚嘆號');
  if (/(嗎|吧|呢|請|希望|拜託|好不好)/.test(text)) p.push('不求認同');
  if (/(因為|所以|之所以)/.test(text)) p.push('不解釋原因');
  if (/(可能|也許|或許|大概)/.test(text)) p.push('不含糊');
  if (/(笨|蠢|廢物|可憐|活該|弱者|沒用)/.test(text)) p.push('不羞辱');
  if (/(委屈|無奈|可惜|沒人懂我|誤會我)/.test(text)) p.push('不自憐');
  if (/(你會|你將|明年|下個月|一定會發生)/.test(text)) p.push('不做具體預言');
  if (/(都是我|多虧我|感謝我|我付出|辛苦|沒人感謝|我替你扛了|功勞)/.test(text)) p.push('不邀功');
  if (/(小心|後果|等著瞧|報應|我早就說過|看吧|走著瞧|你逃不掉)/.test(text)) p.push('不威嚇');
  if (/(大凶|血光)/.test(text) || OVERCLAIM.some((w) => text.includes(w))) p.push('越過證據上限');
  if (HOLLOW.some((h) => text.includes(h))) p.push('空洞誇詞');
  for (const s of text.split('。').map((x) => x.trim()).filter(Boolean)) if (s.length > 16) p.push(`句長 ${s.length}`);
  return p;
}
const grams = (t: string) => { const s = t.replace(/[。，\s]/g, ''); const g = new Set<string>(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); return g; };
const sim = (a: string, b: string) => { const A = grams(a), B = grams(b); let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); };

const customer = (over: Partial<BaziBirthInput>): BaziBirthInput => ({
  gender: 'female', birthDate: '1974-7-2', birthTimeKnown: true, birthTime: '03:30', ...over,
});

console.log('話術含金量守門');

ok('句庫 100 句：10 日元 × 10 構面，編號唯一', () => {
  assert.equal(entries.length, 100);
  assert.equal(new Set(entries.map((e) => e.id)).size, 100);
  assert.equal(new Set(entries.map((e) => `${e.stem}/${e.dimension}`)).size, 100);
});

ok('每句附出處標記', () => {
  for (const e of entries) assert.ok(e.source.length >= 2 && e.source[0].includes('ghost-asura-narrative-engine.ts'), e.id);
});

ok('100 句全過口氣規則與證據上限', () => {
  for (const e of entries) assert.deepEqual(lint(e.line), [], `${e.id} ${e.line}`);
});

ok('句與句相似度不超過 0.72', () => {
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    assert.ok(sim(entries[i].line, entries[j].line) <= 0.72, `${entries[i].id}~${entries[j].id}`);
  }
});

const cases: Array<[string, BaziBirthInput]> = [
  ['1974-07-02 03:30 女', customer({})],
  ['1990-03-15 時辰未知 男', customer({ gender: 'male', birthDate: '1990-3-15', birthTimeKnown: false, birthTime: undefined })],
  ['1985-11-23 14:20 男', customer({ gender: 'male', birthDate: '1985-11-23', birthTime: '14:20' })],
  ['2001-05-08 09:00 女', customer({ birthDate: '2001-5-8', birthTime: '09:00' })],
];

ok('同一份資料重複挑句結果完全相同', () => {
  for (const [, input] of cases) {
    const a = pickGoldWording(createBaziCore(input));
    for (let i = 0; i < 20; i++) assert.deepEqual(pickGoldWording(createBaziCore(input)), a);
  }
});

ok('不同客戶資料得到不同的句子', () => {
  const lines = cases.map(([, input]) => { const r = pickGoldWording(createBaziCore(input)); assert.equal(r.status, 'OK'); return r.status === 'OK' ? r.id : ''; });
  assert.ok(new Set(lines).size >= 3, lines.join(','));
});

ok('沒填時辰一律先說明（挑到「時辰未填」構面）', () => {
  const core = createBaziCore(cases[1][1]);
  assert.equal(core.timePrecision, 'UNKNOWN_TIME');
  const r = pickGoldWording(core);
  assert.ok(r.status === 'OK' && r.dimension === 'HOUR_UNKNOWN');
});

ok('「時辰未填」句與卡片提示一致：都說暫以夜半起算，不得自稱「不補編」', () => {
  // 顯示管線對沒填時辰的客人以子時（夜半）暫排，並印出「我以夜半起算」；句子不得與之矛盾
  const unknown = entries.filter((e) => e.dimension === 'HOUR_UNKNOWN');
  assert.equal(unknown.length, 10);
  for (const e of unknown) {
    assert.ok(e.line.includes('夜半'), `${e.id} 未說明夜半起算：${e.line}`);
    assert.ok(!/(不補編|不替你編|不編|不假造|不猜)/.test(e.line), `${e.id} 與卡片「以夜半起算」矛盾：${e.line}`);
  }
});

ok('客戶看得到的句子不得出現命理術語（SKILL_LOCK 術語封鎖精神）', () => {
  // 取自 lib/server/ghost-asura-voice.ts 的 PLAIN_JARGON 中的命理名詞，再加上本次確認要換成白話的詞
  const JARGON = /(月令|五行|貴人|印記|命盤|命格|八字|四柱|十神|神煞|煞|盤上|天干|地支|年柱|月柱|日柱|時柱|紫微|命宮)/;
  for (const e of entries) assert.ok(!JARGON.test(e.line), `${e.id} ${e.line}`);
});

ok('技能檔寫明證據上限：〈5.1〉〈5.2〉〈5.4〉存在，且不得宣稱清單涵蓋守門的每個禁語', () => {
  const doc = readFileSync(
    new URL('../docs/技能戰鬥檔案/鬼魅阿修羅/話術含金量技能.md', import.meta.url),
    'utf8',
  );
  for (const h of ['### 5.1 證據只證明到哪裡', '### 5.2 不得宣稱', '### 5.4 要老實標出的限制']) assert.ok(doc.includes(h), `技能檔缺 ${h}`);
  const claims = doc.slice(doc.indexOf('### 5.2'), doc.indexOf('### 5.3'));
  for (const w of OVERCLAIM) assert.ok(claims.includes(w), `技能檔〈5.2〉未列出禁語：${w}`);
});

ok('句子不隨日期變，不得寫「今日」', () => {
  for (const e of entries) assert.ok(!e.line.includes('今日'), `${e.id} ${e.line}`);
});

ok('命中的句子必屬該客戶日元，且構面確實命中', () => {
  for (const [, input] of cases) {
    const core = createBaziCore(input);
    const r = pickGoldWording(core);
    assert.ok(r.status === 'OK');
    if (r.status !== 'OK') continue;
    assert.ok(entries.find((e) => e.id === r.id)!.stem === core.dayMaster.stem);
    assert.ok(matchDimensions(core).includes(r.dimension));
  }
});

ok('後端無欄位的構面（提醒類神煞、流年）不外流', () => {
  assert.ok(!WIRED_DIMENSIONS.includes('WARNING_STAR'));
  assert.ok(!WIRED_DIMENSIONS.includes('FLOW_YEAR'));
  for (const [, input] of cases) {
    const r = pickGoldWording(createBaziCore(input));
    assert.ok(r.status === 'OK' && WIRED_DIMENSIONS.includes(r.dimension));
  }
});

ok('偏旺門檻固定為 0.45（改動須同步審查）', () => assert.equal(EXCESS_SHARE_THRESHOLD, 0.45));

ok('分布守門：1500 組固定隨機生辰，任一構面不得獨占超過 35%，至少 6 種構面被用到', () => {
  let seed = 12345;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const picked: Record<string, number> = {};
  const lines = new Set<string>();
  const N = 1500;
  for (let i = 0; i < N; i++) {
    const known = rnd() > 0.2;
    const core = createBaziCore({
      gender: rnd() > 0.5 ? 'male' : 'female',
      birthDate: `${1950 + Math.floor(rnd() * 70)}-${1 + Math.floor(rnd() * 12)}-${1 + Math.floor(rnd() * 28)}`,
      birthTimeKnown: known,
      birthTime: known ? `${String(Math.floor(rnd() * 24)).padStart(2, '0')}:10` : undefined,
    });
    const r = pickGoldWording(core);
    assert.equal(r.status, 'OK');
    if (r.status === 'OK') { picked[r.dimension] = (picked[r.dimension] || 0) + 1; lines.add(r.id); }
  }
  const max = Math.max(...Object.values(picked)) / N;
  console.log('    分布', Object.entries(picked).map(([k, v]) => `${k} ${(v / N * 100).toFixed(1)}%`).join('｜'), `｜用到 ${lines.size} 句`);
  assert.ok(max <= 0.35, `最大占比 ${(max * 100).toFixed(1)}%`);
  assert.ok(Object.keys(picked).length >= 6);
});

ok('查無資料時回明確中文狀態，不用別句頂替', () => {
  const r = pickGoldWording({ dayMaster: undefined } as never);
  assert.deepEqual(r, { status: 'UNAVAILABLE', message: '技能檔無此資料，暫不顯示' });
});

console.log(`\n通過 ${pass} 組\n`);
console.log('實跑示範（同一套後端，不同資料）：');
for (const [label, input] of cases) {
  const core = createBaziCore(input);
  const r = pickGoldWording(core);
  if (r.status === 'OK') {
    console.log(`\n▸ ${label}`);
    console.log(`  日柱 ${core.pillars.day.ganZhi}｜月令 ${core.seasonalStrength.lifeStage}／${core.seasonalStrength.tendency}｜時辰 ${core.timePrecision}`);
    console.log(`  命中構面：${r.matchedDimensions.join(' > ')}`);
    console.log(`  挑出 ${r.id}（${r.dimensionName}）：${r.line}`);
  } else console.log(`\n▸ ${label}\n  ${r.message}`);
}
