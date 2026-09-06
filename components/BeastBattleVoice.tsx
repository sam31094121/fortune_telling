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
    let attempted = false;
    const auto = () => {
      if (attempted || manual.current || document.hidden) return;
      // Voices may arrive after mount. Do not auto-start repeatedly after a playback error.
      if (!window.speechSynthesis.getVoices().some(v => /^zh([-_]|$)/i.test(v.lang))) { setStatus('unavailable'); return; }
      attempted = true;
      voice.speak(id, text, setStatus, true);
    };
    const timer = setTimeout(auto, 250);
    const hide = () => { if (document.hidden) { attempted = true; voice.stop(); setStatus('ready'); } };
    window.speechSynthesis.addEventListener('voiceschanged', auto);
    document.addEventListener('visibilitychange', hide);
    return () => {
      clearTimeout(timer); voice.stop(); player.current = null;
      window.speechSynthesis.removeEventListener('voiceschanged', auto);
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
      {status === 'unavailable' ? '語音暫時無法播放；結算已顯示，可點按重試。' : status === 'speaking' ? '正在播報本場卡片張數…' : '中文語音・可重聽，不會重複發獎或扣卡。'}
    </p>
  </div>;
}
