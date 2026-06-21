'use client';

import { useState } from 'react';
import LunarBirthdayInput from './LunarBirthdayInput';

type BloodType = 'A' | 'B' | 'AB' | 'O';
type Gender = 'male' | 'female';

export interface MusicFormData {
  birthDate: string;
  bloodType: BloodType | '';
  name: string;
  gender: Gender;
  voiceCharacteristics: string[];
}

interface PersonalityMusicFlowProps {
  onSubmit: (data: MusicFormData) => Promise<void>;
  loading: boolean;
}

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];
const BLOOD_DESC: Record<BloodType, string> = {
  A: '細膩穩定，重視秩序與安全感。',
  B: '自主鮮明，節奏感強，較有個人風格。',
  AB: '理性感性並存，觀察力與距離感並行。',
  O: '主動直接，行動力高，帶動感明顯。',
};

const VOICE_OPTIONS = [
  { key: 'confident', label: '自信明亮' },
  { key: 'soft_spoken', label: '輕柔慢說' },
  { key: 'emotional_tone', label: '情感濃厚' },
  { key: 'rhythmic_speech', label: '說話有節奏' },
  { key: 'high_energy', label: '高能量表達' },
  { key: 'hesitant', label: '較保留猶豫' },
];

const STEPS = ['國曆生日', '血型', '姓名', '聲音特徵'];

export default function PersonalityMusicFlow({ onSubmit, loading }: PersonalityMusicFlowProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<MusicFormData>({
    birthDate: '',
    bloodType: '',
    name: '',
    gender: 'female',
    voiceCharacteristics: [],
  });
  const [localError, setLocalError] = useState('');

  function validateStep(targetStep = step): string | null {
    if (targetStep === 0 && !form.birthDate) return '請先輸入完整的民國年國曆生日。';
    if (targetStep === 1 && !form.bloodType) return '請先選擇血型。';
    if (targetStep === 2) {
      if (form.name.trim().length < 2) return '姓名至少要 2 個字。';
      if (form.name.trim().length > 20) return '姓名不可超過 20 個字。';
    }
    return null;
  }

  const currentStepInvalid = Boolean(validateStep());

  function handleNext() {
    const error = validateStep();
    if (error) {
      setLocalError(error);
      return;
    }

    setLocalError('');

    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    void onSubmit(form);
  }

  function toggleVoice(key: string) {
    setForm((prev) => ({
      ...prev,
      voiceCharacteristics: prev.voiceCharacteristics.includes(key)
        ? prev.voiceCharacteristics.filter((item) => item !== key)
        : [...prev.voiceCharacteristics, key],
    }));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                index < step
                  ? 'bg-[color:var(--sky-violet)] text-white'
                  : index === step
                    ? 'border-2 border-[color:var(--sky-violet)] text-[color:var(--sky-violet)]'
                    : 'border border-white/20 text-[color:var(--text-muted)]'
              }`}
            >
              {index < step ? '✓' : index + 1}
            </div>
            <span
              className={`text-xs tracking-wider ${
                index === step ? 'text-[color:var(--text-main)]' : 'text-[color:var(--text-muted)]'
              }`}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <div className={`h-px w-6 ${index < step ? 'bg-[color:var(--sky-violet)]' : 'bg-white/15'}`} />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--text-sub)]">
            先輸入民國年國曆生日，系統會自動換成西元，再進入後面的音樂人格分析。
          </p>
          <LunarBirthdayInput
            value={form.birthDate}
            onChange={(solarDate) => {
              setForm((prev) => ({ ...prev, birthDate: solarDate }));
              setLocalError('');
            }}
            accent="violet"
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--text-sub)]">請選擇血型，系統會補充你的行為與表達風格。</p>
          <div className="grid grid-cols-2 gap-3">
            {BLOOD_TYPES.map((bloodType) => (
              <button
                key={bloodType}
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, bloodType }));
                  setLocalError('');
                }}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  form.bloodType === bloodType
                    ? 'border-amber-400 bg-amber-400/15'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <p className={`text-lg font-bold ${form.bloodType === bloodType ? 'text-amber-300' : 'text-[color:var(--text-main)]'}`}>
                  {bloodType} 型
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">{BLOOD_DESC[bloodType]}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <p className="mb-4 text-sm text-[color:var(--text-sub)]">請輸入姓名，系統會做最後的人層校正。</p>
            <input
              type="text"
              value={form.name}
              maxLength={20}
              placeholder="請輸入姓名"
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }));
                setLocalError('');
              }}
              className="form-input w-full"
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-[color:var(--text-muted)]">性別只做外在呈現修飾，不會推翻前面結果。</p>
            <div className="grid grid-cols-2 gap-3">
              {(['female', 'male'] as Gender[]).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, gender }))}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    form.gender === gender
                      ? 'border-pink-400 bg-pink-400/15 text-pink-200'
                      : 'border-white/10 bg-white/5 text-[color:var(--text-sub)]'
                  }`}
                >
                  {gender === 'female' ? '女性' : '男性'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--text-sub)]">
            這一步是選填，讓 AI 更了解你的說話節奏與聲音氣質。
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VOICE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => toggleVoice(option.key)}
                className={`rounded-[18px] border px-3 py-3 text-sm transition-all ${
                  form.voiceCharacteristics.includes(option.key)
                    ? 'border-[color:var(--human-cyan)] bg-[color:rgba(110,231,249,0.1)] text-[color:var(--human-cyan)]'
                    : 'border-white/10 bg-white/5 text-[color:var(--text-sub)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {localError && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-3 text-sm text-rose-300">
          {localError}
        </div>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => {
              setStep((current) => current - 1);
              setLocalError('');
            }}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            上一步
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={loading || currentStepInvalid}
          className="vip-gold-btn flex-1 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '正在生成人格音樂報告…' : step === STEPS.length - 1 ? '開始音樂人格分析' : `前往下一步：${STEPS[step + 1]}`}
        </button>
      </div>
    </div>
  );
}
