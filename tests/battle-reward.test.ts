import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FUSION_TIER_SHARDS, SHARDS_PER_ADULT, SHARDS_PER_GUARDIAN, SWIFT_WIN_MAX_ROUNDS, exchangeCardId, rewardLines, rewardShards,
  streakBonus, survivalShards, winsToNextStreakTier, type BattleReward,
} from '../lib/beast-game/battle-reward';
import { battleRewardFor, replayHighestFusionTier } from '../lib/beast-game/battle-reward-server';
import { advance, chooseAI, interactiveCatalog, newMatch, type Match } from '../lib/beast-game/interactive';
import { applyCardCampaignStats, cardCampaignOpponent, cardCampaignSeed, cardCampaignStage, enhanceCardCampaign, type CardCampaign } from '../lib/beast-game/card-campaign';
import { creditBattleReward, exchangeShards, migrateCollection, parseShardLedger, shardSummary, type BeastCollection } from '../lib/beast-collection-ledger';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
let n = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); n += 1; };
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n += 1; };
const throws = (fn: () => unknown, msg: string) => { assert.throws(fn, msg); n += 1; };

// ── 規則：連勝階梯、存活分、說明文字 ──
eq([1, 2, 3, 4, 5, 9, 10, 25].map(streakBonus), [0, 0, 1, 1, 2, 2, 3, 3], '連勝 3／5／10 場起加碼 1／2／3');
eq([0, 1, 2, 3].map(survivalShards), [2, 1, 0, 0], '全員生還 2 分、只倒下一隻 1 分');
eq(winsToNextStreakTier(0), { wins: 3, bonus: 1 }, '連勝 0：再 3 場加碼');
eq(winsToNextStreakTier(4), { wins: 1, bonus: 2 }, '連勝 4：再 1 場升到 5 場階');
eq(winsToNextStreakTier(10), null, '連勝 10：已到最高階');
ok(FUSION_TIER_SHARDS.NONE === 0 && FUSION_TIER_SHARDS.DUAL_UNSEAL < FUSION_TIER_SHARDS.TRUE_FUSION && FUSION_TIER_SHARDS.TRUE_FUSION < FUSION_TIER_SHARDS.RAGE_ULTIMATE, '合體階越高碎片越多（越合體越厲害）');
ok(SHARDS_PER_GUARDIAN > SHARDS_PER_ADULT, '四象比成獸貴');
eq([0, 1, 27, 28, 29].map((i) => exchangeCardId('ADULT', i)), ['beast_a01', 'beast_a02', 'beast_a28', 'beast_a01', 'beast_a02'], '成獸按卡檔順序輪流，二十八張輪完回頭');
eq([0, 1, 2, 3, 4].map((i) => exchangeCardId('GUARDIAN', i)), ['beast_g_qinglong', 'beast_g_baihu', 'beast_g_zhuque', 'beast_g_xuanwu', 'beast_g_qinglong'], '四象輪流');

const win = (key: string, parts: Partial<BattleReward> = {}): BattleReward => {
  const r = { key, outcome: 'win' as const, base: 1, survival: 0, swift: 0, fusion: 0, fusionTier: 'NONE' as const, rounds: 30, lines: ['贏得勝利 ＋1'], ...parts };
  return r;
};
const lose = (key: string): BattleReward => ({ key, outcome: 'lose', base: 0, survival: 0, swift: 0, fusion: 0, fusionTier: 'NONE', rounds: 30, lines: [] });
const draw = (key: string): BattleReward => ({ key, outcome: 'draw', base: 0, survival: 0, swift: 0, fusion: 0, fusionTier: 'NONE', rounds: 80, lines: [] });
const empty = (): BeastCollection => ({ cards: [], history: [], granted: [], receipts: {} });
const at = '2026-11-08T00:00:00.000Z';

// ── 帳本：入帳、連勝、防重複 ──
let c = empty();
const first = creditBattleReward(c, win('m1', { survival: 1, swift: 1, lines: ['贏得勝利 ＋1', '穩健：只倒下 1 隻 ＋1', '速戰：22 回合內獲勝 ＋1'] }), at);
c = first.collection;
ok(first.receipt.gained === 3 && c.shards?.shards === 3 && c.shards.streak === 1, '贏一場：基礎＋穩健＋速戰＝3 片、連勝 1');
const dup = creditBattleReward(c, win('m1', { survival: 2 }), at);
ok(dup.duplicate && dup.collection === c && dup.collection.shards?.shards === 3, '同一把鑰匙重送不會多給（即使內容被改成更大）');
const gains: number[] = [];
for (let i = 2; i <= 10; i++) { const r = creditBattleReward(c, win('m' + i), at); c = r.collection; gains.push(r.receipt.gained); }
eq(gains, [1, 2, 2, 3, 3, 3, 3, 3, 4], '連勝 2→1 片、3→+1、5→+2、10→+3 逐場入帳');
ok(c.shards?.streak === 10 && c.shards.bestStreak === 10, '連勝累積到 10');
const afterDraw = creditBattleReward(c, draw('d1'), at);
ok(afterDraw.collection.shards?.streak === 10 && afterDraw.receipt.gained === 0, '平手：連勝不動、沒有碎片');
const afterLose = creditBattleReward(afterDraw.collection, lose('l1'), at);
ok(afterLose.collection.shards?.streak === 0 && afterLose.collection.shards.bestStreak === 10 && afterLose.receipt.gained === 0, '輸了：連勝歸零、最佳紀錄保留、沒有碎片');

// ── 帳本：拒絕不合理的戰績（防竄改）──
throws(() => creditBattleReward(empty(), win('x', { base: 5 }), at), '基礎碎片被改大 → 拒絕');
throws(() => creditBattleReward(empty(), win('x', { fusion: 9 }), at), '合體碎片超過上限 → 拒絕');
throws(() => creditBattleReward(empty(), { ...lose('x'), base: 1 }, at), '輸了卻帶碎片 → 拒絕');
throws(() => creditBattleReward(empty(), win(''), at), '沒有鑰匙 → 拒絕');
throws(() => creditBattleReward(empty(), { ...win('x'), outcome: 'whatever' as never }, at), '勝負不明 → 拒絕');

// ── 帳本：收據只留最近 200 筆 ──
let big = empty();
for (let i = 0; i < 230; i++) big = creditBattleReward(big, draw('k' + i), at).collection;
ok(Object.keys(big.shards!.receipts).length === 200 && !big.shards!.receipts['k0'] && Boolean(big.shards!.receipts['k229']), '收據只留最近 200 筆，舊的被擠掉');

// ── 帳本：兌換 ──
let h = empty();
for (let i = 0; i < 12; i++) h = creditBattleReward(h, win('w' + i, { survival: 2, swift: 1, fusion: 1, fusionTier: 'DUAL_UNSEAL' }), at).collection;
const total = h.shards!.shards;
ok(total >= SHARDS_PER_ADULT, '累積夠兌換');
const ex1 = exchangeShards(h, 'ADULT', at);
ok(ex1.cardId === 'beast_a01' && ex1.shardsLeft === total - SHARDS_PER_ADULT && ex1.collection.cards.some((x) => x.cardId === 'beast_a01' && x.id === 'shard:ADULT:0'), '第一次兌換 → beast_a01，扣 12 片，卡進收藏');
const ex2 = exchangeShards(ex1.collection, 'ADULT', at);
ok(ex2.cardId === 'beast_a02' && ex2.collection.shards!.exchanged.ADULT === 2, '第二次兌換輪到 beast_a02');
throws(() => exchangeShards(empty(), 'ADULT', at), '碎片不夠 → 丟例外、不發卡');
throws(() => exchangeShards(creditBattleReward(empty(), win('a'), at).collection, 'GUARDIAN', at), '四象碎片不夠 → 拒絕');
const richer: BeastCollection = { ...empty(), shards: { ...parseShardLedger({ v: 1, shards: 40, streak: 0, bestStreak: 0, totalEarned: 40, exchanged: { ADULT: 0, GUARDIAN: 0 }, receipts: {} }) } };
const g1 = exchangeShards(richer, 'GUARDIAN', at);
ok(g1.cardId === 'beast_g_qinglong' && g1.shardsLeft === 0 && g1.collection.cards[0].cardId === 'beast_g_qinglong', '四象兌換：40 片 → 青龍');
ok(migrateCollection(JSON.parse(JSON.stringify(g1.collection))).shards?.exchanged.GUARDIAN === 1, '存檔讀回後碎片與兌換次數還在');
throws(() => migrateCollection({ ...empty(), shards: { v: 1, shards: -3 } }), '損毀的碎片資料 → 拒絕讀取，不靜靜歸零');
const sum = shardSummary(h);
ok(sum.canAdult && sum.adultCost === 12 && sum.guardianCost === 40 && typeof sum.nextStreakGoal === 'string', '摘要由帳本算好，畫面照印');

// ── 後端重播：真實引擎對局，重播必須與實際一致 ──
const ids = interactiveCatalog().map((x) => x.id);
let seed = 20261108;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (k: number) => { const pool = [...ids]; const out: string[] = []; while (out.length < k) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); return out; };
const play = (): Match => { let m = newMatch(pick(3), pick(3), Math.floor(rnd() * 2147483647), { difficulty: 'EASY' }); for (let i = 0; i < 200 && m.status === 'PLAYING'; i++) m = advance(m, chooseAI(m, 'player')); return m; };
let wins = 0, losses = 0, withFusion = 0;
let sampleWin: Match | null = null;
for (let i = 0; i < 80; i++) {
  const m = play();
  const r = battleRewardFor(m);
  ok(r !== null, `第 ${i} 場：重播與實際一致，可以算獎勵`);
  if (r!.outcome === 'win') {
    wins++; sampleWin ??= m;
    ok(r!.base === 1 && rewardShards(r!) >= 1 && r!.lines.length >= 1, '贏局至少 1 片且有說明');
    ok(r!.swift === (r!.rounds <= SWIFT_WIN_MAX_ROUNDS ? 1 : 0), '速戰只看回合數');
    ok(r!.fusion === FUSION_TIER_SHARDS[r!.fusionTier], '合體碎片與合體階一致');
    if (r!.fusionTier !== 'NONE') withFusion++;
  } else if (r!.outcome === 'lose') { losses++; ok(rewardShards(r!) === 0 && r!.lines.length === 0, '輸局沒有碎片'); }
}
ok(wins > 10 && losses > 10, `模擬有足夠的勝敗樣本（勝 ${wins}／敗 ${losses}）`);
ok(withFusion > 0, `真實引擎對局確實出現過合體加成（${withFusion} 場）`);
const sw = sampleWin!;
eq(battleRewardFor(sw), battleRewardFor(JSON.parse(JSON.stringify(sw))), '同一場紀錄永遠算出同樣的獎勵（確定性）');
ok(battleRewardFor({ ...sw, status: 'PLAYING' } as Match) === null, '進行中的戰鬥算不出獎勵（不提前揭曉）');

// ── 後端重播：偽造的戰局拿不到獎勵 ──
ok(battleRewardFor({ ...sw, winner: 'opponent' } as Match)?.outcome !== 'win' || replayHighestFusionTier({ ...sw, winner: 'opponent' } as Match) === null, '把勝負改掉重播對不上 → 不發獎');
const forgedWinner = { ...sw, winner: 'player' as const, round: sw.round + 5 } as Match;
ok(battleRewardFor(forgedWinner) === null, '把回合數改掉 → 重播對不上 → 不發獎');
const forgedHp = structuredClone(sw); forgedHp.player.team[0].hp = 999;
ok(battleRewardFor(forgedHp) === null, '把我方血量改掉 → 不發獎');
const forgedHistory = structuredClone(sw); forgedHistory.history = forgedHistory.history.slice(0, -2);
ok(battleRewardFor(forgedHistory) === null, '刪掉戰鬥歷程 → 不發獎');
const forgedLoss = structuredClone(sw); forgedLoss.winner = 'opponent';
const lr = battleRewardFor(forgedLoss);
ok(lr === null || lr.outcome === 'lose', '把贏局改成輸局不會變出碎片');

// ── 最關鍵的偽造：把「輸掉的戰局」改成贏，必須拿不到碎片 ──
let sampleLoss: Match | null = null;
for (let i = 0; i < 200 && !sampleLoss; i++) { const m = play(); if (m.winner === 'opponent') sampleLoss = m; }
ok(sampleLoss !== null, '取得一場輸掉的樣本');
const forgedWin = structuredClone(sampleLoss!); forgedWin.winner = 'player';
ok(battleRewardFor(forgedWin) === null, '輸局改成贏 → 重播對不上 → 不發獎');
const forgedWinRound = structuredClone(sampleLoss!); forgedWinRound.winner = 'player'; forgedWinRound.opponent.team.forEach((f) => { f.hp = 0; });
ok(battleRewardFor(forgedWinRound) === null, '輸局連敵方血量一起改成 0 → 仍然不發獎');
const flippedAll = structuredClone(sampleLoss!); flippedAll.winner = 'player'; flippedAll.history = [];
ok(battleRewardFor(flippedAll) === null, '輸局清空歷程再改成贏 → 不發獎');

// ── 卡片闖關：開局之後還要套關卡倍率與上陣副本強化，重播必須用同一份脈絡 ──
const mkCampaign = (wins: number): CardCampaign => ({ v: 1, kind: 'card-campaign', id: 'c' + Math.floor(rnd() * 1e9), seed: Math.floor(rnd() * 2147483647), wins, pending: 'p-' + Math.floor(rnd() * 1e9), enhancements: [] });
const playCampaign = (campaign: CardCampaign, player: string[], entries?: Array<{ id: string; cardId: string }>) => {
  let m = newMatch(player, cardCampaignOpponent(campaign), cardCampaignSeed(campaign), { difficulty: cardCampaignStage(campaign.wins).difficulty });
  m = applyCardCampaignStats(m, campaign, entries);
  for (let i = 0; i < 400 && m.status === 'PLAYING'; i++) m = advance(m, chooseAI(m, 'player'));
  return m;
};
let campaignWins = 0, withoutContextBroken = 0;
for (let i = 0; i < 400 && campaignWins < 12; i++) {
  const campaign = mkCampaign(3 + (i % 2));
  const player = pick(5);
  const entries = i % 2 === 0 ? player.map((cardId, j) => ({ id: 'entry-' + j, cardId })) : undefined;
  const m = playCampaign(campaign, player, entries);
  if (m.winner !== 'player') continue;
  campaignWins++;
  const withCtx = battleRewardFor(m, { campaign, selectedEntries: entries });
  ok(withCtx !== null && withCtx.outcome === 'win' && withCtx.base === 1, '闖關贏局：給了開局脈絡，重播與實際一致、發獎');
  if (battleRewardFor(m) === null) withoutContextBroken++;
}
ok(campaignWins >= 12, '取得足夠的闖關贏局樣本（' + campaignWins + ' 場）');
ok(withoutContextBroken >= 6, '沒給開局脈絡時闖關贏局大多對不上（' + withoutContextBroken + '／' + campaignWins + '）：脈絡確實必要');

// 有強化的闖關：上陣副本的強化加成也要重做才對得上；拿掉強化就必須對不上
{
  let c: CardCampaign = { ...mkCampaign(1), pending: null };
  const target = { id: 'e-target', cardId: 'beast_a01' };
  const material = { id: 'e-material', cardId: 'beast_y01' };
  const enhanced = enhanceCardCampaign(c, 'op-1', target, material);
  c = { ...enhanced.campaign, pending: 'p-1' };
  ok(c.enhancements.length === 1, '成功建立一筆強化紀錄');
  let found = 0, stripped = 0;
  for (let i = 0; i < 300 && found < 6; i++) {
    const others = pick(8).filter((id) => id !== 'beast_a01' && id !== 'beast_y01').slice(0, 4);
    const player = ['beast_a01', ...others];
    const entries = player.map((cardId, j) => ({ id: j === 0 ? 'e-target' : 'entry-' + j, cardId }));
    const m = playCampaign(c, player, entries);
    if (m.winner !== 'player') continue;
    found++;
    ok(battleRewardFor(m, { campaign: c, selectedEntries: entries })?.outcome === 'win', '有強化的闖關贏局：重播一致、發獎');
    if (battleRewardFor(m, { campaign: { ...c, enhancements: [] }, selectedEntries: entries }) === null) stripped++;
  }
  ok(found >= 3, '取得有強化的闖關贏局樣本（' + found + ' 場）');
  // 被強化的那隻在某些場次可能沒造成傷害（強化對結果無影響），那幾場重播本來就會一致，所以只要求「確實有對不上的」。
ok(stripped >= 1, '把強化紀錄拿掉重播，有場次對不上（' + stripped + '／' + found + '）：強化加成確實被驗證');
}

// ── 穩健：舊存檔、缺欄位、亂資料一律回傳 null，不丟例外（否則戰況 API 會整個 400）──
for (const junk of [null, undefined, {}, { status: 'FINISHED' }, { status: 'FINISHED', seed: 42 }, { status: 'FINISHED', winner: 'player', seed: 1, player: {}, opponent: {} }, { status: 'FINISHED', winner: 'player', seed: 1, player: { team: [] }, opponent: { team: [] }, history: 'x' }, 'garbage', 42]) {
  let result: unknown = 'unset';
  assert.doesNotThrow(() => { result = battleRewardFor(junk as never); }, '壞資料不得讓後端丟例外');
  ok(result === null, '壞資料一律算不出獎勵（null）：' + JSON.stringify(junk));
}

// ── 結構守門：規則檔不得匯入引擎；前端只顯示；不提前揭曉 ──
const rules = read('lib/beast-game/battle-reward.ts');
ok(!/from '\.\/interactive'/.test(rules.replace(/import type \{ Match \} from '\.\/interactive';/, '')), '規則檔只以型別匯入 interactive，不帶進引擎');
ok(!/battle-reward-server/.test(read('lib/beast-collection-ledger.ts')) && !/battle-reward-server/.test(read('lib/beast-collection.ts')), '收藏帳本不得匯入伺服器專用檔');
const comp = read('components/battlefield/FreeBattleShards.tsx');
ok(!/battle-reward-server|beast-game\/interactive|streakBonus|rewardShards|survivalShards|exchangeCardId/.test(comp), '元件不得自己算碎片、連勝或兌換');
ok(!/Math\.random/.test(comp), '元件不得亂數');
ok(/receipt\.lines\.map/.test(comp) && /summary\.nextStreakGoal/.test(comp), '說明與下一個目標只照印後端／帳本算好的結果');
ok(/status === 'saved' && receipt && summary/.test(comp) || /state === 'saved' && receipt && summary/.test(comp), '保存成功才顯示已獲得');
ok(/state === 'failed'/.test(comp) && /重試保存/.test(comp), '失敗可重試');
const route = read('app/api/beast-game/battlefield/route.ts');
ok(/reward: battleRewardFor\(match, \{ campaign: session\.campaign, selectedEntries: session\.selectedEntries \}\)/.test(route), '卡片闖關 API：由後端重播驗證後才送出獎勵');
ok(/selectedEntries:table\.selectedEntries/.test(route), '闖關開局把上陣副本寫進戰局票（重播才做得出同一個開局）');
ok(/selectedEntries\?: OwnedCardRef\[\]/.test(read('lib/beast-game/battle-session.ts')), '戰局票型別帶 selectedEntries');
const page = read('app/beast-game/battlefield/page.tsx');
ok((page.match(/setReward\(/g) ?? []).length === 3, '開戰（清空）、接續、套用回應三處都更新 reward');
ok(/setReward\(null\)/.test(page) && (page.match(/setReward\(reply\.reward \?\? null\)/g) ?? []).length === 2, '開戰時清空；接續與每一步回應採用後端的 reward');
ok(/match\.status === 'FINISHED' && !playing && \(isTrial \|\| settlement\?\.saved === true\) && <FreeBattleShards reward=\{reward\} \/>/.test(page), '只在戰鬥結束且演出完畢後顯示；押注戰要等保存成功才入帳，試用局直接入帳');
ok((page.match(/<FreeBattleShards/g) ?? []).length === 1, '只有一處顯示碎片面板');
ok(!/battle-reward-server/.test(page), '頁面不得匯入伺服器專用的獎勵計算');
ok(!/FreeBattleShards/.test(read('components/BeastTurnGame.tsx')) && !/battleRewardFor/.test(read('app/api/beast-game/turns/route.ts')), '閒置的免費戰場路徑不接線（沒有頁面載入它）');

console.log(`battle-reward: ${n} checks passed`);
