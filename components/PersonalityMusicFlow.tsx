'use client';

import { useState } from 'react';

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
  A: '細膩·謹慎·規律',
  B: '自由·創意·熱情',
  AB: '理性·敏感·雙面',
  O: '領導·社交·行動',
};

const VOICE_OPTIONS = [
  { key: 'confident', label: '自信有力' },
  { key: 'soft_spoken', label: '輕柔內斂' },
  { key: 'emotional_tone', label: '情感豐富' },
  { key: 'rhythmic_speech', label: '節奏感強' },
  { key: 'high_energy', label: '能量高昂' },
  { key: 'hesitant', label: '沉思型' },
];

const STEPS = ['生日', '血型', '姓名', '聲音'];

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

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.birthDate) return '請輸入出生日期。';
      const d = new Date(form.birthDate);
      if (isNaN(d.getTime()) || d.getTime() > Date.now()) return '日期不合法，請重新輸入。';
    }
    if (step === 1 && !form.bloodType) return '請選擇血型。';
    if (step === 2) {
      if (form.name.trim().length < 2) return '姓名至少需要 2 個字。';
      if (form.name.trim().length > 20) return '姓名不可超過 20 個字。';
    }
    return null;
  }

  function handleNext() {
    const err = validateStep();
    if (err) { setLocalError(err); return; }
    setLocalError('');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onSubmit(form);
    }
  }

  function toggleVoice(key: string) {
    setForm(prev => ({
      ...prev,
      voiceCharacteristics: prev.voiceCharacteristics.includes(key)
        ? prev.voiceCharacteristics.filter(k => k !== key)
        : [...prev.voiceCharacteristics, key],
    }));
  }

  return (
    <div className="space-y-8">
      {/* 步驟指示器 */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                i < step
                  ? 'bg-[color:var(--sky-violet)] text-white'
                  : i === step
                  ? 'border-2 border-[color:var(--sky-violet)] text-[color:var(--sky-violet)]'
                  : 'border border-white/20 text-[color:var(--text-muted)]'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs tracking-wider ${
                i === step ? 'text-[color:var(--text-main)]' : 'text-[color:var(--text-muted)]'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${i < step ? 'bg-[color:var(--sky-violet)]' : 'bg-white/15'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0：生日 */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-violet-300">天 · 出生日期</p>
            <p className="mb-4 text-sm text-[color:var(--text-sub)]">
              你的出生日期是人格音樂的骨架，決定主旋律與情緒基調。
            </p>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => { setForm(p => ({ ...p, birthDate: e.target.value })); setLocalError(''); }}
              max={new Date().toISOString().split('T')[0]}
              className="form-input w-full"
            />
          </div>
        </div>
      )}

      {/* Step 1：血型 */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-amber-300">地 · 血型</p>
            <p className="mb-4 text-sm text-[color:var(--text-sub)]">
              血型決定節奏感、低頻厚度與音色風格。
            </p>
            <div className="grid grid-cols-2 gap-3">
              {BLOOD_TYPES.map(bt => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => { setForm(p => ({ ...p, bloodType: bt })); setLocalError(''); }}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    form.bloodType === bt
                      ? 'border-amber-400 bg-amber-400/15'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <p className={`text-lg font-bold ${form.bloodType === bt ? 'text-amber-300' : 'text-[color:var(--text-main)]'}`}>
                    {bt} 型
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">{BLOOD_DESC[bt]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2：姓名 + 性別 */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-pink-300">人 · 姓名與性別</p>
            <p className="mb-4 text-sm text-[color:var(--text-sub)]">
              姓名音韻決定歌詞主題與個人旋律記憶點。
            </p>
            <input
              type="text"
              value={form.name}
              maxLength={20}
              placeholder="輸入你的姓名"
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setLocalError(''); }}
              className="form-input w-full"
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-[color:var(--text-muted)]">性別（影響唱腔音域校正）</p>
            <div className="grid grid-cols-2 gap-3">
              {(['female', 'male'] as Gender[]).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, gender: g }))}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    form.gender === g
                      ? 'border-pink-400 bg-pink-400/15 text-pink-200'
                      : 'border-white/10 bg-white/5 text-[color:var(--text-sub)]'
                  }`}
                >
                  {g === 'female' ? '女性' : '男性'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3：聲音特徵（可選） */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[color:var(--human-cyan)]">
              聲音特質 <span className="ml-2 normal-case tracking-normal text-[color:var(--text-muted)]">（可選）</span>
            </p>
            <p className="mb-4 text-sm text-[color:var(--text-sub)]">
              選擇最貼近你說話風格的特質，AI 會用來校正唱腔音色。可不選，直接生成。
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VOICE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleVoice(opt.key)}
                  className={`rounded-[18px] border px-3 py-3 text-sm transition-all ${
                    form.voiceCharacteristics.includes(opt.key)
                      ? 'border-[color:var(--human-cyan)] bg-[color:rgba(110,231,249,0.1)] text-[color:var(--human-cyan)]'
                      : 'border-white/10 bg-white/5 text-[color:var(--text-sub)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 錯誤訊息 */}
      {localError && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-3 text-sm text-rose-300">
          {localError}
        </div>
      )}

      {/* 按鈕列 */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => { setStep(s => s - 1); setLocalError(''); }}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20"
          >
            返回
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="vip-gold-btn flex-1 py-4 text-sm disabled:opacity-60"
        >
          {loading
            ? '人格音樂生成中…'
            : step === STEPS.length - 1
            ? '啟動人格音樂生成'
            : `下一步 · ${STEPS[step + 1]}`}
        </button>
      </div>
    </div>
  );
}
