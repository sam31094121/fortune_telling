'use client';

import { useEffect, useRef, useState } from 'react';
import { createResultVoice, type VoiceState } from '@/lib/beast-result-voice';

export default function BeastBattleVoice({ id, text, reward = false }: { id: string; text: string; reward?: boolean }) {
  const player = useRef<ReturnType<typeof createResultVoice> | null>(null);
  const manual = useRef(false);
  const [status, setStatus] = useState<VoiceState>('ready');
  useEffect(() => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { setStatus('unavailable'); return; }
    const voice = createResultVoice(window.speechSynthesis, value => new SpeechSynthesisUtterance(value));
    player.current = voice;
    manual.current = false;
    setStatus('ready');
    // 解說完全由客戶決定是否播放；不自動開口，也不要求聽完。
    const hide = () => { if (document.hidden) { voice.stop(); setStatus('ready'); } };
    document.addEventListener('visibilitychange', hide);
    return () => {
      voice.stop(); player.current = null;
      document.removeEventListener('visibilitychange', hide);
    };
  }, [id, text]);
  return <div className="mt-3" data-result-voice={status}>
    <button type="button" className="min-h-11 w-full rounded-xl border border-amber-200/40 px-3 py-2 text-sm font-bold text-amber-100"
      onClick={() => {
        manual.current = true;
        if (status === 'speaking') { player.current?.stop(); setStatus('ready'); }
        else if (player.current) player.current.speak(id, text, setStatus);
        else setStatus('unavailable');
      }}>{status === 'speaking' ? '停止播報' : reward ? '播報獎賞' : '播報結算'}</button>
    <p className="mt-1 text-xs leading-5 text-white/60" role="status">
      {status === 'unavailable' ? '語音暫時無法播放；結算文字仍可直接查看。' : status === 'speaking' ? '正在解說；可隨時按停止。' : '解說自由選擇，不播放也不影響結算。'}
    </p>
  </div>;
}
