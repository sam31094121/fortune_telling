// 寶石捷連線・四象合體（純視覺）：判定規則＋「不改傷害」守門＋畫面接線結構。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('../.beast-game-build/lib/beast-game/match3/guardian-fusion');
const G = require('../.beast-game-build/lib/beast-guardians');

const unit = (id, hp = 100) => ({ id, hp });
const hit = (attackerId, amount = 10) => ({ attackerId, amount });
// 主角白虎＋白虎宿（奎 y15、婁 y16）＋青龍宿（角 y01）＋玄武宿（斗 y08）
const team = [unit('beast_g_baihu'), unit('beast_y15'), unit('beast_y16'), unit('beast_y01'), unit('beast_y08')];
assert.equal(G.guardianOf('beast_y15').key, 'BAIHU');
assert.equal(G.guardianOf('beast_y01').key, 'QINGLONG');

// 1) 同一步：本尊＋本象星宿都打出傷害 → 白虎合體
let f = M.guardianFusions(team, M.fusionStrikers([hit('beast_g_baihu'), hit('beast_y15'), hit('beast_y01')]));
assert.equal(f.length, 1);
assert.deepEqual({ key: f[0].key, short: f[0].short, element: f[0].element, core: f[0].coreId, members: f[0].memberIds }, { key: 'BAIHU', short: '白虎', element: 'SPACE', core: 'beast_g_baihu', members: ['beast_y15'] });
assert(!f[0].memberIds.includes('beast_y01'), '別象星宿不算本象合體');

// 2) 只有本尊、只有星宿、0 傷害、別象星宿 → 不合體
assert.equal(M.guardianFusions(team, M.fusionStrikers([hit('beast_g_baihu')])).length, 0);
assert.equal(M.guardianFusions(team, M.fusionStrikers([hit('beast_y15'), hit('beast_y16')])).length, 0);
assert.equal(M.guardianFusions(team, M.fusionStrikers([hit('beast_g_baihu'), hit('beast_y15', 0)])).length, 0, '實際傷害 0 不算出手');
assert.equal(M.guardianFusions(team, M.fusionStrikers([hit('beast_g_baihu'), hit('beast_y01'), hit('beast_y08')])).length, 0);
assert.deepEqual(M.fusionStrikers([hit(null, 30), hit('a'), hit('a'), hit('b', 0)]), ['a']);

// 3) 接續：上一步本尊、這一步星宿 → 合體；合體後清空，不重播
let carry = [];
let cur = M.fusionStrikers([hit('beast_g_baihu')]);
f = M.guardianFusions(team, cur, carry); assert.equal(f.length, 0); carry = M.nextFusionCarry(cur, f);
assert.deepEqual(carry, ['beast_g_baihu']);
cur = M.fusionStrikers([hit('beast_y16')]);
f = M.guardianFusions(team, cur, carry); assert.equal(f.length, 1); assert.deepEqual(f[0].memberIds, ['beast_y16']); carry = M.nextFusionCarry(cur, f);
assert.deepEqual(carry, [], '一次合體只算一次');
cur = M.fusionStrikers([hit('beast_y15')]);
assert.equal(M.guardianFusions(team, cur, carry).length, 0);
// 窗口只有緊接的兩步：中間落空（沒有實際出手）就斷開
carry = M.nextFusionCarry(M.fusionStrikers([hit('beast_g_baihu')]), []);
carry = M.nextFusionCarry(M.fusionStrikers([]), []);
assert.equal(M.guardianFusions(team, M.fusionStrikers([hit('beast_y15')]), carry).length, 0);
// 舊紀錄不得自己重播：本步沒有任何合體成員出手 → 不合體
assert.equal(M.guardianFusions(team, M.fusionStrikers([hit('beast_y01')]), ['beast_g_baihu', 'beast_y15']).length, 0);

// 4) 倒下的成員不參與；隊伍沒有本尊 → 不合體
const hurt = [unit('beast_g_baihu'), unit('beast_y15', 0), unit('beast_y16')];
assert.equal(M.guardianFusions(hurt, M.fusionStrikers([hit('beast_g_baihu')]), ['beast_y15']).length, 0);
assert.equal(M.guardianFusions([unit('beast_y15'), unit('beast_y16')], M.fusionStrikers([hit('beast_y15'), hit('beast_y16')])).length, 0);

// 5) 收藏隊伍有兩位四象：各自合體，依四象順序
const two = [unit('beast_g_qinglong'), unit('beast_a01'), unit('beast_g_baihu'), unit('beast_a15'), unit('beast_y28')];
f = M.guardianFusions(two, M.fusionStrikers(two.map(u => hit(u.id))));
assert.deepEqual(f.map(x => x.key + ':' + x.memberIds.join('+')), ['QINGLONG:beast_a01', 'BAIHU:beast_a15']);
assert.equal(f[0].short, '青龍', '印記用玩家口語「青龍」');
assert.match(M.guardianFusionLabel(f[1], id => ({ beast_g_baihu: '白虎', beast_a15: '奎木狼' })[id]), /^白虎合體：白虎＋奎木狼（僅特效，不加傷害）$/);
// 6) 冷卻：合體後緊接的下一步不能再合體（也不累積），再下一步恢復
{
  const both = M.fusionStrikers([hit('beast_g_baihu'), hit('beast_y15')]);
  let r = M.stepGuardianFusion(team, both, M.GUARDIAN_FUSION_START);
  assert.equal(r.fusions.length, 1); assert.deepEqual(r.state, { carry: [], cooldown: true });
  r = M.stepGuardianFusion(team, both, r.state);
  assert.equal(r.fusions.length, 0, '合體後下一步冷卻，即使本尊＋星宿同時出手也不合體');
  assert.deepEqual(r.state, { carry: [], cooldown: false }, '冷卻步的出手者不累積到下一步');
  r = M.stepGuardianFusion(team, M.fusionStrikers([hit('beast_y16')]), r.state);
  assert.equal(r.fusions.length, 0, '冷卻步不留 carry：只有星宿出手不能接續成合體');
  r = M.stepGuardianFusion(team, both, M.GUARDIAN_FUSION_START);
  r = M.stepGuardianFusion(team, M.fusionStrikers([]), r.state);
  r = M.stepGuardianFusion(team, both, r.state);
  assert.equal(r.fusions.length, 1, '冷卻只擋一步：落空一步後同步合體恢復');
  // 接續合體也會進入冷卻
  r = M.stepGuardianFusion(team, M.fusionStrikers([hit('beast_g_baihu')]), M.GUARDIAN_FUSION_START);
  assert.equal(r.fusions.length, 0); assert.deepEqual(r.state.carry, ['beast_g_baihu']);
  r = M.stepGuardianFusion(team, M.fusionStrikers([hit('beast_y16')]), r.state);
  assert.equal(r.fusions.length, 1); assert.equal(r.state.cooldown, true);
  assert.equal(M.stepGuardianFusion(team, both, r.state).fusions.length, 0);
  // 連續 10 步本尊＋星宿都出手：合體與冷卻交替，最多每兩步一次
  let st = M.GUARDIAN_FUSION_START, fired = [];
  for (let i = 0; i < 10; i++) { const o = M.stepGuardianFusion(team, both, st); st = o.state; fired.push(o.fusions.length ? 1 : 0); }
  assert.deepEqual(fired, [1,0,1,0,1,0,1,0,1,0]);
}
console.log('PASS guardian fusion rules');
console.log('PASS guardian fusion cooldown');

// 6) 純視覺：伺服端結算（resolve-turn／card-attack／damage）完全不引用合體判定
for (const file of ['lib/beast-game/match3/resolve-turn.ts', 'lib/beast-game/match3/card-attack.ts', 'lib/beast-game/match3/damage.ts', 'lib/beast-game/match3/player-skills.ts']) {
  assert(!fs.readFileSync(file, 'utf8').includes('guardian-fusion'), file + ' 不得引用四象合體（合體不改傷害）');
}
const src = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
assert.equal((src.match(/noteGuardianFusion\(/g) || []).length, 3, '連珠／能量技／連線攻擊三處都判定');
assert(src.includes('noteGuardianFusion(actualHits, nextTeam)'), '連珠只吃伺服端實際命中');
assert(src.includes("data-guardian-fusion={gfRole}") && src.includes('<GuardianFusionTrace fx={guardianFx}'), '外框＋星宿連線特效');
assert(src.includes('setGuardianFx(null); fusionState.current = GUARDIAN_FUSION_START;'), '重開一局清空合體紀錄與冷卻');
assert(src.includes('stepGuardianFusion(teamNow, fusionStrikers(hits), fusionState.current)'), '畫面走同一個含冷卻的判定');
assert(src.includes('data-testid="match3-guardian-fusion-help"'), '規格寫在「玩法與操作」說明裡，不另佔畫面');
const trace = fs.readFileSync('components/battlefield/GuardianFusionTrace.tsx', 'utf8');
const css = fs.readFileSync('components/battlefield/GuardianFusionTrace.module.css', 'utf8');
assert(/\.layer \{[^}]*pointer-events: none/.test(css), '特效不攔截拖珠與點卡');
assert(css.includes('prefers-reduced-motion'), '減少動態時不播動畫');
assert(trace.includes('data-testid="match3-guardian-fusion"'));
assert(trace.includes('top: core.y + core.h * 0.18'), '合體印在本尊卡內下段，不超出卡框、不壓棋盤');
const boardCss = fs.readFileSync('components/battlefield/Match3Board.module.css', 'utf8');
assert(boardCss.includes('.ally[data-guardian-fusion][data-rig-active="true"] [data-rig-source] { opacity: .7 !important; }'), '合體期間本尊卡不留空');
console.log('PASS guardian fusion visual-only wiring');

// 7) 選夥伴：與主角同一象的星宿標示「白虎宿・」
const entry = fs.readFileSync('components/battlefield/HardCampaignEntry.tsx', 'utf8');
assert(entry.includes('`${GUARDIAN_SHORT[heroGuardian.key]}宿・`') && entry.includes('data-guardian-kin='), '選卡頁標示同象星宿');
console.log('PASS picker kin label');
