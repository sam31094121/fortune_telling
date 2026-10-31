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
const CampaignUI = () => null;
const nodes = element => !element || typeof element !== 'object' ? [] : [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
for (const mode of [undefined])
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
      if (id === '@/lib/beast-game/match3/progress-store') return require('../.beast-game-build/lib/beast-game/match3/progress-store');
      if (id === './HardCampaignEntry') return { default: CampaignUI };
      if (id === './Match3Board') return { default: () => null };
      if (id === './BeastCardTile') return { BeastCardFace: CardFace };
      if (id.endsWith('.css')) return { default: {} };
      return require(id);
    },
  });
  const render = () => { cursor = 0; const routed = mod.exports.default({ mode }); return routed.type(routed.props); };
  assert.equal(mod.exports.default({ mode: 'hard45' }).type, CampaignUI);
  assert.equal(mod.exports.default({ mode: 'hard45b' }).type, CampaignUI);
  render(); effect(); mounted = true;
  const board = render().props.children;
  assert.equal(JSON.stringify(board.props.teamIds), JSON.stringify(expected), query);
  board.props.onRepick();
  assert.doesNotThrow(render, `repick after ?team=${query} must not read name from an unknown card`);

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
assert.deepEqual(routes, ['/beast-game/match3-hard']);
assert.equal(M.MATCH3_MODES.medium.id, 'medium');
assert.equal(M.MATCH3_MODES.medium.title, '寶珠戰・簡單');
assert.equal(M.MATCH3_MODES.medium.badge, '簡單・35 珠');
assert.equal(M.MATCH3_MODES.hard45.title, '寶珠戰・困難');
assert.deepEqual([M.MATCH3_MODES.medium.cols, M.MATCH3_MODES.medium.rows, M.MATCH3_MODES.medium.enemyHp, M.MATCH3_MODES.medium.enemyAtk], [7,5,300,8]);
assert.deepEqual([M.MATCH3_MODES.hard45.cols, M.MATCH3_MODES.hard45.rows, M.MATCH3_MODES.hard45.enemyHp, M.MATCH3_MODES.hard45.enemyAtk], [7,8,450,12]);
const old = { exports: {} }; let destination;
vm.runInNewContext(compile('app/beast-game/match3-hard2/page.tsx'), {
  module: old, exports: old.exports, require: id => {
    assert.equal(id, 'next/navigation'); return { redirect: to => { destination = to; } };
  },
});
old.exports.default();
assert.equal(destination, '/beast-game/match3-hard');
for (const route of ['match3', 'match3-preview']) {
  const retired = { exports: {} };
  let retiredDestination;
  vm.runInNewContext(compile(`app/beast-game/${route}/page.tsx`), {
    module: retired, exports: retired.exports, require: id => {
      assert.equal(id, 'next/navigation');
      return { permanentRedirect: to => { retiredDestination = to; } };
    },
  });
  retired.exports.default();
  assert.equal(retiredDestination, '/beast-game/match3-hard', `${route} must retire into the current orb game`);
}
console.log('PASS: one public orb entry, retired URLs redirect, invalid query repick safe, valid team and numerical rules preserved');

(async () => {
  const statsModule = { exports: {} };
  vm.runInNewContext(compile('lib/beast-game/card-face-stats.ts'), { module: statsModule, exports: statsModule.exports,
    require: id => require(id.startsWith('@/') ? '../.beast-game-build/' + id.slice(2) : id) });
  const realStats = statsModule.exports.CARD_FACE_STATS;
  const campaignModule = { exports: {} };
  vm.runInNewContext(compile('lib/beast-game/match3/hard-campaign.ts'), { module: campaignModule, exports: campaignModule.exports, require: id => {
    if (id === '../registry') return require('../.beast-game-build/lib/beast-game/registry');
    if (id === '../card-face-stats') return { CARD_FACE_STATS: realStats };
    return require(id);
  } });
  const C = campaignModule.exports;
  let profile = C.newCampaign(), writes = 0;
  const state = []; let cursor = 0; let effects = []; let reducedMotion = false; const scrolls = [];
  const Board = () => null;
  const hooks = { ...React, useMemo: fn => fn(), useEffect: fn => effects.push(fn), useRef: initial => {
    const i = cursor++; if (!(i in state)) state[i] = { current: initial }; return state[i];
  }, useState: initial => {
    const i = cursor++; if (!(i in state)) state[i] = initial;
    return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }];
  } };
  const store = {
    readCampaign: () => ({ ok: true, profile }),
    readLegacyCampaignStatus: () => ({ canImport: false, legacyWins: 0 }),
    resetGuestCampaign: async () => ({ ok: true, profile: profile = C.newCampaign() }),
    selectCampaignHero: async (_, id) => ({ ok: true, profile: profile = C.chooseCampaignHero(profile, id) }),
    saveCampaignTeam: async (_, ids) => {
      assert(C.validateCampaignTeam(profile, ids)); writes++; profile = { ...profile, teamIds: [...ids] };
      return { ok: true, profile };
    },
  };
  const mod = { exports: {} };
  vm.runInNewContext(compile('components/battlefield/HardCampaignEntry.tsx'), {
    module: mod, exports: mod.exports,
    window: { matchMedia: () => ({ matches: reducedMotion }), location: { search: '?team=' + realPool.filter(c => c.form === 'ADULT').slice(0, 5).map(c => c.id).join(',') } },
    require: id => {
      if (id === 'react') return hooks;
      if (id === '@/lib/beast-game/registry') return { playableCards: () => realPool };
      if (id === '@/lib/beast-game/card-face-stats') return { CARD_FACE_STATS: realStats };
      if (id === '@/cards/skills') return { getSkill };
      if (id === '@/lib/beast-game/match3') return M;
      if (id === '@/lib/beast-game/match3/hard-campaign') return C;
      if (id === '@/lib/beast-game/match3/hard-campaign-store') return store;
      if (id === './Match3Board') return { default: Board };
      if (id === './CampaignEnhancement') return { default: () => null };
      if (id === './BeastCardTile') return { BeastCardFace: CardFace };
      if (id.endsWith('.css')) return { default: {} };
      return require(id);
    },
  });
  const render = () => {
    cursor = 0; effects = []; const result = mod.exports.default({ mode: 'hard45' });
    const start = nodes(result).find(n => n.props?.['data-testid'] === 'start-battle');
    if (start?.props.ref) start.props.ref.current = { scrollIntoView: options => scrolls.push(options) };
    effects.forEach(fn => fn()); return result;
  };
  const by = testid => nodes(render()).find(n => n.props?.['data-testid'] === testid);
  assert(by('play-guest')); await by('play-guest').props.onClick();
  assert(by('match3-hero-choice'), 'URL adult team cannot bypass hero choice');
  assert.equal(by('confirm-hero').props.disabled, true, 'No automatic hero selection');
  const heroes = nodes(render()).filter(n => n.props?.['data-testid'] === 'pick-hero');
  assert.equal(heroes.length, 4);
  heroes[0].props.onClick(); await by('confirm-hero').props.onClick();
  let choices = nodes(render()).filter(n => n.props?.['data-testid'] === 'pick-card');
  assert.equal(choices.length, 28);
  assert(choices.every(n => realPool.find(c => c.id === n.props['data-id']).form === 'YOUNG'));
  assert.equal(nodes(by('picked-row')).find(n => n.type === 'button').props.disabled, true, 'Hero is locked');
  for (const n of choices) {
    const face = nodes(n).find(x => x.type === CardFace);
    const card = realPool.find(c => c.id === n.props['data-id']); const skill = getSkill(card.skills[0]);
    assert.equal(face.props.card.skillName, skill.name); assert.equal(face.props.card.description, skill.description);
  }
  choices.slice(0, 5).forEach(n => n.props.onClick());
  assert.equal(nodes(by('picked-row')).filter(n => n.type === CardFace).length, 5, 'Hero plus four only');
  assert.equal(by('team-ready-hint').props.children, '隊伍已就緒，點此開始作戰');
  assert.equal(scrolls.length, 1); assert.equal(scrolls[0].block, 'nearest'); assert.equal(scrolls[0].behavior, 'smooth');
  render(); render(); assert.equal(scrolls.length, 1, 'Rerenders must not scroll repeatedly');
  assert.notEqual(render().type, Board, 'Full team must not auto-start');
  const removable = nodes(by('picked-row')).find(n => n.type === 'button' && !n.props.disabled);
  removable.props.onClick(); render(); assert.equal(by('team-ready-hint'), undefined);
  reducedMotion = true;
  nodes(render()).find(n => n.props?.['data-testid'] === 'pick-card' && n.props['data-id'] === choices[0].props['data-id']).props.onClick();
  render(); assert.equal(scrolls.length, 2); assert.equal(scrolls[1].behavior, 'instant');
  assert.equal(by('start-battle').props.disabled, false);
  await by('start-battle').props.onClick();
  assert.equal(render().type, Board); assert.equal(render().props.campaignEnabled, true); assert.equal(writes, 1);
  assert.equal(profile.teamIds[0], heroes[0].props['data-id']);
  const won = C.campaignWin(profile, 'entry-ui-win', 0); profile = won.profile;
  await render().props.onRepick();
  choices = nodes(render()).filter(n => n.props?.['data-testid'] === 'pick-card');
  assert.equal(choices.length, 29); assert(choices.some(n => n.props['data-id'] === won.reward.cardId));
  // Enhancement uses a single explicit confirmation; failed persistence cannot
  // consume the material, and retry must reuse the same operation receipt ID.
  const enhancementState = []; let enhancementCursor = 0, attempts = 0;
  const operationRef = { current: null }; const operationIds = [];
  const enhancementModule = { exports: {} };
  vm.runInNewContext(compile('components/battlefield/CampaignEnhancement.tsx'), {
    module: enhancementModule, exports: enhancementModule.exports,
    crypto: { randomUUID: () => 'entry-enhancement-operation' },
    require: id => {
      if (id === 'react') return { ...React, useRef: () => operationRef, useState: initial => {
        const i = enhancementCursor++; if (!(i in enhancementState)) enhancementState[i] = initial;
        return [enhancementState[i], next => { enhancementState[i] = next; }];
      } };
      if (id === '@/lib/beast-game/registry') return { playableCards: () => realPool };
      if (id === '@/cards/skills') return { getSkill };
      if (id === '@/lib/beast-game/match3/hard-campaign') return C;
      if (id === '@/lib/beast-game/match3/hard-campaign-store') return { enhanceCampaign: async (_, op, young, target) => {
        operationIds.push(op); attempts++;
        if (attempts === 1) return { ok: false, profile: null, error: '測試儲存失敗' };
        return { ok: true, ...C.enhanceCampaignProfile(profile, op, young, target) };
      } };
      if (id === './BeastCardTile') return { BeastCardFace: CardFace };
      if (id.endsWith('.css')) return { default: {} };
      return require(id);
    },
  });
  const renderEnhancement = () => { enhancementCursor = 0; return enhancementModule.exports.default({ owner: 'self', profile, onSaved: p => { profile = p; } }); };
  const enhanceBy = id => nodes(renderEnhancement()).find(n => n.props?.['data-testid'] === id);
  // Controlled progress fixtures test the fifth-stage boundary, not natural wins.
  profile = { ...profile, wins: 3 };
  assert.equal(enhanceBy('enhancement-locked').props.children, '第五關解鎖永久強化');
  assert.equal(enhanceBy('enhance-material'), undefined, 'First four stages cannot expose consumption form');
  profile = { ...profile, wins: 4 };
  assert(enhanceBy('campaign-enhancement'), 'Entering fifth stage unlocks the form');
  const material = C.enhancementOptions(profile).youngIds[0];
  assert(material && !profile.teamIds.includes(material));
  enhanceBy('enhance-target').props.onChange({ target: { value: profile.heroId } });
  enhanceBy('enhance-material').props.onChange({ target: { value: material } });
  assert.equal(enhanceBy('confirm-enhancement').props.disabled, false);
  const oldAttack = C.campaignCardAttack(profile, profile.heroId).attack;
  await enhanceBy('confirm-enhancement').props.onClick();
  assert(C.enhancementOptions(profile).youngIds.includes(material), 'Failed save cannot consume young');
  assert.equal(C.campaignCardAttack(profile, profile.heroId).attack, oldAttack);
  await enhanceBy('confirm-enhancement').props.onClick();
  assert.equal(operationIds[0], operationIds[1], 'Retry must reuse operation ID');
  assert(!C.enhancementOptions(profile).youngIds.includes(material));
  assert(C.campaignCardAttack(profile, profile.heroId).attack > oldAttack);
  assert.match(enhanceBy('enhancement-result').props.children, /已融入/);
  console.log('PASS: hard campaign requires guardian, locks hero + four young, registered skills and unlocked adult remain selectable');
  console.log('PASS: permanent enhancement confirmation, failed save preservation and idempotent retry UI');
})().catch(error => { console.error(error); process.exitCode = 1; });
