/**
 * 《神煞易經》鬼魅老師解盤（後端運算，前端只照印）
 * ============================================================================
 * 業主定案 2026-09-28：「再多一張卡片，鬼魅老師解盤，資料來源：話術、茅山道士。
 * 兩套說法落差要很大——神跟魔的落差。後端負責運算，前端只顯示。」
 *
 * 同一張盤、同一組神煞、同一個生辰卦，換成「茅山道士・門外低語」的話術分身：
 *   開壇 → 拆卦三段（磁場／詭異／因果，沿用 buildGhostDecoding）→ 逐柱鬼語 → 陣法（組合）→ 收壇
 *
 * 界線（沿用 docs/iching-skill-manual.md〈五〉鬼魅老師：恐怖是外殼、知己是內核）：
 * - 神秘口氣是外衣，真實邏輯是骨架：每句最後都回到「你自己能做的事」。
 * - 不說外靈附身、不說會出事、不賣符咒、不作驅邪或預言；禁止「必定、註定、大凶、血光、死」等字（測試會擋）。
 * - 這是本派話術分身，不是宗教儀式或事實宣稱；公信力照實標示。
 * 技能檔：docs/技能戰鬥檔案/神煞異君/（《神煞異君》）。
 */
import { buildGhostDecoding } from './iching-psychology';
import type { IChingReading } from './iching-engine';
import type { ShenShaTone } from './shensha-teacher-readings';
import type { ShenShaIChingView } from './shensha-iching';

export interface ShenShaGhostLine { name: string; tone: ShenShaTone | null; text: string }
export type ShenShaGhostView =
  | {
    state: 'READY';
    opening: string;
    decoding: { label: string; text: string }[];
    groups: { pillar: string; intro: string; lines: ShenShaGhostLine[] }[];
    formations: { title: string; text: string }[];
    closing: string;
    disclaimer: string;
  }
  | { state: 'BLOCKED'; reason: string };

/**
 * 鬼語三段：起（依類別三種說法輪替）→ 門外的聲音替你說出心事（取洋蔥「心」那一層，每個神煞不同）→ 收（依類別三種說法輪替）。
 * 福氣＝護身符、動能＝要壓陣的活氣、提醒＝門縫裡的風。輪替依盤上順序決定，同一張盤永遠同一套說法。
 */
const GHOST_OPEN: Record<ShenShaTone, ((n: string, p: string) => string)[]> = {
  福氣: [(n, p) => `「${n}」伏在${p}——這是護身的東西。`, (n, p) => `${p}亮著一點金光，是「${n}」。`, (n, p) => `${p}有一道「${n}」，壓在你背後護著。`],
  動能: [(n, p) => `「${n}」伏在${p}——這股氣是活的，會動、會衝。`, (n, p) => `${p}裡「${n}」在躁動，按不太住。`, (n, p) => `「${n}」在${p}打轉，像一匹還沒上韁的馬。`],
  提醒: [(n, p) => `「${n}」伏在${p}——門縫裡有風。`, (n, p) => `${p}的角落，「${n}」在低聲說話。`, (n, p) => `「${n}」蹲在${p}，一直沒走。`],
};
const GHOST_CLOSE: Record<ShenShaTone, ((theme: string) => string)[]> = {
  福氣: [t => `茅山的說法：這道「${t}」的符不是誰替你畫的，是你自己一路積下來的；常做好事，它才一直亮著。`, t => `「${t}」這道光是你自己積的，別小看它。`, t => `記得回頭謝謝那些替你擋過風的人，「${t}」才會一直在。`],
  動能: [t => `道士只說一句：「${t}，壓得住是兵，壓不住是亂。」你要當那個壓陣的人。`, t => `給「${t}」一個方向，它就替你開路。`, t => `韁繩在你手上，慢一步，「${t}」就聽話了。`],
  提醒: [t => `別慌，那不是外靈，是「${t}」還沒收乾淨；燈點亮、名字叫出來，它自己就退了。`, t => `把「${t}」寫下來，它就從暗處走到亮處。`, t => `茅山不驅它，看懂「${t}」，它就散了。`],
};
function ghostLine(name: string, pillar: string, theme: string, tone: ShenShaTone | null, heart: string | null, index: number): string {
  if (!tone) return `「${name}」伏在${pillar}——這一筆氣還在打量你，先別理它，把眼前的事做穩。`;
  const open = GHOST_OPEN[tone][index % 3](name, pillar);
  const close = GHOST_CLOSE[tone][Math.floor(index / 3) % 3](theme);
  const secret = heart ? `門外的聲音替你說出來：「${heart.replace(/^其實/, '')}」` : '';
  return `${open}${secret}${close}`;
}

/** 鬼魅版柱位宮義：每柱開頭一句（易經老師講宮位，鬼魅老師講「氣從哪裡來」）。 */
const GHOST_PILLAR: Record<string, string> = {
  年柱: '年柱是祖上那一脈傳下來的氣，老一輩的事、別人第一眼看你的樣子，都從這裡飄出來。',
  月柱: '月柱是家門口的氣，父母兄弟、同事同輩，天天進出，你最常撞見的就是它。',
  日柱: '日柱是貼身的氣，睡在你枕邊，跟你最親的人，也在這一柱。',
  時柱: '時柱是往外走的氣，子女、部屬、你這輩子往外伸出去的那隻手，都在這裡。',
};

/** 陣法台詞：每一種陣各有一句鬼魅說法（依整盤合看的規則 id）。 */
const GHOST_FORMATION: Record<string, (members: string, where: string) => string> = {
  'march-leader': (m, w) => `${m}在${w}一起行軍——邊走邊點兵的陣。走到哪，人就跟到哪；先想好往哪走，別讓隊伍跟著你繞圈。`,
  'charm-trio': (m, w) => `${m}在${w}圍成一圈——桃花陣。香氣太濃，蜂蝶會來，雜蟲也會來；門要開，也要知道什麼時候關。`,
  'noble-pair': (m, w) => `${m}在${w}站成一排——貴人陣。這不是天上掉下來的，是你以前幫過的人，換一種樣子回來找你。`,
  'de-softens': (m, w) => `${m}鎮在${w}——德星壓煞的陣。煞氣是真的，但壓在德底下翻不了身；你守住善念，它就一直被壓著。`,
  'edge-and-command': (m, w) => `${m}在${w}刀出鞘、令在手——權柄陣。刀太亮會傷自己人，收一半在鞘裡，陣才鎮得住。`,
  'scholar': (m, w) => `${m}在${w}點起一盞油燈——書房陣。夜深了燈還亮著，那是你的腦子不肯休息；寫下來，燈油才不會白燒。`,
  'solitary-depth': (m, w) => `${m}在${w}各守一角——閉關陣。一個人待著不是壞事，但別把門從裡面鎖死。`,
  'livelihood': (m, w) => `${m}在${w}守著米缸——衣食陣。缸不會自己滿，先存一把米，再煮一鍋飯。`,
  'busy-mind': (m, w) => `${m}在${w}繞成一團線——心結陣。線頭在你手上，一次解一個結，別整團亂扯。`,
  'outer-waves': (m, w) => `${m}在${w}颳起外風——風浪陣。風是從外面吹進來的，不是你招的；關好窗、留好後路，風自己會過去。`,
  'distant-romance': (m, w) => `${m}在${w}同路——遠行遇緣陣。緣分常在路上碰見，出門時眼睛多留一點給陌生人。`,
  'care-and-rest': (m, w) => `${m}在${w}守著一盞藥爐——照看陣。你總在替別人熬藥，也記得替自己添一把柴。`,
};

export function buildShenShaGhost(view: ShenShaIChingView, hexagram: IChingReading | null): ShenShaGhostView {
  if (view.state !== 'READY' || !hexagram) {
    return { state: 'BLOCKED', reason: '四柱還沒對齊，壇不能開。茅山的規矩：盤不清，不開口。' };
  }
  const d = buildGhostDecoding(hexagram);
  const strip = (text: string) => text.replace(/^【[^】]+】/, '');
  // 依盤上順序給每個神煞一個輪替序號，同一類別的鬼語不重複句型。
  const toneIndex: Record<string, number> = {};
  const groups = view.groups.map(group => ({
    pillar: group.pillar,
    intro: GHOST_PILLAR[group.pillar] ?? '',
    lines: group.items.map(item => {
      const tone = item.teacher?.tone ?? null;
      const index = tone ? (toneIndex[tone] = (toneIndex[tone] ?? -1) + 1) : 0;
      const heart = item.onion?.layers.find(layer => layer.layer === '心')?.text ?? null;
      return { name: item.name, tone, text: ghostLine(item.name, item.pillar, item.teacher?.theme ?? item.name, tone, heart, index) };
    }),
  }));
  const formations = view.combos.map(combo => ({
    // 同一種陣可能在不同柱各成一陣（例：德星化煞在年柱、時柱），陣名帶柱位才分得清。
    title: `${combo.title}陣${combo.pillar ? `（${combo.pillar}）` : ''}`,
    text: (GHOST_FORMATION[combo.id] ?? ((m: string, w: string) => `${m}在${w}結成一陣。陣不是用來嚇人的，是讓你看清楚：這幾股氣會一起來，也要一起接。`))(combo.members.join('、'), combo.pillar ?? '這張盤上'),
  }));
  const total = view.items.length;
  const tones = { 福氣: 0, 動能: 0, 提醒: 0 } as Record<ShenShaTone, number>;
  for (const item of view.items) if (item.teacher?.tone) tones[item.teacher.tone] += 1;
  const heaviest = [...view.groups].sort((a, b) => b.count - a.count)[0];
  return {
    state: 'READY',
    opening: `（門外低語）茅山的規矩：先驗四柱，再開壇。你這張盤，八字與紫微一字不差——門，可以開了。${total ? `盤上伏著 ${total} 道神煞氣——護身 ${tones.福氣} 道、活氣 ${tones.動能} 道、門縫風 ${tones.提醒} 道；${heaviest ? `氣最重的在${heaviest.pillar}，${heaviest.count} 道擠在一起。` : ''}今天一道一道點給你看。` : '盤上乾乾淨淨，沒有神煞伏著，這也是一種福氣。'}`,
    decoding: [
      { label: '磁場', text: strip(d.field) },
      { label: '詭異', text: strip(d.spirit) },
      { label: '因果', text: strip(d.karma) },
    ],
    groups,
    formations,
    closing: `收壇。最後一句話留給你：門我替你開過了，燈要你自己點。看起來像鬼的，多半是還沒說出口的心事；看起來像劫的，多半是還沒走完的功課。${hexagram.hexagramName}卦的意思很簡單——${hexagram.advice.split('（')[0]}。`,
    // 茅山正統不以恐嚇立教（〈認識茅山傳承〉，業主提供，D 級參考；見 docs/技能戰鬥檔案/神煞異君/）。
    disclaimer: '鬼魅老師是同一場解盤的另一種話術分身：神秘是外衣，真實邏輯是骨架。茅山正統不以恐嚇立教——不作驅邪、不賣符咒、不作預言；內容僅作自我反思參考。',
  };
}
