// Run after compiling the core with npm run test:beast-game.
// Paired role swaps keep each sampled lineup/deck on both sides.
const assert = require('node:assert/strict');
const core = require('../.beast-game-build/lib/beast-game');
const ids = core.playableCards().map(card => card.id);
const stats = { games: 0, firstWins: 0, secondWins: 0, draws: 0, fatigueGames: 0, totalRounds: 0 };
const seen = new Set();
for (let seed = 1001; seed <= 1500; seed++) {
  const random = core.createRng(seed);
  const a = { lineup: core.buildLineup(ids, random), deck: core.buildDeck(ids, random) };
  const b = { lineup: core.buildLineup(ids, random), deck: core.buildDeck(ids, random) };
  for (const [player, opponent] of [[a, b], [b, a]]) {
    player.lineup.concat(opponent.lineup).forEach(id => seen.add(id));
    const game = core.playToEnd(core.createDuel({ player, opponent, seed }));
    stats.games++;
    assert(game.winner && game.turn <= core.MAX_TURNS + 1);
    assert(game.players.PLAYER.field.length <= 3 && game.players.OPPONENT.field.length <= 3);
    if (game.winner === (game.firstPlayer ?? 'PLAYER')) stats.firstWins++;
    else if (game.winner !== 'DRAW') stats.secondWins++;
    else stats.draws++;
    if (game.players.PLAYER.fatigue || game.players.OPPONENT.fatigue) stats.fatigueGames++;
    stats.totalRounds += game.turn;
  }
}
const firstWinRate = stats.firstWins / (stats.firstWins + stats.secondWins);
console.log(JSON.stringify({ ...stats, averageRounds: stats.totalRounds / stats.games, firstWinRate, startersCovered: seen.size, coreVersion: core.GAME_CORE_VERSION }));
// A regression alarm for this fixed sample, not proof of universal balance.
assert(firstWinRate >= 0.4 && firstWinRate <= 0.6, 'fixed-sample initiative bias exceeds 60/40');
assert(stats.draws / stats.games < 0.1, 'too many stalled matches');
assert.equal(seen.size, ids.length, 'sample must exercise all 60 cards as starters');
