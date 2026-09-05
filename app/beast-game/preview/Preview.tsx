'use client';
import { useEffect, useState } from 'react';
import BeastDuelRitual from '@/components/BeastDuelRitual';
import type { PairResult } from '@/lib/beast-game/series';
type Card = { id: string; name: string; element: string; thumbnail: string };
export default function Preview({ player, opponent, pairs }: { player: Card[]; opponent: Card[]; pairs: PairResult[] }) {
  const [open, setOpen] = useState(true);
  const [audioLog, setAudioLog] = useState<Array<{ src: string; status: string }>>([]);
  useEffect(() => {
    const record = (event: Event) => setAudioLog((log) => [...log.slice(-29), (event as CustomEvent).detail]);
    window.addEventListener('beast-voice-status', record);
    return () => window.removeEventListener('beast-voice-status', record);
  }, []);
  return <main className="min-h-screen bg-slate-950 p-6 text-amber-100">
    {open ? <BeastDuelRitual player={player} opponent={opponent} pairs={pairs} onComplete={() => setOpen(false)} onCancel={() => setOpen(false)} /> : <>
      <h1 className="text-xl font-bold">演示完成・比分 {pairs[2].score.player} : {pairs[2].score.opponent}</h1>
      <p>演示不扣收藏卡</p>
      <button className="mt-6 rounded-xl bg-amber-200 px-6 py-3 text-black" onClick={() => { setAudioLog([]); setOpen(true); }}>再看一次</button>
    </>}
    <details className="mt-4 text-sm text-slate-300">
      <summary>預覽聲音檢查</summary>
      <output aria-label="音訊播放檢查" data-audio-log={JSON.stringify(audioLog)}>
        成功播放 {audioLog.filter((entry) => entry.status === 'playing').length} 次；
        播放受阻 {audioLog.filter((entry) => entry.status === 'blocked').length} 次。
      </output>
      <p><a href="/audio/beast-voices/credits.html" target="_blank" rel="noreferrer">聲音素材來源</a></p>
    </details>
  </main>;
}
