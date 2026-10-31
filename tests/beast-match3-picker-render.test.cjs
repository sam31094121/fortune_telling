const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const cache = new Map();

// Render the real presentation components. Effects do not run or write inventory.
function load(relative) {
  let file = path.resolve(root, relative);
  if (!path.extname(file)) {
    const candidates = [file + '.ts', file + '.tsx', path.join(file, 'index.ts'), path.join(file, 'index.tsx')];
    file = candidates.find(candidate => fs.existsSync(candidate)) ?? file;
  }
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const input = fs.readFileSync(file, 'utf8');
  const source = ts.transpileModule(input, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const customRequire = id => {
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children); };
    if (id === 'next/dynamic') return () => () => null;
    return id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
  };
  vm.runInNewContext(source, { module: mod, exports: mod.exports, require: customRequire, console, setTimeout, clearTimeout, AbortController, structuredClone, process: { env: { NODE_ENV: 'test', NEXT_PUBLIC_BEAST_ORB: '1' } }, crypto: require('node:crypto').webcrypto }, { filename: file });
  return mod.exports;
}

// Actual entry + real card faces, deliberately without GuideBookProvider.
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]));
function audit() {
  const pool = load('lib/beast-game/registry').playableCards();
  const { getSkill } = load('cards/skills');
  const { CARD_FACE_STATS } = load('lib/beast-game/card-face-stats');
  const Entry = load('components/battlefield/bead/BeadBattle.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Entry));
  const buttons = (html.match(/<button\b[^>]*data-testid="pick-card"[\s\S]*?<\/button>/g) || []);
  assert.equal(pool.length, 60, 'registry contains all 60 original cards');
  assert.equal(buttons.length, 60, 'entry renders all 60 selectable cards');
  const missing = [];
  for (const card of pool) {
    const button = buttons.find(s => s.includes('aria-label="' + escape(card.name) + '，'));
    assert.ok(button, card.id + ' has its own selectable card');
    const skill = getSkill(card.skills[0]);
    assert.ok(skill, card.id + ' has original registered skill');
    // Card face deliberately prints the skill name suffix after its category prefix.
    const skillName = escape(skill.name.split('・').pop());
    const attack = '<small>攻</small>' + escape(CARD_FACE_STATS[card.id].attack) + '</span>';
    if (!button.includes(skillName) || !button.includes(escape(skill.description)) || !button.includes(attack)) missing.push(card.id);
  }
  return missing;
}
assert.deepEqual(audit(), [], 'all cards show their own registered skill and description');
console.log('PASS real BeadBattle SSR: 60 original skills/descriptions/attacks');

// Only the approved orb entrance is visible; unrelated battle entries and card pool remain intact.
const ModesPage = load('app/star-beasts/page.tsx').default;
const modesHtml = renderToStaticMarkup(React.createElement(ModesPage));
const modeLinks = modesHtml.match(/<a\b[^>]*data-difficulty-choice="[^"]+"[^>]*>/g) || [];
assert.deepEqual(modeLinks.map(link => link.match(/data-difficulty-choice="([^"]+)"/)[1]), ['easy', 'medium', 'hard', 'bead-hard'], 'keep all non-orb battles and only the approved orb entry');
assert.ok(modeLinks[3].includes('href="/beast-game/match3-hard"'), 'retain the 56-orb route');
console.log('PASS real mode picker: battle entries unchanged; only difficult orb entry visible');
