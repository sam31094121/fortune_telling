// Guard the customer-visible name of the beast-game opponent without changing
// backend identifiers, comments, or unrelated AI service/provider labels.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'production') walk(full);
    } else if (entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
}

walk(path.join(root, 'app', 'beast-game'));
walk(path.join(root, 'components', 'battlefield'));
for (const name of fs.readdirSync(path.join(root, 'components'))) {
  if ((name.startsWith('Beast') || name === 'GrowthStakeSlots.tsx') && name.endsWith('.tsx')) {
    files.push(path.join(root, 'components', name));
  }
}

const banned = /\bAI\b|電腦/;
const violations = [];
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function inspect(node) {
    // Text displayed directly in JSX, or a string/template passed to JSX,
    // aria-label, a button, result narration, etc. Comments and identifiers
    // are intentionally excluded.
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
      || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const value = node.text;
      if (banned.test(value)) {
        const position = source.getLineAndCharacterOfPosition(node.getStart(source));
        violations.push(`${path.relative(root, file)}:${position.line + 1}: ${value.trim().slice(0, 100)}`);
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
}

assert.deepEqual(violations, [], `神獸遊戲前端對手名稱必須顯示「易經」：\n${violations.join('\n')}`);
console.log(`PASS beast opponent naming: ${files.length} front-end files checked`);
