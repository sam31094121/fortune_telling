'use client';

import { useEffect, useState } from 'react';
import LunarBirthdayInput from './LunarBirthdayInput';
import FriendlyChoiceCard from './FriendlyChoiceCard';
import VoiceConsentRecorder, { type VoiceConsentState } from './VoiceConsentRecorder';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { saveUserData, loadUserData } from '@/lib/storage';

type BloodType = 'A' | 'B' | 'AB' | 'O';
type Gender = 'male' | 'female';
type PreferredSongLanguage = 'mandarin' | 'english' | 'taiwanese';
type SelectionConfirm = { gender: boolean };

export type ShichenChoice = number | 'unknown' | null;
export type VocalGenderPreference = 'male' | 'female' | null;

export interface MusicFormData {
  birthDate: string;
  bloodType: BloodType | '';
  name: string;
  gender: Gender;
  shichen: ShichenChoice;
  voiceCharacteristics: string[];
  vocalGenderPreference: VocalGenderPreference;
  preferredSongLanguage: PreferredSongLanguage;
  voiceConsent: VoiceConsentState;
}

interface PersonalityMusicFlowProps {
  onSubmit: (data: MusicFormData) => Promise<void>;
  loading: boolean;
}

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];
const EMPTY_SELECTION_CONFIRM: SelectionConfirm = { gender: false };
const STEPS = ['\u751f\u65e5', '\u8840\u578b', '\u59d3\u540d', '\u6642\u8fb0', '\u8072\u97f3'];

const BLOOD_DESC: Record<BloodType, string> = {
  A: '\u7d30\u81a9\u7a69\u5b9a\uff0c\u9069\u5408\u6574\u7406\u65cb\u5f8b\u4e2d\u7684\u5b89\u5168\u611f\u8207\u60c5\u7dd2\u5c64\u6b21\u3002',
  B: '\u76f4\u89ba\u9bae\u660e\uff0c\u9069\u5408\u653e\u5927\u6b4c\u66f2\u88e1\u81ea\u7531\u3001\u7bc0\u594f\u8207\u81ea\u6211\u8868\u9054\u3002',
  AB: '\u7406\u6027\u8207\u611f\u6027\u4e26\u5b58\uff0c\u9069\u5408\u505a\u51fa\u50cf\u96d9\u91cd\u4eba\u683c\u5c0d\u8a71\u7684\u6bb5\u843d\u3002',
  O: '\u80fd\u91cf\u76f4\u63a5\uff0c\u9069\u5408\u5f37\u5316\u526f\u6b4c\u5f35\u529b\u8207\u9762\u5c0d\u81ea\u5df1\u7684\u52c7\u6c23\u3002',
};

const VOICE_OPTIONS = [
  { key: 'confident', label: '\u8072\u97f3\u6709\u81ea\u4fe1' },
  { key: 'soft_spoken', label: '\u8aaa\u8a71\u504f\u6eab\u67d4' },
  { key: 'emotional_tone', label: '\u60c5\u7dd2\u8d77\u4f0f\u660e\u986f' },
  { key: 'rhythmic_speech', label: '\u8a9e\u6c23\u6709\u7bc0\u594f' },
  { key: 'high_energy', label: '\u80fd\u91cf\u6bd4\u8f03\u9ad8' },
  { key: 'hesitant', label: '\u5e36\u4e00\u9ede\u7336\u8c6b\u611f' },
];

const SONG_LANGUAGE_OPTIONS: Array<{ key: PreferredSongLanguage; label: string; hint: string; badge?: string }> = [
  {
    key: 'mandarin',
    label: '\u4e2d\u6587\u6b4c\u66f2',
    hint: '\u6700\u9069\u5408\u624b\u6a5f\u5ba2\u6236\u5feb\u901f\u7406\u89e3\u5167\u5fc3\u7368\u767d\uff0c\u60c5\u7dd2\u6703\u6bd4\u8f03\u76f4\u63a5\u3002',
    badge: '\u63a8\u85a6',
  },
  {
    key: 'english',
    label: '\u82f1\u6587\u6b4c\u66f2',
    hint: '\u9069\u5408\u505a\u51fa\u66f4\u5f37\u7684\u6bb5\u843d\u611f\u3001Hook \u8207\u570b\u969b\u6d41\u884c\u97f3\u6a02\u6c1b\u570d\u3002',
  },
  {
    key: 'taiwanese',
    label: '\u53f0\u8a9e\u6b4c\u66f2',
    hint: '\u9069\u5408\u628a\u4eba\u751f\u611f\u3001\u571f\u5730\u611f\u8207\u771f\u5be6\u60c5\u7dd2\u5531\u5f97\u66f4\u539a\u3002',
  },
];

export default function PersonalityMusicFlow({ onSubmit, loading }: PersonalityMusicFlowProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<MusicFormData>({
    birthDate: '',
    bloodType: '',
    name: '',
    gender: 'female',
    shichen: null,
    voiceCharacteristics: [],
    vocalGenderPreference: null,
    preferredSongLanguage: 'mandarin',
    voiceConsent: {
      accepted: false,
      version: 'voice-song-consent-v1',
      confirmedOwnVoice: false,
      allowSongGeneration: false,
    },
  });
  const [selectionConfirm, setSelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const saved = loadUserData();
    if (!saved) return;
    setForm((prev) => ({
      ...prev,
      name: saved.name || prev.name,
      birthDate: saved.birthday || prev.birthDate,
      bloodType: (saved.bloodType as BloodType) || prev.bloodType,
      gender: (saved.gender as Gender) || prev.gender,
    }));
    if (saved.gender) setSelectionConfirm({ gender: true });
  }, []);

  useEffect(() => {
    if (!form.name && !form.birthDate && !form.bloodType) return;
    saveUserData({
      name: form.name,
      birthday: form.birthDate,
      bloodType: form.bloodType as BloodType,
      gender: form.gender,
    });
  }, [form.name, form.birthDate, form.bloodType, form.gender]);

  function validateStep(targetStep = step): string | null {
    if (targetStep === 0 && !form.birthDate) return '\u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\uff0c\u9019\u662f\u751f\u6210\u7d50\u679c\u7684\u57fa\u790e\u3002';
    if (targetStep === 1 && !form.bloodType) return '\u8acb\u9ede\u9078\u8840\u578b\uff0c\u9078\u4e00\u500b\u5c31\u53ef\u4ee5\u7e7c\u7e8c\u3002';
    if (targetStep === 2) {
      if (form.name.trim().length < 2) return '\u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002';
      if (form.name.trim().length > 20) return '\u59d3\u540d\u8acb\u63a7\u5236\u5728 20 \u500b\u5b57\u4ee5\u5167\u3002';
      if (!selectionConfirm.gender) return '\u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002';
    }
    if (targetStep === 3 && form.shichen === null) return '\u8acb\u9078\u64c7\u51fa\u751f\u6642\u8fb0\uff1b\u82e5\u4e0d\u77e5\u9053\uff0c\u8acb\u9ede\u9078\u300c\u4e0d\u77e5\u9053\u6642\u8fb0\u300d\u3002';
    if (targetStep === 4) {
      if (!form.voiceConsent.accepted) return '\u8acb\u5148\u52fe\u9078\u672c\u4eba\u8072\u97f3\u6388\u6b0a\uff0c\u624d\u80fd\u9032\u884c\u8072\u97f3\u6458\u8981\u6821\u6e96\u6b4c\u66f2\u751f\u6210\u3002';
      if (!form.voiceConsent.sample) return '\u8acb\u5148\u5b8c\u6210\u4e00\u6bb5\u9304\u97f3\u6821\u6e96\uff0c\u9019\u6a23\u6b4c\u66f2\u624d\u6703\u4f9d\u672c\u4eba\u8072\u97f3\u6458\u8981\u904b\u7b97\uff0c\u4e0d\u6703\u8aa4\u8a8d\u6210\u8072\u97f3\u8907\u88fd\u3002';
    }
    return null;
  }

  const showMissingBirthDate = Boolean(localError) && step === 0 && !form.birthDate;
  const showMissingBloodType = Boolean(localError) && step === 1 && !form.bloodType;
  const showMissingName = Boolean(localError) && step === 2 && form.name.trim().length < 2;
  const showMissingGender = Boolean(localError) && step === 2 && !selectionConfirm.gender;
  const showMissingShichen = Boolean(localError) && step === 3 && form.shichen === null;
  const showMissingVoice = Boolean(localError) && step === 4 && (!form.voiceConsent.accepted || !form.voiceConsent.sample);

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
      <div className="flex flex-wrap items-center gap-2.5 border-b border-white/5 pb-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`radar-node ${index < step ? 'bg-cyan-400 text-cyan-400' : index === step ? 'radar-node--active bg-rose-400 text-rose-400 shadow-[0_0_10px_#f43f5e]' : 'bg-white/20 text-white/20'}`} />
            <span className={`text-xs font-bold ${index === step ? 'text-[color:var(--text-main)]' : 'text-[color:var(--text-muted)]'}`}>{label}</span>
            {index < STEPS.length - 1 && <div className="h-px w-3 bg-white/10" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">{'\u751f\u65e5\u6703\u4f5c\u70ba\u6b4c\u66f2\u4eba\u683c\u5e95\u8272\uff0c\u8acb\u7528\u624b\u6a5f\u5bb9\u6613\u8f38\u5165\u7684\u6c11\u570b\u5e74\u683c\u5f0f\u586b\u5beb\u3002'}</p>
          <LunarBirthdayInput
            value={form.birthDate}
            onChange={(solarDate) => {
              setForm((prev) => ({ ...prev, birthDate: solarDate }));
              setLocalError('');
            }}
            accent="violet"
          />
          {showMissingBirthDate && <p className="form-missing-alert">{'\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\uff0c\u9019\u6b04\u9084\u6c92\u6709\u586b\u5beb\u3002'}</p>}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">{'\u8840\u578b\u6703\u5354\u52a9 AI \u6821\u6e96\u6b4c\u66f2\u7684\u60c5\u7dd2\u901f\u5ea6\u8207\u81ea\u6211\u5c0d\u8a71\u65b9\u5f0f\u3002'}</p>
          {showMissingBloodType && <p className="form-missing-alert">{'\u26a0\ufe0f \u8acb\u9ede\u9078\u8840\u578b\uff0c\u9078\u4e00\u500b\u5c31\u53ef\u4ee5\u7e7c\u7e8c\u3002'}</p>}
          <div className="grid grid-cols-2 gap-3">
            {BLOOD_TYPES.map((bloodType, index) => (
              <FriendlyChoiceCard
                key={bloodType}
                active={form.bloodType === bloodType}
                title={`${bloodType} ${'\u578b'}`}
                description={BLOOD_DESC[bloodType]}
                onClick={() => {
                  setForm((prev) => ({ ...prev, bloodType }));
                  setLocalError('');
                }}
                tone={index % 2 === 0 ? 'violet' : 'cyan'}
                attention={showMissingBloodType}
              />
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <p className="mb-4 text-sm leading-6 text-[color:var(--text-sub)]">{'\u59d3\u540d\u6703\u7528\u4f86\u5efa\u7acb\u6b4c\u66f2\u4e3b\u89d2\uff0c\u8b93\u6b4c\u8a5e\u66f4\u50cf\u5728\u8ddf\u81ea\u5df1\u8aaa\u8a71\u3002'}</p>
            <input
              type="text"
              value={form.name}
              maxLength={20}
              placeholder="\u8acb\u8f38\u5165\u59d3\u540d"
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }));
                setLocalError('');
              }}
              className={`form-input w-full text-base neon-input-focus neon-card-hover glass-input glass-input-cyan ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
            />
            {showMissingName && <p className="form-missing-alert">{'\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002'}</p>}
          </div>

          <div>
            <p className="mb-2 text-xs text-[color:var(--text-muted)]">{'\u6027\u5225\u53ea\u7528\u4f86\u8abf\u6574\u8a9e\u6c23\u8207\u6577\u4e8b\u89d2\u5ea6\uff0c\u4e0d\u6703\u9650\u5236\u6b4c\u66f2\u98a8\u683c\u3002'}</p>
            {showMissingGender && <p className="form-missing-alert">{'\u26a0\ufe0f \u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002'}</p>}
            <div className="grid grid-cols-2 gap-3">
              {(['female', 'male'] as Gender[]).map((gender) => (
                <FriendlyChoiceCard
                  key={gender}
                  active={selectionConfirm.gender && form.gender === gender}
                  title={gender === 'female' ? '\u5973\u6027' : '\u7537\u6027'}
                  description={gender === 'female' ? '\u504f\u5411\u7d30\u81a9\u3001\u611f\u53d7\u8207\u65cb\u5f8b\u5c64\u6b21\u3002' : '\u504f\u5411\u529b\u91cf\u3001\u7bc0\u594f\u8207\u5167\u5728\u63a8\u9032\u611f\u3002'}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender }));
                    setSelectionConfirm({ gender: true });
                    setLocalError('');
                  }}
                  tone={gender === 'female' ? 'pink' : 'cyan'}
                  compact
                  attention={showMissingGender}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">{'\u6642\u8fb0\u6703\u8b93\u6b4c\u66f2\u591a\u4e00\u5c64\u7bc0\u594f\u611f\u3002\u82e5\u4e0d\u78ba\u5b9a\uff0c\u76f4\u63a5\u9078\u4e0d\u77e5\u9053\uff0c\u7cfb\u7d71\u6703\u7528\u4fdd\u5b88\u65b9\u5f0f\u63a8\u4f30\u3002'}</p>
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({ ...prev, shichen: 'unknown' }));
              setLocalError('');
            }}
            className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${form.shichen === 'unknown' ? 'border-emerald-400 bg-emerald-400/15' : showMissingShichen ? 'border-rose-400/85 bg-rose-500/12 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : 'border-white/15 bg-white/5 hover:border-white/25'}`}
          >
            <p className={`text-base font-bold ${form.shichen === 'unknown' ? 'text-emerald-300' : 'text-[color:var(--text-main)]'}`}>{'\u4e0d\u77e5\u9053\u6642\u8fb0 / \u4ea4\u7d66\u7cfb\u7d71\u63a8\u4f30'}</p>
            <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">{'\u9019\u662f\u6700\u53cb\u5584\u7684\u9078\u9805\uff0c\u4e0d\u6703\u5361\u4f4f\u6d41\u7a0b\uff0c\u4e5f\u4e0d\u6703\u8b93\u7d50\u679c\u904e\u5ea6\u6b66\u65b7\u3002'}</p>
          </button>
          {showMissingShichen && <p className="form-missing-alert">{'\u26a0\ufe0f \u8acb\u9078\u64c7\u51fa\u751f\u6642\u8fb0\uff1b\u82e5\u4e0d\u77e5\u9053\uff0c\u8acb\u9ede\u9078\u300c\u4e0d\u77e5\u9053\u6642\u8fb0\u300d\u3002'}</p>}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="shrink-0 text-xs text-[color:var(--text-muted)]">{'\u77e5\u9053\u6642\u8fb0\u53ef\u76f4\u63a5\u9ede\u9078'}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHICHEN_LIST.map((s) => {
              const selected = form.shichen === s.branchIndex;
              return (
                <button
                  key={s.branchIndex}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, shichen: s.branchIndex }));
                    setLocalError('');
                  }}
                  className={`rounded-2xl border px-3 py-3 text-left transition-all ${selected ? 'border-cyan-400 bg-cyan-400/15' : showMissingShichen ? 'border-rose-400/85 bg-rose-500/12 shadow-[0_0_18px_rgba(244,63,94,0.18)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                >
                  <p className={`text-base font-bold ${selected ? 'text-cyan-300' : 'text-[color:var(--text-main)]'}`}>{s.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-sub)]">{s.range}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[color:var(--text-muted)]">{s.imagery}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">{'\u9019\u662f\u8072\u97f3\u6458\u8981\u6821\u6e96\u7248\uff1a\u8acb\u5148\u6388\u6b0a\u4e26\u9304\u4e00\u6bb5\u8072\u97f3\uff0c\u7cfb\u7d71\u6703\u4f9d\u8072\u97f3\u6458\u8981\u8abf\u6574\u300c\u81ea\u6211\u5c0d\u8a71\u300d\u6b4c\u66f2\uff1b\u9019\u4e0d\u662f\u8072\u97f3\u8907\u88fd\u6216\u8072\u7dda\u514b\u9686\u3002'}</p>
          <VoiceConsentRecorder
            value={form.voiceConsent}
            disabled={loading}
            required
            showMissing={showMissingVoice}
            onChange={(voiceConsent) => {
              setForm((prev) => ({ ...prev, voiceConsent }));
              setLocalError('');
            }}
          />

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="mb-2 text-xs font-semibold text-cyan-100">{'\u9304\u97f3\u5f8c\u53ef\u88dc\u5145\u7684\u8072\u97f3\u6a19\u7c64\uff08\u9078\u586b\uff09'}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VOICE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleVoice(option.key)}
                  className={`rounded-[18px] border px-3 py-3 text-sm transition-all ${form.voiceCharacteristics.includes(option.key) ? 'border-cyan-300 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/5 text-[color:var(--text-sub)]'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-cyan-100">{'\u5e0c\u671b\u6b4c\u66f2\u7531\u8ab0\u4f86\u5531'}</p>
              <p className="text-xs text-[color:var(--text-muted)]">{'\u53ef\u4e0d\u9078\uff0c\u7cfb\u7d71\u6703\u4f9d\u8072\u97f3\u6458\u8981\u5224\u65b7'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'female', label: '\u5973\u8072\u7248\u672c', icon: '\u2640', tone: 'rose' },
                { key: 'male', label: '\u7537\u8072\u7248\u672c', icon: '\u2642', tone: 'cyan' },
              ] as const).map((option) => {
                const selected = form.vocalGenderPreference === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, vocalGenderPreference: selected ? null : option.key }))}
                    className={`group relative overflow-hidden rounded-[18px] border px-4 py-3 text-left text-sm transition-all duration-500 ${selected ? option.tone === 'rose' ? 'border-rose-200/80 bg-rose-300/15 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.25)]' : 'border-cyan-200/80 bg-cyan-300/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.25)]' : 'border-white/10 bg-white/5 text-[color:var(--text-sub)] hover:border-white/35 hover:bg-white/10'}`}
                  >
                    <span className="relative flex items-center gap-2.5">
                      <span className="text-lg">{option.icon}</span>
                      <span className="font-semibold">{option.label}</span>
                      {selected && <span className="ml-auto text-xs text-white">{'\u5df2\u9078'}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="mb-3 space-y-1">
              <p className="text-sm font-semibold text-amber-100">{'\u6b4c\u66f2\u8a9e\u8a00'}</p>
              <p className="text-xs leading-6 text-[color:var(--text-muted)]">{'\u4e2d\u6587\u6700\u76f4\u89ba\uff0c\u82f1\u6587\u504f\u6d41\u884c\u6bb5\u843d\uff0c\u53f0\u8a9e\u66f4\u6709\u751f\u6d3b\u539a\u5ea6\u3002'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {SONG_LANGUAGE_OPTIONS.map((option) => {
                const selected = form.preferredSongLanguage === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, preferredSongLanguage: option.key }))}
                    className={`rounded-[18px] border px-4 py-3 text-left transition-all ${selected ? 'border-amber-300/80 bg-amber-300/15 text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.18)]' : 'border-white/10 bg-white/5 text-[color:var(--text-sub)] hover:border-amber-200/35 hover:bg-white/10'}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{option.label}</span>
                      {option.badge && <span className="rounded-full border border-amber-200/30 px-2 py-0.5 text-[10px] text-amber-200">{option.badge}</span>}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-[color:var(--text-muted)]">{option.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {localError && <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-3 text-sm text-rose-300">{localError}</div>}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => {
              setStep((current) => current - 1);
              setLocalError('');
            }}
            disabled={loading}
            className="rounded-full border border-white/10 bg-slate-900/60 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition-all duration-300 hover:border-cyan-500/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {'\u4e0a\u4e00\u6b65'}
          </button>
        )}
        <button type="button" onClick={handleNext} disabled={loading} className="vip-gold-btn shimmer-btn flex-1 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'AI \u6b63\u5728\u751f\u6210\u6b4c\u66f2...' : step === STEPS.length - 1 ? '\u751f\u6210\u8072\u97f3\u6821\u6e96\u4e3b\u984c\u66f2' : `\u4e0b\u4e00\u6b65\uff1a${STEPS[step + 1]}`}
        </button>
      </div>
    </div>
  );
}