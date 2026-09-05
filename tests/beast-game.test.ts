/**
 * 神獸卡遊戲核心守門測試
 * ============================================================================
 *
 * 規格第二十二條：第一階段先證明「核心可以玩」——
 * 抽得到、叫得出、打得動、技能正常、輸贏正常、手機不卡。
 *
 * 這支測試就是那份證明。核心沒過這裡之前，禁止一次導入全部卡片。
 */

import fs from 'node:fs';
import path from 'node:path';
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
  MAX_FIELD,
  OPENING_HAND,
  TURN_PHASES,
  assertPhaseTransition,
  buildDeck,
  createGame,
  createRng,
  playToEnd,
  playTurn,
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

const root = process.cwd();
const assetExists = (p: string) => fs.existsSync(path.join(root, 'public', p.replace(/^\//, '')));

console.log('\n【一】卡片登錄中心：不合格的卡不准進正式牌庫');
const registry = buildRegistry({ assetExists });
{
  eq('第一階段只接 6 張', registry.cards.length, 6);
  eq('沒有任何一張被擋下', registry.rejected.map((r) => r.card.id), []);
  check('核心版本與卡片版本分離',
    GAME_CORE_VERSION === '1.0.0' && registry.cards.every((c) => c.version === '1.0.0'),
    `核心 ${GAME_CORE_VERSION}`);

  // ✓ 圖片存在（三段式都要真的在）
  for (const card of registry.cards) {
    check(`${card.name}：三段圖都存在`,
      assetExists(card.art.thumbnail) && assetExists(card.art.front)
      && assetExists(card.art.high) && assetExists(card.art.back));
  }

  // 手牌只載縮圖——這是手機不卡的前提（規格第十四條）
  for (const card of registry.cards) {
    const thumb = fs.statSync(path.join(root, 'public', card.art.thumbnail.replace(/^\//, ''))).size;
    const high = fs.statSync(path.join(root, 'public', card.art.high.replace(/^\//, ''))).size;
    check(`${card.name}：縮圖遠小於高清`, thumb < high / 10,
      `${(thumb / 1024).toFixed(0)}KB vs ${(high / 1024).toFixed(0)}KB`);
  }
}

console.log('\n【二】卡片驗證真的會擋');
{
  const good = registry.cards[0];
  const knownSkillIds = new Set(SKILLS.map((s) => s.id));

  const cases: Array<[string, BeastCard]> = [
    ['元素不合法', { ...good, id: 'x1', element: 'LIGHT' as never }],
    ['數值超出範圍', { ...good, id: 'x2', stats: { ...good.stats, attack: 9999 } }],
    ['技能不存在', { ...good, id: 'x3', skills: ['skill_不存在'] }],
    ['沒有技能', { ...good, id: 'x4', skills: [] }],
    ['版本格式錯', { ...good, id: 'x5', version: 'v1' }],
    ['圖片不存在', { ...good, id: 'x6', art: { ...good.art, thumbnail: '/beast-game/thumb/99.webp' } }],
    ['宿號超範圍', { ...good, id: 'x7', mansionId: 99 }],
    ['副元素與主元素相同', { ...good, id: 'x8', subElement: good.element }],
  ];

  for (const [label, card] of cases) {
    const issues = validateCard(card, { knownSkillIds, knownCardIds: new Set(), assetExists });
    check(`擋下：${label}`, issues.length > 0, issues[0]?.message?.slice(0, 46) ?? '（沒擋到）');
  }

  // id 重複也要擋
  const dup = validateCard(good, { knownSkillIds, knownCardIds: new Set([good.id]), assetExists });
  check('擋下：id 重複', dup.some((i) => i.field === 'id'));
}

console.log('\n【三】五元素：只有一套，不得另立');
{
  eq('固定五個', [...ELEMENTS], ['SPACE', 'AIR', 'WATER', 'FIRE', 'EARTH']);

  // 與平台既有的 PRODUCT_ELEMENT 同一組對照（金空木風水水火火土地）
  const link = fs.readFileSync(path.join(root, 'lib/ziwei-star-beast-link.ts'), 'utf8');
  const expected: Array<[string, string]> = [['metal', '空'], ['wood', '風'], ['water', '水'], ['fire', '火'], ['earth', '地']];
  for (const [key, label] of expected) {
    check(`平台對照仍是 ${key} → ${label}`, new RegExp(`${key}:\\s*'${label}'`).test(link));
  }

  eq('角木蛟 → 風', elementFromMansionName('角木蛟'), 'AIR');
  eq('亢金龍 → 空', elementFromMansionName('亢金龍'), 'SPACE');
  eq('房日兔 → 火（太陽屬火）', elementFromMansionName('房日兔'), 'FIRE');
  eq('心月狐 → 水（太陰屬水）', elementFromMansionName('心月狐'), 'WATER');
  check('認不得就回 null，不猜', elementFromMansionName('未知怪獸') === null);

  // 相剋是一個環，不能有死路
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
  eq('攻60 防20 無相剋 → 40', normal.damage, 40);

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
  for (const type of ['DAMAGE', 'HEAL', 'BUFF_ATTACK', 'BUFF_DEFENSE', 'BUFF_SPEED', 'DEBUFF_ATTACK',
    'DEBUFF_DEFENSE', 'STUN', 'SHIELD', 'DRAW', 'DISCARD', 'REVIVE', 'ELEMENT_BOOST'] as const) {
    check(`有 ${type}`, (EFFECT_TYPES as readonly string[]).includes(type));
  }

  const mk = (name: string, hp: number): BeastInstance => ({
    instanceId: name, cardId: name, name, element: 'FIRE', subElement: null,
    maxHp: hp, hp, attack: 50, defense: 20, speed: 50,
    shield: 0, stunnedTurns: 0, modifiers: [], elementBoosts: [], defeated: false,
  });
  const side = { draw: () => 1, discard: () => 1 };

  const a = mk('甲', 100);
  const b = mk('乙', 100);
  const log: never[] | Parameters<typeof resolveEffects>[1]['log'] = [];

  resolveEffects([{ type: 'SHIELD', value: 30 }], { source: a, target: a, baseAttack: 0, side, log });
  eq('護盾生效', a.shield, 30);

  resolveEffects([{ type: 'DAMAGE', value: 0 }], { source: b, target: a, baseAttack: 50, side, log });
  check('護盾先扣，血才扣', a.shield < 30 && a.hp <= 100, `盾 ${a.shield}／血 ${a.hp}`);

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
    () => resolveEffects([{ type: 'MIND_CONTROL' as never, value: 1 }], { source: a, target: b, baseAttack: 0, side, log }),
    'UNKNOWN_EFFECT_TYPE');

  check('每一次結算都留下紀錄', log.length >= 5, `${log.length} 筆`);
}

console.log('\n【六】技能：資料驅動，不寫死在核心');
{
  for (const skill of SKILLS) {
    check(`${skill.name}：效果種類合法`,
      skill.effects.every((e) => (EFFECT_TYPES as readonly string[]).includes(e.type)),
      skill.effects.map((e) => e.type).join(','));
    check(`${skill.name}：版本格式`, /^\d+\.\d+\.\d+$/.test(skill.version));
  }
  eq('技能 id 唯一', new Set(SKILLS.map((s) => s.id)).size, SKILLS.length);

  // 核心不得認得任何一個技能的名字
  const battleSrc = fs.readFileSync(path.join(root, 'lib/beast-game/battle.ts'), 'utf8');
  for (const skill of SKILLS) {
    check(`Battle Engine 不認得「${skill.name}」`, !battleSrc.includes(skill.name));
    if (fail > 0) break;
  }
  check('Battle Engine 不寫死任何 skill id', !/skill_\d{3}/.test(battleSrc));
}

console.log('\n【七】回合流程：七階段固定，不得跳關');
{
  eq('七個階段', [...TURN_PHASES], ['TURN_START', 'DRAW', 'SUMMON', 'ACTION', 'BATTLE', 'EFFECT_RESOLVE', 'TURN_END']);
  for (let i = 0; i < TURN_PHASES.length - 1; i += 1) {
    const from = TURN_PHASES[i];
    const to = TURN_PHASES[i + 1];
    let ok = true;
    try { assertPhaseTransition(from, to); } catch { ok = false; }
    check(`${from} → ${to} 合法`, ok);
  }
  throws('不得跳過 DRAW', () => assertPhaseTransition('TURN_START', 'SUMMON'), 'TURN_PHASE_ILLEGAL');
  throws('不得跳過 BATTLE', () => assertPhaseTransition('ACTION', 'TURN_END'), 'TURN_PHASE_ILLEGAL');
  throws('不得倒退', () => assertPhaseTransition('BATTLE', 'DRAW'), 'TURN_PHASE_ILLEGAL');
}

console.log('\n【八】核心可以玩：抽得到、叫得出、打得動、分得出輸贏');
{
  const ids = registry.cards.map((c) => c.id);
  const rng = createRng(20260905);
  const playerDeck = buildDeck(ids, rng);
  const opponentDeck = buildDeck(ids, rng);

  eq('牌組 20 張', playerDeck.length, DECK_SIZE);
  check('牌組只含正式牌庫的卡', playerDeck.every((id) => ids.includes(id)));

  const game = createGame({ playerDeck, opponentDeck, seed: 20260905 });
  eq('起手 5 張', game.players.PLAYER.hand.length, OPENING_HAND);
  eq('對手也起手 5 張', game.players.OPPONENT.hand.length, OPENING_HAND);

  playTurn(game);
  check('第一回合有召喚', game.players.PLAYER.field.length > 0,
    game.players.PLAYER.field.map((u) => u.instance.name).join('、'));
  check('場上不得超過 3 隻', game.players.PLAYER.field.length <= MAX_FIELD);

  const finished = playToEnd(game);
  check('打得完，分得出結果', finished.winner !== null, String(finished.winner));
  check('戰鬥有實際傷害紀錄', finished.log.some((entry) => entry.type === 'DAMAGE' && entry.applied > 0));
  check('時間軸涵蓋七階段',
    new Set(finished.timeline.map((t) => t.phase)).size === 7,
    `${new Set(finished.timeline.map((t) => t.phase)).size} 種`);

  // 同一個 seed 必須跑出同一場——不能重現就無法回查客訴
  const replay = playToEnd(createGame({ playerDeck, opponentDeck, seed: 20260905 }));
  eq('同一 seed → 同樣的勝負', replay.winner, finished.winner);
  eq('同一 seed → 同樣的回合數', replay.turn, finished.turn);
  eq('同一 seed → 同樣的紀錄長度', replay.log.length, finished.log.length);

  // 不同 seed 應該有不同的牌序（否則洗牌是假的）
  const otherRng = createRng(999);
  const otherDeck = buildDeck(ids, otherRng);
  check('不同 seed → 不同牌序', JSON.stringify(otherDeck) !== JSON.stringify(playerDeck));
}

console.log('\n【九】技能在實戰中真的會生效');
{
  const kang = registry.cards.find((c) => c.name === '亢金龍')!;
  const jiao = registry.cards.find((c) => c.name === '角木蛟')!;
  const attacker = instantiate(jiao, 'A');
  const defender = instantiate(kang, 'B');
  const context: BattleContext = { side: { draw: () => 0, discard: () => 0 }, usage: new Map(), log: [] };

  const before = defender.hp;
  const result = performAttack({ attackerCard: jiao, attacker, defenderCard: kang, defender, context });
  check('普攻造成傷害', result.basicDamage > 0, `${before} → ${defender.hp}`);
  check('角衝的減防真的掛上去了',
    defender.modifiers.some((m) => m.stat === 'defense' && m.value < 0),
    JSON.stringify(defender.modifiers));

  // 整場次數限制要真的生效
  const limited = getSkill('skill_008')!;
  eq('雷震整場一次', limited.usesPerBattle, 1);
  const stunCtx: BattleContext = { side: { draw: () => 0, discard: () => 0 }, usage: new Map(), log: [] };
  const wei = registry.cards.find((c) => c.name === '尾火虎')!;
  const tiger = instantiate(wei, 'T');
  const prey = instantiate(kang, 'P');
  performAttack({ attackerCard: wei, attacker: tiger, defenderCard: kang, defender: prey, context: stunCtx });
  const firstStun = prey.stunnedTurns;
  prey.stunnedTurns = 0;
  performAttack({ attackerCard: wei, attacker: tiger, defenderCard: kang, defender: prey, context: stunCtx });
  check('第一次會暈', firstStun > 0, String(firstStun));
  eq('第二次不再暈（次數用完）', prey.stunnedTurns, 0);
}

console.log('\n【十】平衡：稀有度不等於絕對戰力');
{
  const reports = registry.cards.map((card) => evaluateBalance(card));
  for (const report of reports) {
    check(`${report.name}（${report.rarity}）在預算帶內`, report.status === 'OK', report.detail);
  }
  const rarity = rarityIsNotPower(registry.cards);
  check('稀有度不得直接等於戰力', rarity.passed, rarity.detail);

  // 失衡要抓得到——不是只會說「都 OK」
  const inflated = { ...registry.cards[0], id: 'inflated', stats: { hp: 300, attack: 150, defense: 120, speed: 150 } };
  eq('灌爆數值 → BALANCE_WARNING', evaluateBalance(inflated as BeastCard).status, 'BALANCE_WARNING');
}

console.log('\n【十一】資料與畫面分離、不得為新卡改核心');
{
  const registrySrc = fs.readFileSync(path.join(root, 'lib/beast-game/registry.ts'), 'utf8');
  check('卡片資料不在核心裡硬寫', !/stats:\s*\{\s*hp:/.test(registrySrc));
  check('registry 只負責收與擋', registrySrc.includes('validateCard'));

  for (const file of ['schema.ts', 'effects.ts', 'battle.ts', 'turn.ts', 'balance.ts', 'elements.ts']) {
    const src = fs.readFileSync(path.join(root, 'lib/beast-game', file), 'utf8');
    check(`${file} 不含任何神獸名`, !registry.cards.some((c) => src.includes(c.name)));
    check(`${file} 不含 React`, !src.includes('react') && !src.includes('jsx'));
  }
}

console.log(`\n神獸卡遊戲核心 — PASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exit(1);
console.log('BEAST_GAME_CORE_CERTIFIED=true');
