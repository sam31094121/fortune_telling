/** 強化流程共用圖示（線條 SVG，跟著文字顏色）。 */
export type EnhanceIconName = 'up' | 'lock' | 'wait' | 'sword' | 'bead' | 'cards' | 'check' | 'back' | 'close' | 'tap' | 'gift' | 'retry' | 'star';
const PATHS: Record<EnhanceIconName, string> = {
  up: 'M12 19V6 M6 11l6-6 6 6',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z',
  wait: 'M7 3h10 M7 21h10 M8 3c0 5 8 5 8 9s-8 4-8 9 M16 3c0 5-8 5-8 9',
  sword: 'M4 3l3 1 12 13-2 2L4 6z M3 17l4 4 M5 19l-2 2',
  bead: 'M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M6 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M18 13a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
  cards: 'M8 4h11v15H8z M5 7v14h11',
  check: 'M4 12l5 5L20 6',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12 M18 6L6 18',
  tap: 'M9 11V5a2 2 0 0 1 4 0v6 M13 10a2 2 0 0 1 4 0v3 M9 11a2 2 0 0 0-4 0v3c0 4 3 7 7 7h1a5 5 0 0 0 5-5v-3',
  gift: 'M4 10h16v10H4z M3 7h18v3H3z M12 7v13 M12 7c-2-4-6-3-5 0 M12 7c2-4 6-3 5 0',
  retry: 'M20 11a8 8 0 1 0-2.3 5.7 M20 5v6h-6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
};
export default function EnhanceIcon({ name, className }: { name: EnhanceIconName; className?: string }) {
  return <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={PATHS[name]} /></svg>;
}
