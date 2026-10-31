const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const M = require('../.beast-game-build/lib/beast-game/match3');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Exercise the real picker render/callback path with a small deterministic hook
// harness. This is not browser or pointer-event acceptance.
const pool = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id, name: id, element: 'AIR', skills: [`skill-${id}`], art: { thumbnail: `/test/${id}.webp` } }));
const skills = Object.fromEntries(pool.map(c => [c.skills[0], { name: `${c.id} 技能`, description: `${c.id} 登錄技能說明` }]));
const stats = Object.fromEntries(pool.map(c => [c.id, { attack: 10 }]));
const CardFace = () => null;
const nodes = element => !element || typeof element !== 'object' ? [] : [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
for (const mode of [undefined, 'hard45'])
for (const [query, expected] of [
  ['missing', null], ['a,b,c,d,missing', null], ['a,a,c,d,e', null],
  ['a,b,c,d', null], ['a,b,c,d,e,f', null], ['', null], ['a,b,c,d,e', ['a','b','c','d','e']],
]) {
  const state = []; let cursor = 0, effect, mounted = false;
  const hooks = {
    ...React,
    useMemo: fn => fn(),
    useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial;
      return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
    useEffect: fn => { if (!mounted) effect = fn; },
  };
  const mod = { exports: {} };
  vm.runInNewContext(compile('components/battlefield/Match3TeamPicker.tsx'), {
    module: mod, exports: mod.exports, URLSearchParams,
    window: { location: { search: '?team=' + encodeURIComponent(query) } },
    require: id => {
      if (id === 'react') return hooks;
      if (id === '@/lib/beast-game/registry') return { playableCards: () => pool };
      if (id === '@/lib/beast-game/card-face-stats') return { CARD_FACE_STATS: stats };
      if (id === '@/cards/skills') return { getSkill: id => skills[id] };
      if (id === '@/lib/beast-game/match3') return M;
      if (id === './Match3Board') return { default: () => null };
      if (id === './BeastCardTile') return { BeastCardFace: CardFace };
      if (id.endsWith('.css')) return { default: {} };
      return require(id);
    },
  });
  const render = () => { cursor = 0; return mod.exports.default({ mode }); };
  render(); effect(); mounted = true;
  const board = render().props.children;
  assert.equal(JSON.stringify(board.props.teamIds), JSON.stringify(expected), query);
  board.props.onRepick();
  assert.doesNotThrow(render, `repick after ?team=${query} must not read name from an unknown card`);
  if (mode === 'hard45') {
    const cards = nodes(render()).filter(n => n.props?.['data-testid'] === 'pick-card');
    assert.equal(cards.length, pool.length);
    for (const c of cards) {
      const face = nodes(c).find(n => n.type === CardFace);
      assert.ok(face, 'each hard picker choice contains the shared full card face');
      assert.equal(face.props.card.id, c.props['data-id']);
      assert.equal(face.props.card.thumbnail, pool.find(p => p.id === c.props['data-id']).art.thumbnail);
      const skill = skills[pool.find(p => p.id === c.props['data-id']).skills[0]];
      assert.equal(face.props.card.skillName, skill.name);
      assert.equal(face.props.card.description, skill.description);
    }
    // Fill any remaining places: attempting the sixth card never exceeds five.
    for (const c of pool) {
      const button = nodes(render()).find(n => n.props?.['data-id'] === c.id);
      if (!button.props['aria-pressed']) button.props.onClick();
    }
    assert.equal(nodes(render()).filter(n => n.props?.['data-testid'] === 'pick-card' && n.props['aria-pressed']).length, 5);
    assert.equal(nodes(render()).find(n => n.props?.['data-testid'] === 'start-battle').props.disabled, false);
    const picked = nodes(render()).find(n => n.props?.['data-testid'] === 'picked-row');
    assert.equal(nodes(picked).filter(n => n.type === CardFace).length, 5);
    nodes(picked).find(n => n.type === 'button').props.onClick();
    assert.equal(nodes(render()).find(n => n.props?.['data-testid'] === 'start-battle').props.disabled, true);
  }
}

// The production registry must supply real skill text for all 28 young,
// 28 adult and 4 guardian cards, not just the young-only CARD_FACE_SKILL map.
const realPool = require('../.beast-game-build/lib/beast-game/registry').playableCards();
const { getSkill } = require('../.beast-game-build/cards/skills');
assert.equal(realPool.length, 60);
for (const c of realPool) {
  const skill = getSkill(c.skills[0]);
  assert.ok(skill?.name?.trim(), `${c.id} must have a registered skill name`);
  assert.ok(skill?.description?.trim(), `${c.id} must have a registered skill description`);
}

const entry = fs.readFileSync('components/BeastTurnGame.tsx', 'utf8');
const routes = [...entry.matchAll(/<Link\s+href="(\/beast-game\/match3[^" ]*)"/g)].map(m => m[1]);
assert.deepEqual(routes, ['/beast-game/match3-preview', '/beast-game/match3-hard']);
assert.equal(M.MATCH3_MODES.medium.id, 'medium');
assert.equal(M.MATCH3_MODES.medium.title, '寶珠戰・簡單');
assert.equal(M.MATCH3_MODES.medium.badge, '簡單・35 珠');
assert.equal(M.MATCH3_MODES.hard45.title, '寶珠戰・困難');
assert.deepEqual([M.MATCH3_MODES.medium.cols, M.MATCH3_MODES.medium.rows, M.MATCH3_MODES.medium.enemyHp, M.MATCH3_MODES.medium.enemyAtk], [7,5,300,8]);
assert.deepEqual([M.MATCH3_MODES.hard45.cols, M.MATCH3_MODES.hard45.rows, M.MATCH3_MODES.hard45.enemyHp, M.MATCH3_MODES.hard45.enemyAtk], [7,7,450,12]);
const old = { exports: {} }; let destination;
vm.runInNewContext(compile('app/beast-game/match3-hard2/page.tsx'), {
  module: old, exports: old.exports, require: id => {
    assert.equal(id, 'next/navigation'); return { redirect: to => { destination = to; } };
  },
});
old.exports.default();
assert.equal(destination, '/beast-game/match3-hard');
console.log('PASS: two public orb entries, legacy hard2 redirect, invalid query repick safe, valid team and numerical rules preserved');
