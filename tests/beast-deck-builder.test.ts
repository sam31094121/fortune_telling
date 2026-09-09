import { strict as assert } from 'node:assert';
import { BATTLEFIELD_DECK_SIZE, buildFreshOpeningDeck, buildUniqueDeck, isCompleteDeckSelection, sanitizeDeckSelection } from '../lib/beast-game/deck-builder';

const ids = Array.from({ length: 60 }, (_, index) => `card-${index + 1}`);
let value = 0;
const rng = () => ((value++ * 17) % 97) / 97;

const deck = buildUniqueDeck(ids, rng);
assert.equal(deck.length, BATTLEFIELD_DECK_SIZE);
assert.equal(new Set(deck).size, BATTLEFIELD_DECK_SIZE, 'a deck must not contain duplicate cards');
assert.ok(deck.every(id => ids.includes(id)), 'every selected card must belong to the card pool');

const dirty = [ids[0], ids[0], 'unknown', ...ids.slice(1, 25)];
const clean = sanitizeDeckSelection(dirty, ids);
assert.equal(clean.length, BATTLEFIELD_DECK_SIZE);
assert.equal(new Set(clean).size, BATTLEFIELD_DECK_SIZE);
assert.equal(isCompleteDeckSelection(clean, ids), true);
assert.equal(isCompleteDeckSelection(clean.slice(0, 19), ids), false);

const previousOpening = deck.slice(0, 5);
const nextOrder = buildFreshOpeningDeck(deck, previousOpening, rng);
assert.equal(nextOrder.length, BATTLEFIELD_DECK_SIZE);
assert.equal(new Set(nextOrder).size, BATTLEFIELD_DECK_SIZE);
assert.equal(nextOrder.slice(0, 5).some(id => previousOpening.includes(id)), false, 'the next opening hand must avoid the previous five cards');

console.log('beast deck builder tests passed');
