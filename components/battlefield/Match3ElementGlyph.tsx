import type { BeastElement } from '@/lib/beast-game/elements';

/** Display-only element silhouettes; accessible names remain on the owning cell. */
export default function Match3ElementGlyph({ element, className }: { element: BeastElement; className?: string }) {
  return <svg className={className} data-orb-glyph={element} viewBox="0 0 32 32" aria-hidden="true" focusable="false"
    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {element === 'WATER' && <>
      <path d="M16 5C13 9 7.5 14 7.5 19a8.5 8.5 0 0 0 17 0C24.5 14 19 9 16 5Z" fill="currentColor" fillOpacity=".14" />
      <path d="M11.5 19.5c0 2 1.4 3.5 3.2 3.8" />
    </>}
    {element === 'FIRE' && <>
      <path d="M17 5c1 6-5 7-5 12-2-1-2.5-3-2.5-4.5C5 18 7 26 15.5 27 24 27 27 20 22 13c.2 3-1 4-2 4 1-5-1-9-3-12Z" fill="currentColor" fillOpacity=".14" />
      <path d="M16 19c-2 2-3 4-1 5.5 2.5 1.5 5-1 3-3.5" />
    </>}
    {element === 'AIR' && <>
      <path d="M6 13h13c6 0 6-8 1-8-2 0-3 1-3 2.5M5 19h17c5 0 5 7 1 7-2 0-3-1-3-2.5" />
      <path d="M8 24h5M7 8h5" opacity=".55" />
    </>}
    {element === 'EARTH' && <>
      <path d="M5 24c2-3 4-8 7-8 2 0 3 2 4 3 2-4 4-8 6-8s4 8 6 13Z" fill="currentColor" fillOpacity=".14" />
      <path d="M8 27h17" opacity=".65" />
    </>}
    {element === 'SPACE' && <>
      <circle cx="16" cy="16" r="8.5" />
      <path d="M7 9a12 12 0 0 1 19 6M25 23A12 12 0 0 1 6 17" opacity=".5" />
    </>}
  </svg>;
}
