/* Independent customer-flow regressions. Run after npm run test:beast-game. */
const assert = require('node:assert/strict');
const core = require('../.beast-game-build/lib/beast-game');
const cards = core.playableCards();
const ids = cards.slice(0, 4).map(card => card.id);
let failed = 0;
let total = 0;
function check(name, run) {
  total++;
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
function context() {
  return { side: { draw: () => 0, discard: () => 0 }, usage: new Map(), log: [] };
}
function durable(card, id) {
  const unit = core.instantiate(card, id);
  unit.hp = unit.maxHp = 10000;
  return unit;
}

check('lineup rejects a fourth occupied slot', () => {
  assert.equal(core.validateLineup(ids).ready, false);
});
check('core rejects duplicate starters instead of trusting the UI', () => {
  assert.throws(() => core.createDuel({
    player: { lineup: [ids[0], ids[0], ids[1]], deck: ids },
    opponent: { lineup: ids.slice(0, 3), deck: ids }, seed: 1,
  }));
});
check('a one-turn stun survives until the target gets a turn', () => {
  const tiger = cards.find(c => c.id === 'beast_g_baihu');
  const target = cards.find(c => c.id === 'beast_g_xuanwu');
  const game = core.createGame({ playerDeck: [], opponentDeck: [], seed: 1 });
  game.turn = 2;
  game.players.PLAYER.field = [{ card: tiger, instance: durable(tiger, 'tiger'), slot: 0 }];
  game.players.OPPONENT.field = [{ card: target, instance: durable(target, 'target'), slot: 0 }];
  core.playTurn(game);
  assert.equal(game.players.OPPONENT.field[0].instance.stunnedTurns, 1);
});
check('fire guardian strengthens its own fire, never its enemy', () => {
  const bird = cards.find(c => c.id === 'beast_g_zhuque');
  const target = cards.find(c => c.id === 'beast_g_xuanwu');
  const self = durable(bird, 'bird');
  const enemy = durable(target, 'enemy');
  core.performAttack({ attackerCard: bird, attacker: self, defenderCard: target, defender: enemy, context: context() });
  assert(self.elementBoosts.some(boost => boost.element === 'FIRE'));
  assert.equal(enemy.elementBoosts.length, 0);
});
check('each card instance retains its own limited skill uses', () => {
  const tiger = cards.find(c => c.id === 'beast_g_baihu');
  const target = cards.find(c => c.id === 'beast_g_xuanwu');
  const ctx = context();
  for (let index = 0; index < 2; index++) {
    const self = durable(tiger, `tiger-${index}`);
    const enemy = durable(target, `enemy-${index}`);
    core.performAttack({ attackerCard: tiger, attacker: self, defenderCard: target, defender: enemy, context: ctx });
    assert.equal(enemy.stunnedTurns, 1, `instance ${index} must get its own skill use`);
  }
});
check('a replacement occupies the vacant frontline slot', () => {
  const card = cards.find(c => c.form === 'YOUNG' && c.cost === 1);
  const game = core.createGame({ playerDeck: [], opponentDeck: [], seed: 2 });
  game.players.PLAYER.field = [1, 2].map(slot => ({ card, instance: durable(card, `slot-${slot}`), slot }));
  game.players.PLAYER.hand = [card.id];
  core.playTurn(game);
  assert.deepEqual(game.players.PLAYER.field.map(unit => unit.slot).sort(), [0, 1, 2]);
});
check('high-rarity starters obey the shared budget', () => {
  const guardians = cards.filter(card => card.form === 'GUARDIAN').slice(0, 3).map(card => card.id);
  assert.equal(core.validateLineup(guardians).ready, false);
  assert.throws(() => core.createDuel({ player: { lineup: guardians, deck: ids }, opponent: { lineup: guardians, deck: ids }, seed: 1 }));
});
check('opponents are unique, affordable and reproducible for 100 seeds', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const pool = cards.map(card => card.id);
    const lineup = core.buildLineup(pool, core.createRng(seed));
    assert(core.validateLineup(lineup).ready);
    assert.deepEqual(lineup, core.buildLineup(pool, core.createRng(seed)));
  }
});
check('stunned target misses its action and recovers after its own turn', () => {
  const tiger = cards.find(card => card.id === 'beast_g_baihu');
  const card = cards.find(card => card.id === 'beast_g_xuanwu');
  const game = core.createGame({ playerDeck: [], opponentDeck: [], seed: 1 });
  game.turn = 2;
  game.players.PLAYER.field = [{ card: tiger, instance: durable(tiger, 'tiger'), slot: 0 }];
  game.players.OPPONENT.field = [{ card, instance: durable(card, 'target'), slot: 0 }];
  core.playTurn(game);
  const before = game.players.PLAYER.field[0].instance.hp;
  core.playTurn(game);
  assert.equal(game.players.PLAYER.field[0].instance.hp, before);
  assert.equal(game.players.OPPONENT.field[0].instance.stunnedTurns, 0);
});
console.log(`Customer-flow review: ${total - failed}/${total} passed`);
process.exitCode = failed ? 1 : 0;
