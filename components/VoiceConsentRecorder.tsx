'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export type AiVoiceGender = 'male' | 'female';

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
  onReadyToGenerate?: (next: VoiceConsentState, aiVoiceGender?: AiVoiceGender) => void;
  aiVoiceGender?: AiVoiceGender | null;
  onAiVoiceGenderChange?: (gender: AiVoiceGender) => void;
  disabled?: boolean;
  required?: boolean;
  showMissing?: boolean;
}

type RecorderStatus = 'idle' | 'recording' | 'analyzing' | 'ready' | 'error';
type RecorderIssue = 'permission' | 'social-browser' | 'unsupported' | 'quality' | 'generic';

const AI_VOICE_MIME = 'application/x-ai-voice-direct';
const CONSENT_VERSION = 'voice-song-consent-v1';
const MAX_RECORDING_SECONDS = 20;
const MIN_GUIDED_RECORDING_SECONDS = 8;
const WAVE_BAR_COUNT = 18;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isAiVoiceSample(sample?: VoiceSampleSummary) {
  return Boolean(sample?.mimeType === AI_VOICE_MIME || sample?.inferredCharacteristics.includes('ai_voice_direct'));
}

function detectSocialBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Line\/|FBAN|FBAV|Instagram|Messenger/i.test(navigator.userAgent);
}

function isVoiceQualityEnough(summary: { durationSeconds: number; averageVolume: number; dynamicRange: number; qualityScore: number }) {
  return summary.durationSeconds >= MIN_GUIDED_RECORDING_SECONDS &&
    summary.averageVolume >= 0.012 &&
    summary.dynamicRange >= 0.018 &&
    summary.qualityScore >= 38;
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
  if (summary.durationSeconds >= 10 && summary.dynamicRange >= 0.08) inferred.add('inner_dialogue_voice');
  return Array.from(inferred).slice(0, 8);
}

function createAiVoiceSample(gender: AiVoiceGender): VoiceSampleSummary {
  return {
    durationSeconds: 0,
    averageVolume: gender === 'male' ? 0.056 : 0.052,
    dynamicRange: 0.08,
    brightness: gender === 'male' ? 0.34 : 0.48,
    tempoPulse: 0.5,
    qualityScore: 66,
    inferredCharacteristics: [
      'ai_voice_direct',
      gender === 'male' ? 'ai_voice_male' : 'ai_voice_female',
      'manual_voice_guidance',
      'inner_dialogue_voice',
    ],
    recordedAt: new Date().toISOString(),
    mimeType: AI_VOICE_MIME,
    localOnly: true,
  };
}

async function analyzeVoiceBlob(blob: Blob): Promise<VoiceSampleSummary> {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error('\u76ee\u524d\u66ab\u6642\u7121\u6cd5\u5206\u6790\u9304\u97f3\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002');
  if (blob.size < 1200) throw new Error('\u9304\u97f3\u6642\u9593\u592a\u77ed\uff0c\u8acb\u91cd\u65b0\u9304\u88fd 10 \u5230 20 \u79d2\uff0c\u6216\u76f4\u63a5\u4f7f\u7528 AI \u8072\u97f3\u751f\u6210\u3002');

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
    const durationScore = clamp(durationSeconds / 20, 0, 1) * 32;
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

    if (!isVoiceQualityEnough(baseSummary)) {
      throw new Error('VOICE_QUALITY_INSUFFICIENT');
    }

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

export default function VoiceConsentRecorder({
  value,
  onChange,
  onReadyToGenerate,
  aiVoiceGender,
  onAiVoiceGenderChange,
  disabled,
  showMissing = false,
}: VoiceConsentRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>(value.sample ? 'ready' : 'idle');
  const [issue, setIssue] = useState<RecorderIssue | null>(null);
  const [showRecordingGuide, setShowRecordingGuide] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedAiGender, setSelectedAiGender] = useState<AiVoiceGender>(aiVoiceGender ?? 'female');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  const canRecord = typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
  const sample = value.sample;
  const aiVoiceSample = isAiVoiceSample(sample);
  const needsAttention = showMissing && !sample;
  const isSocialBrowser = detectSocialBrowser();
  const progressPercent = status === 'recording'
    ? clamp((elapsedSeconds / MAX_RECORDING_SECONDS) * 100, 8, 100)
    : sample
      ? 100
      : 0;

  const waveBars = useMemo(() => Array.from({ length: WAVE_BAR_COUNT }, (_, index) => {
    const centerDistance = Math.abs(index - (WAVE_BAR_COUNT - 1) / 2);
    return Math.max(22, Math.round(78 - centerDistance * 7));
  }), []);

  useEffect(() => {
    if (aiVoiceGender) setSelectedAiGender(aiVoiceGender);
  }, [aiVoiceGender]);

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

  function buildRecordedConsent(sample: VoiceSampleSummary): VoiceConsentState {
    return {
      accepted: true,
      confirmedOwnVoice: true,
      allowSongGeneration: true,
      version: CONSENT_VERSION,
      recordedAt: sample.recordedAt,
      sample,
    };
  }

  function buildAiVoiceConsent(gender: AiVoiceGender): VoiceConsentState {
    const sample = createAiVoiceSample(gender);
    return {
      accepted: true,
      confirmedOwnVoice: false,
      allowSongGeneration: true,
      version: CONSENT_VERSION,
      recordedAt: sample.recordedAt,
      sample,
    };
  }

  function chooseAiGender(gender: AiVoiceGender) {
    setSelectedAiGender(gender);
    onAiVoiceGenderChange?.(gender);
  }

  function useAiVoice(gender = selectedAiGender) {
    if (disabled || status === 'recording' || status === 'analyzing') return;
    clearRecordingTimers();
    stopStream();
    chooseAiGender(gender);
    const next = buildAiVoiceConsent(gender);
    onChange(next);
    setStatus('ready');
    setIssue(null);
    setShowRecordingGuide(false);
    onReadyToGenerate?.(next, gender);
  }

  function requestRecordingGuide() {
    if (disabled || status === 'recording' || status === 'analyzing') return;
    setIssue(null);
    setShowRecordingGuide(true);
  }

  async function beginRecording() {
    if (disabled) return;
    setIssue(null);
    setShowRecordingGuide(false);

    if (!canRecord) {
      setIssue(isSocialBrowser ? 'social-browser' : 'unsupported');
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
          const next = buildRecordedConsent(sample);
          onChange(next);
          setElapsedSeconds(Math.ceil(sample.durationSeconds));
          setStatus('ready');
          setIssue(null);
          window.setTimeout(() => onReadyToGenerate?.(next), 450);
        } catch (analysisError) {
          setIssue(analysisError instanceof Error && analysisError.message === 'VOICE_QUALITY_INSUFFICIENT' ? 'quality' : 'generic');
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
      setIssue(isSocialBrowser ? 'social-browser' : permissionDenied ? 'permission' : 'generic');
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
      accepted: false,
      confirmedOwnVoice: false,
      allowSongGeneration: false,
      version: CONSENT_VERSION,
    });
    setStatus('idle');
    setElapsedSeconds(0);
    setIssue(null);
    setShowRecordingGuide(false);
  }

  const consoleTone = status === 'recording'
    ? 'voice-recorder-console--recording'
    : sample
      ? 'voice-recorder-console--ready'
      : status === 'error'
        ? 'voice-recorder-console--fallback'
        : '';
  const cardTone = issue || needsAttention
    ? 'border-amber-300/45 bg-amber-950/14'
    : 'border-violet-300/20 bg-violet-950/20';
  const consoleTitle = status === 'recording'
    ? '\u6b63\u5728\u9304\u97f3'
    : status === 'analyzing'
      ? '\u9304\u97f3\u5b8c\u6210\uff01'
      : sample
        ? aiVoiceSample ? `\u5df2\u9078 AI ${selectedAiGender === 'male' ? '\u7537\u8072' : '\u5973\u8072'}` : '\u9304\u97f3\u5b8c\u6210\uff01'
        : '\u9078\u64c7\u4f60\u7684\u751f\u6210\u65b9\u5f0f';
  const consoleHint = status === 'recording'
    ? '\u9304\u88fd 10 \u5230 20 \u79d2\u5373\u53ef\uff0c\u7cfb\u7d71\u6703\u81ea\u52d5\u505c\u6b62\u3002'
    : status === 'analyzing'
      ? 'AI \u6b63\u5728\u5206\u6790\u60a8\u7684\u8072\u97f3\uff0c\u5373\u5c07\u958b\u59cb\u5275\u4f5c\u5c08\u5c6c\u6b4c\u66f2\u3002'
      : sample
        ? aiVoiceSample ? '\u4e0d\u7528\u9ea5\u514b\u98a8\uff0cAI \u6703\u76f4\u63a5\u7528\u9078\u5b9a\u8072\u7dda\u751f\u6210\u6b4c\u66f2\u3002' : 'AI \u6b63\u5728\u5206\u6790\u60a8\u7684\u8072\u97f3\uff0c\u5373\u5c07\u958b\u59cb\u5275\u4f5c\u5c08\u5c6c\u6b4c\u66f2\u3002'
        : '\u4f7f\u7528\u81ea\u5df1\u7684\u8072\u97f3\uff0c\u6216\u76f4\u63a5\u7528 AI \u8072\u97f3\u751f\u6210\u3002';

  return (
    <section className={`voice-song-consent-card rounded-[22px] border p-4 text-left shadow-[0_10px_28px_rgba(2,6,23,0.22)] ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[0.18em] text-violet-200">{"AI \u97f3\u6a02\u751f\u6210"}</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{"10 \u79d2\u5167\u9078\u597d\u65b9\u5f0f\uff0c\u5c31\u80fd\u958b\u59cb\u751f\u6210\u60a8\u7684\u5c08\u5c6c\u6b4c\u66f2\u3002"}</p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold text-cyan-100">
          {status === 'recording' ? '\u9304\u97f3\u4e2d' : status === 'analyzing' ? '\u8655\u7406\u4e2d' : sample ? '\u53ef\u751f\u6210' : '\u4e8c\u9078\u4e00'}
        </span>
      </div>

      <div className={`voice-recorder-console mt-4 ${consoleTone}`} aria-live="polite">
        <div className="voice-recorder-orb" aria-hidden="true"><span>{aiVoiceSample ? '\u2728' : '\u{1F3A4}'}</span></div>
        <div className="voice-recorder-console__body">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="voice-recorder-console__title">{consoleTitle}</p>
              <p className="voice-recorder-console__hint">{consoleHint}</p>
            </div>
            <span className="voice-recorder-time">{status === 'recording' ? `${elapsedSeconds}s` : sample && !aiVoiceSample ? `${sample.durationSeconds}s` : `${MAX_RECORDING_SECONDS}s`}</span>
          </div>
          <div className="voice-recorder-wave" aria-hidden="true">
            {waveBars.map((height, index) => (
              <span key={index} className="voice-recorder-bar" style={{ '--bar-height': `${height}%`, '--bar-delay': `${index * 44}ms` } as CSSProperties} />
            ))}
          </div>
          <div className="voice-recorder-progress" aria-hidden="true"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-300/25 bg-violet-300/10 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-violet-100">{"\u{1F3A4} \u4f7f\u7528\u6211\u7684\u8072\u97f3"}</p>
              <p className="mt-1 text-[11px] font-bold text-amber-100">{"\u63a8\u85a6"}</p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-[color:var(--text-sub)]">{"\u9304\u88fd 10 \u5230 20 \u79d2\u5373\u53ef\uff0cAI \u5c07\u4f9d\u60a8\u7684\u8072\u97f3\u6458\u8981\u751f\u6210\u5c08\u5c6c\u6b4c\u66f2\u3002"}</p>
          <button
            type="button"
            onClick={status === 'recording' ? stopRecording : requestRecordingGuide}
            disabled={disabled || status === 'analyzing'}
            className="mt-3 w-full rounded-2xl border border-violet-300/35 bg-violet-300/12 px-4 py-3 text-sm font-black text-violet-100 transition hover:border-violet-200/70 hover:bg-violet-300/18 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {status === 'recording' ? '\u5b8c\u6210\u9304\u97f3' : status === 'analyzing' ? '\u6b63\u5728\u8655\u7406' : '\u958b\u59cb\u9304\u97f3'}
          </button>
        </div>

        <div className="rounded-2xl border border-amber-200/35 bg-amber-300/12 p-3">
          <p className="text-sm font-black text-amber-100">{"\u2728 \u4e0d\u9304\u97f3\uff0c\u76f4\u63a5\u751f\u6210"}</p>
          <p className="mt-2 text-xs leading-5 text-[color:var(--text-sub)]">{"\u4e0d\u7528\u9ea5\u514b\u98a8\uff0c\u9078\u64c7 AI \u7537\u8072\u6216\u5973\u8072\u5f8c\u7acb\u5373\u751f\u6210\u6b4c\u66f2\u3002"}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['male', 'female'] as const).map((gender) => {
              const selected = selectedAiGender === gender;
              return (
                <button
                  key={gender}
                  type="button"
                  onClick={() => chooseAiGender(gender)}
                  disabled={disabled || status === 'recording' || status === 'analyzing'}
                  className={`rounded-xl border px-3 py-2 text-xs font-black transition ${selected ? 'border-cyan-200/70 bg-cyan-300/15 text-cyan-50' : 'border-white/10 bg-white/[0.04] text-[color:var(--text-sub)] hover:border-white/25'}`}
                >
                  {gender === 'male' ? '\u{1F468} \u7537\u8072' : '\u{1F469} \u5973\u8072'}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => useAiVoice(selectedAiGender)}
            disabled={disabled || status === 'recording' || status === 'analyzing'}
            className="mt-3 w-full rounded-2xl border border-amber-200/45 bg-amber-300/16 px-4 py-3 text-sm font-black text-amber-100 transition hover:border-amber-200/80 hover:bg-amber-300/22 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {"\u7acb\u5373\u751f\u6210"}
          </button>
        </div>
      </div>

      {showRecordingGuide && status !== 'recording' && status !== 'analyzing' && (
        <div className="mt-3 rounded-2xl border border-violet-300/30 bg-violet-300/10 p-3">
          <p className="text-sm font-black text-violet-100">{"\u{1F3A4} \u9304\u97f3\u5c0f\u63d0\u9192"}</p>
          <p className="mt-2 text-xs leading-5 text-[color:var(--text-sub)]">
            {"\u70ba\u4e86\u8b93 AI \u66f4\u6e96\u78ba\u5b78\u7fd2\u60a8\u7684\u8072\u97f3\uff0c\u8acb\u4f7f\u7528\u81ea\u7136\u7684\u8a9e\u6c23\uff0c\u4f9d\u7167\u4e0b\u9762\u5167\u5bb9\u6717\u8b80\u5373\u53ef\u3002\u6574\u500b\u9304\u97f3\u7d04 15 \u5230 20 \u79d2\u3002"}
          </p>
          <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-[color:var(--text-sub)]">
            <p><span className="font-black text-violet-100">{"\u7b2c\u4e00\u6bb5\uff1a"}</span>{"\u8acb\u5ff5\uff1a\u4e00\u3001\u4e8c\u3001\u4e09\u3001\u56db\u3001\u4e94\u3001\u516d\u3001\u4e03\u3001\u516b\u3001\u4e5d\u3001\u5341\u3002"}</p>
            <p><span className="font-black text-violet-100">{"\u7b2c\u4e8c\u6bb5\uff1a"}</span>{"\u60a8\u597d\uff0c\u6211\u662f\uff08\u81ea\u5df1\u7684\u59d3\u540d\uff09\u3002\u5f88\u9ad8\u8208\u8a8d\u8b58\u60a8\u3002"}</p>
            <p><span className="font-black text-violet-100">{"\u7b2c\u4e09\u6bb5\uff1a"}</span>{"\u8acb\u81ea\u7136\u8aaa\u4e00\u53e5\u5b8c\u6574\u53e5\u5b50\uff0c\u4f8b\u5982\uff1a\u4eca\u5929\u662f\u4e00\u500b\u5f88\u7f8e\u597d\u7684\u4e00\u5929\uff0c\u5e0c\u671b\u672a\u4f86\u4e00\u5207\u9806\u5229\u3002"}</p>
          </div>
          <p className="mt-3 text-[11px] font-semibold leading-5 text-amber-100">
            {"\u8acb\u5728\u5b89\u975c\u74b0\u5883\u3001\u624b\u6a5f\u9760\u8fd1\u5634\u5df4\uff0c\u6b63\u5e38\u8aaa\u8a71\u5373\u53ef\u3002\u4e0d\u8981\u53ea\u8aaa\u540d\u5b57\u3001\u4e0d\u8981\u5531\u6b4c\u3001\u4e0d\u8981\u6545\u610f\u6539\u8b8a\u8072\u97f3\u3002"}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={beginRecording}
              disabled={disabled}
              className="rounded-xl border border-violet-300/40 bg-violet-300/14 px-3 py-2.5 text-xs font-black text-violet-100 transition hover:border-violet-200/70 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {"\u958b\u59cb\u6b63\u5f0f\u9304\u97f3"}
            </button>
            <button
              type="button"
              onClick={() => setShowRecordingGuide(false)}
              disabled={disabled}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-bold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {"\u5148\u4e0d\u9304"}
            </button>
          </div>
        </div>
      )}

      {issue && (
        <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3">
          <p className="text-sm font-black text-amber-100">{issue === 'quality' ? '\u{1F3A4} \u9304\u97f3\u54c1\u8cea\u4e0d\u8db3' : '\u{1F3A4} \u7121\u6cd5\u4f7f\u7528\u9ea5\u514b\u98a8'}</p>
          <p className="mt-2 text-xs leading-5 text-[color:var(--text-sub)]">
            {issue === 'quality'
              ? '\u70ba\u4e86\u8b93\u6b4c\u66f2\u66f4\u63a5\u8fd1\u60a8\u7684\u8072\u97f3\uff0c\u5efa\u8b70\u91cd\u65b0\u9304\u88fd\u4e00\u6b21\u3002'
              : issue === 'social-browser'
              ? '\u76ee\u524d\u6b64\u700f\u89bd\u5668\u53ef\u80fd\u9650\u5236\u9304\u97f3\u3002\u5efa\u8b70\u9ede\u64ca\u53f3\u4e0a\u89d2\u300c\u4f7f\u7528 Chrome \u958b\u555f\u300d\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u4f7f\u7528 AI \u8072\u97f3\u751f\u6210\u3002'
              : issue === 'unsupported'
                ? '\u76ee\u524d\u9019\u500b\u700f\u89bd\u5668\u4e0d\u652f\u63f4\u9304\u97f3\u3002\u60a8\u53ef\u4ee5\u6539\u7528 Chrome\uff0c\u6216\u76f4\u63a5\u4f7f\u7528 AI \u8072\u97f3\u751f\u6210\u3002'
                : issue === 'permission'
                  ? '\u76ee\u524d\u5c1a\u672a\u53d6\u5f97\u9304\u97f3\u6b0a\u9650\u3002\u8acb\u9ede\u64ca\u5141\u8a31\u9ea5\u514b\u98a8\uff0c\u5373\u53ef\u4f7f\u7528\u81ea\u5df1\u7684\u8072\u97f3\u751f\u6210\u6b4c\u66f2\u3002'
                  : '\u76ee\u524d\u66ab\u6642\u7121\u6cd5\u5b8c\u6210\u9304\u97f3\u3002\u60a8\u53ef\u4ee5\u7a0d\u5f8c\u518d\u8a66\uff0c\u6216\u76f4\u63a5\u4f7f\u7528 AI \u8072\u97f3\u751f\u6210\u3002'}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={beginRecording}
              disabled={disabled || status === 'recording' || status === 'analyzing'}
              className="rounded-xl border border-violet-300/35 bg-violet-300/12 px-3 py-2.5 text-xs font-black text-violet-100 transition hover:border-violet-200/70 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {issue === 'quality' ? '\u91cd\u65b0\u9304\u97f3' : '\u5141\u8a31\u9ea5\u514b\u98a8'}
            </button>
            <button
              type="button"
              onClick={() => useAiVoice(selectedAiGender)}
              disabled={disabled || status === 'recording' || status === 'analyzing'}
              className="rounded-xl border border-amber-200/45 bg-amber-300/16 px-3 py-2.5 text-xs font-black text-amber-100 transition hover:border-amber-200/80 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {"\u4f7f\u7528 AI \u8072\u97f3"}
            </button>
          </div>
        </div>
      )}

      {needsAttention && !issue && (
        <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">
          {"\u8acb\u9078\u64c7\u300c\u958b\u59cb\u9304\u97f3\u300d\u6216\u300c\u7acb\u5373\u751f\u6210\u300d\uff0c\u5169\u7a2e\u65b9\u5f0f\u90fd\u53ef\u4ee5\u5b8c\u6210\u6b4c\u66f2\u3002"}
        </p>
      )}

      {sample && (
        <button
          type="button"
          onClick={resetSample}
          disabled={disabled || status === 'recording' || status === 'analyzing'}
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          {"\u91cd\u65b0\u9078\u64c7\u751f\u6210\u65b9\u5f0f"}
        </button>
      )}
    </section>
  );
}
