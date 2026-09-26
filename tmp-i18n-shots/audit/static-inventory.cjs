// Read-only static inventory: for each route, walk the import graph from app/<route>/page.tsx and count
// Han-containing string literals / JSX text per file, how many exactly match dictionary keys, and which
// files are wired to a translation hook. Writes only into tmp-i18n-shots/audit/out.
const path = require('path'); const fs = require('fs');
const root = path.resolve(__dirname, '..', '..');
const ts = require(path.join(root, 'node_modules', 'typescript'));
const jiti = require(path.join(root, 'node_modules', 'jiti'))(__filename, { cache: false });
const ko = jiti(path.join(root, 'lib/korean-copy/index.ts')).koreanCopy;
const en = Object.assign({}, jiti(path.join(root, 'lib/result-english-copy.ts')).resultEnglishCopy, jiti(path.join(root, 'lib/home-english-copy.ts')).homeEnglishCopy, jiti(path.join(root, 'lib/form-english-copy.ts')).formEnglishCopy, jiti(path.join(root, 'lib/birthday-english-copy.ts')).birthdayEnglishCopy);
const ja = jiti(path.join(root, 'lib/home-japanese-copy.ts')).homeJapaneseCopy;
const HAN = /[\u3400-\u9fff]/;
const EXCLUDE = /lib[\\/](korean-copy|result-english)[\\/]|lib[\\/](home|form|birthday|result)-(english|japanese)-copy\.ts$|lib[\\/]interface-languages\.ts$|lib[\\/]translation-|-db\.ts$|lib[\\/]generated[\\/]/;
const WIRED = /HomeTranslatedText|useDisplayText|useMatchResultView|koreanCopy|birthdayEnglishCopy|resultEnglishCopy|homeEnglishCopy|formEnglishCopy/;
const cache = new Map();
function resolve(from, spec) {
  let p;
  if (spec.startsWith('@/')) p = path.join(root, spec.slice(2));
  else if (spec.startsWith('.')) p = path.resolve(path.dirname(from), spec);
  else return null;
  for (const c of [p, p + '.tsx', p + '.ts', path.join(p, 'index.tsx'), path.join(p, 'index.ts')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return /\.(tsx?|json)$/.test(c) ? c : null;
  return null;
}
function analyze(file) {
  if (cache.has(file)) return cache.get(file);
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.json') ? ts.ScriptKind.JSON : ts.ScriptKind.TS);
  const lits = []; const imports = [];
  (function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) { if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && !(node.importClause && node.importClause.isTypeOnly)) imports.push(node.moduleSpecifier.text); }
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const t = node.text.trim().replace(/\s+/g, ' ');
      if (HAN.test(t) && !(node.parent && (ts.isImportDeclaration(node.parent)))) lits.push({ t, jsx: ts.isJsxText(node) });
    } else if (ts.isTemplateExpression(node)) {
      const t = [node.head.text, ...node.templateSpans.map(s => s.literal.text)].join('{}');
      if (HAN.test(t)) lits.push({ t, tpl: true });
    }
    ts.forEachChild(node, visit);
  })(sf);
  const deps = imports.map(s => resolve(file, s)).filter(Boolean);
  const info = { file: path.relative(root, file).replace(/\\/g, '/'), wired: WIRED.test(src), lits: lits.length, jsx: lits.filter(l => l.jsx).length, tpl: lits.filter(l => l.tpl).length,
    inKo: lits.filter(l => ko[l.t] !== undefined).length, inEn: lits.filter(l => en[l.t] !== undefined).length, inJa: lits.filter(l => ja[l.t] !== undefined).length, deps };
  cache.set(file, info); return info;
}
function tree(entry) {
  const seen = new Set(); const stack = [entry];
  while (stack.length) { const f = stack.pop(); if (seen.has(f)) continue; seen.add(f); if (EXCLUDE.test(f)) continue; const i = analyze(f); stack.push(...i.deps); }
  return [...seen].filter(f => !EXCLUDE.test(f)).map(analyze);
}
const routes = ['', 'match', 'bazi', 'nameology', 'numerology', 'zodiac', 'red-luan-heartbeat', 'tarot', 'insight', 'music', 'star-beasts', 'growth-center', 'beast-game'];
const out = {};
for (const r of routes) {
  const entry = path.join(root, 'app', r, 'page.tsx');
  if (!fs.existsSync(entry)) { out['/' + r] = { missing: true }; continue; }
  const files = tree(entry).filter(f => f.lits > 0);
  const data = files.filter(f => f.file.endsWith('.json'));
  const ui = files.filter(f => !f.file.startsWith('lib/') && !f.file.endsWith('.json'));
  const lib = files.filter(f => f.file.startsWith('lib/'));
  const sum = (arr, k) => arr.reduce((a, f) => a + f[k], 0);
  out['/' + r] = {
    uiFiles: ui.length, uiWiredFiles: ui.filter(f => f.wired).length, uiLits: sum(ui, 'lits'), uiLitsInWiredFiles: sum(ui.filter(f => f.wired), 'lits'),
    uiInKo: sum(ui, 'inKo'), uiInEn: sum(ui, 'inEn'), uiInJa: sum(ui, 'inJa'), uiTemplates: sum(ui, 'tpl'),
    dataJsonFiles: data.length, dataJsonLits: sum(data, 'lits'), dataJsonInKo: sum(data, 'inKo'), dataJson: data.map(f => `${f.file} (${f.lits})`),
    libFiles: lib.length, libLits: sum(lib, 'lits'), libInKo: sum(lib, 'inKo'), libInEn: sum(lib, 'inEn'), libTemplates: sum(lib, 'tpl'),
    topUnwired: ui.filter(f => !f.wired).sort((a, b) => b.lits - a.lits).slice(0, 8).map(f => `${f.file} (${f.lits})`),
    topLib: lib.sort((a, b) => b.lits - a.lits).slice(0, 6).map(f => `${f.file} (${f.lits})`),
  };
}
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'static.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
