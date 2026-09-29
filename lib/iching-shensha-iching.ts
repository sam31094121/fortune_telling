/**
 * 《神煞易經》第④層：特星神煞 → 易經（後端運算，前端只照印）
 * ============================================================================
 *
 * 衍生鏈（業主定案 2026-09-27，順序不可顛倒）：
 *   客戶資料 → ①八字 → ②紫微（四柱逐字核對）→ ③特星神煞 → ④易經 → 前端只顯示
 *
 * - 卦象沿用三合一的 runIChingLayer（帶憑證起卦），不另起一套卦。
 * - 每一個命中的神煞都延伸出來：落在哪一柱、怎麼從八字紫微推出來（取法原文），不挑重點、不省略。
 * - 神煞的吉凶含義尚無登記來源，一律不寫；只寫可回查的事實（名稱、柱位、推導）。
 * - 公信力句子由來源閘門重算（C-SHENSHA-ICHING），只有 VERIFIED 才能說「已通過交叉比對」。
 *
 * 來源登記：docs/技能戰鬥檔案/易經/來源登記.json 的 C-SHENSHA-ICHING。
 */
import ichingRegistry from '../docs/技能戰鬥檔案/易經/來源登記.json';
import { evaluateClaim, indexSources, type GateStatus, type SourceRegistry } from './iching-source-gate';
import { STATUS_WORDING } from './credibility-phrases';
import type { ThreeCoreIChingLayer } from './three-core-engine';
import type { ShenShaCardView } from './dual-chart-iching-shensha-card';
import { SHENSHA_IMAGERY_ATTRIBUTION, shenShaImagery, type ShenShaImagery } from './iching-shensha-char-imagery';
import { PILLAR_LINK, PILLAR_PALACE, SHENSHA_PRINCIPLE, SHENSHA_TEACHER_READINGS, SHENSHA_TRADITION, teacherReadingFor, type ShenShaTone } from './iching-shensha-teacher-readings';
import { shenShaOnion, shenShaOnionCredibility, type ShenShaOnionView } from './iching-shensha-onion';
import { findShenShaCombos, type ShenShaCombo } from './iching-shensha-combos';

export const SHENSHA_ICHING_CLAIM = 'C-SHENSHA-ICHING';

export interface ShenShaIChingStep { step: '八字' | '紫微' | '特星神煞' | '易經'; text: string }
export interface ShenShaIChingItem {
  id: string; name: string; pillar: string; derivation: string; reference: boolean; imagery: ShenShaImagery;
  /** 本派導師解盤：本意→意境→柱位→落地，一整段話。 */
  teacher: { theme: string; tone: ShenShaTone; text: string } | null;
  /** 傳統三分類（常用神煞總覽）；總覽沒列的為 null。 */
  tradition: string | null;
  /** 神煞洋蔥心理學：殼→心→禮物，對得上的附心理學名詞與原始文獻。 */
  onion: ShenShaOnionView | null;
  /** 跳轉錨點：與四柱格子同一個。 */
  anchor: string;
  /** 先給重點：洋蔥「心」那一句（沒有洋蔥時用主題），完整解讀折疊。 */
  hook: string | null;
}
export type ShenShaIChingView =
  | {
    state: 'READY';
    chain: ShenShaIChingStep[];
    hexagram: { name: string; glyph: string; kingWen: number; changingLine: number; changingLabel: string; essence: string; advice: string };
    /** 整盤合看：本派組合規則找出的神煞組合（同柱或整盤）。 */
    combos: ShenShaCombo[];
    /** 逐柱細看：依年月日時分組（只含有命中的柱），anchor 供畫面跳轉。 */
    groups: { pillar: string; anchor: string; count: number; palace: string; toneLine: string; items: ShenShaIChingItem[] }[];
    /** 每一個命中的神煞，逐項延伸。 */
    items: ShenShaIChingItem[];
    /** 各柱命中數，依柱序（年月日時）。 */
    distribution: { pillar: string; count: number }[];
    /** 老師解盤：只串接可回查的事實與既有卦義，不自編吉凶。 */
    /** 折疊卡預告：收起來時也看得到裡面有什麼。 */
    teaser: string;
    /** 一句話：易經老師對這張盤最想說的話（與鬼魅老師對照用）。 */
    oneLiner: string;
    /** 導師總評：一段話說完這張盤的輪廓。 */
    summary: string;
    /** 最集中柱位的解讀：這張盤的故事多半在哪一面發生。沒有命中時為 null。 */
    focusLine: string | null;
    /** 三個重點：底氣（福氣）、推力（動能）、留心（提醒）；沒有的類別不出現。 */
    highlights: { tone: ShenShaTone; title: string; names: string[]; text: string }[];
    /** 其餘解盤段落（原則、卦義、整盤合看、讀法）。 */
    reading: string[];
    credibility: { status: GateStatus; line: string };
    /** 字的意境出處說明。 */
    imageryAttribution: string;
    /** 洋蔥心理學層的公信力（閘門重算 C-SHENSHA-ONION）。 */
    onionCredibility: { status: GateStatus; line: string };
  }
  | { state: 'BLOCKED'; chain: ShenShaIChingStep[]; reason: string };

/** 福氣／動能／提醒三類各幾項，給導師解盤一個總覽。 */
/** 三個重點：底氣／推力／留心。 */
const HIGHLIGHT_COPY: Record<ShenShaTone, { title: string; text: (names: string) => string }> = {
  福氣: { title: '你的底氣', text: n => `${n}是你一路走來的依靠，遇到難處時，這些是你可以回頭借力的地方。` },
  動能: { title: '推你往前的力量', text: n => `${n}是推著你往前的引擎，用在對的方向，就是你最有衝勁的時候。` },
  提醒: { title: '要多留一分心', text: n => `${n}不是壞消息，是先把燈點亮：知道哪裡要多留心，路就走得穩。` },
};
function highlightsOf(items: ShenShaIChingItem[]) {
  return (['福氣', '動能', '提醒'] as const).flatMap(tone => {
    const names = [...new Set(items.filter(i => i.teacher?.tone === tone).map(i => i.name))];
    return names.length ? [{ tone, title: HIGHLIGHT_COPY[tone].title, names, text: HIGHLIGHT_COPY[tone].text(names.join('、')) }] : [];
  });
}
function toneCountLine(items: ShenShaIChingItem[]): string {
  return (['福氣', '動能', '提醒'] as const).map(tone => [tone, items.filter(i => i.teacher?.tone === tone).length] as const).filter(([, n]) => n > 0).map(([tone, n]) => `${tone} ${n}`).join('、');
}

export function buildShenShaIChing(params: {
  pillars: { year: string; month: string; day: string; hour: string };
  pillarCheckPassed: boolean;
  card: ShenShaCardView;
  iching: ThreeCoreIChingLayer;
}): ShenShaIChingView {
  const { pillars, pillarCheckPassed, card, iching } = params;
  const chain: ShenShaIChingStep[] = [
    { step: '八字', text: `${pillars.year}／${pillars.month}／${pillars.day}／${pillars.hour}` },
    { step: '紫微', text: pillarCheckPassed ? '四柱與八字逐字核對一致' : '四柱與八字不一致，停在核對關' },
  ];
  if (!pillarCheckPassed) return { state: 'BLOCKED', chain, reason: '八字與紫微四柱尚未核對一致，不衍生神煞，也不起卦。' };
  if (card.state !== 'received') {
    chain.push({ step: '特星神煞', text: '尚未全部判定' });
    return { state: 'BLOCKED', chain, reason: '特星神煞尚未全部判定完成，易經解盤暫不提供，避免用不完整的神煞下結論。' };
  }
  const items: ShenShaIChingItem[] = card.columns.flatMap(col => col.hits.map(hit => ({
    // 取法原文分號後是查柱範圍（工程用），客戶只看推導本身。
    id: hit.id, name: hit.name, pillar: col.label, derivation: hit.rule.split('；')[0], reference: hit.reference,
    onion: shenShaOnion(hit.id),
    anchor: hit.anchor,
    // 重點句單獨出現時去掉開頭「其實」：十幾句連著都以「其實你」起頭，讀起來像套版。
    hook: shenShaOnion(hit.id)?.layers.find(l => l.layer === '心')?.text.replace(/^其實/, '') ?? SHENSHA_TEACHER_READINGS[hit.id]?.theme ?? null,
    tradition: SHENSHA_TRADITION[hit.id] ? `傳統分類：${SHENSHA_TRADITION[hit.id]}` : null,
    teacher: SHENSHA_TEACHER_READINGS[hit.id] ? { theme: SHENSHA_TEACHER_READINGS[hit.id].theme, tone: SHENSHA_TEACHER_READINGS[hit.id].tone, text: teacherReadingFor(hit.id, hit.name, col.label)! } : null,
    // 老師解盤：字有字的意境，取姓名學字庫字義作參考（業主定案 2026-09-27）。
    imagery: shenShaImagery(hit.name),
  })));
  // 同一顆神煞落在兩柱以上：第二次起重點句改講這一柱，不再和第一次一模一樣（客人審查第二輪）。
  // 同一個心理學名詞在一張盤只出現一次（客人審查第三輪：天狗與十惡大敗都掛「沉沒成本」）。
  const termSeen = new Set<string>();
  for (const item of items) {
    const term = item.onion?.term;
    if (!term) continue;
    if (termSeen.has(term.name)) item.onion = { ...item.onion!, term: null };
    else termSeen.add(term.name);
  }
  const firstPillar = new Map<string, string>();
  for (const item of items) {
    const first = firstPillar.get(item.id);
    if (first) item.hook = `和${first}那顆是同一顆；落在${item.pillar}，${PILLAR_LINK[item.pillar] ?? '在這一柱顯現'}。`;
    else firstPillar.set(item.id, item.pillar);
  }
  const distribution = card.columns.map(col => ({ pillar: col.label, count: col.hits.length }));
  chain.push({ step: '特星神煞', text: items.length ? `共 ${items.length} 項：${distribution.map(d => `${d.pillar}${d.count}`).join('、')}` : '本次依本派取法未命中任何特星神煞' });
  if (iching.status !== 'READY') {
    chain.push({ step: '易經', text: '未起卦' });
    return { state: 'BLOCKED', chain, reason: iching.reason };
  }
  const r = iching.reading;
  chain.push({ step: '易經', text: `生辰起卦：${r.hexagramName}，動爻第${r.changingLine}爻` });

  const combos = findShenShaCombos(items.map(i => ({ id: i.id, name: i.name, pillar: i.pillar, tone: i.teacher?.tone })));
  const max = Math.max(0, ...distribution.map(d => d.count));
  const focus = distribution.filter(d => d.count === max && max > 0).map(d => d.pillar);
  const empty = distribution.filter(d => d.count === 0).map(d => d.pillar);
  const summary = items.length
    ? `這張盤由八字排出四柱（${chain[0].text}），紫微斗數逐字核對一致，從同一張盤衍生特星神煞 ${items.length} 項（${toneCountLine(items)}），以${focus.join('、')}最集中${empty.length ? `，${empty.join('、')}本派取法未命中` : ''}；本命卦為「${r.hexagramName}」。`
    : `這張盤由八字排出四柱（${chain[0].text}），紫微斗數逐字核對一致；依本派取法沒有命中特星神煞，這不代表其他流派也沒有。本命卦為「${r.hexagramName}」。`;
  const highlights = highlightsOf(items);
  const focusLine = items.length && focus.length
    ? `神煞最集中在${focus.join('、')}，${focus.map(p => PILLAR_LINK[p]).filter(Boolean).join('；也')}——這張盤的故事，多半在這一面發生。`
    : null;
  const reading = [
    ...(items.length ? [SHENSHA_PRINCIPLE] : []),
    `易經以同一份生辰起卦，得「${r.hexagramName}」：${r.essence.replace(/[。．.]?$/, '。')}行動建議：${r.advice}`,
  ];

  const registry = ichingRegistry as unknown as SourceRegistry;
  const claim = registry.claims.find(c => c.claim_id === SHENSHA_ICHING_CLAIM);
  const status: GateStatus = claim ? evaluateClaim(claim, indexSources(registry)).status : 'PENDING_POOL';
  return {
    teaser: `本命卦「${r.hexagramName}」・神煞 ${items.length} 項${combos.length ? `・合看 ${combos.length} 組` : ''}`,
    oneLiner: items.length ? `讀意、讀位、讀卦：${focus.join('、')}最集中，回到「${r.hexagramName}」——${r.advice.split('（')[0]}。` : `盤上沒有特星神煞，回到「${r.hexagramName}」——${r.advice.split('（')[0]}。`,
    state: 'READY', chain, items, distribution, summary, focusLine, highlights, reading, combos,
    groups: card.columns.map(col => {
      const groupItems = items.filter(i => i.pillar === col.label);
      const tones = (['福氣', '動能', '提醒'] as const).map(tone => [tone, groupItems.filter(i => i.teacher?.tone === tone).length] as const).filter(([, n]) => n > 0);
      return { pillar: col.label, anchor: `shensha-${col.pillar}`, count: col.hits.length, palace: `${PILLAR_PALACE[col.label] ?? ''}。`, toneLine: tones.map(([tone, n]) => `${tone} ${n}`).join('　'), items: groupItems };
    }).filter(g => g.count > 0),
    hexagram: { name: r.hexagramName, glyph: r.glyph, kingWen: r.kingWen, changingLine: r.changingLine, changingLabel: `第${r.changingLine}爻動`, essence: r.essence, advice: r.advice },
    credibility: { status, line: `神煞易經解盤：${STATUS_WORDING[status]}` },
    imageryAttribution: SHENSHA_IMAGERY_ATTRIBUTION,
    onionCredibility: shenShaOnionCredibility(),
  };
}
