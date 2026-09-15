/**
 * 神獸卡三級難度＋困難首領反制守門（2026-09-15）
 * ============================================================================
 *
 * 業主定調：
 *   易經變強靠「更聰明的出手」，數值不動；先做三級。
 *   玩家的自動連擊維持基礎規則。
 *   困難的首領反制（強力版）只有易經能用，畫面要明白告知。
 *   目標勝率（易經對基礎自動連擊）：簡單約五成、困難約七成。
 *
 * 技能檔案鐵律：不得偷看玩家隱藏決策、偷偷調整數值、保證玩家輸或假裝真人。
 * 這支測試把上面每一句變成會紅的斷言。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const B = '../.beast-game-build/lib/beast-game/';
const { newMatch, advance, chooseAI, bossNotice, interactiveCatalog, INTERACTIVE_VERSION } = require(B + 'interactive');
const { createRng } = require(B + 'turn');
const { elementGenerates } = require(B + 'elements');

const cards = interactiveCatalog();
const ids = cards.map((c) => c.id);
const ofElement = (element) => cards.filter((c) => c.element === element).map((c) => c.id);
// 風生火：火當主戰、風當後備，雙方都有相生後備，才有魔珠與暴怒合體。
assert.ok(elementGenerates('AIR', 'FIRE'));
const mine = [ofElement('FIRE')[0], ofElement('AIR')[0]];
const theirs = [ofElement('FIRE')[1], ofElement('AIR')[1]];
const ATTACK = { type: 'ATTACK' };
let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`PASS: ${name}`); };

check('沒指定難度就是簡單：紀錄不多欄位、沒有首領', () => {
  const easy = newMatch(mine, theirs, 21);
  assert.equal(easy.difficulty, undefined);
  assert.equal(easy.opponent.boss, undefined);
  assert.equal(easy.player.boss, undefined);
});

check('困難不改任何卡片數值與開局資源；首領反制只有易經有', () => {
  const easy = newMatch(mine, theirs, 21);
  const hard = newMatch(mine, theirs, 21, { difficulty: 'HARD' });
  assert.equal(hard.difficulty, 'HARD');
  assert.deepEqual(hard.player.team, easy.player.team);
  assert.deepEqual(hard.opponent.team, easy.opponent.team);
  for (const side of ['player', 'opponent']) {
    for (const key of ['energy', 'rageAvailable', 'orbs', 'rage']) assert.equal(hard[side][key], easy[side][key], `${side}.${key}`);
  }
  assert.ok(hard.opponent.boss);
  assert.equal(hard.player.boss, undefined);
  assert.equal(newMatch(mine, theirs, 21, { difficulty: 'NORMAL' }).opponent.boss, undefined, '中等沒有首領反制');
});

check('玩家那一側預設永遠是基礎規則（自動連擊不跟著變聰明）', () => {
  for (const difficulty of ['NORMAL', 'HARD']) {
    for (let seed = 0; seed < 20; seed++) {
      const m = newMatch(ids.slice(seed, seed + 3), ids.slice(seed + 3, seed + 6), seed, { difficulty });
      assert.deepEqual(chooseAI(m, 'player'), chooseAI(m, 'player', 'EASY'));
    }
  }
});

check('易經判斷只看局面：同局面同答案，也不看這一場的種子', () => {
  for (let seed = 0; seed < 30; seed++) {
    let m = newMatch(ids.slice(seed, seed + 3), ids.slice(seed + 3, seed + 6), seed, { difficulty: 'HARD' });
    for (let i = 0; i < 6 && m.status === 'PLAYING'; i++) m = advance(m, chooseAI(m, 'player'));
    if (m.status !== 'PLAYING') continue;
    const decision = chooseAI(m, 'opponent');
    assert.deepEqual(chooseAI(structuredClone(m), 'opponent'), decision);
    assert.deepEqual(chooseAI({ ...m, seed: m.seed + 123457 }, 'opponent'), decision, '換一顆種子（先後手結果不同）判斷必須一樣');
  }
});

check('寶珠封印：先在戰報預告，下一回合結束才封；玩家搶先合體就封不到', () => {
  const start = newMatch(mine, theirs, 21, { difficulty: 'HARD' });
  start.player.orbs = 2;
  const warned = advance(start, ATTACK, ATTACK);
  assert.equal(warned.opponent.boss.armed, 'ORB_SEAL');
  assert.ok(warned.log.some((e) => e.bossCounter === 'ORB_SEAL' && /預告/.test(e.text)), '要先預告');
  assert.ok(warned.player.orbs > 0, '預告當下還沒封');
  const sealed = advance(warned, ATTACK, ATTACK);
  assert.equal(sealed.player.orbs, 0);
  assert.ok(sealed.log.some((e) => e.bossCounter === 'ORB_SEAL' && /封印/.test(e.text) && !/預告/.test(e.text)));
  const dodged = advance(warned, { type: 'RAGE' }, ATTACK);
  assert.ok(!dodged.log.some((e) => e.bossCounter === 'ORB_SEAL' && !/預告/.test(e.text)), '玩家已用掉魔珠合體，不再封印');
  assert.equal(advance(sealed, ATTACK, ATTACK).opponent.boss.armed === 'ORB_SEAL', false, '整場只用一次');
});

check('合體破壞：到迴天滅地先預告；下回合仍合體就被擊碎、不造成傷害', () => {
  const start = newMatch(mine, theirs, 21, { difficulty: 'HARD' });
  start.player.orbs = 3; start.player.rage = 70;
  const warned = advance(start, ATTACK, ATTACK);
  assert.equal(warned.opponent.boss.armed, 'FUSION_BREAK');
  assert.ok(warned.log.some((e) => e.bossCounter === 'FUSION_BREAK' && /預告/.test(e.text)));
  const before = warned.opponent.team[warned.opponent.active];
  const broken = advance(warned, { type: 'RAGE' }, ATTACK);
  const after = broken.opponent.team[broken.opponent.active];
  assert.equal(after.hp + after.shield, before.hp + before.shield, '被擊碎的合體不得造成傷害');
  assert.equal(broken.player.rageAvailable, 0);
  assert.ok(broken.log.some((e) => e.bossCounter === 'FUSION_BREAK' && /擊碎/.test(e.text)));
  const waited = advance(warned, ATTACK, ATTACK);
  assert.equal(waited.opponent.boss.armed === 'FUSION_BREAK', false, '預告只維持一回合，整場一次');
});

check('背水模式：易經五珠滿怒才進入，接下來兩回合攻擊加成、之後恢復', () => {
  const start = newMatch(mine, theirs, 21, { difficulty: 'HARD' });
  start.opponent.orbs = 5; start.opponent.rage = 100;
  const entered = advance(start, ATTACK, ATTACK);
  assert.equal(entered.opponent.boss.desperationRounds, 2);
  assert.ok(entered.log.some((e) => e.bossCounter === 'DESPERATION_MODE'));
  const calm = structuredClone(entered); calm.opponent.boss.desperationRounds = 0;
  const hit = (m) => { const n = advance(m, ATTACK, ATTACK); const f = n.player.team[n.player.active]; return f.hp + f.shield; };
  assert.ok(hit(entered) < hit(calm), '背水回合易經打得更重');
  const later = advance(advance(entered, ATTACK, ATTACK), ATTACK, ATTACK);
  assert.equal(later.opponent.boss.desperationRounds, 0);
});

check('同一局重播結果一模一樣（困難也可回查）', () => {
  const play = () => { let m = newMatch(ids.slice(10, 13), ids.slice(20, 23), 77, { difficulty: 'HARD' }); while (m.status === 'PLAYING') m = advance(m, chooseAI(m, 'player')); return m; };
  assert.deepEqual(play(), play());
});

/*
  勝率閘門：易經（各級）對「基礎自動連擊」，同一批鏡像陣容。
  目標是業主定的五成、七成；區間放寬到能容忍 600 局的抽樣誤差，
  超出就代表判斷壞掉（例如 2026-09-15 第一版一步推演亂換卡，困難只剩 38%）。
*/
const SEEDS = 300;
const results = {};
check('勝率落在目標區間：簡單約五成、困難約七成，且越難越強', () => {
  for (const difficulty of ['EASY', 'NORMAL', 'HARD']) {
    let opp = 0, draws = 0, games = 0;
    for (let seed = 0; seed < SEEDS; seed++) {
      const rng = createRng(seed + 1000), pool = [...ids];
      const pick = () => pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const a = [pick(), pick(), pick()], b = [pick(), pick(), pick()];
      for (const swap of [false, true]) {
        let m = newMatch(swap ? b : a, swap ? a : b, seed, { difficulty });
        while (m.status === 'PLAYING') m = advance(m, chooseAI(m, 'player'));
        games += 1;
        if (m.winner === 'opponent') opp += 1; else if (m.winner === 'DRAW') draws += 1;
      }
    }
    results[difficulty] = { games, opponentWinRate: +((opp + draws * 0.5) / games).toFixed(3), draws };
  }
  console.log(JSON.stringify(results));
  assert.ok(results.EASY.opponentWinRate >= 0.42 && results.EASY.opponentWinRate <= 0.58, `簡單應約五成：${results.EASY.opponentWinRate}`);
  assert.ok(results.HARD.opponentWinRate >= 0.62 && results.HARD.opponentWinRate <= 0.8, `困難應約七成：${results.HARD.opponentWinRate}`);
  assert.ok(results.EASY.opponentWinRate < results.NORMAL.opponentWinRate && results.NORMAL.opponentWinRate < results.HARD.opponentWinRate, '越難越強');
  fs.mkdirSync('reports/beast-turn-based', { recursive: true });
  fs.writeFileSync('reports/beast-turn-based/difficulty.json', JSON.stringify({
    version: INTERACTIVE_VERSION,
    policy: 'opponent level vs player base auto-combo (EASY), mirrored 3v3 lineups, HARD includes boss counters',
    seeds: SEEDS, results,
    note: '中等入口（單卡押注競技場）走三局單挑引擎 series.ts，這裡的 NORMAL 是同一核心的中間層，不代表中等入口的實測勝率。',
  }, null, 2));
});

check('困難頁：只有押注戰用困難，體驗戰維持簡單，並明白告知首領反制', () => {
  const page = fs.readFileSync('app/beast-game/battlefield/page.tsx', 'utf8');
  // 2026-09-15 後端化：難度由困難戰場 API 依押注決定，頁面不自己決定。
  assert.match(fs.readFileSync('app/api/beast-game/battlefield/route.ts', 'utf8'), /difficulty: stakeCount > 0 \? 'HARD' : 'EASY'/);
  assert.match(page, /data-boss-notice>困難：易經是首領/);
  assert.ok(!/線上對戰|真人對戰/.test(page), '不得宣稱真人');
});

check('首領預告在戰鬥畫面看得到：預告時照印對策，生效後照印結果；簡單沒有', () => {
  assert.equal(bossNotice(newMatch(mine, theirs, 21)), null);
  const start = newMatch(mine, theirs, 21, { difficulty: 'HARD' });
  assert.equal(bossNotice(start), null, '還沒預告就不顯示');
  start.player.orbs = 2;
  const warned = advance(start, ATTACK, ATTACK);
  assert.match(bossNotice(warned), /預告・寶珠封印/);
  assert.match(bossNotice(warned), /暫停/, '要附對策');
  assert.match(bossNotice(advance(warned, ATTACK, ATTACK)), /你的魔珠全部被封印/);
  const page = fs.readFileSync('app/beast-game/battlefield/page.tsx', 'utf8');
  assert.match(page, /liveNotice && <p role="status"[^>]*data-boss-live>/, '困難頁要把後端送來的提示放在操作區');
  assert.match(fs.readFileSync('app/api/beast-game/battlefield/route.ts', 'utf8'), /notice: bossNotice\(match\)/, '首領提示由後端產生');
});

/* ── 中等入口：三局單挑的易經組陣 ── */
const core = require(B + 'index');
check('中等易經組陣：只收卡池與種子（看不到玩家陣容）、合法、可重現、不會每場同一套', () => {
  const pool = core.playableCards().map((c) => c.id);
  assert.equal(core.chooseSeriesOpponent.length, 2, '函式只收卡池與種子');
  assert.deepEqual(core.chooseSeriesOpponent(pool, createRng(42)), core.chooseSeriesOpponent(pool, createRng(42)));
  const seen = new Set();
  for (let seed = 0; seed < 200; seed++) {
    const { lineup, fusionSlot } = core.chooseSeriesOpponent(pool, createRng(seed + 9000));
    assert.equal(core.validateLineup(lineup).ready, true, core.validateLineup(lineup).reason);
    assert.ok(lineup.reduce((sum, id) => sum + core.getCard(id).cost, 0) <= 12);
    if (fusionSlot !== null) assert.ok(core.seriesFusionMaterial(lineup, fusionSlot), '合體位置必須真的有未上場的相生卡');
    seen.add(lineup.join(','));
  }
  assert.ok(seen.size >= 150, `陣容要有變化，不可被摸透：${seen.size}`);
});

check('中等易經勝率約六成（對隨機組陣的基礎玩家），隨機對隨機約五成', () => {
  const pool = core.playableCards().map((c) => c.id);
  const randomSide = (rng) => { const lineup = core.buildLineup(pool, rng); return { lineup, fusionSlot: [0, 1].find((s) => core.seriesFusionMaterial(lineup, s)) ?? null }; };
  const rate = (chooseOpponent) => {
    let opp = 0, draws = 0; const games = 1200;
    for (let seed = 0; seed < games; seed++) {
      const p = randomSide(createRng(seed + 5000));
      const o = chooseOpponent(createRng(seed + 9000));
      const r = core.playSeries(p.lineup, o.lineup, seed, { player: p.fusionSlot, opponent: o.fusionSlot });
      if (r.winner === 'OPPONENT') opp += 1; else if (r.winner === 'DRAW') draws += 1;
    }
    return +((opp + draws * 0.5) / games).toFixed(3);
  };
  const medium = rate((rng) => core.chooseSeriesOpponent(pool, rng));
  const baseline = rate(randomSide);
  console.log(JSON.stringify({ mediumOpponentWinRate: medium, randomBaseline: baseline }));
  assert.ok(baseline >= 0.4 && baseline <= 0.56, `隨機對隨機應約五成：${baseline}`);
  assert.ok(medium >= 0.54 && medium <= 0.68, `中等易經應約六成：${medium}`);
  fs.writeFileSync('reports/beast-turn-based/medium-opponent.json', JSON.stringify({ games: 1200, mediumOpponentWinRate: medium, randomBaseline: baseline, topFraction: core.MEDIUM_TOP_FRACTION, policy: 'chooseSeriesOpponent vs random buildLineup player with first valid fusion slot' }, null, 2));
  const api = fs.readFileSync('app/api/beast-game/route.ts', 'utf8');
  assert.match(api, /chooseSeriesOpponent\(ids, rng\)/, '中等 API 要用易經組陣');
  assert.ok(!/buildLineup\(ids, rng\)/.test(api), '不可再隨機抽易經陣容');
  assert.match(api, /組陣時看不到你的陣容/, '公平說明要照實告訴客戶');
  assert.ok(!/一比一時親手揭開決勝局/.test(api), '公平說明不得寫過期的揭牌規則');
});


/* ── 《易經》檔案＋turns difficulty 接線 ── */
check('易經正式檔與新人檔存在，且載入層讀得到政策', () => {
  const archivePath = 'docs/技能戰鬥檔案/易經/易經.json';
  const newbiePath = 'docs/技能戰鬥檔案/易經/新人檔案.md';
  assert.ok(fs.existsSync(archivePath), '缺正式易經.json');
  assert.ok(fs.existsSync(newbiePath), '缺新人檔案.md');
  const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
  assert.equal(archive.name, '易經');
  assert.ok(archive.intelligencePolicies.EASY.rage);
  assert.ok(archive.intelligencePolicies.NORMAL.rage);
  assert.ok(archive.intelligencePolicies.HARD.rage);
  assert.ok(archive.bigDataSummary.rates.opponent.RAGE < 0.02, '大數據應記錄暴怒偏低');
  assert.ok(archive.bigDataSummary.rates.opponent.SKILL > 0.25, '大數據應記錄技能率');
  const { getIchingPolicy, difficultyFromMode, TURNS_START_DEFAULT_DIFFICULTY, shouldRageByPolicy } = require(B + 'iching-skill-archive');
  assert.equal(TURNS_START_DEFAULT_DIFFICULTY, 'NORMAL');
  assert.equal(difficultyFromMode('easy'), 'NORMAL');
  assert.equal(difficultyFromMode('hard'), 'HARD');
  assert.equal(getIchingPolicy('NORMAL').rage.orbsAtLeast, 2);
  assert.equal(shouldRageByPolicy('NORMAL', { selfHpRatio: 0.9, enemyHpRatio: 0.9, orbs: 2 }), true);
  assert.equal(shouldRageByPolicy('EASY', { selfHpRatio: 0.9, enemyHpRatio: 0.9, orbs: 0 }), false);
});

check('turns START 接 difficulty、缺省 NORMAL；免費三卡 UI 送 NORMAL', () => {
  const route = fs.readFileSync('app/api/beast-game/turns/route.ts', 'utf8');
  assert.match(route, /TURNS_START_DEFAULT_DIFFICULTY/, 'START 缺省讀易經檔預設');
  assert.match(route, /newMatch\(b\.lineup,pick\(3\),randomInt\(2147483647\),\{difficulty\}\)/, 'START 必須傳 difficulty');
  const page = fs.readFileSync('components/BeastTurnGame.tsx', 'utf8');
  assert.match(page, /send\('START', \{ lineup: selected, difficulty: 'NORMAL' \}\)/, '免費三卡開戰送 NORMAL');
  const interactive = fs.readFileSync('lib/beast-game/interactive.ts', 'utf8');
  assert.match(interactive, /shouldRageByPolicy/, '暴怒判斷讀易經政策');
  assert.match(interactive, /政策門檻來自《易經》檔/, '註解標明政策來源');
});

console.log(`beast difficulty ─ PASS ${passed}`);
