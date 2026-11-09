const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Source-based so parallel health checks never share compiler output.
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const M = require('../lib/beast-game/match3/index.ts');
const { buildOrbReplay } = require('../lib/beast-game/match3/replay.ts');
const { refillPresentation } = require('../lib/beast-game/match3/refill-presentation.ts');
const key = p => p.r * 1000 + p.c;
let groups = 0, five = 0, multiple = 0, diagonal = 0;
for (let seed = 1; seed <= 200; seed++) {
  for (const length of [3, 5, 6, 7]) {
    const board = M.generateBoard(M.seededRng(seed), 8, 7, true);
    board[7].fill('FIRE', 0, length);
    const magic = M.emptyMagic(board), path = Array.from({ length }, (_, c) => ({ r: 7, c }));
    const result = M.resolveDrag(board, path, M.seededRng(1000 + seed), magic, 50, true, true, 7);
    const snapshot = JSON.stringify(result), replay = buildOrbReplay(board, magic, path, result, true);
    assert.equal(JSON.stringify(result), snapshot, 'replay never redraws RNG or mutates settlement');
    assert.deepEqual(replay.at(-1).boardAfter, result.board);
    assert.deepEqual(replay.at(-1).magicAfter, result.magic);
    assert.equal(replay[0].matches[0].count, length);
    assert.equal(replay[0].matches[0].retained.length, length >= 4 ? 1 : 0);
    const events = M.buildEvents(result.steps, []);
    assert.deepEqual(events.filter(e => e.type === 'clear').map(e => e.count), replay.flatMap(f => f.matches.map(g => g.count)));
    for (const [index, frame] of replay.entries()) {
      const holes = new Set(frame.emptyBefore.map(key)), cleared = new Set(frame.clearedCells.map(key));
      assert.deepEqual(frame.boardBefore, index ? replay[index - 1].boardAfter : board);
      if (frame.kind === 'shuffle') { assert.equal(frame.matches.length, 0); continue; }
      for (const group of frame.matches) {
        groups++; if (index && group.count === 5) five++;
        assert.equal(group.count, new Set(group.cells.map(key)).size);
        assert.equal(group.label, `${group.count} 顆`);
        assert.equal(group.retained.length + group.cells.filter(p => cleared.has(key(p))).length, group.count);
        assert(group.cells.every(p => !holes.has(key(p)) && frame.boardBefore[p.r][p.c] === group.element));
        const traced = new Set(group.paths.flat().map(key));
        assert.deepEqual([...traced].sort(), group.cells.map(key).sort(), 'every actual bead, including retained bead, is traced');
        for (const line of group.paths) {
          assert(line.length >= 3);
          assert(M.isValidPath(frame.boardBefore, line, true));
          if (line[0].r !== line[1].r && line[0].c !== line[1].c) diagonal++;
        }
      }
      if (frame.matches.length > 1) multiple++;
      const matched = new Set(frame.matches.flatMap(g => g.cells.map(key)));
      assert([...cleared].every(k => matched.has(k)), 'no disappearance without a matched event');
      const spawned = frame.falls.filter(f => f.fromRow < 0);
      assert.equal(spawned.length + frame.emptyCells.length, holes.size + cleared.size);
      const destinations = new Map(frame.falls.map(f => [key(f), f]));
      const rewardAt = new Map(frame.rewards.map(r => [key(r), r]));
      const emptyAfter = new Set(frame.emptyCells.map(key));
      const consumed = new Set();
      for (let r = 0; r < 8; r++) for (let c = 0; c < 7; c++) {
        const k = key({ r, c }); if (emptyAfter.has(k)) continue;
        const fall = destinations.get(k); if (fall?.fromRow < 0) continue;
        const from = fall?.fromRow ?? r, source = key({ r: from, c });
        assert(!holes.has(source) && !cleared.has(source) && !consumed.has(source)); consumed.add(source);
        assert.equal(frame.boardAfter[r][c], frame.boardBefore[from][c], 'survivor cannot silently change colour');
        assert.equal(frame.magicAfter[r][c], rewardAt.get(k)?.power ?? frame.magicBefore[from][c]);
      }
      assert.equal(consumed.size, 56 - holes.size - cleared.size, 'every surviving bead has exactly one destination');
      if (index && frame.matches.length) {
        const excluded = new Set(holes);
        frame.magicBefore.forEach((row,r)=>row.forEach((n,c)=>{if(n>=7)excluded.add(r*1000+c)}));
        assert.deepEqual(frame.groups.map(g => g.cells), M.findGroups(frame.boardBefore, true, excluded).map(g => g.cells));
      }
    }
    for (const reduced of [false, true]) {
      const plan = refillPresentation(replay, reduced);
      plan.frames.forEach((f,i)=>assert.equal(f.matchMs, replay[i].matches.length ? 600 : 0));
    }
  }
}
assert(five > 0 && multiple > 0 && diagonal > 0);
console.log(`PASS 800 seeded 56-bead replays: ${groups} groups, ${five} falling five-bead groups, ${multiple} simultaneous groups; 3/5/6/7, survivor conservation, no silent colour change, exact events/paths/counts, reduced-motion hold`);
