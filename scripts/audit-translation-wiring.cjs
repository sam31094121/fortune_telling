/* Read-only source audit: translated dictionaries do not prove rendered coverage. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const dictionary = new Map();
const conflicts = [];
function files(dir, extension) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const file = path.join(dir, item.name);
    return item.isDirectory() ? files(file, extension) : file.endsWith(extension) ? [file] : [];
  });
}
for (const file of files('lib/korean-copy', '.ts')) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name) && ts.isStringLiteral(node.initializer)) {
      const key = node.name.text;
      const value = node.initializer.text;
      if (dictionary.has(key) && dictionary.get(key).value !== value) conflicts.push({ key, first: dictionary.get(key), second: { file, value } });
      dictionary.set(key, { file, value });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const entries = [];
for (const file of ['app', 'components', 'features'].flatMap(dir => files(dir, '.tsx'))) {
  if (/[/\\](api|admin|test|preview)[/\\]/.test(file)) continue;
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    const literalChild = ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression) && !ts.isJsxAttribute(node.parent);
    const text = ts.isJsxText(node) ? node.text.trim() : literalChild ? node.expression.text : '';
    if (/[\u3400-\u9fff]/.test(text)) entries.push({
      file: file.replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      text, koreanDictionaryReady: dictionary.has(text),
    });
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const report = {
  scope: 'Unwrapped JSX text candidates, not runtime coverage. Hidden UI needs manual review. Does not inspect customer data or dynamic output.',
  koreanKeys: dictionary.size, conflictingDuplicates: conflicts,
  readyToWire: entries.filter(entry => entry.koreanDictionaryReady).length,
  missingDictionary: entries.filter(entry => !entry.koreanDictionaryReady).length, entries,
};
fs.mkdirSync('reports/translation', { recursive: true });
fs.writeFileSync('reports/translation/wiring-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ koreanKeys: report.koreanKeys, conflictingDuplicates: conflicts.length, readyToWire: report.readyToWire, missingDictionary: report.missingDictionary }));
