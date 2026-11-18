// 英文字典缺口稽核：以韓文字典的鍵（原文清單）為基準，列出英文還沒有的句子，依頁面統計。
// 用法：node scripts/audit-english-gap.cjs            → 每頁缺幾句
//       node scripts/audit-english-gap.cjs numerology → 列出該頁缺的句子
// 只讀、不改檔。英文字典的鍵必須與繁體中文原文逐字相同。
const path = require('path');
const fs = require('fs');
const Module = require('module');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const resolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) { return resolve.call(this, req.startsWith('@/') ? path.join(root, req.slice(2)) : req, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2020' } }).outputText, f);
const load = p => require(path.join(root, p));

const p1 = load('lib/i18n-copy/phase1.ts').phase1Copy;
const en = {
  ...load('lib/english-copy/index.ts').englishPageCopy, ...p1.en,
  ...load('lib/birthday-english-copy.ts').birthdayEnglishCopy, ...load('lib/result-english-copy.ts').resultEnglishCopy,
  ...load('lib/home-english-copy.ts').homeEnglishCopy, ...load('lib/form-english-copy.ts').formEnglishCopy,
};
const pages = ['form', 'birthday', 'result', 'pages/bazi', 'pages/growth-center', 'pages/insight', 'pages/music', 'pages/nameology', 'pages/numerology',
  'pages/red-luan-heartbeat', 'pages/tarot', 'pages/zodiac', 'pages/misc', 'pages/shared', 'pages/beast-game', 'pages/star-beasts'];
const want = process.argv[2];
let total = 0;
for (const page of pages) {
  const mod = load(`lib/korean-copy/${page}.ts`);
  const dict = Object.values(mod).find(v => v && typeof v === 'object' && !Array.isArray(v));
  const missing = Object.keys(dict).filter(k => !(k in en));
  total += missing.length;
  if (want) { if (page.endsWith(want)) console.log(missing.join('\n')); }
  else console.log(page.padEnd(26), 'ko', String(Object.keys(dict).length).padStart(5), '缺英文', String(missing.length).padStart(5));
}
if (!want) console.log('合計缺英文', total);
