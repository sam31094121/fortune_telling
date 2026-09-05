/**
 * 神獸卡遊戲｜六十張卡產生器
 *
 * 六十張＝二十八宿幼子 28 ＋ 二十八宿成獸 28 ＋ 四象 4。
 * 全部用既有素材，沒有新造任何一隻神獸。
 *
 * 為什麼用產生器而不是手寫六十個檔案：
 * 六十張卡的數值必須彼此有關係（同元素同一套傾向、同形態同一個量級），
 * 手寫六十次一定會歪，而且改一條規則要改六十個地方。
 * 這裡把「規則」寫在一處，卡片檔案是產物——但產物仍是一張一個檔（規格第十七條），
 * 可以逐張讀、逐張改、逐張版本控管。
 *
 * 手動微調過的卡片：把 version 從 1.0.0 往上改，並在檔案裡標註，
 * 重跑前先確認不會被覆蓋（本腳本會跳過標了 @manual 的檔案）。
 *
 * 重跑：node scripts/gen-beast-cards.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/star-beasts.json'), 'utf8'));
const outDir = path.join(root, 'cards/beasts');
fs.mkdirSync(outDir, { recursive: true });

/** 宿名中間字 → 元素。與 lib/beast-game/elements.ts 同一組對照。 */
const CHAR_ELEMENT = { 木: 'AIR', 金: 'SPACE', 土: 'EARTH', 水: 'WATER', 火: 'FIRE', 日: 'FIRE', 月: 'WATER' };

/**
 * 每個元素的數值傾向（相對於基準的加減）。
 * 同元素的卡吃同一套傾向，玩家才學得會「風的快、地的硬」。
 */
const PROFILE = {
  AIR: { hp: -6, attack: 2, defense: -6, speed: 12 },
  SPACE: { hp: 0, attack: -2, defense: 10, speed: -2 },
  WATER: { hp: 8, attack: -2, defense: 4, speed: 0 },
  FIRE: { hp: -8, attack: 10, defense: -6, speed: 2 },
  EARTH: { hp: 12, attack: -6, defense: 10, speed: -10 },
};

/** 元素的守招／攻招／被動池。成獸依元素抽，同元素風格一致。 */
const ELEMENT_SKILLS = {
  AIR: { attack: 'skill_101', guard: 'skill_106', passive: 'skill_111' },
  SPACE: { attack: 'skill_102', guard: 'skill_107', passive: 'skill_112' },
  WATER: { attack: 'skill_103', guard: 'skill_108', passive: 'skill_112' },
  FIRE: { attack: 'skill_104', guard: 'skill_109', passive: 'skill_113' },
  EARTH: { attack: 'skill_105', guard: 'skill_110', passive: 'skill_112' },
};

/** 幼子技能池。依 id 輪流分配，讓二十八隻幼子不會全部一樣。 */
const YOUNG_SKILLS = ['skill_201', 'skill_202', 'skill_204', 'skill_205', 'skill_207', 'skill_208', 'skill_203'];

/**
 * 稀有度。刻意讓同一個稀有度橫跨幼子與成獸——
 * 這樣「R 一定比 N 強」在資料上就不成立（規格第五條）。
 */
function rarityFor(form, id) {
  if (form === 'GUARDIAN') return 'UR';
  if (form === 'YOUNG') return id % 3 === 0 ? 'R' : 'N';
  if (id % 7 === 1) return 'SSR';
  if (id % 2 === 0) return 'SR';
  return 'R';
}

/**
 * 成本與稀有度刻意脫鉤。
 *
 * 第一版把成本直接綁在稀有度上（R 一律 2、SSR 一律 5），結果是
 * 稀有度＝成本＝戰力，規格第五條「稀有度不等於絕對戰力」形同虛設——
 * 自己的 rarityIsNotPower() 也確實把它抓出來了。
 *
 * 現在成本由宿號決定，稀有度另外決定，所以同一個成本階梯裡
 * 會同時出現 N 和 SR：想要那張 SR，付的氣跟旁邊那張 N 一樣多。
 * 稀有度換來的是技能數與戰術價值，不是硬吃一截數值。
 */
function costFor(form, id) {
  if (form === 'GUARDIAN') return id % 2 === 1 ? 7 : 8;
  if (form === 'YOUNG') return 1 + (id % 2);
  return 3 + (id % 3);
}

/** 同一顆種子永遠同一組微調，讓每張卡有個性但可重現。 */
function jitter(seed, spread) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return Math.round((x - Math.floor(x)) * (spread * 2 + 1)) - spread;
}

/**
 * 數值只由「成本」決定，形態只決定圖、故事與技能組。
 *
 * 第一版把數值掛在形態上，成本只微調元素偏移，結果成本幾乎不影響強弱：
 * 一氣平均 143、二氣 136、三氣 292、四氣 291、五氣 290——
 * 二氣比一氣還弱，三到五氣完全平坦。成本變成擺設，自己的測試直接抓出來。
 *
 * 現在整組數值乘上成本係數：付得多才該強，這是卡牌遊戲唯一站得住的平衡軸。
 */
const BASE = { hp: 112, attack: 56, defense: 46, speed: 62 };
const COST_SCALE = { 1: 0.42, 2: 0.56, 3: 0.85, 4: 1.0, 5: 1.14, 7: 1.36, 8: 1.46 };

/**
 * 稀有度稅。
 *
 * 稀有度換來的是技能數與戰術價值，不是白吃一截數值——
 * 所以同一個成本裡，稀有度越高、基礎數值要越低一點，把預算讓給技能。
 * 沒有這一條的話，同成本的 SSR 永遠壓過 SR，
 * 規格第五條「稀有度不等於絕對戰力」就是空話（實測 SSR 最低 306 > SR 最高 301）。
 */
const RARITY_TAX = { N: 1.07, R: 1.035, SR: 1.0, SSR: 0.955, UR: 0.93 };

function statsFor(element, id, cost, rarity) {
  const profile = PROFILE[element];
  const scale = (COST_SCALE[cost] ?? 1) * (RARITY_TAX[rarity] ?? 1);
  const at = (key, spread) => Math.max(1, Math.round((BASE[key] + profile[key]) * scale) + jitter(id + spread, 3));
  return {
    hp: Math.max(40, at('hp', 1)),
    attack: Math.max(10, at('attack', 2)),
    defense: Math.max(0, at('defense', 3)),
    speed: Math.max(10, at('speed', 4)),
  };
}

const GUARDIANS = [
  { slug: 'qinglong', name: '青龍', element: 'AIR', season: '東方・春', mansionId: 1,
    skills: ['skill_301', 'skill_101'], passive: ['skill_111'],
    story: '東方蒼龍，統角、亢、氐、房、心、尾、箕七宿。春之主宰，主生發與開創——龍抬頭之時，萬物隨之而動。' },
  { slug: 'zhuque', name: '朱雀', element: 'FIRE', season: '南方・夏', mansionId: 22,
    skills: ['skill_302', 'skill_104'], passive: ['skill_113'],
    story: '南方朱雀，統井、鬼、柳、星、張、翼、軫七宿。夏之主宰，主熱烈與昭彰——展翼之時，天地俱明。' },
  { slug: 'baihu', name: '白虎', element: 'SPACE', season: '西方・秋', mansionId: 15,
    skills: ['skill_303', 'skill_102'], passive: ['skill_113'],
    story: '西方白虎，統奎、婁、胃、昴、畢、觜、參七宿。秋之主宰，主肅殺與決斷——虎嘯之時，萬象歸位。' },
  { slug: 'xuanwu', name: '玄武', element: 'WATER', season: '北方・冬', mansionId: 8,
    skills: ['skill_304', 'skill_103'], passive: ['skill_112'],
    story: '北方玄武，統斗、牛、女、虛、危、室、壁七宿。冬之主宰，主收藏與守成——負淵而立，不動如山。' },
];

const header = (name, form) => `/**
 * 神獸卡｜${name}${form === 'YOUNG' ? '（幼子）' : form === 'GUARDIAN' ? '（四象）' : '（成獸）'}
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
`;

/**
 * 手動微調標記。
 *
 * 第一版直接檢查字串 @manual，結果說明文字裡就有這個字，
 * 六十張全部被自己跳過——產生器等於失效，而且不會報錯。
 * 改成用組出來的標記，說明文字裡不會剛好命中。
 */
const MANUAL_MARK = ["@", "manual", "tuned"].join("-");

function emit(card, form) {
  const file = path.join(outDir, `${card.slug}.ts`);
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(MANUAL_MARK)) {
    return 'skipped';
  }
  const body = header(card.name, form)
    + `  id: '${card.id}',\n`
    + `  name: '${card.name}',\n`
    + `  category: 'DIVINE_BEAST',\n`
    + `  element: '${card.element}',\n`
    + `  rarity: '${card.rarity}',\n`
    + `  form: '${form}',\n`
    + `  cost: ${card.cost},\n`
    + `  stats: { hp: ${card.stats.hp}, attack: ${card.stats.attack}, defense: ${card.stats.defense}, speed: ${card.stats.speed} },\n`
    + `  skills: [${card.skills.map((s) => `'${s}'`).join(', ')}],\n`
    + `  passive: [${card.passive.map((s) => `'${s}'`).join(', ')}],\n`
    + `  art: {\n`
    + `    thumbnail: '${card.art.thumbnail}',\n`
    + `    front: '${card.art.front}',\n`
    + `    high: '${card.art.high}',\n`
    + `    back: '/beast-game/card-back.webp',\n`
    + `  },\n`
    + `  story: '${card.story.replace(/'/g, "\\'")}',\n`
    + `  mansionId: ${card.mansionId},\n`
    + `  version: '1.0.0',\n`
    + `};\n\nexport default card;\n`;
  fs.writeFileSync(file, body);
  return 'written';
}

const generated = [];
let skipped = 0;

for (const item of data.items) {
  const n = String(item.id).padStart(2, '0');
  const element = CHAR_ELEMENT[item.name.slice(1, 2)];
  if (!element) throw new Error(`認不得元素：${item.name}`);

  // 幼子
  const youngRarity = rarityFor('YOUNG', item.id);
  const youngCost = costFor('YOUNG', item.id);
  const young = {
    slug: `${item.slug}-young`,
    id: `beast_y${n}`,
    name: `${item.name}・幼子`,
    element,
    rarity: youngRarity,
    cost: youngCost,
    stats: statsFor(element, item.id, youngCost, youngRarity),
    skills: [YOUNG_SKILLS[item.id % YOUNG_SKILLS.length]],
    passive: item.id % 4 === 0 ? ['skill_206'] : [],
    art: {
      thumbnail: `/beast-game/thumb/young-${n}.webp`,
      front: `/beast-game/front/young-${n}.webp`,
      high: item.youngDivineImage,
    },
    story: `${item.symbolicPart}的幼子。尚未長成，靈性已顯——${item.coreMeaning}的雛形。餵養與陪伴，牠會長成成獸的模樣。`,
    mansionId: item.id,
  };
  if (emit(young, 'YOUNG') === 'skipped') skipped += 1; else generated.push({ ...young, form: 'YOUNG' });

  // 成獸
  const adultRarity = rarityFor('ADULT', item.id);
  const adultCost = costFor('ADULT', item.id);
  const kit = ELEMENT_SKILLS[element];
  const adult = {
    slug: item.slug,
    id: `beast_a${n}`,
    name: item.name,
    element,
    rarity: adultRarity,
    cost: adultCost,
    stats: statsFor(element, item.id, adultCost, adultRarity),
    skills: adultRarity === 'R' ? [kit.attack] : [kit.attack, kit.guard],
    passive: adultRarity === 'SSR' ? [kit.passive] : [],
    art: {
      thumbnail: `/beast-game/thumb/adult-${n}.webp`,
      front: `/beast-game/front/adult-${n}.webp`,
      high: item.image,
    },
    story: `${item.symbolicPart}，二十八宿第 ${item.id} 宿。核心寓意：${item.coreMeaning}。${item.traits}`,
    mansionId: item.id,
  };
  if (emit(adult, 'ADULT') === 'skipped') skipped += 1; else generated.push({ ...adult, form: 'ADULT' });
}

// 四象
for (const guardian of GUARDIANS) {
  const card = {
    slug: `guardian-${guardian.slug}`,
    id: `beast_g_${guardian.slug}`,
    name: guardian.name,
    element: guardian.element,
    rarity: 'UR',
    cost: costFor('GUARDIAN', guardian.mansionId),
    stats: statsFor(guardian.element, guardian.mansionId, costFor('GUARDIAN', guardian.mansionId), 'UR'),
    skills: guardian.skills,
    passive: guardian.passive,
    art: {
      thumbnail: `/beast-game/thumb/guardian-${guardian.slug}.webp`,
      front: `/beast-game/front/guardian-${guardian.slug}.webp`,
      high: `/star-beasts/four-guardians/${guardian.slug}.png`,
    },
    story: guardian.story,
    mansionId: guardian.mansionId,
  };
  if (emit(card, 'GUARDIAN') === 'skipped') skipped += 1; else generated.push({ ...card, form: 'GUARDIAN' });
}

// registry 的匯入清單也一起產出，免得加卡忘了註冊
const imports = generated
  .map((c) => `import ${c.slug.replace(/[^a-zA-Z0-9]/g, '_')} from '../../cards/beasts/${c.slug}';`)
  .join('\n');
const list = generated.map((c) => `  ${c.slug.replace(/[^a-zA-Z0-9]/g, '_')},`).join('\n');
fs.writeFileSync(path.join(root, 'cards/beasts/_registry-imports.txt'), `${imports}\n\n---\n\n${list}\n`);

console.log(`產出 ${generated.length} 張（跳過手動微調 ${skipped} 張）`);
console.log(`幼子 ${generated.filter((c) => c.form === 'YOUNG').length}`
  + ` 成獸 ${generated.filter((c) => c.form === 'ADULT').length}`
  + ` 四象 ${generated.filter((c) => c.form === 'GUARDIAN').length}`);
