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
    groups: { pillar: string; lines: ShenShaGhostLine[] }[];
    formations: { title: string; text: string }[];
    closing: string;
    disclaimer: string;
  }
  | { state: 'BLOCKED'; reason: string };

/** 三種鬼語：福氣＝護身符、動能＝要壓陣的活氣、提醒＝門縫裡的風。 */
function ghostLine(name: string, pillar: string, theme: string, tone: ShenShaTone | null): string {
  if (tone === '福氣') return `「${name}」伏在${pillar}——這是護身的東西。茅山的說法：你身上有一道「${theme}」的符，不是誰替你畫的，是你自己一路積下來的。符會褪色，常做好事，它才一直亮著。`;
  if (tone === '動能') return `「${name}」伏在${pillar}——這股氣是活的，會動、會衝。道士見了只說一句：「${theme}，壓得住是兵，壓不住是亂。」你要當那個壓陣的人。`;
  if (tone === '提醒') return `「${name}」伏在${pillar}——門縫裡有風。別慌，那不是外靈，是你心裡那段「${theme}」還沒收乾淨。茅山不驅它，只教你：燈點亮、名字叫出來，它自己就退了。`;
  return `「${name}」伏在${pillar}——這一筆氣還在打量你，先別理它，把眼前的事做穩。`;
}

export function buildShenShaGhost(view: ShenShaIChingView, hexagram: IChingReading | null): ShenShaGhostView {
  if (view.state !== 'READY' || !hexagram) {
    return { state: 'BLOCKED', reason: '四柱還沒對齊，壇不能開。茅山的規矩：盤不清，不開口。' };
  }
  const d = buildGhostDecoding(hexagram);
  const strip = (text: string) => text.replace(/^【[^】]+】/, '');
  const groups = view.groups.map(group => ({
    pillar: group.pillar,
    lines: group.items.map(item => ({ name: item.name, tone: item.teacher?.tone ?? null, text: ghostLine(item.name, item.pillar, item.teacher?.theme ?? item.name, item.teacher?.tone ?? null) })),
  }));
  const formations = view.combos.map(combo => ({
    // 同一種陣可能在不同柱各成一陣（例：德星化煞在年柱、時柱），陣名帶柱位才分得清。
    title: `${combo.title}陣${combo.pillar ? `（${combo.pillar}）` : ''}`,
    text: `${combo.members.join('、')}${combo.pillar ? `在${combo.pillar}` : '在這張盤上'}結成一陣。陣不是用來嚇人的，是讓你看清楚：這幾股氣會一起來，也要一起接。`,
  }));
  const total = view.items.length;
  return {
    state: 'READY',
    opening: `（門外低語）茅山的規矩：先驗四柱，再開壇。你這張盤，八字與紫微一字不差——門，可以開了。${total ? `盤上伏著 ${total} 道神煞氣，今天一道一道點給你看。` : '盤上乾乾淨淨，沒有神煞伏著，這也是一種福氣。'}`,
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
