'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

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

const PERMISSION_FALLBACK_MIME = 'application/x-voice-permission-fallback';
const CONSENT_VERSION = 'voice-song-consent-v1';
const MAX_RECORDING_SECONDS = 8;
const WAVE_BAR_COUNT = 18;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isPermissionFallbackSample(sample?: VoiceSampleSummary) {
  return Boolean(sample?.mimeType === PERMISSION_FALLBACK_MIME || sample?.inferredCharacteristics.includes('permission_fallback'));
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

function createPermissionFallbackSample(): VoiceSampleSummary {
  return {
    durationSeconds: 4,
    averageVolume: 0.052,
    dynamicRange: 0.08,
    brightness: 0.42,
    tempoPulse: 0.48,
    qualityScore: 58,
    inferredCharacteristics: ['permission_fallback', 'manual_voice_guidance', 'inner_dialogue_voice'],
    recordedAt: new Date().toISOString(),
    mimeType: PERMISSION_FALLBACK_MIME,
    localOnly: true,
  };
}

async function analyzeVoiceBlob(blob: Blob): Promise<VoiceSampleSummary> {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("\u6b64\u700f\u89bd\u5668\u4e0d\u652f\u63f4\u8072\u97f3\u5206\u6790\uff0c\u8acb\u6539\u7528\u624b\u6a5f\u9810\u8a2d\u700f\u89bd\u5668\u6216\u66f4\u65b0 LINE\u3002");
  if (blob.size < 1200) throw new Error("\u9304\u97f3\u6642\u9593\u592a\u77ed\uff0c\u8acb\u5c0d\u8457\u9ea5\u514b\u98a8\u8aaa 3 \u5230 8 \u79d2\uff0c\u6216\u4f7f\u7528\u5b89\u5168\u6587\u5b57\u6821\u6e96\u7e7c\u7e8c\u3002");

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

export default function VoiceConsentRecorder({ value, onChange, disabled, showMissing = false }: VoiceConsentRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>(value.sample ? 'ready' : 'idle');
  const [error, setError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  const canRecord = typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
  const sample = value.sample;
  const permissionFallback = isPermissionFallbackSample(sample);
  const needsAttention = showMissing && !sample;
  const progressPercent = status === 'recording'
    ? clamp((elapsedSeconds / MAX_RECORDING_SECONDS) * 100, 8, 100)
    : sample
      ? 100
      : 0;

  const waveBars = useMemo(() => Array.from({ length: WAVE_BAR_COUNT }, (_, index) => {
    const centerDistance = Math.abs(index - (WAVE_BAR_COUNT - 1) / 2);
    return Math.max(22, Math.round(78 - centerDistance * 7));
  }), []);

  function clearRecordingTimers() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      clearRecordingTimers();
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      stopStream();
    };
  }, []);

  function updateConsent(accepted: boolean) {
    onChange({
      ...value,
      accepted,
      confirmedOwnVoice: accepted,
      allowSongGeneration: accepted,
      version: CONSENT_VERSION,
    });
    if (!accepted) {
      clearRecordingTimers();
      stopStream();
      setStatus('idle');
      setElapsedSeconds(0);
      setError('');
    }
  }

  async function startRecording() {
    if (disabled || !value.accepted) return;
    setError('');

    if (!canRecord) {
      setError("\u9019\u500b\u700f\u89bd\u5668\u76ee\u524d\u4e0d\u652f\u63f4\u9304\u97f3\u3002\u53ef\u4ee5\u6539\u7528 Safari / Chrome \u958b\u555f\uff0c\u6216\u76f4\u63a5\u4f7f\u7528\u5b89\u5168\u6587\u5b57\u6821\u6e96\u7e7c\u7e8c\u751f\u6210\u3002");
      setStatus('error');
      return;
    }

    try {
      clearRecordingTimers();
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        clearRecordingTimers();
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
          setElapsedSeconds(Math.ceil(sample.durationSeconds));
          setStatus('ready');
        } catch (analysisError) {
          setError(analysisError instanceof Error ? analysisError.message : "\u8072\u97f3\u5206\u6790\u5931\u6557\uff0c\u8acb\u91cd\u65b0\u9304\u88fd\u4e00\u6b21\u3002");
          setStatus('error');
        } finally {
          stopStream();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      recordingStartedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setStatus('recording');
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds(clamp(Math.ceil((Date.now() - recordingStartedAtRef.current) / 1000), 0, MAX_RECORDING_SECONDS));
      }, 250);
      autoStopRef.current = window.setTimeout(() => {
        const activeRecorder = mediaRecorderRef.current;
        if (activeRecorder?.state === 'recording') activeRecorder.stop();
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (recordError) {
      clearRecordingTimers();
      stopStream();
      const errorName = recordError instanceof DOMException ? recordError.name : '';
      const permissionDenied = errorName === 'NotAllowedError' || errorName === 'SecurityError' || errorName === 'PermissionDeniedError';
      setError(permissionDenied
        ? "\u9ea5\u514b\u98a8\u6b0a\u9650\u88ab\u700f\u89bd\u5668\u64cb\u4e0b\u4e86\u3002\u8acb\u9ede\u7db2\u5740\u5217\u7684\u9396\u982d\u6216\u8a2d\u5b9a\uff0c\u628a\u9ea5\u514b\u98a8\u6539\u6210\u5141\u8a31\uff1b\u5982\u679c\u662f LINE \u5167\u5efa\u700f\u89bd\u5668\u6c92\u6709\u5f48\u51fa\u6b0a\u9650\uff0c\u53ef\u6309\u4e0b\u65b9\u5b89\u5168\u6587\u5b57\u6821\u6e96\u7e7c\u7e8c\u3002"
        : "\u9304\u97f3\u555f\u52d5\u6c92\u6709\u6210\u529f\u3002\u8acb\u91cd\u65b0\u9ede\u4e00\u6b21\uff0c\u6216\u4f7f\u7528\u5b89\u5168\u6587\u5b57\u6821\u6e96\u7e7c\u7e8c\u751f\u6210\u3002");
      setStatus('error');
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') recorder.stop();
  }

  function resetSample() {
    clearRecordingTimers();
    stopStream();
    onChange({
      accepted: value.accepted,
      confirmedOwnVoice: value.accepted,
      allowSongGeneration: value.accepted,
      version: CONSENT_VERSION,
    });
    setStatus('idle');
    setElapsedSeconds(0);
    setError('');
  }

  function usePermissionFallback() {
    if (disabled || status === 'recording' || status === 'analyzing') return;
    clearRecordingTimers();
    stopStream();
    const sample = createPermissionFallbackSample();
    onChange({
      ...value,
      accepted: true,
      confirmedOwnVoice: true,
      allowSongGeneration: true,
      version: CONSENT_VERSION,
      recordedAt: sample.recordedAt,
      sample,
    });
    setElapsedSeconds(0);
    setStatus('ready');
    setError('');
  }

  const statusLabel = status === 'recording'
    ? "\u9304\u97f3\u4e2d"
    : status === 'analyzing'
      ? "\u5206\u6790\u4e2d"
      : sample
        ? permissionFallback ? "\u5df2\u5b8c\u6210\u5b89\u5168\u6821\u6e96" : "\u5df2\u5b8c\u6210\u9304\u97f3\u6821\u6e96"
        : value.accepted
          ? "\u53ef\u958b\u59cb\u9304\u97f3"
          : "\u5f85\u6388\u6b0a";
  const recordButtonLabel = status === 'recording'
    ? "\u505c\u6b62\u9304\u97f3"
    : status === 'analyzing'
      ? "\u6b63\u5728\u5206\u6790"
      : value.accepted
        ? "\u958b\u59cb\u9304\u97f3"
        : "\u5148\u52fe\u9078\u6388\u6b0a";
  const consoleTone = status === 'recording'
    ? 'voice-recorder-console--recording'
    : permissionFallback
      ? 'voice-recorder-console--fallback'
      : sample
        ? 'voice-recorder-console--ready'
        : '';
  const cardTone = permissionFallback
    ? 'border-amber-300/45 bg-amber-950/16'
    : error
      ? 'border-amber-300/45 bg-amber-950/14'
      : needsAttention
        ? 'border-rose-300/70 bg-rose-950/20'
        : 'border-violet-300/20 bg-violet-950/20';

  return (
    <section className={`voice-song-consent-card rounded-[22px] border p-4 text-left shadow-[0_10px_28px_rgba(2,6,23,0.22)] ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[0.18em] text-violet-200">{"\u8072\u97f3\u6821\u6e96\u7cfb\u7d71"}</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
            {"\u540c\u610f\u6388\u6b0a\u5f8c\u9304 3 \u5230 8 \u79d2\u672c\u4eba\u8072\u97f3\uff0c\u7cfb\u7d71\u53ea\u64f7\u53d6\u7bc0\u594f\u3001\u6e05\u6670\u5ea6\u8207\u60c5\u7dd2\u6458\u8981\u9023\u7d50\u4eba\u683c\u97f3\u6a02\u751f\u6210\uff1b\u4e0d\u540c\u610f\u6216 LINE \u64cb\u4f4f\u6b0a\u9650\uff0c\u4e5f\u53ef\u4ee5\u7528\u5b89\u5168\u6587\u5b57\u6821\u6e96\u7e7c\u7e8c\u751f\u6210\u3002"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold text-cyan-100">
          {statusLabel}
        </span>
      </div>

      <div className={`voice-recorder-console mt-4 ${consoleTone}`} aria-live="polite">
        <div className="voice-recorder-orb" aria-hidden="true"><span>{permissionFallback ? '\u270e' : '\ud83c\udfa4'}</span></div>
        <div className="voice-recorder-console__body">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="voice-recorder-console__title">
                {status === 'recording'
                  ? "\u8acb\u8aaa\u4e00\u5c0f\u6bb5\u60f3\u5c0d\u81ea\u5df1\u8aaa\u7684\u8a71"
                  : permissionFallback
                    ? "\u5df2\u6539\u7528\u5b89\u5168\u6587\u5b57\u6821\u6e96"
                    : sample
                      ? "\u8072\u97f3\u6458\u8981\u5df2\u9023\u7d50\u751f\u6210\u7cfb\u7d71"
                      : "\u5c08\u696d\u77ed\u9304\u97f3\u6821\u6e96"}
              </p>
              <p className="voice-recorder-console__hint">
                {status === 'recording'
                  ? "\u9304\u5230 8 \u79d2\u6703\u81ea\u52d5\u505c\u6b62\uff0c\u4e0d\u9700\u8981\u8b1b\u5f88\u9577\u3002"
                  : permissionFallback
                    ? "\u672c\u6b21\u4e0d\u4f7f\u7528\u9ea5\u514b\u98a8\uff0c\u4f9d\u8cc7\u6599\u8207\u4eba\u683c\u6587\u5b57\u751f\u6210\u6b4c\u66f2\u3002"
                    : sample
                      ? "\u5f8c\u7aef\u6703\u4f9d\u6458\u8981\u8abf\u6574\u81ea\u6211\u5c0d\u8a71\u6b4c\u66f2\uff0c\u4e0d\u6703\u4e0a\u50b3\u539f\u59cb\u97f3\u6a94\u3002"
                      : "\u5efa\u8b70\u8aaa\uff1a\u6211\u73fe\u5728\u60f3\u628a\u5167\u5fc3\u7684\u8072\u97f3\u8b8a\u6210\u4e00\u9996\u6b4c\u3002"}
              </p>
            </div>
            <span className="voice-recorder-time">{status === 'recording' ? `${elapsedSeconds}s` : sample && !permissionFallback ? `${sample.durationSeconds}s` : `${MAX_RECORDING_SECONDS}s`}</span>
          </div>
          <div className="voice-recorder-wave" aria-hidden="true">
            {waveBars.map((height, index) => (
              <span key={index} className="voice-recorder-bar" style={{ '--bar-height': `${height}%`, '--bar-delay': `${index * 44}ms` } as CSSProperties} />
            ))}
          </div>
          <div className="voice-recorder-progress" aria-hidden="true"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
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

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={status === 'recording' ? stopRecording : startRecording}
          disabled={disabled || !value.accepted || status === 'analyzing'}
          className="rounded-2xl border border-violet-300/30 bg-violet-300/10 px-4 py-3 text-sm font-bold text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-300/16 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {recordButtonLabel}
        </button>
        <button
          type="button"
          onClick={usePermissionFallback}
          disabled={disabled || status === 'recording' || status === 'analyzing'}
          className="rounded-2xl border border-amber-200/35 bg-amber-300/12 px-4 py-3 text-sm font-black text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {"\u4e0d\u7528\u9ea5\u514b\u98a8\uff0c\u7e7c\u7e8c\u751f\u6210"}
        </button>
      </div>

      {sample && (
        <button
          type="button"
          onClick={resetSample}
          disabled={disabled || status === 'recording' || status === 'analyzing'}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          {"\u91cd\u65b0\u9078\u64c7\u6821\u6e96\u65b9\u5f0f"}
        </button>
      )}

      {error && (
        <div className="mt-3 space-y-2 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-3">
          <p className="text-xs font-semibold leading-5 text-rose-100">{error}</p>
          <button
            type="button"
            onClick={usePermissionFallback}
            disabled={disabled || status === 'recording' || status === 'analyzing'}
            className="w-full rounded-xl border border-amber-200/35 bg-amber-300/12 px-3 py-2.5 text-xs font-black text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {"\u76f4\u63a5\u5b89\u5168\u6821\u6e96\uff0c\u7e7c\u7e8c\u751f\u6210"}
          </button>
          <p className="text-[11px] font-medium leading-5 text-[color:var(--text-muted)]">
            {"\u63d0\u9192\uff1a\u9019\u500b\u5099\u63f4\u53ea\u6703\u7528\u8868\u55ae\u8207\u4eba\u683c\u8cc7\u6599\u505a\u81ea\u6211\u5c0d\u8a71\u6b4c\u66f2\uff0c\u4e0d\u6703\u8072\u7a31\u5df2\u9304\u5230\u672c\u4eba\u8072\u97f3\u3002"}
          </p>
        </div>
      )}

      {needsAttention && (
        <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/12 px-3 py-2 text-xs font-bold text-rose-100">
          {"\u8acb\u9078\u64c7\u4e00\u7a2e\u6821\u6e96\u65b9\u5f0f\uff1a\u53ef\u52fe\u9078\u6388\u6b0a\u5f8c\u9304\u97f3\uff0c\u4e5f\u53ef\u76f4\u63a5\u6309\u300c\u4e0d\u7528\u9ea5\u514b\u98a8\uff0c\u7e7c\u7e8c\u751f\u6210\u300d\u3002"}
        </p>
      )}

      {sample && !permissionFallback && (
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

      {permissionFallback && (
        <p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold leading-5 text-amber-100">
          {"\u5df2\u6539\u7528\u5b89\u5168\u6587\u5b57\u6821\u6e96\u3002\u5f8c\u7aef\u6703\u7e7c\u7e8c\u751f\u6210\u4eba\u683c\u5206\u88c2\u8207\u81ea\u6211\u5c0d\u8a71\u6b4c\u66f2\uff0c\u4f46\u4e0d\u6703\u628a\u672c\u6b21\u8996\u70ba\u771f\u5be6\u9304\u97f3\u3002"}
        </p>
      )}
    </section>
  );
}

