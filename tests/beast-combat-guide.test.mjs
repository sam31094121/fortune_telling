import assert from 'node:assert/strict';
import { combatGuideFor, elementGuideRows, elementPercent } from '../.beast-game-build/lib/beast-game/combat-guide.js';
import { interactiveCatalog, newMatch, advance } from '../.beast-game-build/lib/beast-game/interactive.js';
import { getCard } from '../.beast-game-build/lib/beast-game/registry.js';
import { computeDamage } from '../.beast-game-build/lib/beast-game/effects.js';
import { ELEMENT_LABEL } from '../.beast-game-build/lib/beast-game/elements.js';

const catalog = interactiveCatalog();
assert.equal(catalog.length, 60);
for (const card of catalog) {
  const guide = combatGuideFor(card.id);
  assert.ok(guide, card.id);
  assert.equal(guide.elementLabel, ELEMENT_LABEL[card.element]);
  assert.equal(guide.role, card.role);
  assert.equal(guide.skill.description, card.description);
  assert.equal(guide.skill.cost, card.cost);
  for (const stat of ['hp', 'attack', 'defense', 'speed']) assert.equal(guide.stats[stat], card.stats[stat], `${card.id}: show turn-combat ${stat}, not deck-combat stats`);
  assert.ok(guide.guardian && guide.form && guide.wuxing && guide.weapon.name);
}
const differentModes = catalog.find(card => card.stats.hp !== getCard(card.id).stats.hp);
assert.ok(differentModes, 'Fixture distinguishes turn-combat stats from card-registry stats');
assert.notEqual(combatGuideFor(differentModes.id).stats.hp, getCard(differentModes.id).stats.hp);
assert.equal(combatGuideFor('not-a-card'), null);

const match = newMatch(['beast_y21', 'beast_a02'], ['beast_a06', 'beast_a22'], 42);
const fighter = match.player.team[0];
fighter.hp -= 25;
fighter.shield = 19;
fighter.modifiers.push({ stat: 'attack', value: -200, remainingTurns: 2, source: 'test' });
fighter.modifiers.push({ stat: 'speed', value: 20, remainingTurns: 2, source: 'test' });
fighter.cooldown = 2;
const before = structuredClone(match);
const current = combatGuideFor(fighter.cardId, fighter);
assert.equal(current.stats.attack, 0, 'Attack reduction uses the core clamp');
assert.equal(current.stats.speed, fighter.speed + 20);
assert.equal(current.stats.hp, fighter.hp);
assert.equal(current.stats.shield, 19);
assert.equal(current.skill.cooldown, 2);
const reserve = combatGuideFor('beast_a02', fighter);
assert.equal(reserve.stats.hp, match.player.team[1].hp, 'Inspecting a reserve must not show active HP');
assert.deepEqual(match, before, 'Inspecting cards never mutates combat');
assert.deepEqual(advance(match, { type: 'ATTACK' }), advance(before, { type: 'ATTACK' }), 'Inspection does not change the next round');

const rows = elementGuideRows();
assert.equal(rows.length, 5);
for (const row of rows) {
  assert.equal(row.cells.length, 5);
  for (const cell of row.cells) {
    const resolved = computeDamage({ attack: 43, defense: 30, attackerElement: row.element, defenderElement: cell.defender });
    assert.equal(cell.multiplier, resolved.multiplier, 'The displayed cell matches actual damage calculation');
  }
}
assert.equal(elementPercent('WATER', 'FIRE'), '120%');
assert.equal(elementPercent('FIRE', 'WATER'), '90%');
assert.equal(elementPercent('FIRE', 'FIRE'), '100%');
assert.equal(combatGuideFor('beast_a06').guardian, '東方蒼龍');
assert.equal(combatGuideFor('beast_a06').elementLabel, '火', 'Guardian affiliation does not replace the card element');
console.log('PASS: 60 card guides use turn-combat stats, skill costs, roles and element identities');
console.log('PASS: current HP, shield, cooldown and modifiers; reserve isolation; inspection never changes combat');
console.log('PASS: all 25 matchup cells agree with core damage; existing 120/90/100 percentages preserved');
