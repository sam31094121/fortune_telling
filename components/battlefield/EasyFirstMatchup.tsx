'use client';

import { useEffect, useRef, useState } from 'react';
import type { ElementCell } from '@/lib/beast-game/guide-book';

const SEEN_KEY = 'tdh_easy_matchup_hint_seen_v1';

/** Only the easy screen uses this hint; the matchup itself comes from the server. */
export default function EasyFirstMatchup({ matchup, turn, enabled, className }: {
  matchup: ElementCell | undefined;
  turn: string;
  enabled: boolean;
  className?: string;
}) {
  const shown = useRef(false);
  const [notice, setNotice] = useState<{ turn: string; text: string } | null>(null);
  useEffect(() => {
    if (!enabled || !matchup || matchup.kind === 'NEUTRAL' || shown.current) return;
    shown.current = true;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch { /* A teaching preference must never block play. */ }
    setNotice({ turn, text: matchup.headline });
  }, [enabled, matchup, turn]);
  if (!enabled || notice?.turn !== turn) return null;
  return <p className={className} role="status" data-easy-first-matchup>{notice.text}</p>;
}
