/**
 * 《神煞易經》分享卡（後端組好內容，前端只把它畫成一張圖）
 * ============================================================================
 * 業主定案 2026-09-28（客人審查第 6 項）：讓客人把自己的四柱神煞存下來、傳給朋友。
 * 隱私：卡上不放出生日期、時辰、姓名——只有神煞、本命卦、老師一句話與流年一句話。
 * 前端只負責排版與輸出圖片，不自己組句、不自己算。
 */
import type { ShenShaCardView } from './dual-chart-shensha-card';
import type { ShenShaIChingView } from './shensha-iching';
import type { ShenShaFlowView } from './shensha-flow-year';
import type { ShenShaTone } from './shensha-teacher-readings';

export interface ShenShaShareView {
  title: string; subtitle: string;
  columns: { label: string; names: { name: string; tone: ShenShaTone | null }[] }[];
  emptyColumn: string;
  hexagram: string;
  lines: { label: string; text: string }[];
  footer: string; site: string;
  fileName: string; shareText: string;
  buttonLabel: string; busyLabel: string; doneLabel: string; failLabel: string; privacyNote: string;
}

export function buildShenShaShare(card: ShenShaCardView, iching: ShenShaIChingView, flow: ShenShaFlowView): ShenShaShareView | null {
  if (card.state !== 'received' || iching.state !== 'READY') return null;
  const lines = [{ label: '易經老師', text: iching.oneLiner }];
  if (flow.state === 'READY') lines.push({ label: flow.years[0].label, text: flow.years[0].oneLiner });
  return {
    title: '神煞易經',
    subtitle: '八字 → 紫微 → 特星神煞 → 易經',
    columns: card.columns.map(col => ({ label: col.label, names: col.hits.map(hit => ({ name: hit.name, tone: hit.tone })) })),
    emptyColumn: '—',
    hexagram: `本命卦「${iching.hexagram.name}」`,
    lines,
    footer: '太極紫微易經派・僅作自我反思參考',
    site: 'heaven-earth-humanity-pair.vercel.app',
    fileName: '神煞易經分享卡.png',
    shareText: `我的神煞易經：${iching.teaser}`,
    buttonLabel: '製作分享卡',
    busyLabel: '分享卡製作中',
    doneLabel: '分享卡已完成，可以長按圖片儲存或分享。',
    failLabel: '這台裝置暫時無法製作圖片，可以直接截圖分享。',
    privacyNote: '分享卡不含出生日期、時辰與姓名。',
  };
}
