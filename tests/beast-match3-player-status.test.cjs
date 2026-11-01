const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const { computeHits, fighterCanAct, fighterEffectiveAttack, endPlayerSkillTurn } = require('../lib/beast-game/match3/damage.ts');
const unit = { id: 'status-test', element: 'FIRE', hp: 100, maxHp: 100, attack: 80,
  skillRuntime: { uses: {}, initialized: {}, lastEvents: {}, shield: 0, stunnedTurns: 1,
    modifiers: [{ stat: 'attack', value: -15, remainingTurns: 2, source: 'enemy' }] } };
const steps = [{ chain: 1, attackAllowed: true, groups: [{ element: 'FIRE', size: 4, longest: 4 }] }];
const original = JSON.stringify(unit);
assert.equal(fighterCanAct(unit), false);
assert.equal(computeHits(steps, [unit], 'EARTH').reduce((n, h) => n + h.amount, 0), 0, 'stun blocks damage while the board may clear');
assert.equal(fighterEffectiveAttack(unit), 65);
const [next] = endPlayerSkillTurn([unit]);
assert.equal(fighterCanAct(next), true, 'one valid player turn consumes one stun turn');
assert.equal(fighterEffectiveAttack(next), 65, 'two-turn debuff remains for second action');
assert(computeHits(steps, [next], 'EARTH').some(h => h.amount > 0));
const [ended] = endPlayerSkillTurn([next]);
assert.equal(fighterEffectiveAttack(ended), 80);
assert.equal(ended.attack, 80, 'base card attack is never overwritten');
assert.equal(JSON.stringify(unit), original, 'turn settlement is immutable');
assert.equal(fighterCanAct({ ...ended, hp: 0 }), false);
assert.equal(computeHits([{ ...steps[0], attackAllowed: false }], [ended], 'EARTH')[0].amount, 0, 'three-orb clear cannot bypass attack threshold');
console.log('PASS player received status: stun, effective attack, holder duration, immutable original card');
