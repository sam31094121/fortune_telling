'use client';

import { useRef, useState } from 'react';

export interface VoiceSampleSummary {
  durationSeconds: number;
  averageVolume: number;
  dynamicRange: number;
  brightness: number;
  tempoPulse: number;
  qualityScore: number;
  inferredCharacteristics: string[];
  recordedAt: string;
  mimeType: string;
  localOnly: true;
}

export interface VoiceConsentState {
  accepted: boolean;
  version: string;
  confirmedOwnVoice: boolean;
  allowSongGeneration: boolean;
  recordedAt?: string;
  sample?: VoiceSampleSummary;
}

interface VoiceConsentRecorderProps {
  value: VoiceConsentState;
  onChange: (next: VoiceConsentState) => void;
  disabled?: boolean;
  required?: boolean;
  showMissing?: boolean;
}

type RecorderStatus = 'idle' | 'recording' | 'analyzing' | 'ready' | 'error';

const CONSENT_VERSION = 'voice-song-consent-v1';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function inferVoiceCharacteristics(summary: Omit<VoiceSampleSummary, 'inferredCharacteristics' | 'recordedAt' | 'mimeType' | 'localOnly'>) {
  const inferred = new Set<string>(['voice_recorded']);
  if (summary.averageVolume >= 0.072) inferred.add('confident');
  if (summary.averageVolume >= 0.092 || summary.tempoPulse >= 0.62) inferred.add('high_energy');
  if (summary.averageVolume < 0.038) inferred.add('soft_spoken');
  if (summary.dynamicRange >= 0.12) inferred.add('emotional_tone');
  if (summary.tempoPulse >= 0.5) inferred.add('rhythmic_speech');
  if (summary.brightness >= 0.54) inferred.add('bright_voice');
  if (summary.brightness <= 0.28 && summary.averageVolume >= 0.045) inferred.add('deep_resonance');
  if (summary.qualityScore >= 72) inferred.add('clear_projection');
  if (summary.durationSeconds >= 6 && summary.dynamicRange >= 0.08) inferred.add('inner_dialogue_voice');
  return Array.from(inferred).slice(0, 8);
}

async function analyzeVoiceBlob(blob: Blob): Promise<VoiceSampleSummary> {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("\u6b64\u700f\u89bd\u5668\u4e0d\u652f\u63f4\u8072\u97f3\u5206\u6790\uff0c\u8acb\u6539\u7528\u624b\u6a5f\u9810\u8a2d\u700f\u89bd\u5668\u6216\u66f4\u65b0 LINE\u3002");

  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContextCtor();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const durationSeconds = audioBuffer.duration;
    const channel = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(channel.length / 9000));

    let sumSquares = 0;
    let peak = 0;
    let zeroCrossings = 0;
    let previous = channel[0] || 0;
    let movement = 0;
    let count = 0;

    for (let i = 0; i < channel.length; i += step) {
      const sample = channel[i] || 0;
      const abs = Math.abs(sample);
      sumSquares += sample * sample;
      peak = Math.max(peak, abs);
      if ((sample >= 0 && previous < 0) || (sample < 0 && previous >= 0)) zeroCrossings += 1;
      movement += Math.abs(sample - previous);
      previous = sample;
      count += 1;
    }

    const rms = Math.sqrt(sumSquares / Math.max(1, count));
    const averageVolume = clamp(rms, 0, 1);
    const dynamicRange = clamp(peak - averageVolume, 0, 1);
    const brightness = clamp((zeroCrossings / Math.max(1, count)) * 3.2, 0, 1);
    const tempoPulse = clamp((movement / Math.max(1, count)) * 8.5, 0, 1);
    const durationScore = clamp(durationSeconds / 8, 0, 1) * 32;
    const volumeScore = averageVolume >= 0.025 && averageVolume <= 0.18 ? 30 : 16;
    const clarityScore = clamp((dynamicRange + tempoPulse + (1 - Math.abs(brightness - 0.42))) / 3, 0, 1) * 38;
    const qualityScore = Math.round(clamp(durationScore + volumeScore + clarityScore, 0, 100));

    const baseSummary = {
      durationSeconds: Number(durationSeconds.toFixed(1)),
      averageVolume: Number(averageVolume.toFixed(3)),
      dynamicRange: Number(dynamicRange.toFixed(3)),
      brightness: Number(brightness.toFixed(3)),
      tempoPulse: Number(tempoPulse.toFixed(3)),
      qualityScore,
    };

    return {
      ...baseSummary,
      inferredCharacteristics: inferVoiceCharacteristics(baseSummary),
      recordedAt: new Date().toISOString(),
      mimeType: blob.type || 'audio/webm',
      localOnly: true,
    };
  } finally {
    void audioContext.close();
  }
}

export default function VoiceConsentRecorder({ value, onChange, disabled, required = false, showMissing = false }: VoiceConsentRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>(value.sample ? 'ready' : 'idle');
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const canRecord = typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

  function updateConsent(accepted: boolean) {
    onChange({
      ...value,
      accepted,
      confirmedOwnVoice: accepted,
      allowSongGeneration: accepted,
      version: CONSENT_VERSION,
    });
    if (!accepted) {
      setStatus('idle');
      setError('');
    }
  }

  async function startRecording() {
    if (disabled || !value.accepted) return;
    setError('');

    if (!canRecord) {
      setError("\u76ee\u524d\u700f\u89bd\u5668\u4e0d\u652f\u63f4\u9304\u97f3\uff0c\u8acb\u7528\u624b\u6a5f\u9810\u8a2d\u700f\u89bd\u5668\u958b\u555f\u5f8c\u518d\u8a66\u3002");
      setStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setStatus('analyzing');
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const sample = await analyzeVoiceBlob(blob);
          onChange({
            ...value,
            accepted: true,
            confirmedOwnVoice: true,
            allowSongGeneration: true,
            version: CONSENT_VERSION,
            recordedAt: sample.recordedAt,
            sample,
          });
          setStatus('ready');
        } catch (analysisError) {
          setError(analysisError instanceof Error ? analysisError.message : "\u8072\u97f3\u5206\u6790\u5931\u6557\uff0c\u8acb\u91cd\u65b0\u9304\u88fd\u4e00\u6b21\u3002");
          setStatus('error');
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch {
      setError("\u7121\u6cd5\u53d6\u5f97\u9ea5\u514b\u98a8\u6b0a\u9650\uff0c\u8acb\u5141\u8a31\u9304\u97f3\u5f8c\u518d\u8a66\u4e00\u6b21\u3002");
      setStatus('error');
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') recorder.stop();
  }

  function resetSample() {
    onChange({
      accepted: value.accepted,
      confirmedOwnVoice: value.accepted,
      allowSongGeneration: value.accepted,
      version: CONSENT_VERSION,
    });
    setStatus('idle');
    setError('');
  }

  const sample = value.sample;
  const statusLabel = status === 'recording'
    ? "\u9304\u97f3\u4e2d"
    : status === 'analyzing'
      ? "\u5206\u6790\u4e2d"
      : sample
        ? "\u5df2\u5b8c\u6210\u6821\u6e96"
        : value.accepted
          ? "\u53ef\u958b\u59cb\u9304\u97f3"
          : "\u5f85\u6388\u6b0a";
  const needsAttention = showMissing && (!value.accepted || !sample);


  return (
    <section className={`voice-song-consent-card rounded-[22px] border p-4 text-left shadow-[0_10px_28px_rgba(2,6,23,0.22)] ${needsAttention ? 'border-rose-300/70 bg-rose-950/20' : 'border-violet-300/20 bg-violet-950/20'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[0.22em] text-violet-200">{"\u672c\u4eba\u8072\u97f3\u6388\u6b0a"}</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
            {required ? "\u672c\u9801\u662f\u8072\u97f3\u6458\u8981\u6821\u6e96\u6b4c\u66f2\u7248\uff0c\u5fc5\u9808\u5148\u6388\u6b0a\u4e26\u5b8c\u6210\u9304\u97f3\u6821\u6e96\u5f8c\u624d\u80fd\u751f\u6210\u3002\u539f\u59cb\u97f3\u6a94\u4e0d\u6703\u4e0a\u50b3\uff0c\u53ea\u9001\u51fa\u8072\u97f3\u6458\u8981\u7d66\u5f8c\u7aef\u904b\u7b97\uff1b\u4e0d\u6703\u9032\u884c\u8072\u97f3\u8907\u88fd\u6216\u514b\u9686\u3002" : "\u9304\u4e00\u5c0f\u6bb5\u81ea\u5df1\u7684\u8072\u97f3\uff0c\u7cfb\u7d71\u53ea\u5728\u624b\u6a5f\u7aef\u6574\u7406\u7bc0\u594f\u3001\u6e05\u6670\u5ea6\u8207\u60c5\u7dd2\u6458\u8981\u3002"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold text-cyan-100">
          {statusLabel}
        </span>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-[color:var(--text-sub)]">
        <input
          type="checkbox"
          checked={value.accepted}
          disabled={disabled || status === 'recording' || status === 'analyzing'}
          onChange={(event) => updateConsent(event.target.checked)}
          className="mt-1 h-4 w-4 accent-violet-300"
        />
        <span>
          {"\u6211\u78ba\u8a8d\u9019\u662f\u672c\u4eba\u8072\u97f3\uff0c\u4e26\u540c\u610f\u7cfb\u7d71\u4f7f\u7528\u8072\u97f3\u6458\u8981\u6821\u6e96\u300c\u81ea\u6211\u5c0d\u8a71\u300d\u6b4c\u66f2\u3002"}
        </span>
      </label>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={status === 'recording' ? stopRecording : startRecording}
          disabled={disabled || !value.accepted || status === 'analyzing'}
          className="rounded-2xl border border-violet-300/30 bg-violet-300/10 px-4 py-3 text-sm font-bold text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-300/16 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {status === 'recording' ? "\u505c\u6b62\u9304\u97f3" : "\u958b\u59cb\u9304\u97f3"}
        </button>
        <button
          type="button"
          onClick={resetSample}
          disabled={disabled || status === 'recording' || status === 'analyzing' || !sample}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          {"\u91cd\u65b0\u6821\u6e96"}
        </button>
      </div>

      {needsAttention && (
        <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-100">
          {"\u8acb\u5148\u52fe\u9078\u672c\u4eba\u8072\u97f3\u6388\u6b0a\uff0c\u4e26\u5b8c\u6210\u4e00\u6bb5\u9304\u97f3\u6821\u6e96\uff0c\u624d\u80fd\u751f\u6210\u8072\u97f3\u6458\u8981\u6821\u6e96\u6b4c\u66f2\u3002"}
        </p>
      )}

      {sample && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-[10px] text-[color:var(--text-muted)]">{"\u79d2\u6578"}</p>
            <p className="mt-1 text-sm font-black text-violet-100">{sample.durationSeconds}s</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-[10px] text-[color:var(--text-muted)]">{"\u6e05\u6670\u5ea6"}</p>
            <p className="mt-1 text-sm font-black text-cyan-100">{sample.qualityScore}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-[10px] text-[color:var(--text-muted)]">{"\u5c0d\u8a71\u7bc0\u594f"}</p>
            <p className="mt-1 text-sm font-black text-amber-100">{Math.round(sample.tempoPulse * 100)}</p>
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">{error}</p>}
    </section>
  );
}