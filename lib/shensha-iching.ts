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
import type { ShenShaCardView } from './dual-chart-shensha-card';
import { SHENSHA_IMAGERY_ATTRIBUTION, shenShaImagery, type ShenShaImagery } from './shensha-char-imagery';
import { SHENSHA_TEACHER_READINGS, teacherReadingFor, type ShenShaTone } from './shensha-teacher-readings';

export const SHENSHA_ICHING_CLAIM = 'C-SHENSHA-ICHING';

export interface ShenShaIChingStep { step: '八字' | '紫微' | '特星神煞' | '易經'; text: string }
export interface ShenShaIChingItem {
  id: string; name: string; pillar: string; derivation: string; reference: boolean; imagery: ShenShaImagery;
  /** 本派導師解盤：本意→意境→柱位→落地，一整段話。 */
  teacher: { theme: string; tone: ShenShaTone; text: string } | null;
}
export type ShenShaIChingView =
  | {
    state: 'READY';
    chain: ShenShaIChingStep[];
    hexagram: { name: string; glyph: string; kingWen: number; changingLine: number; changingLabel: string; essence: string; advice: string };
    /** 每一個命中的神煞，逐項延伸。 */
    items: ShenShaIChingItem[];
    /** 各柱命中數，依柱序（年月日時）。 */
    distribution: { pillar: string; count: number }[];
    /** 老師解盤：只串接可回查的事實與既有卦義，不自編吉凶。 */
    reading: string[];
    credibility: { status: GateStatus; line: string };
    /** 字的意境出處說明。 */
    imageryAttribution: string;
  }
  | { state: 'BLOCKED'; chain: ShenShaIChingStep[]; reason: string };

/** 福氣／動能／提醒三類各幾項，給導師解盤一個總覽。 */
function toneSummary(items: ShenShaIChingItem[]): string {
  const count = (tone: ShenShaTone) => items.filter(i => i.teacher?.tone === tone);
  const names = (list: ShenShaIChingItem[]) => list.map(i => i.name).join('、');
  const blessing = count('福氣'); const drive = count('動能'); const reminder = count('提醒');
  const parts = [
    blessing.length ? `福氣 ${blessing.length} 項（${names(blessing)}）是你的底氣` : '',
    drive.length ? `動能 ${drive.length} 項（${names(drive)}）是推你往前的力量` : '',
    reminder.length ? `提醒 ${reminder.length} 項（${names(reminder)}）是要你多留一分心的地方` : '',
  ].filter(Boolean);
  return `把這些神煞分成三類來看：${parts.join('；')}。提醒不是壞消息，而是先把燈點亮。`;
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
    teacher: SHENSHA_TEACHER_READINGS[hit.id] ? { theme: SHENSHA_TEACHER_READINGS[hit.id].theme, tone: SHENSHA_TEACHER_READINGS[hit.id].tone, text: teacherReadingFor(hit.id, hit.name, col.label)! } : null,
    // 老師解盤：字有字的意境，取姓名學字庫字義作參考（業主定案 2026-09-27）。
    imagery: shenShaImagery(hit.name),
  })));
  const distribution = card.columns.map(col => ({ pillar: col.label, count: col.hits.length }));
  chain.push({ step: '特星神煞', text: items.length ? `共 ${items.length} 項：${distribution.map(d => `${d.pillar}${d.count}`).join('、')}` : '本次依本派取法未命中任何特星神煞' });
  if (iching.status !== 'READY') {
    chain.push({ step: '易經', text: '未起卦' });
    return { state: 'BLOCKED', chain, reason: iching.reason };
  }
  const r = iching.reading;
  chain.push({ step: '易經', text: `生辰起卦：${r.hexagramName}，動爻第${r.changingLine}爻` });

  const max = Math.max(0, ...distribution.map(d => d.count));
  const focus = distribution.filter(d => d.count === max && max > 0).map(d => d.pillar);
  const empty = distribution.filter(d => d.count === 0).map(d => d.pillar);
  const reading = [
    `這張命盤先由八字排出四柱（${chain[0].text}），紫微斗數四柱逐字核對一致，才從同一張盤衍生特星神煞。`,
    items.length
      ? `特星神煞共 ${items.length} 項，${focus.join('、')}最集中（${max} 項）${empty.length ? `，${empty.join('、')}本派取法未命中` : ''}。每一項的推導都列在下方，可逐項回查。`
      : '依本派取法，這張盤沒有命中特星神煞；這不代表其他流派也沒有。',
    ...(items.length ? [toneSummary(items)] : []),
    `易經以同一份生辰起卦，得「${r.hexagramName}」：${r.essence.replace(/[。．.]?$/, '。')}`,
    `行動建議：${r.advice}`,
    ...(items.length ? [`導師解盤的讀法：先讀神煞的本意，再看它落在哪一柱，最後回到「${r.hexagramName}」的行動建議——讀意、讀位、讀卦，三者合看。下方逐項展開，每一項並附字的意境。`] : []),
  ];

  const registry = ichingRegistry as unknown as SourceRegistry;
  const claim = registry.claims.find(c => c.claim_id === SHENSHA_ICHING_CLAIM);
  const status: GateStatus = claim ? evaluateClaim(claim, indexSources(registry)).status : 'PENDING_POOL';
  return {
    state: 'READY', chain, items, distribution, reading,
    hexagram: { name: r.hexagramName, glyph: r.glyph, kingWen: r.kingWen, changingLine: r.changingLine, changingLabel: `第${r.changingLine}爻動`, essence: r.essence, advice: r.advice },
    credibility: { status, line: `神煞易經解盤：${STATUS_WORDING[status]}` },
    imageryAttribution: SHENSHA_IMAGERY_ATTRIBUTION,
  };
}
