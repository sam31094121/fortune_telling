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
// 5b) 四象各自只認自己的星宿（青龍 1–7、玄武 8–14、白虎 15–21、朱雀 22–28），混隊只有同象合體
{
  const range = { QINGLONG: [1, 7], XUANWU: [8, 14], BAIHU: [15, 21], ZHUQUE: [22, 28] };
  for (const [key, [a, b]] of Object.entries(range)) for (let n = a; n <= b; n++) for (const p of ['y', 'a']) assert.equal(G.guardianOf(`beast_${p}${String(n).padStart(2, '0')}`).key, key, `${p}${n} 屬 ${key}`);
  const coreOf = { QINGLONG: 'beast_g_qinglong', XUANWU: 'beast_g_xuanwu', BAIHU: 'beast_g_baihu', ZHUQUE: 'beast_g_zhuque' };
  for (const [key, core] of Object.entries(coreOf)) {
    // 主角＋一張本象＋三張別象，全部同時出手：只跟本象合體
    const own = `beast_y${String(range[key][0] + 2).padStart(2, '0')}`;
    const others = Object.entries(range).filter(([k]) => k !== key).map(([, [a]]) => `beast_y${String(a + 1).padStart(2, '0')}`);
    const mixed = [unit(core), unit(own), ...others.map(id => unit(id))];
    const got = M.guardianFusions(mixed, M.fusionStrikers(mixed.map(u => hit(u.id))));
    assert.deepEqual(got.map(x => [x.key, x.coreId, x.memberIds]), [[key, core, [own]]], key + ' 混隊只認本象');
    assert.equal(M.guardianFusions(mixed, M.fusionStrikers([core, ...others].map(id => hit(id)))).length, 0, key + ' 只有別象星宿出手不合體');
  }
}
// 6) 冷卻以「拖珠」計：合體那次拖珠剩下的步驟＋下一次拖珠（含它帶出的連線、能量技）都不合體；再下一次拖珠恢復
{
  const both = M.fusionStrikers([hit('beast_g_baihu'), hit('beast_y15')]);
  const S = M.GUARDIAN_FUSION_START;
  assert.deepEqual(S, { carry: [], move: 0, quietThrough: -1 });
  // 拖珠 1 合體 → 同一次拖珠帶出的自動連線（本尊＋星宿）不再合體
  let r = M.stepGuardianFusion(team, both, S, true);
  assert.equal(r.fusions.length, 1); assert.deepEqual(r.state, { carry: [], move: 1, quietThrough: 2 });
  r = M.stepGuardianFusion(team, both, r.state);
  assert.equal(r.fusions.length, 0, '合體那次拖珠帶出的連線攻擊不再合體');
  // 拖珠 2：連珠＋它帶出的連線都冷卻（實測曾出現「拖珠 1 合體、拖珠 2 的自動連線又合體」，這裡守住）
  r = M.stepGuardianFusion(team, M.fusionStrikers([hit('beast_y16')]), r.state, true);
  assert.equal(r.fusions.length, 0); assert.deepEqual(r.state.carry, [], '冷卻中的出手者不累積');
  r = M.stepGuardianFusion(team, both, r.state);
  assert.equal(r.fusions.length, 0, '下一次拖珠帶出的連線攻擊也不合體');
  r = M.stepGuardianFusion(team, both, r.state);
  assert.equal(r.fusions.length, 0, '下一次拖珠之後的能量技也不合體');
  // 拖珠 3 恢復
  r = M.stepGuardianFusion(team, both, r.state, true);
  assert.equal(r.fusions.length, 1, '再下一次拖珠恢復合體');
  // 接續合體（上一步本尊、這一步星宿）也會進入冷卻
  r = M.stepGuardianFusion(team, M.fusionStrikers([hit('beast_g_baihu')]), S, true);
  assert.equal(r.fusions.length, 0); assert.deepEqual(r.state.carry, ['beast_g_baihu']);
  r = M.stepGuardianFusion(team, M.fusionStrikers([hit('beast_y16')]), r.state);
  assert.equal(r.fusions.length, 1); assert.equal(r.state.quietThrough, 2);
  assert.equal(M.stepGuardianFusion(team, both, r.state, true).fusions.length, 0);
  // 隨機模擬 2000 次拖珠（每次拖珠後隨機 0–2 個連線／能量技步驟）：任兩次相鄰拖珠都不會都合體
  let st = S, seed = 7, prevFused = false, fusedMoves = 0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = () => M.fusionStrikers(team.filter(() => rnd() < 0.5).map(u => hit(u.id)));
  for (let mv = 0; mv < 2000; mv++) {
    let fusedThisMove = false;
    let o = M.stepGuardianFusion(team, pick(), st, true); st = o.state; fusedThisMove ||= o.fusions.length > 0;
    for (let k = Math.floor(rnd() * 3); k > 0; k--) { o = M.stepGuardianFusion(team, pick(), st); st = o.state; if (o.fusions.length) { assert(!fusedThisMove, '同一次拖珠最多合體一次'); fusedThisMove = true; } }
    assert(!(prevFused && fusedThisMove), '相鄰兩次拖珠都合體 @' + mv);
    if (fusedThisMove) fusedMoves++;
    prevFused = fusedThisMove;
  }
  assert(fusedMoves > 200, '冷卻不是把合體關掉：2000 次拖珠合體 ' + fusedMoves + ' 次');
  // 每次拖珠本尊＋星宿都出手：合體與冷卻逐次交替
  st = S; const fired = [];
  for (let i = 0; i < 10; i++) { const o = M.stepGuardianFusion(team, both, st, true); st = o.state; fired.push(o.fusions.length ? 1 : 0); }
  assert.deepEqual(fired, [1,0,1,0,1,0,1,0,1,0]);
}
console.log('PASS guardian fusion rules');
console.log('PASS guardian fusion cooldown');

// 7) 純視覺：伺服端結算（resolve-turn／card-attack／damage）完全不引用合體判定
for (const file of ['lib/beast-game/match3/resolve-turn.ts', 'lib/beast-game/match3/card-attack.ts', 'lib/beast-game/match3/damage.ts', 'lib/beast-game/match3/player-skills.ts']) {
  assert(!fs.readFileSync(file, 'utf8').includes('guardian-fusion'), file + ' 不得引用四象合體（合體不改傷害）');
}
const src = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
assert.equal((src.match(/noteGuardianFusion\(/g) || []).length, 3, '連珠／能量技／連線攻擊三處都判定');
assert(src.includes('noteGuardianFusion(actualHits, nextTeam, true)'), '連珠只吃伺服端實際命中');
assert(src.includes("data-guardian-fusion={gfRole}") && src.includes('<GuardianFusionTrace fx={guardianFx}'), '外框＋星宿連線特效');
assert(src.includes('setGuardianFx(null); fusionState.current = GUARDIAN_FUSION_START;'), '重開一局清空合體紀錄與冷卻');
assert(src.includes('stepGuardianFusion(teamNow, fusionStrikers(hits), fusionState.current, newMove)'), '畫面走同一個含冷卻的判定');
assert.equal((src.match(/noteGuardianFusion\(actualHits, nextTeam, true\)/g) || []).length, 1, '只有連珠那一步算新的一次拖珠');
assert(src.includes('data-testid="match3-guardian-fusion-help"'), '規格寫在「玩法與操作」說明裡，不另佔畫面');
const trace = fs.readFileSync('components/battlefield/GuardianFusionTrace.tsx', 'utf8');
const css = fs.readFileSync('components/battlefield/GuardianFusionTrace.module.css', 'utf8');
assert(/\.layer \{[^}]*pointer-events: none/.test(css), '特效不攔截拖珠與點卡');
assert(css.includes('prefers-reduced-motion'), '減少動態時不播動畫');
assert(trace.includes('data-testid="match3-guardian-fusion"'));
assert(trace.includes('top: core.y + core.h * GUARDIAN_SEAL_Y') && M.GUARDIAN_SEAL_Y === 0.18, '合體印在本尊卡內下段，不壓棋盤');
assert(!/Math\.max\(core\.x, 36\)/.test(trace) && trace.includes('left: core.x'), '印對準本尊卡中心，不再被畫面邊緣推離卡面');
assert(trace.includes("['--gfit' as string]") && trace.includes('guardianSealFit(d.core, { w: el.offsetWidth, h: el.offsetHeight })'), '印依實際尺寸縮放');
// 彈出動畫每一格都乘上 --gfit，最大那格的倍率與 GUARDIAN_SEAL_PEAK 一致
const sealKf = css.split('\n').find(l => l.startsWith('@keyframes gfSeal'));
const scales = [...sealKf.matchAll(/transform: ([^;}]*)/g)].map(m => m[1].trim());
assert(scales.length >= 4 && scales.every(x => x.includes('var(--gfit')), '每個關鍵影格的 scale 都乘上 --gfit：' + scales.join(' | '));
const peaks = [...sealKf.matchAll(/\* ([\d.]+)\)/g)].map(m => +m[1]);
assert.equal(Math.max(...peaks), M.GUARDIAN_SEAL_PEAK, '關鍵影格最大倍率＝GUARDIAN_SEAL_PEAK');
// 幾何：360／390／1280 實測本尊卡尺寸與印尺寸（未縮放，2026-11-15 本機 production 實測），最大放大那格也在卡內（左右上下留 2px）
for (const [w, card, seal] of [[360, { w: 66, h: 77 }, { w: 63, h: 20 }], [390, { w: 72, h: 83 }, { w: 63, h: 20 }], [1280, { w: 106, h: 117 }, { w: 63, h: 19 }], ['極窄', { w: 40, h: 46 }, { w: 63, h: 20 }]]) {
  const fit = M.guardianSealFit(card, seal);
  assert(fit > 0 && fit <= 1, w + ' fit ' + fit);
  for (const k of [.6, 1.08, 1]) {
    const sw = seal.w * k * fit, sh = seal.h * k * fit;
    assert(sw <= card.w - 4 + 1e-9, `${w}px 第 ${k} 倍那格寬 ${sw.toFixed(1)} 超出卡寬 ${card.w}`);
    assert(card.h * 0.18 + sh / 2 <= card.h / 2 - 2 + 1e-9, `${w}px 第 ${k} 倍那格超出卡底`);
  }
}
assert.equal(M.guardianSealFit({ w: 200, h: 200 }, { w: 63, h: 18 }), 1, '卡夠大時不縮小');
assert.equal(M.guardianSealFit({ w: 66, h: 77 }, { w: 0, h: 0 }), 1, '量不到時不亂縮');
const boardCss = fs.readFileSync('components/battlefield/Match3Board.module.css', 'utf8');
assert(boardCss.includes('.ally[data-guardian-fusion][data-rig-active="true"] [data-rig-source] { opacity: 1 !important; }'), '合體期間本尊卡實心、不留空');
const rigSrc = fs.readFileSync('components/battlefield/Match3RigAttack.tsx', 'utf8');
// 一般攻擊（非合體）的卡面淡出由 Match3RigAttack 自己決定（正式站 f8070440 起為 0.3），合體規則只在 data-guardian-fusion 時蓋過它
assert(/card\.current\.style\.opacity = t >= RIG_CARD_HIDDEN\[0\] && t < RIG_CARD_HIDDEN\[1\] \? '[\d.]+' : '';/.test(rigSrc), '一般攻擊（非合體）的卡面淡出動畫維持正式站原樣');
console.log('PASS guardian fusion visual-only wiring');

// 8) 選夥伴：與主角同一象的星宿標示「白虎宿・」
const entry = fs.readFileSync('components/battlefield/HardCampaignEntry.tsx', 'utf8');
assert(entry.includes('`${GUARDIAN_SHORT[heroGuardian.key]}宿・`') && entry.includes('data-guardian-kin='), '選卡頁標示同象星宿');
console.log('PASS picker kin label');
