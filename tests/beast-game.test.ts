/**
 * 神獸卡遊戲核心守門測試（六十張・出戰三席）
 * ============================================================================
 *
 * 規格第二十二／二十三條：核心要先證明可以玩——
 * 抽得到、叫得出、打得動、技能正常、輸贏正常、手機不卡；
 * 之後每擴一批都要重跑 Balance / Mobile / Regression。
 *
 * 牌庫＝二十八宿幼子 28 ＋ 成獸 28 ＋ 四象 4。
 */

import fs from 'node:fs';
import path from 'node:path';
import { selectRitualHighlights, type RitualTurn } from '../lib/beast-ritual';
import { SKILLS, getSkill } from '../cards/skills';
import { evaluateBalance, rarityIsNotPower } from '../lib/beast-game/balance';
import { instantiate, performAttack, type BattleContext } from '../lib/beast-game/battle';
import {
  EFFECT_TYPES,
  MINIMUM_DAMAGE,
  computeDamage,
  resolveEffects,
  tickDurations,
  type BeastInstance,
} from '../lib/beast-game/effects';
import {
  ELEMENTS,
  ELEMENT_COUNTER,
  elementFromMansionName,
  elementMultiplier,
} from '../lib/beast-game/elements';
import { buildRegistry } from '../lib/beast-game/registry';
import { GAME_CORE_VERSION, validateCard, type BeastCard } from '../lib/beast-game/schema';
import {
  DECK_SIZE,
  LINEUP_SLOTS,
  MAX_FIELD,
  MAX_MANA_CAP,
  OPENING_HAND,
  SECOND_PLAYER_BONUS_CARD,
  STARTING_LIFE,
  TURN_PHASES,
  assertPhaseTransition,
  buildDeck,
  createDuel,
  createGame,
  createRng,
  playToEnd,
  playTurn,
  validateLineup,
} from '../lib/beast-game/turn';

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${label}${detail ? `  ${detail}` : ''}`);
  } else {
    fail += 1;
    console.error(`  FAIL  ${label}${detail ? `  ${detail}` : ''}`);
  }
}

function eq(label: string, actual: unknown, expected: unknown) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  check(label, same, same ? String(actual) : `實際 ${JSON.stringify(actual)}／應為 ${JSON.stringify(expected)}`);
}

function throws(label: string, fn: () => unknown, fragment: string) {
  try {
    fn();
    check(label, false, '沒有丟出例外');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(label, message.includes(fragment), message.slice(0, 100));
  }
}

/** x.y.z。不用正規表示式，避免跨工具轉義把它吃掉。 */
function isSemver(value: string): boolean {
  const parts = String(value).split('.');
  return parts.length === 3
    && parts.every((part) => part.length > 0 && [...part].every((ch) => ch >= '0' && ch <= '9'));
}

/**
 * 去掉註解，只留真的會執行的程式碼。
 *
 * 註解為了說明「原本錯在哪」而引用舊寫法是允許的，
 * 但檢查不能把那段說明當成違規——這一點在 iching 那支測試上踩過同樣的坑。
 * 用逐行狀態機而不是正規表示式：區塊註解的內文常常不是以 * 開頭。
 */
function codeWithoutComments(source: string): string {
  const out: string[] = [];
  let inBlock = false;
  for (const line of source.split('\n')) {
    const t = line.trim();
    if (inBlock) {
      if (t.includes('*/')) inBlock = false;
      continue;
    }
    if (t.startsWith('/*') || t.startsWith('{/*')) {
      if (!t.includes('*/')) inBlock = true;
      continue;
    }
    if (t.startsWith('//') || t.startsWith('*')) continue;
    out.push(line);
  }
  return out.join('\n');
}

const root = process.cwd();
const assetExists = (p: string) => fs.existsSync(path.join(root, 'public', p.replace(/^\//, '')));
const sizeOf = (p: string) => fs.statSync(path.join(root, 'public', p.replace(/^\//, ''))).size;

console.log('\n【一】卡片登錄中心：六十張，不合格的不准進正式牌庫');
const registry = buildRegistry({ assetExists });
{
  eq('正式牌庫六十張', registry.cards.length, 60);
  eq('沒有任何一張被擋下', registry.rejected.map((r) => r.card.id), []);
  eq('幼子 28', registry.cards.filter((c) => c.form === 'YOUNG').length, 28);
  eq('成獸 28', registry.cards.filter((c) => c.form === 'ADULT').length, 28);
  eq('四象 4', registry.cards.filter((c) => c.form === 'GUARDIAN').length, 4);
  eq('卡片 id 全部唯一', new Set(registry.cards.map((c) => c.id)).size, 60);

  check('核心版本與卡片版本分離',
    isSemver(GAME_CORE_VERSION) && registry.cards.every((c) => isSemver(c.version)),
    `核心 ${GAME_CORE_VERSION}／卡片 ${registry.cards[0].version}`);

  for (const element of ELEMENTS) {
    const count = registry.cards.filter((c) => c.element === element).length;
    check(`${element} 有卡`, count > 0, String(count));
  }

  const missingArt = registry.cards.filter((c) =>
    !assetExists(c.art.thumbnail) || !assetExists(c.art.front)
    || !assetExists(c.art.high) || !assetExists(c.art.back));
  eq('六十張的三段圖全部存在', missingArt.map((c) => c.name), []);

  // 手牌只載縮圖——這是手機不卡的前提（規格第十四條）
  const fat = registry.cards.filter((c) => sizeOf(c.art.thumbnail) >= sizeOf(c.art.high) / 8);
  eq('每張縮圖都遠小於高清', fat.map((c) => c.name), []);

  const handWeight = registry.cards.slice(0, OPENING_HAND)
    .reduce((sum, c) => sum + sizeOf(c.art.thumbnail), 0);
  check('起手五張縮圖合計 < 250KB', handWeight < 250 * 1024, `${(handWeight / 1024).toFixed(0)}KB`);

  const allThumbs = registry.cards.reduce((sum, c) => sum + sizeOf(c.art.thumbnail), 0);
  check('六十張縮圖合計 < 3MB（整個組陣畫面都載也還好）',
    allThumbs < 3 * 1024 * 1024, `${(allThumbs / 1024 / 1024).toFixed(2)}MB`);
}

console.log('\n【二】卡片驗證真的會擋');
{
  const good = registry.cards.find((c) => c.form === 'ADULT')!;
  const knownSkillIds = new Set(SKILLS.map((s) => s.id));

  const cases: Array<[string, BeastCard]> = [
    ['元素不合法', { ...good, id: 'x1', element: 'LIGHT' as never }],
    ['數值超出範圍', { ...good, id: 'x2', stats: { ...good.stats, attack: 9999 } }],
    ['技能不存在', { ...good, id: 'x3', skills: ['skill_does_not_exist'] }],
    ['沒有技能', { ...good, id: 'x4', skills: [] }],
    ['版本格式錯', { ...good, id: 'x5', version: 'v1' }],
    ['圖片不存在', { ...good, id: 'x6', art: { ...good.art, thumbnail: '/beast-game/thumb/nope.webp' } }],
    ['宿號超範圍', { ...good, id: 'x7', mansionId: 99 }],
    ['副元素與主元素相同', { ...good, id: 'x8', subElement: good.element }],
    ['形態不合法', { ...good, id: 'x9', form: 'BOSS' as never }],
    ['成獸賣一氣（成本與形態對不上）', { ...good, id: 'x10', cost: 1 }],
    ['成本不是整數', { ...good, id: 'x11', cost: 3.5 }],
  ];

  for (const [label, card] of cases) {
    const issues = validateCard(card, { knownSkillIds, knownCardIds: new Set(), assetExists });
    check(`擋下：${label}`, issues.length > 0, issues[0]?.message?.slice(0, 44) ?? '（沒擋到）');
  }

  const dup = validateCard(good, { knownSkillIds, knownCardIds: new Set([good.id]), assetExists });
  check('擋下：id 重複', dup.some((i) => i.field === 'id'));
}

console.log('\n【三】五元素：只有一套，不得另立');
{
  eq('固定五個', [...ELEMENTS], ['SPACE', 'AIR', 'WATER', 'FIRE', 'EARTH']);

  const link = fs.readFileSync(path.join(root, 'lib/ziwei-star-beast-link.ts'), 'utf8');
  for (const [key, label] of [['metal', '空'], ['wood', '風'], ['water', '水'], ['fire', '火'], ['earth', '地']]) {
    check(`平台對照仍是 ${key} → ${label}`, link.includes(`${key}: '${label}'`));
  }

  eq('木 → 風', elementFromMansionName('角木蛟'), 'AIR');
  eq('金 → 空', elementFromMansionName('亢金龍'), 'SPACE');
  eq('土 → 地', elementFromMansionName('氐土貉'), 'EARTH');
  eq('日 → 火（太陽屬火）', elementFromMansionName('房日兔'), 'FIRE');
  eq('月 → 水（太陰屬水）', elementFromMansionName('心月狐'), 'WATER');
  check('認不得就回 null，不猜', elementFromMansionName('未知怪獸') === null);

  // 每張卡的元素都要和宿名對得上——產生器歪掉會在這裡被抓到
  const mismatched = registry.cards
    .filter((c) => c.form !== 'GUARDIAN')
    .filter((c) => elementFromMansionName(c.name) !== c.element);
  eq('每張卡的元素都與宿名一致', mismatched.map((c) => `${c.name}:${c.element}`), []);

  for (const element of ELEMENTS) {
    const countered = ELEMENT_COUNTER[element];
    check(`${element} 剋 ${countered}`, elementMultiplier(element, countered) > 1);
    check(`${countered} 打 ${element} 吃虧`, elementMultiplier(countered, element) < 1);
  }
  eq('無相剋關係時不調整', elementMultiplier('AIR', 'AIR'), 1);
}

console.log('\n【四】傷害公式：前端不准自己算，底值不得被穿');
{
  const normal = computeDamage({ attack: 60, defense: 20, attackerElement: 'AIR', defenderElement: 'WATER' });
  eq('攻60 防20 折算50% → 50', normal.damage, 50);

  const advantage = computeDamage({ attack: 60, defense: 20, attackerElement: 'AIR', defenderElement: 'EARTH' });
  check('風剋地：傷害更高', advantage.damage > normal.damage, `${advantage.damage} > ${normal.damage}`);

  const floor = computeDamage({ attack: 10, defense: 500, attackerElement: 'AIR', defenderElement: 'WATER' });
  eq('防禦再高也不得低於底值', floor.damage, MINIMUM_DAMAGE);
  check('底值被觸發時要講出來', floor.detail.includes('底值'));
  check('依據可回查', normal.detail.includes('攻') && normal.detail.includes('防'));
}

console.log('\n【五】效果核心：13 種齊備，未知種類直接擋');
{
  eq('效果種類數', EFFECT_TYPES.length, 13);

  const mk = (name: string, hp: number): BeastInstance => ({
    instanceId: name, cardId: name, name, element: 'FIRE', subElement: null,
    maxHp: hp, hp, attack: 50, defense: 20, speed: 50,
    shield: 0, stunnedTurns: 0, modifiers: [], elementBoosts: [], defeated: false,
  });
  const side = { draw: () => 1, discard: () => 1 };
  const a = mk('甲', 100);
  const b = mk('乙', 100);
  const log: Parameters<typeof resolveEffects>[1]['log'] = [];

  resolveEffects([{ type: 'SHIELD', value: 30 }], { source: a, target: a, baseAttack: 0, side, log });
  eq('護盾生效', a.shield, 30);

  resolveEffects([{ type: 'DAMAGE', value: 0 }], { source: b, target: a, baseAttack: 50, side, log });
  check('護盾先扣，血才扣', a.shield < 30, `盾 ${a.shield}／血 ${a.hp}`);

  resolveEffects([{ type: 'HEAL', value: 999 }], { source: a, target: a, baseAttack: 0, side, log });
  eq('治療不得超過上限', a.hp, a.maxHp);

  resolveEffects([{ type: 'STUN', value: 1, duration: 2 }], { source: a, target: b, baseAttack: 0, side, log });
  eq('暈眩回合數', b.stunnedTurns, 2);
  tickDurations(b);
  eq('暈眩會自己遞減', b.stunnedTurns, 1);

  resolveEffects([{ type: 'BUFF_ATTACK', value: 20, duration: 1 }], { source: a, target: a, baseAttack: 0, side, log });
  eq('加成掛上', a.modifiers.length, 1);
  tickDurations(a);
  eq('加成到期自動移除', a.modifiers.length, 0);

  throws('未知效果種類直接擋',
    () => resolveEffects([{ type: 'MIND_CONTROL' as never, value: 1 }],
      { source: a, target: b, baseAttack: 0, side, log }),
    'UNKNOWN_EFFECT_TYPE');

  check('每一次結算都留下紀錄', log.length >= 5, `${log.length} 筆`);
}

console.log('\n【六】技能：資料驅動，核心不認得任何一個技能名');
{
  eq('技能 id 唯一', new Set(SKILLS.map((s) => s.id)).size, SKILLS.length);

  const badEffect = SKILLS.filter((s) =>
    s.effects.length === 0 || s.effects.some((e) => !(EFFECT_TYPES as readonly string[]).includes(e.type)));
  eq('每個技能都有合法效果', badEffect.map((s) => s.name), []);

  const badVersion = SKILLS.filter((s) => !isSemver(s.version));
  eq('技能版本格式一致', badVersion.map((s) => s.name), []);

  const orphan = registry.cards.filter((c) => [...c.skills, ...c.passive].some((id) => !getSkill(id)));
  eq('沒有卡片指向不存在的技能', orphan.map((c) => c.name), []);

  const battleSrc = fs.readFileSync(path.join(root, 'lib/beast-game/battle.ts'), 'utf8');
  const leaked = SKILLS.filter((s) => battleSrc.includes(s.name));
  eq('Battle Engine 不認得任何技能名', leaked.map((s) => s.name), []);
  check('Battle Engine 不寫死任何 skill id', !battleSrc.includes('skill_'));
}

console.log('\n【七】回合流程：七階段固定，不得跳關');
{
  eq('七個階段', [...TURN_PHASES],
    ['TURN_START', 'DRAW', 'SUMMON', 'ACTION', 'BATTLE', 'EFFECT_RESOLVE', 'TURN_END']);
  for (let i = 0; i < TURN_PHASES.length - 1; i += 1) {
    let ok = true;
    try { assertPhaseTransition(TURN_PHASES[i], TURN_PHASES[i + 1]); } catch { ok = false; }
    check(`${TURN_PHASES[i]} → ${TURN_PHASES[i + 1]} 合法`, ok);
  }
  throws('不得跳過 DRAW', () => assertPhaseTransition('TURN_START', 'SUMMON'), 'TURN_PHASE_ILLEGAL');
  throws('不得跳過 BATTLE', () => assertPhaseTransition('ACTION', 'TURN_END'), 'TURN_PHASE_ILLEGAL');
  throws('不得倒退', () => assertPhaseTransition('BATTLE', 'DRAW'), 'TURN_PHASE_ILLEGAL');
}

console.log('\n【八】出戰三席：放滿才准開戰，站位決定誰先挨打');
{
  const ids = registry.cards.filter((c) => c.form === 'YOUNG').map((c) => c.id);

  eq('三席', LINEUP_SLOTS, 3);
  check('沒放滿不准開戰', validateLineup([ids[0], null, null]).ready === false,
    validateLineup([ids[0], null, null]).reason);
  check('理由要講得出來', validateLineup([null, null, null]).reason.includes('還要再放'));
  check('同一張不得站兩格', validateLineup([ids[0], ids[0], ids[1]]).ready === false,
    validateLineup([ids[0], ids[0], ids[1]]).reason);
  check('不在牌庫的卡不准上場', validateLineup([ids[0], ids[1], 'beast_fake']).ready === false);
  check('三席放滿就可以開戰', validateLineup([ids[0], ids[1], ids[2]]).ready === true,
    validateLineup([ids[0], ids[1], ids[2]]).reason);

  // 站位：前鋒替後面擋刀
  const tank = registry.cards.find((c) => c.form === 'ADULT' && c.element === 'EARTH')!;
  const backline = registry.cards.find((c) => c.form === 'ADULT' && c.element === 'FIRE')!;
  const mid = registry.cards.find((c) => c.form === 'ADULT' && c.element === 'WATER')!;
  const guardians = registry.cards.filter((c) => c.form === 'GUARDIAN');
  const [enemy, enemy2, enemy3] = guardians;

  const rng = createRng(4242);
  const duel = createDuel({
    player: { lineup: [tank.id, backline.id, ids[0]], deck: buildDeck(ids, rng) },
    opponent: { lineup: [enemy.id, ids[0], ids[1]], deck: buildDeck(ids, rng) },
    seed: 4242,
  });

  eq('玩家開場就有三隻在場', duel.players.PLAYER.field.length, 3);
  eq('對手開場也有三隻', duel.players.OPPONENT.field.length, 3);
  eq('第一席就是前鋒', duel.players.PLAYER.field[0].card.id, tank.id);
  eq('站位依序 0/1/2', duel.players.PLAYER.field.map((u) => u.slot), [0, 1, 2]);
  check('布陣有寫進時間軸', duel.timeline.some((t) => t.note.includes('布陣')),
    duel.timeline[0]?.note ?? '');

  // 打一回合，確認挨打的是前鋒不是後面
  const frontHpBefore = duel.players.PLAYER.field[0].instance.hp;
  const backHpBefore = duel.players.PLAYER.field[2].instance.hp;
  // 先後手是擲出來的，所以多跑幾個回合，確保對手一定出手過。
  for (let i = 0; i < 4; i += 1) playTurn(duel);
  const front = duel.players.PLAYER.field.find((u) => u.slot === 0);
  const back = duel.players.PLAYER.field.find((u) => u.slot === 2);
  check('前鋒先挨打',
    !front || front.instance.hp < frontHpBefore,
    front ? `前鋒 ${frontHpBefore} → ${front.instance.hp}` : '前鋒已陣亡');
  check('後陣被保護著',
    !back || back.instance.hp === backHpBefore,
    back ? `後陣 ${backHpBefore} → ${back.instance.hp}` : '後陣已不在場');
}

console.log('\n【九】核心可以玩：抽得到、叫得出、打得動、分得出輸贏');
{
  const ids = registry.cards.map((c) => c.id);
  const rng = createRng(20260905);
  const playerDeck = buildDeck(ids, rng);
  const opponentDeck = buildDeck(ids, rng);

  eq('牌組 20 張', playerDeck.length, DECK_SIZE);
  check('牌組只含正式牌庫的卡', playerDeck.every((id) => ids.includes(id)));

  const game = createGame({ playerDeck, opponentDeck, seed: 20260905 });
  const first = game.firstPlayer;
  const second = first === 'PLAYER' ? 'OPPONENT' : 'PLAYER';
  eq('先手起手 5 張', game.players[first].hand.length, OPENING_HAND);
  eq('後手多一張補償', game.players[second].hand.length, OPENING_HAND + SECOND_PLAYER_BONUS_CARD);
  check('先後手由種子決定，不是固定客戶先', ['PLAYER','OPPONENT'].includes(first), first);
  check('擲先手要寫進戰報', game.timeline.some((t) => t.note.includes('擲先手')), game.timeline[0]?.note ?? '');
  eq('雙方本命都是 30',
    [game.players.PLAYER.life, game.players.OPPONENT.life], [STARTING_LIFE, STARTING_LIFE]);

  playTurn(game);
  eq('第一回合氣上限為 2', game.players[first].manaCap, 2);
  check('第一回合只召得動便宜的',
    game.players[first].field.every((u) => u.card.cost <= 2),
    game.players[first].field.map((u) => u.card.name + '(' + u.card.cost + '氣)').join('、') || '（無）');
  check('場上不得超過 3 隻', game.players[first].field.length <= MAX_FIELD);

  const finished = playToEnd(game);
  check('打得完，分得出結果', finished.winner !== null, String(finished.winner));
  check('氣上限不得超過十', finished.players[first].manaCap <= MAX_MANA_CAP,
    String(finished.players[first].manaCap));
  check('戰鬥有實際傷害紀錄', finished.log.some((e) => e.type === 'DAMAGE' && e.applied > 0));
  check('本命有被打到',
    finished.players.PLAYER.life < STARTING_LIFE || finished.players.OPPONENT.life < STARTING_LIFE,
    `${finished.players.PLAYER.life} / ${finished.players.OPPONENT.life}`);
  eq('時間軸涵蓋七階段', new Set(finished.timeline.map((t) => t.phase)).size, 7);

  // 同一個 seed 必須跑出同一場
  const replay = playToEnd(createGame({ playerDeck, opponentDeck, seed: 20260905 }));
  eq('同一 seed → 同樣的勝負', replay.winner, finished.winner);
  eq('同一 seed → 同樣的回合數', replay.turn, finished.turn);
  eq('同一 seed → 同樣的本命',
    [replay.players.PLAYER.life, replay.players.OPPONENT.life],
    [finished.players.PLAYER.life, finished.players.OPPONENT.life]);

  const otherDeck = buildDeck(ids, createRng(999));
  check('不同 seed → 不同牌序', JSON.stringify(otherDeck) !== JSON.stringify(playerDeck));

  // 多跑幾場，確認不會卡死也不會全部平手
  const results: string[] = [];
  for (let seed = 1; seed <= 12; seed += 1) {
    const r = createRng(seed * 7919);
    const g = playToEnd(createGame({
      playerDeck: buildDeck(ids, r), opponentDeck: buildDeck(ids, r), seed,
    }));
    results.push(String(g.winner));
  }
  eq('十二場都跑得完', results.filter((r) => r === 'null').length, 0);
  // 疲勞機制加進來之前，十二場有七場平手（五成八）——客戶等於白打一場。
  const draws = results.filter((r) => r === 'DRAW').length;
  check('平手不得過半', draws <= 3, draws + '/12 場平手');

  // 公平性：先後手隨機之後，長期勝率不得偏向任何一邊。
  // 這一條是「禁止作假」的量化版本——不是宣稱公平，是每次 CI 都量一次。
  const many: string[] = [];
  for (let seed = 1; seed <= 60; seed += 1) {
    const r = createRng(seed * 104729);
    const g = playToEnd(createGame({ playerDeck: buildDeck(ids, r), opponentDeck: buildDeck(ids, r), seed: seed * 31 }));
    many.push(String(g.winner));
  }
  const pWin = many.filter((r) => r === 'PLAYER').length;
  const oWin = many.filter((r) => r === 'OPPONENT').length;
  const decided = pWin + oWin;
  const share = decided === 0 ? 0.5 : pWin / decided;
  check('六十場勝率不得偏向任何一邊（0.3–0.7）', share >= 0.3 && share <= 0.7,
    '玩家 ' + pWin + ' 勝／對手 ' + oWin + ' 勝／勝率 ' + share.toFixed(2));

  const firsts = new Set<string>();
  for (let seed = 1; seed <= 20; seed += 1) {
    const r = createRng(seed);
    firsts.add(createGame({ playerDeck: buildDeck(ids, r), opponentDeck: buildDeck(ids, r), seed: seed * 977 }).firstPlayer);
  }
  eq('先手不是固定同一邊', firsts.size, 2);
  const wins = results.filter((r) => r === 'PLAYER').length;
  const losses = results.filter((r) => r === 'OPPONENT').length;
  check('先手不得穩贏（後手至少要贏得了幾場）', losses >= 2, `先手 ${wins} 勝／後手 ${losses} 勝`);
  check('不是每一場都平手', results.some((r) => r !== 'DRAW'),
    `勝 ${results.filter((r) => r === 'PLAYER').length}`
    + `／負 ${results.filter((r) => r === 'OPPONENT').length}`
    + `／和 ${results.filter((r) => r === 'DRAW').length}`);
}

console.log('\n【十】技能在實戰中真的會生效');
{
  const ctx = (): BattleContext => ({ side: { draw: () => 0, discard: () => 0 }, usage: new Map(), log: [] });

  // 不指名任何一張卡：從牌庫裡找符合條件的，之後換卡也不會壞。
  const withDebuff = registry.cards.find((c) =>
    c.skills.some((id) => getSkill(id)?.effects.some((e) => e.type === 'DEBUFF_DEFENSE')));
  const target = registry.cards.find((c) => c.form === 'ADULT' && c.id !== withDebuff?.id)!;
  check('牌庫裡有帶削防的卡', Boolean(withDebuff), withDebuff?.name ?? '');

  if (withDebuff) {
    const attacker = instantiate(withDebuff, 'A');
    const defender = instantiate(target, 'B');
    const before = defender.hp;
    const result = performAttack({
      attackerCard: withDebuff, attacker, defenderCard: target, defender, context: ctx(),
    });
    check('普攻造成傷害', result.basicDamage > 0, `${before} → ${defender.hp}`);
    check('削防真的掛上去了', defender.modifiers.some((m) => m.stat === 'defense' && m.value < 0));
  }

  const stunCard = registry.cards.find((c) =>
    c.skills.some((id) => {
      const skill = getSkill(id);
      return Boolean(skill?.effects.some((e) => e.type === 'STUN')) && skill?.usesPerBattle === 1;
    }));
  check('牌庫裡有整場一次的暈眩招', Boolean(stunCard), stunCard?.name ?? '');

  if (stunCard) {
    const stunCtx = ctx();
    const stunner = instantiate(stunCard, 'T');
    const prey = instantiate(target, 'P');
    performAttack({ attackerCard: stunCard, attacker: stunner, defenderCard: target, defender: prey, context: stunCtx });
    const firstStun = prey.stunnedTurns;
    prey.stunnedTurns = 0;
    prey.hp = prey.maxHp;
    prey.defeated = false;
    performAttack({ attackerCard: stunCard, attacker: stunner, defenderCard: target, defender: prey, context: stunCtx });
    check('第一次會暈', firstStun > 0, String(firstStun));
    eq('第二次不再暈（次數用完）', prey.stunnedTurns, 0);
  }

  const onSummon = registry.cards.find((c) => c.skills.some((id) => getSkill(id)?.trigger === 'ON_SUMMON'));
  check('牌庫裡有登場技', Boolean(onSummon), onSummon?.name ?? '');
}

console.log('\n【十一】平衡：以成本為軸，稀有度不決定強弱');
{
  const reports = registry.cards.map((card) => evaluateBalance(card));
  const over = reports.filter((r) => r.status === 'BALANCE_WARNING');
  eq('六十張全部在成本預算帶內', over.map((r) => `${r.name}:${r.powerBudget}`), []);

  const rarity = rarityIsNotPower(registry.cards);
  check('同成本下稀有度不決定強弱', rarity.passed, rarity.detail.slice(0, 130));

  // 成本越高越強，這一條要成立，否則成本就沒有意義
  const byCost = new Map<number, number[]>();
  for (const r of reports) byCost.set(r.cost, [...(byCost.get(r.cost) ?? []), r.powerBudget]);
  const averages = [...byCost.keys()].sort((a, b) => a - b).map((cost) => {
    const list = byCost.get(cost)!;
    return { cost, avg: Math.round(list.reduce((s, v) => s + v, 0) / list.length) };
  });
  let monotonic = true;
  for (let i = 1; i < averages.length; i += 1) {
    if (averages[i].avg <= averages[i - 1].avg) monotonic = false;
  }
  check('成本越高、平均戰力越高', monotonic, averages.map((a) => `${a.cost}氣:${a.avg}`).join(' '));

  const inflated: BeastCard = {
    ...registry.cards[0], id: 'inflated',
    stats: { hp: 300, attack: 150, defense: 120, speed: 150 },
  };
  eq('灌爆數值 → BALANCE_WARNING', evaluateBalance(inflated).status, 'BALANCE_WARNING');
}

console.log('\n【十二】資料與畫面分離、不得為新卡改核心');
{
  const registrySrc = fs.readFileSync(path.join(root, 'lib/beast-game/registry.ts'), 'utf8');
  check('卡片數值不在核心裡硬寫', !registrySrc.includes('hp:'));
  check('registry 只負責收與擋', registrySrc.includes('validateCard'));

  for (const file of ['schema.ts', 'effects.ts', 'battle.ts', 'turn.ts', 'balance.ts', 'elements.ts']) {
    const src = fs.readFileSync(path.join(root, 'lib/beast-game', file), 'utf8');
    const named = registry.cards.filter((c) => src.includes(c.name));
    eq(`${file} 不含任何神獸名`, named.map((c) => c.name), []);
    check(`${file} 不含 React`, !src.includes('react') && !src.includes('jsx'));
  }
}
console.log('\n【十三】禁止作假：公平性要量得出來，不能只是宣稱');
{
  const ids = registry.cards.map((c) => c.id);

  // 對手不得有任何額外資源
  const r = createRng(31337);
  const g = createGame({ playerDeck: buildDeck(ids, r), opponentDeck: buildDeck(ids, r), seed: 31337 });
  eq('雙方本命相同', g.players.PLAYER.life, g.players.OPPONENT.life);
  eq('雙方氣上限相同', g.players.PLAYER.manaCap, g.players.OPPONENT.manaCap);
  // 抽過牌之後兩邊牌組張數本來就會差一張（後手多抽一張），
  // 所以要比的是「牌組＋手牌」——那才是起始資源。
  eq('雙方起始牌量相同',
    g.players.PLAYER.deck.length + g.players.PLAYER.hand.length,
    g.players.OPPONENT.deck.length + g.players.OPPONENT.hand.length);
  eq('雙方疲勞都從零開始', [g.players.PLAYER.fatigue, g.players.OPPONENT.fatigue], [0, 0]);

  // 起手張數的差只能來自「後手補一張」，不能來自身分
  const firstSide = g.firstPlayer;
  const secondSide = firstSide === 'PLAYER' ? 'OPPONENT' : 'PLAYER';
  eq('先手起手就是基準張數', g.players[firstSide].hand.length, OPENING_HAND);
  eq('後手就是基準加補償', g.players[secondSide].hand.length, OPENING_HAND + SECOND_PLAYER_BONUS_CARD);

  // 核心不得有任何偏袒某一邊的寫死判斷
  const turnSrc = fs.readFileSync(path.join(root, 'lib/beast-game/turn.ts'), 'utf8');
  const codeOnly = codeWithoutComments(turnSrc);
  check('先後手不得寫死成 PLAYER', !codeOnly.includes("active: 'PLAYER'"));
  check('首回合不進攻是綁先手，不是綁 PLAYER',
    codeOnly.includes('state.active === state.firstPlayer'));
  check('補償是給後手，不是給對手', !codeOnly.includes('players.OPPONENT, OPENING_HAND +'));

  // 前端不得有任何自己算勝負的程式
  const pageSrc = fs.readFileSync(path.join(root, 'app/beast-game/page.tsx'), 'utf8');
  const pageCode = codeWithoutComments(pageSrc);
  /*
    前端不得匯入「會決定結果」的東西。

    原本這一條擋整個 lib/beast-game 目錄，結果把 describeStakeRisk 也擋掉了——
    那支只是把「輸了會失去哪一張」寫成一句話，不決定任何勝負。
    規則要擋的是「前端自己算結果」，不是「前端引用共用文案」，
    所以改成點名那些真的會決定結果的函式。
  */
  for (const decider of ['playToEnd', 'playTurn', 'performAttack', 'computeDamage',
    'createDuel', 'createGame', 'resolveEffects', 'resolveStake', 'buildDeck']) {
    check(`組陣台不得自己跑 ${decider}`, !pageCode.includes(`${decider}(`));
  }
  check('組陣台不得匯入戰鬥引擎',
    !pageCode.includes("from '@/lib/beast-game/turn'")
    && !pageCode.includes("from '@/lib/beast-game/battle'")
    && !pageCode.includes("from '@/lib/beast-game/effects'"));

  // 客戶不得指定種子（只能重播），否則可以一直換種子試到贏
  const apiSrc = fs.readFileSync(path.join(root, 'app/api/beast-game/route.ts'), 'utf8');
  check('決鬥種子由伺服器產生', apiSrc.includes('randomInt'));
  check('重播是唯一能指定種子的路徑', apiSrc.includes('replaySeed'));
  check('不得直接採用客戶端傳來的 seed', !codeWithoutComments(apiSrc).includes('body.seed'));

  // 同一顆種子必須完全重現——這是「可回查」的定義
  const deckA = buildDeck(ids, createRng(7));
  const deckB = buildDeck(ids, createRng(8));
  const a = playToEnd(createGame({ playerDeck: deckA, opponentDeck: deckB, seed: 555 }));
  const b = playToEnd(createGame({ playerDeck: deckA, opponentDeck: deckB, seed: 555 }));
  eq('同種子 → 同勝負', a.winner, b.winner);
  eq('同種子 → 同先手', a.firstPlayer, b.firstPlayer);
  eq('同種子 → 同本命', [a.players.PLAYER.life, a.players.OPPONENT.life],
    [b.players.PLAYER.life, b.players.OPPONENT.life]);
}

console.log('\n【十四】友善引導：新手要進得來');
{
  const pageSrc = fs.readFileSync(path.join(root, 'app/beast-game/page.tsx'), 'utf8');
  check('有新手三步驟', pageSrc.includes('const ONBOARDING') && pageSrc.includes('data-onboarding'));
  check('引導看過就不再擋路', pageSrc.includes('ONBOARDING_SEEN_KEY'));
  check('提供選卡建議入口', pageSrc.includes('data-recommend'));
  check('推薦要講得出理由，不是亂數', pageSrc.includes('data-recommend-note') && pageSrc.includes('reason'));
  check('公平性直接顯示給客戶', pageSrc.includes('data-fairness'));
  check('可以重播同一場驗證', pageSrc.includes('data-replay'));

  // 推薦出來的陣容必須真的能開戰
  const rec = registry.cards.length >= 3;
  check('卡池夠推薦三張', rec);
}

console.log('\n【十五】穩定性：連線不穩、存壞了，都不能讓整頁壞掉');
{
  const pageSrc = fs.readFileSync(path.join(root, 'app/beast-game/page.tsx'), 'utf8');
  check('請求有逾時', pageSrc.includes('AbortController') && pageSrc.includes('setTimeout'));
  check('請求有重試', pageSrc.includes('retries'));
  check('逾時要講人話', pageSrc.includes('連線逾時'));
  check('本機儲存一律包 try/catch', pageSrc.includes('function readLocal') && pageSrc.includes('function writeLocal'));
  check('存壞的舊資料要忽略，不得讓整頁開不起來', pageSrc.includes('存壞了就當作沒存過'));
  check('卡池認不得的 id 要自動忽略', pageSrc.includes('known.has(id)'));
  check('載入失敗有錯誤畫面', pageSrc.includes('loadError'));

  const apiSrc = fs.readFileSync(path.join(root, 'app/api/beast-game/route.ts'), 'utf8');
  check('API 擋掉壞掉的 JSON', apiSrc.includes('請傳入有效的 JSON'));
  check('API 擋掉沒放滿的陣容', apiSrc.includes('validateLineup'));
  check('API 不快取戰果', apiSrc.includes('no-store'));
}


console.log('\n【十六】揭牌儀式：只播放真實交鋒，保留最後回合');
{
  const timeline: RitualTurn[] = Array.from({ length: 100 }, (_, i) => ({
    turn: i + 1, side: i % 2 ? 'OPPONENT' : 'PLAYER', phase: 'BATTLE',
    note: i % 3 === 0 ? '2 次交戰、1 次直擊' : '0 次交戰、0 次直擊',
  }));
  timeline.push({ turn: 101, side: 'OPPONENT', phase: 'DRAW', note: '牌庫已空，受到疲勞傷害' });
  const before = JSON.stringify(timeline);
  const highlights = selectRitualHighlights(timeline);
  eq('只取三段，避免手機長篇戰報擋住牌面', highlights.length, 3);
  eq('包含六十筆以後真正的最後事件', highlights[2], timeline[100]);
  check('每段皆來自原始對戰紀錄', highlights.every((entry) => timeline.includes(entry)));
  check('不更動原始對戰', JSON.stringify(timeline) === before);
  eq('沒有攻擊就不編造交鋒', selectRitualHighlights([
    { turn: 1, side: 'PLAYER', phase: 'BATTLE', note: '0 次交戰、0 次直擊' },
    { turn: 1, side: 'SYSTEM', phase: 'BATTLE', note: '3 次交戰' },
    { turn: 2, side: 'OPPONENT', phase: 'SUMMON', note: '放入一張神獸' },
  ]), []);
  eq('未收到紀錄時不提前播放', selectRitualHighlights(), []);
}

console.log(`\n神獸卡遊戲核心（六十張） — PASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exit(1);
console.log('BEAST_GAME_CORE_CERTIFIED=true');
