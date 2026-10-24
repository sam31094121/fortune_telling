'use client';
import { useEffect, useState } from 'react';
import { BeastCardFace } from './BeastCardTile';
import { GuideBookProvider, useGuideBook } from './GuideBookContext';
import type { GuideBook } from '@/lib/beast-game/guide-book';
let request: Promise<GuideBook | null> | null = null;
/** Catalog portraits use the same backend identity and full face as the battlefield. */
export default function CatalogBeastCard({ id, name, young = false, className }: { id?: string; name?: string; young?: boolean; className?: string }) {
 const parent = useGuideBook();
 const [loaded, setLoaded] = useState<GuideBook | null>(null);
 useEffect(() => {
  if (parent) return;
  let active = true;
  request ??= fetch('/api/beast-game/guide-book', {signal: AbortSignal.timeout(20000)}).then(r => r.ok ? r.json() : null).then(d => d?.ok ? d.book : null).catch(() => null);
  void request.then(book => { if (active) setLoaded(book); if (!book) request = null; });
  return () => { active = false; };
 }, [parent]);
 const book = parent ?? loaded;
 const card = id ? book?.cards[id] : Object.values(book?.cards ?? {}).find(c => c.name === (young ? name + '・幼子' : name));
 return <span className={className} style={{display:'block', aspectRatio:'63 / 88'}} aria-label={card?.name}>
  {card ? <GuideBookProvider value={book}><BeastCardFace card={card} /></GuideBookProvider> : <span role="status">暫時無法取得</span>}
 </span>;
}
