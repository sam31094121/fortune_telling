/* Inventory source UI text; never reads customer records or environment files. */
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const entries = [];
function scan(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) scan(file);
    else if (/\.tsx$/.test(file)) {
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node) {
        if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          const text = node.text.trim().replace(/\s+/g, ' ');
          if (/[\u3400-\u9fff]/.test(text)) entries.push({ file: file.replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text, kind: ts.isJsxText(node) ? 'jsx' : 'literal', review: 'pending' });
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
}
for (const directory of ['app', 'components', 'features']) if (fs.existsSync(directory)) scan(directory);
const destination = 'reports/translation/source-inventory.json';
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify({ scope: 'Source candidates only; hidden UI and non-display strings require review. Dynamic results are not included.', entries }, null, 2) + '\n');
console.log(`Inventoried ${entries.length} source candidates in ${new Set(entries.map(item => item.file)).size} files.`);
