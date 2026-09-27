/** Client readiness only; the server remains authoritative for calendar and chart validation. */
export function dualChartHourStatus(value: { birthHourBranch?: string; birthTime?: string; timeUnknown?: boolean }) {
  if (value.timeUnknown || value.birthHourBranch === 'unknown') return { done: false, text: '需補出生時辰', message: '時辰不明時，暫不產生雙命盤；請確認出生時辰後再排盤。' };
  if (!value.birthHourBranch || value.birthHourBranch === 'pending') return { done: false, text: '待選擇', message: '請先點選出生時辰。' };
  if (value.birthHourBranch === 'zi' && !['23:30', '00:30'].includes(value.birthTime ?? '')) return { done: false, text: '待確認午夜前後', message: '請確認子時是午夜前（23 點段）或午夜後（0 點段）。' };
  if (!value.birthTime) return { done: false, text: '待選擇', message: '請重新點選出生時辰。' };
  return { done: true, text: '已確認', message: '' };
}
