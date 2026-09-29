/**
 * 《神煞易經》流年神煞（後端運算，前端只照印）
 * ============================================================================
 * 業主定案 2026-09-28：客人審查「看完就結束、下次再來一模一樣」，要一個每年都不同的回訪理由。
 * 兩種取法都做、分兩段顯示；看今年＋明年（流年以立春為界）。
 *   甲、今年遇到（以本命起算）：客人審查第三輪：原稱「本命被觸動」會讓人以為本命本來就有這顆，改名；算法不變。
 *       流年干支當第五柱，沿用本卡既有取法（lib/dual-chart-shensha.ts buildFlowYearShenSha）。
 *   乙、今年歲神：以流年地支為取主排歲神，看落在本命哪一柱。
 * 取法屬太極紫微易經派（本站自家一派），原典頁碼待補；話術只講提醒與轉化，不作吉凶斷語。
 */
import type { FlowYearShenSha } from './dual-chart-iching-shensha';
import { PILLAR_LINK, SHENSHA_TEACHER_READINGS, type ShenShaTone } from './iching-shensha-teacher-readings';

export interface ShenShaFlowItem { id: string; name: string; pillar: string; derivation: string; tone: ShenShaTone | null; theme: string | null; text: string }
export interface ShenShaFlowYear { year: number; ganZhi: string; label: string; oneLiner: string; touched: ShenShaFlowItem[]; suiShen: ShenShaFlowItem[] }
export type ShenShaFlowView =
  | { state: 'READY'; teaser: string; intro: string; touchedTitle: string; suiShenTitle: string; emptyTouched: string; emptySuiShen: string; years: ShenShaFlowYear[]; note: string }
  | { state: 'BLOCKED'; reason: string };

const PILLAR_LABEL = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' } as const;

function itemOf(year: FlowYearShenSha, hit: FlowYearShenSha['touched'][number]): ShenShaFlowItem {
  const reading = SHENSHA_TEACHER_READINGS[hit.id];
  const where = hit.pillar === 'flow' ? '流年' : PILLAR_LABEL[hit.pillar];
  const text = hit.pillar === 'flow'
    ? `這一年遇上${hit.name}「${reading?.theme ?? hit.name}」。${reading?.action ?? ''}`
    : `這一年歲神${hit.name}落在${where}，${PILLAR_LINK[where] ?? '在這一柱顯現'}。${reading?.action ?? ''}`;
  return { id: hit.id, name: hit.name, pillar: where, derivation: `${year.year} ${year.ganZhi}年：${hit.rule}`, tone: reading?.tone ?? null, theme: reading?.theme ?? null, text };
}

const namesOf = (items: ShenShaFlowItem[]) => [...new Set(items.map(i => i.name))].join('、');
const countOf = (items: ShenShaFlowItem[]) => new Set(items.map(i => i.name)).size;
/** 歲神同一顆落在兩柱時寫成「五鬼（月柱、日柱）」，顆數與名單才對得上。 */
const placedOf = (items: ShenShaFlowItem[]) => [...new Set(items.map(i => i.name))].map(name => { const where = items.filter(i => i.name === name).map(i => i.pillar); return where.length > 1 ? `${name}（${where.join('、')}）` : name; }).join('、');

export function buildShenShaFlow(years: (FlowYearShenSha | null)[]): ShenShaFlowView {
  const ready = years.filter((y): y is FlowYearShenSha => Boolean(y));
  if (!ready.length || ready.length !== years.length) return { state: 'BLOCKED', reason: '四柱尚未核對一致，流年神煞暫不提供。' };
  const views = ready.map(year => {
    const touched = year.touched.map(hit => itemOf(year, hit));
    const suiShen = year.suiShen.map(hit => itemOf(year, hit));
    const label = `${year.year} ${year.ganZhi}年`;
    const oneLiner = touched.length || suiShen.length
      ? `${touched.length ? `遇到 ${countOf(touched)} 顆新神煞（${namesOf(touched)}）` : '沒有遇到新的神煞'}；${suiShen.length ? `歲神 ${countOf(suiShen)} 顆落入本命（${placedOf(suiShen)}）` : '歲神沒有落入本命'}。`
      : '依本派取法，這一年沒有遇到新的神煞，歲神也沒有落入本命——適合按部就班，把手上的事做紮實。';
    return { year: year.year, ganZhi: year.ganZhi, label, oneLiner, touched, suiShen };
  });
  const first = views[0];
  return {
    state: 'READY',
    teaser: `${first.label}・遇到 ${countOf(first.touched)}・歲神 ${countOf(first.suiShen)}`,
    intro: '流年神煞分兩段看：「這一年遇到」是用你本命的日干、日支、年支、月支起算，看這一年的干支帶來哪幾顆神煞（你的本命盤上不一定有）；「這一年的歲神」是從這一年的地支起算歲神，看落在你本命哪一柱——和本命同名的神煞是不同的兩回事。流年以立春為界。',
    touchedTitle: '這一年遇到',
    suiShenTitle: '這一年的歲神',
    emptyTouched: '這一年沒有遇到新的神煞。',
    emptySuiShen: '這一年的歲神沒有落入本命。',
    years: views,
    note: '流年取法依太極紫微易經派（本站自家一派），原典頁碼待補；歲神只講提醒與轉化，不作吉凶斷語，僅作自我反思參考。',
  };
}
