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
  crossCheckFourPillars, GATE_BLOCK_MESSAGE, UNAVAILABLE_MESSAGE, goldWordingViewFor,
} from '../lib/ghost-asura-gold-wording';
import { ASURA_CHAIN, WORDING_COMPOSITION, credibilityTier } from '../lib/ghost-asura-order';
import { CORE_ORDER } from '../lib/credibility-phrases';
import { coreCredibility } from '../lib/credibility-wording';

let pass = 0;
const ok = (label: string, fn: () => void) => { fn(); pass++; console.log(`  ✓ ${label}`); };

const entries = library.entries as Array<{ id: string; stem: string; dimension: string; line: string; source: string[] }>;

/** 不得宣稱的字（須與 話術含金量技能.md〈6.2〉一致；新增禁語兩邊一起改） */
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

const DOC = readFileSync(new URL('../docs/技能戰鬥檔案/鬼魅阿修羅/話術含金量技能.md', import.meta.url), 'utf8');
const section = (from: string, to: string) => DOC.slice(DOC.indexOf(from), DOC.indexOf(to));

ok('技能檔寫明「含金量＝公信力」，心理學整理已降為附錄、不再當判準', () => {
  assert.ok(DOC.includes('## 零、業主更正（2026-10-24）：含金量＝公信力'));
  assert.ok(DOC.includes('最有公信力的含金量，就是最有公信力的話術'));
  assert.ok(DOC.includes('## 附錄、說服與溝通心理學參考（降級，不是含金量判準）'));
  assert.ok(!/心理學證據閘[：:]s*決定/.test(section('### 1.1', '### 1.2')), '鏈條裡不得再有心理學證據閘');
});

ok('技能檔寫明公信力上限：〈6.1〉〈6.2〉〈6.4〉存在，且不得宣稱清單涵蓋守門的每個禁語', () => {
  for (const h of ['### 6.1 公信力上限', '### 6.2 不得宣稱', '### 6.4 要老實標出的限制']) assert.ok(DOC.includes(h), `技能檔缺 ${h}`);
  const claims = section('### 6.2', '### 6.3');
  for (const w of OVERCLAIM) assert.ok(claims.includes(w), `技能檔〈6.2〉未列出禁語：${w}`);
});

ok('順序單一來源：資料鏈與組句順序和技能檔一致；三核心相對順序沿用 CORE_ORDER，不另訂第二套', () => {
  const chain = section('### 1.1', '### 1.2');
  let last = -1;
  for (const step of ASURA_CHAIN) {
    const at = chain.indexOf(step.label.split('（')[0].split('＋')[0]);
    assert.ok(at > last, `技能檔〈1.1〉缺步驟或順序顛倒：${step.label}`);
    last = at;
  }
  assert.equal(ASURA_CHAIN[0].id, 'INPUT');
  assert.equal(ASURA_CHAIN[ASURA_CHAIN.length - 1].id, 'DISPLAY');
  const ids = ASURA_CHAIN.map((s) => s.id);
  assert.ok(ids.indexOf('BAZI') < ids.indexOf('ZIWEI_CROSS_CHECK') && ids.indexOf('ZIWEI_CROSS_CHECK') < ids.indexOf('DIVINATION'));
  assert.ok(ids.indexOf('CREDIBILITY_GATE') < ids.indexOf('ASURA_VOICE') && ids.indexOf('ASURA_VOICE') < ids.indexOf('DISPLAY'));
  // CORE_ORDER：八字 → 紫微斗數 → 易經，與鏈條中八字先於紫微、紫微先於易經卜卦一致
  assert.deepEqual([...CORE_ORDER], ['八字', '紫微斗數', '易經']);
  const comp = section('### 1.2', '## 二、');
  let lastC = -1;
  for (const step of WORDING_COMPOSITION) {
    const at = comp.indexOf(step.label.split('：')[0]);
    assert.ok(at > lastC, `技能檔〈1.2〉缺組句步驟或順序顛倒：${step.label}`);
    lastC = at;
  }
});

ok('公信力等級：核對沒過＝擋；沒填時辰或來源衝突＝弱；強須核對通過＋VERIFIED＋客戶確認，缺一不可', () => {
  const base = { fourPillars: 'PASSED', timeKnown: true, claimStatus: 'VERIFIED', inputConfirmed: true } as const;
  assert.equal(credibilityTier(base), 'STRONG');
  assert.equal(credibilityTier({ ...base, inputConfirmed: false }), 'MEDIUM');
  assert.equal(credibilityTier({ ...base, claimStatus: 'PENDING_POOL' }), 'MEDIUM');
  assert.equal(credibilityTier({ ...base, fourPillars: 'TIME_UNKNOWN', timeKnown: false }), 'WEAK');
  assert.equal(credibilityTier({ ...base, claimStatus: 'CONFLICT' }), 'WEAK');
  for (const f of ['MISMATCH', 'ZIWEI_UNAVAILABLE', 'ERROR'] as const) assert.equal(credibilityTier({ ...base, fourPillars: f }), 'BLOCKED');
  // 即使其他條件都滿，四柱核對沒過也不可能說話
  assert.equal(credibilityTier({ fourPillars: 'MISMATCH', timeKnown: true, claimStatus: 'VERIFIED', inputConfirmed: true }), 'BLOCKED');
});

ok('每句附事實依據 factBasis；來源狀態不寫死在文字裡，一律以閘門重算為準', () => {
  for (const e of entries as Array<{ id: string; factBasis?: string }>) {
    assert.ok(e.factBasis && e.factBasis.length > 0, e.id);
    assert.ok(!/(PENDING_POOL|最高到中|只有兩項)/.test(e.factBasis!), `${e.id} factBasis 不得寫死來源狀態：${e.factBasis}`);
  }
  const star = (entries as Array<{ dimension: string; factBasis?: string }>).find((e) => e.dimension === 'AUSPICIOUS_STAR')!;
  assert.ok(star.factBasis!.includes('以閘門重算為準'));
});

ok('技能檔不得再寫死過時的 VERIFIED 數量；並確認吉類神煞（天乙、文昌）在閘門重算下的實際狀態有登記', () => {
  assert.ok(!DOC.includes('只有兩項 VERIFIED') && !DOC.includes('神煞等多數規則仍是 PENDING_POOL'));
  assert.ok(DOC.includes('一律以閘門重算為準'));
  const bazi = coreCredibility('八字');
  for (const name of ['天乙', '文昌']) {
    const claim = bazi.claims.find((c) => c.claimId === (name === '天乙' ? 'C-BAZI-SHENSHA-TIANYI' : 'C-BAZI-SHENSHA-WENCHANG'));
    assert.ok(claim, `來源登記找不到 ${name}`);
    assert.ok(['VERIFIED', 'CONFLICT', 'PENDING_POOL'].includes(claim!.status));
  }
});

ok('客戶看得到的提示（核對沒過、查無資料、標題）不得含命理術語或內部用語', () => {
  const JARGON = /(月令|五行|貴人|印記|命盤|命格|八字|四柱|十神|神煞|煞|盤上|天干|地支|年柱|月柱|日柱|時柱|紫微|命宮|技能檔|閘門|後端|核對關)/;
  const view = goldWordingViewFor({}, false);
  for (const text of [GATE_BLOCK_MESSAGE, UNAVAILABLE_MESSAGE, view.label, view.text]) assert.ok(!JARGON.test(text), `客戶可見的字含術語：${text}`);
  assert.equal(view.text, UNAVAILABLE_MESSAGE);
});

ok('心理學整理已降為附錄：橫幅在、〈一〉不再定義含金量', () => {
  const psych = readFileSync(new URL('../docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/話術含金量-說服與溝通心理學-權威來源.md', import.meta.url), 'utf8');
  assert.ok(psych.startsWith('# 說服與溝通心理學權威來源（附錄參考，不是含金量判準）'));
  assert.ok(psych.includes('降級說明（業主更正 2026-10-24）'));
  assert.ok(!psych.includes('## 一、含金量怎麼定義'));
});

ok('技能檔寫明個性授權與轉化承諾界線：事實說死結果不說死、錢不進本站、不借運、不承諾結果', () => {
  for (const h of ['## 七、阿修羅的個性與授權', '## 八、轉化承諾']) assert.ok(DOC.includes(h), `技能檔缺 ${h}`);
  const s7 = section('## 七、', '## 八、');
  assert.ok(s7.includes('事實就說死') && s7.includes('結果就不說死'));
  const s8 = section('## 八、', '## 九、');
  for (const w of ['錢不進本站', '不借運', '承諾行動，不承諾結果', '不得說「你會倒楣」']) assert.ok(s8.includes(w), `〈八〉缺：${w}`);
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

ok('第 3 步：已知時辰的客戶，八字×紫微四柱逐字核對通過', () => {
  for (const [label, input] of cases) {
    if (!input.birthTimeKnown) continue;
    const gate = crossCheckFourPillars({ birthDate: input.birthDate, gender: input.gender, birthTime: input.birthTime });
    assert.deepEqual(gate, { status: 'PASSED' }, label);
  }
});

ok('第 3 步：沒填時辰＝無紫微可核對，不當成通過，仍照「時辰未填」句', () => {
  const gate = crossCheckFourPillars({ birthDate: '1990-3-15', gender: 'male', birthTime: null });
  assert.deepEqual(gate, { status: 'TIME_UNKNOWN' });
  const r = pickGoldWording(createBaziCore(cases[1][1]), gate);
  assert.ok(r.status === 'OK' && r.dimension === 'HOUR_UNKNOWN');
});

ok('第 3 步：核對沒過就停在核對關，不挑句、不補別句，兩邊差異原封不動', () => {
  const core = createBaziCore(cases[0][1]);
  const mismatch = { status: 'MISMATCH' as const, differences: [{ pillar: 'hour' as const, bazi: '辛未', ziwei: '壬申' }] };
  const r1 = pickGoldWording(core, mismatch);
  assert.deepEqual(r1, { status: 'UNAVAILABLE', message: GATE_BLOCK_MESSAGE, gate: mismatch });
  assert.deepEqual((r1 as { gate: typeof mismatch }).gate.differences, [{ pillar: 'hour', bazi: '辛未', ziwei: '壬申' }]);
  for (const gate of [{ status: 'ZIWEI_UNAVAILABLE' as const, reason: 'x' }, { status: 'ERROR' as const, reason: 'y' }]) {
    const r = pickGoldWording(core, gate);
    assert.ok(r.status === 'UNAVAILABLE' && r.message === GATE_BLOCK_MESSAGE);
  }
});

ok('第 3 步：核對只用三合一同一份比較函式，不另寫第二套、不改任一邊', () => {
  const src = readFileSync(new URL('../lib/ghost-asura-gold-wording.ts', import.meta.url), 'utf8');
  assert.ok(src.includes("from './four-pillar-verification'") && src.includes("from './three-core-engine'"));
  assert.ok(!/ziwei\.analysis\.bazi\.\w+\s*=[^=]/.test(src) && !/bazi\.(year|month|day|hour)\s*=[^=]/.test(src), '核對關不得改寫任一邊');
});

ok('第 3 步：150 組隨機已知時辰生辰，核對全數通過（有不同就是真實的四柱分歧，要查）', () => {
  let seed = 98765;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 150; i++) {
    const input = {
      birthDate: `${1950 + Math.floor(rnd() * 70)}-${1 + Math.floor(rnd() * 12)}-${1 + Math.floor(rnd() * 28)}`,
      gender: (rnd() > 0.5 ? 'male' : 'female') as 'male' | 'female',
      birthTime: `${String(Math.floor(rnd() * 24)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`,
    };
    const gate = crossCheckFourPillars(input);
    assert.equal(gate.status, 'PASSED', `${JSON.stringify(input)} → ${JSON.stringify(gate)}`);
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
  assert.deepEqual(r, { status: 'UNAVAILABLE', message: UNAVAILABLE_MESSAGE });
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
