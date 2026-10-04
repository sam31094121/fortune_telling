// 鬼魅阿修羅技能頁：畫面（含屬性、<title>/meta）不得出現術數用語；技能清單過話術 lint、與詞彙庫互鏈。
// 需 dev server 在 8888：node tests/ghost-asura-skill-forbidden-terms.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const base = process.env.ASURA_BASE ?? 'http://localhost:8888';
const load = (rel, strip = []) => {
  let src = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const s of strip) src = src.replace(s, '');
  const m = { exports: {} };
  new Function('module', 'exports', 'require', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(m, m.exports, require);
  return m.exports;
};
const alias = load('lib/asura-display-alias.ts');
const voice = load('lib/server/ghost-asura-voice.ts', ["import 'server-only';"]);
const { ASURA_FORBIDDEN_TERMS, ASURA_GANZHI_PAIR, ASURA_SKILLS, ASURA_TIME_TERMS } = alias;
const MUST_NOT = ['年柱', '月柱', '日柱', '時柱', '四柱', '神煞', '八字'];
for (const t of MUST_NOT) assert(ASURA_FORBIDDEN_TERMS.includes(t), `forbidden list has ${t}`);

// 原始神煞名（content.ts FIXED_NAMES 第一欄；為阿修羅名子字串者除外，如「天醫」⊂「天醫靈契」）
const contentSrc = fs.readFileSync(path.join(root, 'app/ghost-asura/skill/content.ts'), 'utf8');
const fixed = [...contentSrc.slice(contentSrc.indexOf('export const FIXED_NAMES')).split('];')[0].matchAll(/\['([^']+)', '([^']+)'\]/g)].map((m) => [m[1], m[2]]);
assert(fixed.length > 20, 'FIXED_NAMES parsed');
const rawNames = fixed.map(([o]) => o).filter((o) => !fixed.some(([, a]) => a.includes(o)));

const scan = (label, text) => {
  const hits = [...ASURA_FORBIDDEN_TERMS.filter((t) => text.includes(t)), ...rawNames.filter((n) => text.includes(n))];
  const pair = text.match(ASURA_GANZHI_PAIR);
  if (pair) hits.push(`干支組:${pair[0]}`);
  return hits.map((h) => `${label}: ${h} …${text.slice(Math.max(0, text.indexOf(h.replace('干支組:', '')) - 20), text.indexOf(h.replace('干支組:', '')) + 20)}…`);
};

// 技能：話術 lint、四時層各有單位、與詞彙庫互鏈
const docDir = path.join(root, 'docs/技能戰鬥檔案/鬼魅阿修羅');
const skillDoc = fs.readFileSync(path.join(docDir, '技能清單.md'), 'utf8');
const vocabDoc = fs.readFileSync(path.join(docDir, '詞彙庫.md'), 'utf8');
for (const s of ASURA_SKILLS) {
  assert.deepEqual(voice.lintAsuraVoice(s.use), [], `skill ${s.name} voice: ${s.use}`);
  assert(skillDoc.includes(`id="skill-${s.anchor}"`) && skillDoc.includes(`詞彙庫.md#${s.anchor}`), `技能清單 ${s.name} anchor + link`);
  assert(skillDoc.includes(s.use), `技能清單 ${s.name} text in sync`);
  assert(vocabDoc.includes(`id="${s.anchor}"`) && vocabDoc.includes(`技能清單.md#skill-${s.anchor}`), `詞彙庫 ${s.name} anchor + backlink`);
  assert.deepEqual(scan(`skill ${s.name}`, s.name + s.use), [], `skill ${s.name} has no forbidden term`);
}
assert.deepEqual(Object.values(ASURA_TIME_TERMS).map((t) => t.unit), ['年', '月', '日', '時'], '四時層保留時間單位');

(async () => {
  const problems = [];
  // 1) 伺服器輸出的整頁 HTML（含屬性、<title>、meta、RSC 資料）
  const fullHtml = await (await fetch(`${base}/ghost-asura/skill`, { cache: 'no-store' })).text();
  assert(fullHtml.includes('鬼魅阿修羅'), 'page rendered');
  // 全站共用的 JSON-LD（app/layout.tsx，搜尋引擎用、不顯示）另列警告，不在本頁可改範圍；其餘 HTML 一律嚴格
  const ld = [...fullHtml.matchAll(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
  // 同一份 JSON-LD 也會以跳脫字串出現在 RSC 資料裡：原文、一層、兩層跳脫都剔除
  const ldVariants = ld.flatMap((block) => { const inner = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''); const e1 = JSON.stringify(inner).slice(1, -1); const e2 = JSON.stringify(e1).slice(1, -1); return [block, inner, e1, e2]; });
  const html = ldVariants.reduce((h, v) => h.split(v).join(''), fullHtml);
  for (const w of ld.flatMap((block) => scan('site JSON-LD (app/layout.tsx)', block))) console.warn('WARN', w);
  problems.push(...scan('HTML', html));
  // 2) 1974-06-28 18:00 男：生辰送出後畫面上的每一個顯示字（audit 為稽核資料，不上畫面）
  for (const body of [
    { birthDate: '1974-06-28', birthTime: '18:00', gender: 'male' },
    { birthDate: '1974-06-28', timeUnknown: true, gender: 'male' },
  ]) {
    const res = await fetch(`${base}/api/ghost-asura/reading`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Forwarded-For': '10.77.1.9' }, body: JSON.stringify({ ...body, calendarType: 'solar', timezone: 'Asia/Taipei' }) });
    const json = await res.json();
    assert(json?.data?.contract, `reading ok ${JSON.stringify(body)}`);
    const { audit, ...shown } = json.data;
    const strings = [];
    const walk = (v, k) => { if (['key', 'id', 'contract', 'tone', 'glowIds'].includes(k)) return; if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach((x) => walk(x, k)); else if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) walk(vv, kk); };
    walk(shown, '');
    problems.push(...scan(`reading ${body.birthTime ?? 'unknown-hour'}`, strings.join('\n')));
    // 四時層的阿修羅名都在柱列上
    assert.deepEqual(shown.columns.map((c) => c.heading), Object.values(ASURA_TIME_TERMS).map((t) => t.term), 'pillar strip shows the four Asura time terms');
  }
  assert.deepEqual(problems, [], `forbidden terms rendered:\n${problems.join('\n')}`);
  console.log('PASS forbidden-terms: HTML + reading clean;', ASURA_SKILLS.length, 'skills linted and cross-linked');
})().catch((e) => { console.error(e); process.exitCode = 1; });
