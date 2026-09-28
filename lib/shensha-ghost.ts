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
import { GHOST_TEACHER_PERSONA } from './ghost-teacher-persona';

/** hook：先給一句（門外的聲音替你說的心事）；text：完整鬼語，前端折疊。 */
export interface ShenShaGhostLine { name: string; tone: ShenShaTone | null; hook: string; text: string }
/** 業主定案 2026-09-28：鬼魅老師卡標示未滿 18 歲禁止進入（READY 與 BLOCKED 都帶，前端照印）。 */
export const GHOST_AGE_GATE = '未滿 18 歲禁止進入';

export type ShenShaGhostView =
  | {
    state: 'READY';
    ageGate: string;
    teaser: string;
    oneLiner: string;
    opening: string;
    decoding: { label: string; text: string }[];
    groups: { pillar: string; intro: string; lines: ShenShaGhostLine[] }[];
    formations: { title: string; text: string }[];
    closing: string;
    disclaimer: string;
  }
  | { state: 'BLOCKED'; ageGate: string; teaser: string; reason: string };

/**
 * 鬼語三段：起（依類別三種說法輪替）→ 門外的聲音替你說出心事（取洋蔥「心」那一層，每個神煞不同）→ 收（依類別三種說法輪替）。
 * 福氣＝護身符、動能＝要壓陣的活氣、提醒＝門縫裡的風。輪替依盤上順序決定，同一張盤永遠同一套說法。
 */
const GHOST_OPEN: Record<ShenShaTone, ((n: string, p: string) => string)[]> = {
  福氣: [(n, p) => `「${n}」伏在${p}——一道護身光。`, (n, p) => `${p}一點金光，是「${n}」。`, (n, p) => `「${n}」立在${p}，替你擋風。`],
  動能: [(n, p) => `「${n}」在${p}——活火，會竄。`, (n, p) => `${p}裡，「${n}」按不住。`, (n, p) => `「${n}」在${p}奔，一匹未上韁的馬。`],
  提醒: [(n, p) => `「${n}」在${p}——門縫透風。`, (n, p) => `${p}暗處，「${n}」在低語。`, (n, p) => `「${n}」蹲在${p}，不肯走。`],
};
const GHOST_CLOSE: Record<ShenShaTone, ((theme: string) => string)[]> = {
  福氣: [t => `這道「${t}」，是你自己畫的符。`, t => `「${t}」是你一路積的光。光不求人，只求你別熄。`, t => `謝過替你擋風的人，「${t}」便長明。`, t => `「${t}」不必供，不必買——心正，它就在。`, t => `「${t}」護你一程；你，再護下一個人。`],
  動能: [t => `「${t}」：壓得住是兵，壓不住是亂。`, t => `給「${t}」一條路，它替你劈開荊棘。`, t => `韁在你手。慢半步，「${t}」便馴。`, t => `「${t}」是火——煮飯，別燒屋。`, t => `先認方向，「${t}」才不兜圈。`],
  提醒: [t => `不是外靈，是「${t}」未收乾淨。喚它的名，它就退。`, t => `寫下「${t}」，暗處便見了光。`, t => `茅山不驅它。看懂「${t}」，它自散。`, t => `「${t}」不是來討債，是來提醒你哪裡該補。`, t => `對「${t}」說一聲：我看見了。它便不再敲門。`],
};
function ghostLine(name: string, pillar: string, theme: string, tone: ShenShaTone | null, heart: string | null, index: number, repeatOf?: string): string {
  if (!tone) return `「${name}」伏在${pillar}——這一筆氣還在打量你，先別理它，把眼前的事做穩。`;
  if (repeatOf) return `${GHOST_OPEN[tone][index % 3](name, pillar)}和${repeatOf}那道同一道氣，${GHOST_REPEAT[pillar] ?? '換一種樣子出現'}。${GHOST_CLOSE[tone][index % GHOST_CLOSE[tone].length](theme)}`;
  const open = GHOST_OPEN[tone][index % 3](name, pillar);
  // 起三種、收五種，錯開輪替：同一類別連著十幾道也不會一句一句重複。
  const close = GHOST_CLOSE[tone][index % GHOST_CLOSE[tone].length](theme);
  // 心事句本身帶「」時，內層改『』，免得引號裡又套引號。
  const secret = heart ? `門外替你說：「${heart.replace(/^其實/, '').replace(/「/g, '『').replace(/」/g, '』')}」` : '';
  return `${open}${secret}${close}`;
}

/** 同一道氣換了柱位：鬼魅版的柱位說法（只用在第二次出現）。 */
const GHOST_REPEAT: Record<string, string> = {
  年柱: '這回從祖上來',
  月柱: '這回守在家門口',
  日柱: '這回貼上你的身',
  時柱: '這回隨你遠行',
};

/** 鬼魅版柱位宮義：每柱開頭一句（易經老師講宮位，鬼魅老師講「氣從哪裡來」）。 */
const GHOST_PILLAR: Record<string, string> = {
  年柱: '年柱，祖上的氣。別人第一眼的你，從這裡來。',
  月柱: '月柱，家門口的氣。天天照面的人，都在這裡。',
  日柱: '日柱，貼身的氣。枕邊的人，也在這一柱。',
  時柱: '時柱，往外走的氣。你伸出去的手，落在這裡。',
};

/** 陣法台詞：每一種陣各有一句鬼魅說法（依整盤合看的規則 id）。 */
const GHOST_FORMATION: Record<string, (members: string, where: string) => string> = {
  'march-leader': (m, w) => `${m}在${w}行軍——點兵陣。先定方向；兵，跟著方向走。`,
  'charm-trio': (m, w) => `${m}在${w}圍成一圈——桃花陣。香引蝶，也引蟲。門要會開，更要會關。`,
  'noble-pair': (m, w) => `${m}在${w}站成一排——貴人陣。天不掉貴人；是你幫過的人，換了張臉回來。`,
  'de-softens': (m, w) => `${m}鎮在${w}——德星壓煞陣。煞是真的；德在上，它翻不了身。`,
  'edge-and-command': (m, w) => `${m}在${w}刀出鞘、令在手——權柄陣。刀太亮，先傷自己人；收刀半寸，陣才鎮得住。`,
  'scholar': (m, w) => `${m}在${w}點一盞油燈——書房陣。夜深燈未熄；寫下來，油就沒白燒。`,
  'solitary-depth': (m, w) => `${m}在${w}各守一角——閉關陣。關門修行可以；別從裡面上鎖。`,
  'livelihood': (m, w) => `${m}在${w}守著米缸——衣食陣。缸不會自己滿；今天，先存一把米。`,
  'busy-mind': (m, w) => `${m}在${w}纏成一團線——心結陣。在泰國，睡不好、想太多，常被說成「被下了東西」。不是。線頭在你手上，一次解一個結。`,
  'outer-waves': (m, w) => `${m}在${w}颳起外風——風浪陣。假阿贊最愛拿這陣收錢。我看破給你聽：風從外面來，不是你招的，也沒人對你下什麼。關窗，留後路，風自會過。`,
  'distant-romance': (m, w) => `${m}在${w}同路——遠行遇緣陣。緣在路上；出門，多看陌生人一眼。`,
  'mount-and-ride': (m, w) => `${m}在${w}牽出一匹備好鞍的馬——出征陣。韁在你手，路你自己挑。`,
  'care-and-rest': (m, w) => `${m}在${w}守一盞藥爐——照看陣。你替人熬了半生的藥；今晚，替自己添把柴。`,
};

export function buildShenShaGhost(view: ShenShaIChingView, hexagram: IChingReading | null): ShenShaGhostView {
  if (view.state !== 'READY' || !hexagram) {
    return { state: 'BLOCKED', ageGate: GHOST_AGE_GATE, teaser: '壇未開', reason: '四柱還沒對齊，壇不能開。茅山的規矩：盤不清，不開口。' };
  }
  const d = buildGhostDecoding(hexagram);
  // 拆卦三段沿用共用的 buildGhostDecoding（其他卡片也在用，不改它）；這裡只去掉段名，
  // 並拿掉夾在括號裡的英文心理學名詞，讓茅山口吻不被打斷，句子本身的邏輯保留。
  const strip = (text: string) => text.replace(/^【[^】]+】/, '').replace(/（[^（）]*[A-Za-z][^（）]*）/g, '');
  // 依盤上順序給每個神煞一個輪替序號，同一類別的鬼語不重複句型。
  const toneIndex: Record<string, number> = {};
  const firstPillar = new Map<string, string>();
  const groups = view.groups.map(group => ({
    pillar: group.pillar,
    intro: GHOST_PILLAR[group.pillar] ?? '',
    lines: group.items.map(item => {
      const tone = item.teacher?.tone ?? null;
      const index = tone ? (toneIndex[tone] = (toneIndex[tone] ?? -1) + 1) : 0;
      const heart = item.onion?.layers.find(layer => layer.layer === '心')?.text.replace(/^其實/, '').replace(/「/g, '『').replace(/」/g, '』') ?? null;
      const repeatOf = firstPillar.get(item.id);
      if (!repeatOf) firstPillar.set(item.id, item.pillar);
      const hook = repeatOf
        ? `「${item.name}」又落在${item.pillar}——和${repeatOf}那道是同一道氣。`
        : heart ? `「${item.name}」門外替你說：「${heart}」` : `「${item.name}」伏在${item.pillar}。`;
      return { name: item.name, tone, hook, text: ghostLine(item.name, item.pillar, item.teacher?.theme ?? item.name, tone, heart, index, repeatOf) };
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
    ageGate: GHOST_AGE_GATE,
    teaser: total ? `${total} 道神煞氣${heaviest ? `・氣最重在${heaviest.pillar}` : ''}${formations.length ? `・${formations.length} 個陣` : ''}` : '盤上無神煞伏著',
    oneLiner: total ? `門外低語：茅山看過，泰國也看過——${heaviest ? `${heaviest.pillar}氣最重。` : ''}像鬼的，多半是你沒說出口的心事。` : '門外低語：盤上乾淨。燈，你自己點。',
    // 人設（docs/技能戰鬥檔案/神煞異君/鬼魅老師人設.md）：學過茅山、見過泰國黑衣阿贊的陰法——只看、只解、不下。
    opening: `（門外低語）${GHOST_TEACHER_PERSONA.introduction}先驗四柱，再開壇。八字、紫微，一字不差——門，開了。${total ? `盤上伏著 ${total} 道氣：護身 ${tones.福氣} 道、活氣 ${tones.動能} 道、門縫風 ${tones.提醒} 道；${heaviest ? `氣最重的在${heaviest.pillar}。` : ''}` : '盤上乾淨，無煞伏著——這也是福。'}${GHOST_TEACHER_PERSONA.voice}`,
    decoding: [
      { label: '磁場', text: strip(d.field) },
      { label: '詭異', text: strip(d.spirit) },
      { label: '因果', text: strip(d.karma) },
    ],
    groups,
    formations,
    closing: `收壇。茅山、泰國，同一句話：沒有不勞而獲的法。真有人傷你——先找信任的人、找專業，必要時報警。人平安了，影子我再替你拆。我替你破，是在贖我的罪；你的道，你自己走。${GHOST_TEACHER_PERSONA.motto}——舊執念放下，新路才長。門，我開了；燈，你自己點。「${hexagram.hexagramName}」只留一句——${hexagram.advice.split('（')[0]}。`,
    // 茅山正統不以恐嚇立教（〈認識茅山傳承〉，業主提供，D 級參考；見 docs/技能戰鬥檔案/神煞異君/）。
    disclaimer: '鬼魅老師是同一場解盤的另一種話術分身：神秘是外衣，真實邏輯是骨架。茅山正統不以恐嚇立教——不作驅邪、不賣符咒、不作預言；內容僅作自我反思參考。',
  };
}
