'use client';
/** v4 音效開關：狀態存在 localStorage（beast-bead-sound-muted），按鈕上不寫死任何顏色。 */
import { useEffect, useState } from 'react';
import { getBeadSound } from '@/lib/beast-game/match3/bead-sound';
import bp from './BeadPolish.module.css';

export function SoundToggle() {
  const [muted, setMuted] = useState(false);
  useEffect(() => { const s = getBeadSound(); if (!s) return; setMuted(s.muted); return s.subscribe(setMuted); }, []);
  return (
    <button type="button" className={bp.soundBtn} data-testid="bead-sound-toggle" aria-pressed={!muted}
      aria-label={muted ? '開啟寶珠音效' : '關閉寶珠音效'} onClick={() => { const s = getBeadSound(); s?.unlock(); s?.toggle(); }}>
      {muted ? '音效 關' : '音效 開'}
    </button>
  );
}