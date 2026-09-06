/** A result announcer, separate from each beast's own voice. Never writes a reward. */
export type VoiceState = 'ready' | 'speaking' | 'done' | 'unavailable';
const announced = new Set<string>();

export function createResultVoice(
  synth: SpeechSynthesis, makeUtterance: (text: string) => SpeechSynthesisUtterance,
) {
  let current: SpeechSynthesisUtterance | null = null;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(watchdog);
    if (current) {
      current.onstart = current.onend = current.onerror = null;
      current = null;
      synth.cancel();
    }
  };
  const speak = (id: string, text: string, report: (state: VoiceState) => void, automatic = false) => {
    if (automatic && announced.has(id)) return;
    stop();
    const voices = synth.getVoices();
    const voice = voices.find(v => /^zh[-_]TW$/i.test(v.lang)) ?? voices.find(v => /^zh([-_]|$)/i.test(v.lang));
    if (!voice) { report('unavailable'); return; }
    const utterance = makeUtterance(text);
    current = utterance;
    utterance.lang = voice.lang;
    utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.onstart = () => {
      announced.add(id);
      if (announced.size > 100) announced.delete(announced.values().next().value!);
      report('speaking');
    };
    const finish = (state: VoiceState) => {
      if (current !== utterance) return;
      clearTimeout(watchdog); current = null; report(state);
    };
    utterance.onend = () => finish('done');
    utterance.onerror = () => finish('unavailable');
    watchdog = setTimeout(() => { stop(); report('unavailable'); }, 45000);
    try { synth.speak(utterance); } catch { stop(); report('unavailable'); }
  };
  return { speak, stop };
}
