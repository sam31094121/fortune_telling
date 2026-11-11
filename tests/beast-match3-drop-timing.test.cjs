// 寶珠戰掉落時序：快、狠、準、穩（2026-11-11 業主要求）。
// 用 300 次真實連線（真實核心、真實連鎖）驗證；只驗「怎麼排時間」，核心盤面／傷害／獎勵由其他測試守著。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, f);
const M = require('../lib/beast-game/match3/index.ts');
const { buildOrbReplay } = require('../lib/beast-game/match3/replay.ts');
const { refillPresentation, refillLandingTimes, fallDurationMs, REFILL_TIMING, FUSION_CLEAR_AT_MS, FUSION_DISPLAY_MS } = require('../lib/beast-game/match3/refill-presentation.ts');
const css = fs.readFileSync('components/battlefield/Match3Board.module.css', 'utf8');
const board_tsx = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n += 1; };
const eq = (a, b, m) => { assert.equal(a, b, m); n += 1; };

// ── 真實連線樣本 ──
function randomPath(board, rng, length) {
  const R = board.length, C = board[0].length;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (let a = 0; a < 200; a++) {
    const r0 = Math.floor(rng() * R), c0 = Math.floor(rng() * C), el = board[r0][c0];
    const cells = [{ r: r0, c: c0 }], seen = new Set([r0 * 100 + c0]);
    while (cells.length < length) {
      const last = cells.at(-1);
      const opt = dirs.map(([dr, dc]) => ({ r: last.r + dr, c: last.c + dc })).filter(p => p.r >= 0 && p.r < R && p.c >= 0 && p.c < C && board[p.r][p.c] === el && !seen.has(p.r * 100 + p.c));
      if (!opt.length) break;
      const next = opt[Math.floor(rng() * opt.length)]; cells.push(next); seen.add(next.r * 100 + next.c);
    }
    if (cells.length >= length) return cells;
  }
  return null;
}
const samples = [];
for (let seed = 1; samples.length < 300 && seed < 2000; seed++) {
  const rng = M.seededRng(seed * 7919);
  const board = M.generateDragBoard(rng, 8, 7, true, 3);
  const path = randomPath(board, rng, 3 + Math.floor(rng() * 5)); if (!path) continue;
  const magic = M.emptyMagic(board);
  const result = M.resolveDrag(board, path, M.seededRng(seed), magic, 50, true, true, 4);
  if (!result.valid || !result.steps.length) continue;
  samples.push({ board, magic, path, result, replay: buildOrbReplay(board, magic, path, result, true) });
}
ok(samples.length >= 250, `取得足夠的真實連線樣本（${samples.length}）`);

// ── 準：落程只由「這顆自己要落幾格」決定 ──
for (let d = 1; d < 9; d++) ok(fallDurationMs(d + 1) > fallDurationMs(d), `落越遠越久（${d}→${d + 1} 格）`);
ok(fallDurationMs(1) >= 90 && fallDurationMs(8) <= 260, `落程落在 90～260ms（1 格 ${fallDurationMs(1)}／8 格 ${fallDurationMs(8)}）`);
let totals = [], firsts = [], steps = [];
for (const s of samples) {
  const plan = refillPresentation(s.replay, false);
  totals.push(plan.durationMs); firsts.push(plan.frames[0].endAt); steps.push(s.replay.length);
  plan.frames.forEach((frame, i) => {
    const info = s.replay[i];
    for (const m of frame.motions) {
      eq(m.durationMs, fallDurationMs(m.r - m.fromRow), '每顆落程＝自己的落差換算（不是整段共用最遠那顆）');
      ok(m.delayMs >= 0 && Number.isInteger(m.delayMs) && Number.isInteger(m.durationMs), '起點與落程為非負整數 ms（穩）');
      ok(frame.fallAt + m.delayMs + m.durationMs <= frame.endAt + 1e-7, '每顆都在這一段結束前落定');
    }
    // 穩：每顆起點唯一
    eq(new Set(frame.motions.map(m => m.delayMs)).size, frame.motions.length, '每顆起點唯一');
    // 舊珠全部落定，新珠才進場（業主核定的嚴格順序）
    const old = frame.motions.filter(m => m.fromRow >= 0), fresh = frame.motions.filter(m => m.fromRow < 0);
    if (old.length && fresh.length) ok(Math.min(...fresh.map(m => m.delayMs)) >= Math.max(...old.map(m => m.delayMs + m.durationMs)), '舊珠全部落定，新珠才進場');
    // 準：同一欄的珠子在飛行途中不互相穿過。逐 3ms 取樣每顆「實際所在的列」（落下曲線 y∝t²），
    // 同組（舊珠或新珠）相鄰兩顆，下方的永遠不落在上方的後面（舊珠間距至少 0.9 列）。
    // 註：新珠都從棋盤上方同一列出發，下方那顆要掉的格數較多，所以上方那顆「落地時間」可能略早幾 ms，
    // 但此時下方那顆已幾乎到位、仍在它下面，並不穿過——所以規則是看位置，不是看誰先落地。
    const rowAt = (m, t) => { const u = Math.min(1, Math.max(0, (t - frame.fallAt - m.delayMs) / m.durationMs)); return m.r - (m.r - m.fromRow) * (1 - u * u); };
    const byCol = new Map(); for (const m of frame.motions) { if (!byCol.has(m.c)) byCol.set(m.c, []); byCol.get(m.c).push(m); }
    for (const list of byCol.values()) {
      for (const group of [list.filter(m => m.fromRow >= 0), list.filter(m => m.fromRow < 0)]) {
        group.sort((a, b) => b.r - a.r);
        for (let k = 1; k < group.length; k++) {
          const low = group[k - 1], up = group[k], minGap = group === list.filter(m => m.fromRow >= 0) ? 0.9 : 0;
          let worst = Infinity;
          for (let t = frame.fallAt; t <= frame.endAt; t += 3) worst = Math.min(worst, rowAt(low, t) - rowAt(up, t));
          ok(worst >= (low.fromRow >= 0 ? 0.9 : -1e-9), '同欄珠子飛行途中不穿過（最小間距 ' + worst.toFixed(2) + ' 列）');
        }
      }
    }
    // 連鎖停留：第一段是玩家自己的線，短；之後每段要看得出配到什麼
    eq(frame.matchMs, info.matches.length ? (i === 0 ? REFILL_TIMING.matchFirstMs : REFILL_TIMING.matchNextMs) : 0, '配對停留依段數');
    if (i) eq(frame.clearAt, plan.frames[i - 1].endAt + frame.matchMs, '段與段首尾相接，沒有空檔');
    ok(refillLandingTimes(frame.motions).length <= 6, '落地提示音有界（不會每顆響一次）');
  });
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const q = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];

// ── 快：真實連線的總時間（改之前：平均約 8100ms、第一段約 1500ms、P90 約 16300ms） ──
ok(avg(totals) <= 5000, `一次連線平均 ≤ 5000ms（實測 ${Math.round(avg(totals))}ms，改之前約 8100ms）`);
ok(q(totals, .9) <= 10500, `一次連線 P90 ≤ 10500ms（實測 ${q(totals, .9)}ms，改之前約 16300ms）`);
ok(avg(firsts) <= 900, `沒連鎖時（第一段）平均 ≤ 900ms（實測 ${Math.round(avg(firsts))}ms，改之前約 1500ms）`);
// 規則：不因連鎖數壓縮——最長的連鎖仍然比短的久（沒有全域上限）
const longest = samples.map((s, i) => ({ steps: steps[i], total: totals[i] })).sort((a, b) => b.steps - a.steps)[0];
ok(longest.steps > 10 && longest.total > avg(totals), `連鎖越長總時間越久，沒有整串壓縮（最長 ${longest.steps} 段 ${longest.total}ms）`);

// ── 穩：減少動態、盾牌合體與獎勵停留不被動到 ──
for (const s of samples.slice(0, 60)) {
  const r = refillPresentation(s.replay, true);
  ok(r.frames.every(f => f.clearMs === REFILL_TIMING.reducedClearMs && f.motions.every(m => m.delayMs === 0 && m.durationMs === 0)), '減少動態：清除 60ms、不排掉落');
}
eq(FUSION_CLEAR_AT_MS, 1450, '盾牌合體釋放點 1450ms 不改'); eq(FUSION_DISPLAY_MS, 1650, '盾牌合體展示 1650ms 不改');
eq(REFILL_TIMING.rewardHoldMs, 260, '獎勵停留 260ms 不改');
eq(refillPresentation([{ falls: [{ r: 3, c: 0, fromRow: 1 }], rewards: [{ r: 3, c: 0, element: 'FIRE', power: 7 }] }]).frames[0].endAt - refillPresentation([{ falls: [{ r: 3, c: 0, fromRow: 1 }] }]).frames[0].endAt, 260, '有獎勵的段落多停 260ms');

// ── 狠＋穩：樣式 ──
const falling = css.slice(css.indexOf('.wrap[data-mode^="hard"] .falling {'), css.indexOf('@keyframes m3RefillLand'));
ok(/cubic-bezier\(\.333,0,\.667,\.333\)/.test(falling), '落下用重力曲線（y∝t²）');
ok(/m3RefillLand 90ms[^;]*forwards/.test(falling) && !/m3RefillLand[^;]*both/.test(falling), '落地壓扁只在落地後才套用（forwards，不蓋住延遲中的位置）');
ok(/transform-origin:\s*50% 100%/.test(falling), '壓扁以底部為支點（像落在地上）');
ok(!/filter|blur|shake|vibrate/i.test(falling), '落下動畫只用 transform／opacity，不用 filter、不震動');
ok(/@keyframes m3RefillLand[\s\S]*?scale\(1\.07, \.9\)/.test(css), '落地壓扁幅度很小（1.07／0.9）');
ok(/prefers-reduced-motion: reduce\)\s*\{[^}]*\.falling[^}]*animation: none/.test(css), '減少動態時關掉落下與落地動畫');
ok(!/navigator\.vibrate|\.vibrate\(/.test(board_tsx), '寶珠盤面沒有裝置震動');
ok(/useState<number>\(REFILL_TIMING\.clearMs\)/.test(board_tsx), '清除時間初值取自同一份時序常數');

console.log(`beast-match3-drop-timing: ${n} checks passed（${samples.length} 次真實連線；平均 ${Math.round(avg(totals))}ms、第一段 ${Math.round(avg(firsts))}ms、P90 ${q(totals, .9)}ms）`);
