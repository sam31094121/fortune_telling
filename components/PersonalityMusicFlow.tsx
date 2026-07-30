'use client';

import { useEffect, useRef, useState } from 'react';
import LunarBirthdayInput from './LunarBirthdayInput';
import FriendlyChoiceCard from './FriendlyChoiceCard';
import VoiceConsentRecorder, { type AiVoiceGender, type VoiceConsentState } from './VoiceConsentRecorder';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { saveUserData, loadUserData } from '@/lib/storage';
import { getAnalysisIdentityTarget } from '@/lib/identity-split-client';

type BloodType = 'A' | 'B' | 'AB' | 'O';
type Gender = 'male' | 'female';
type PreferredSongLanguage = 'mandarin' | 'english' | 'taiwanese';
type SongEnergyStyle = 'dance-pop' | 'emotional-pop' | 'club-edm';
type SelectionConfirm = { gender: boolean };
type MissingField = 'birthDate' | 'bloodType' | 'name' | 'gender' | 'shichen' | 'voice';
type ValidationResult = { field: MissingField; message: string };

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
  songEnergyStyle: SongEnergyStyle;
  voiceConsent: VoiceConsentState;
}

interface PersonalityMusicFlowProps {
  onSubmit: (data: MusicFormData) => Promise<void>;
  loading: boolean;
}

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];
const EMPTY_SELECTION_CONFIRM: SelectionConfirm = { gender: false };
const DATA_FIELD_ORDER: MissingField[] = ['voice', 'birthDate', 'bloodType', 'name', 'gender', 'shichen'];
const LAST_DATA_FIELD = DATA_FIELD_ORDER[DATA_FIELD_ORDER.length - 1];
const DATA_FIELD_LABELS: Record<MissingField, { label: string; hint: string }> = {
  voice: { label: '\u9078\u8072\u97f3\u4f86\u6e90', hint: '\u5148\u6c7a\u5b9a\u8981\u9304\u81ea\u5df1\u7684\u8072\u97f3\uff0c\u6216\u76f4\u63a5\u7528 AI \u8072\u97f3\u3002' },
  birthDate: { label: '\u586b\u5beb\u751f\u65e5', hint: '\u9019\u4e00\u6b65\u53ea\u586b\u751f\u65e5\uff0c\u5b8c\u6210\u5f8c\u518d\u9032\u5230\u4e0b\u4e00\u984c\u3002' },
  bloodType: { label: '\u9ede\u9078\u8840\u578b', hint: '\u9019\u4e00\u6b65\u53ea\u9078\u8840\u578b\uff0c\u9078\u4e00\u500b\u5c31\u53ef\u4ee5\u7e7c\u7e8c\u3002' },
  name: { label: '\u586b\u5beb\u59d3\u540d', hint: '\u8acb\u8f38\u5165\u59d3\u540d\uff0cAI \u6703\u7528\u4f86\u5efa\u7acb\u6b4c\u66f2\u4e3b\u89d2\u3002' },
  gender: { label: '\u9ede\u9078\u6027\u5225', hint: '\u9019\u4e00\u6b65\u53ea\u78ba\u8a8d\u6027\u5225\uff0c\u7528\u4f86\u8abf\u6574\u6b4c\u66f2\u8a9e\u6c23\u3002' },
  shichen: { label: '\u9078\u64c7\u51fa\u751f\u6642\u8fb0', hint: '\u77e5\u9053\u5c31\u9ede\u6642\u8fb0\uff0c\u4e0d\u77e5\u9053\u5c31\u9078\u7cfb\u7d71\u63a8\u4f30\u3002' },
};

const BLOOD_DESC: Record<BloodType, string> = {
  A: '\u7d30\u81a9\u7a69\u5b9a\uff0c\u9069\u5408\u6574\u7406\u65cb\u5f8b\u4e2d\u7684\u5b89\u5168\u611f\u8207\u60c5\u7dd2\u5c64\u6b21\u3002',
  B: '\u76f4\u89ba\u9bae\u660e\uff0c\u9069\u5408\u653e\u5927\u6b4c\u66f2\u88e1\u81ea\u7531\u3001\u7bc0\u594f\u8207\u81ea\u6211\u8868\u9054\u3002',
  AB: '\u7406\u6027\u8207\u611f\u6027\u4e26\u5b58\uff0c\u9069\u5408\u505a\u51fa\u50cf\u96d9\u91cd\u4eba\u683c\u5c0d\u8a71\u7684\u6bb5\u843d\u3002',
  O: '\u80fd\u91cf\u76f4\u63a5\uff0c\u9069\u5408\u5f37\u5316\u526f\u6b4c\u5f35\u529b\u8207\u9762\u5c0d\u81ea\u5df1\u7684\u52c7\u6c23\u3002',
};

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

const SONG_ENERGY_OPTIONS: Array<{ key: SongEnergyStyle; label: string; hint: string; badge?: string }> = [
  {
    key: 'dance-pop',
    label: '\u6d41\u884c\u821e\u66f2',
    hint: 'Hook \u597d\u8a18\u3001\u7bc0\u594f\u660e\u78ba\uff0c\u9069\u5408\u624b\u6a5f\u77ed\u5f71\u97f3\u8207\u5927\u773e\u807d\u611f\u3002',
    badge: '\u63a8\u85a6',
  },
  {
    key: 'emotional-pop',
    label: '\u60c5\u7dd2\u6d41\u884c',
    hint: '\u65cb\u5f8b\u6e05\u695a\u3001\u6545\u4e8b\u611f\u5f37\uff0c\u9069\u5408\u5531\u51fa\u5167\u5fc3\u5c0d\u8a71\u8207\u6eab\u5ea6\u3002',
  },
  {
    key: 'club-edm',
    label: '\u6d3e\u5c0d\u96fb\u97f3',
    hint: '\u9f13\u9ede\u66f4\u5f37\u3001Drop \u66f4\u660e\u986f\uff0c\u9069\u5408\u505a\u6210\u66f4\u6709\u821e\u611f\u7684\u6b4c\u3002',
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
    songEnergyStyle: 'dance-pop',
    voiceConsent: {
      accepted: false,
      version: 'voice-song-consent-v1',
      confirmedOwnVoice: false,
      allowSongGeneration: false,
    },
  });
  const [selectionConfirm, setSelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [localError, setLocalError] = useState('');
  const flowTopRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<MissingField, HTMLDivElement | null>>({
    birthDate: null,
    bloodType: null,
    name: null,
    gender: null,
    shichen: null,
    voice: null,
  });
  const [missingField, setMissingField] = useState<MissingField | null>(null);
  const [activeDataField, setActiveDataField] = useState<MissingField>('voice');

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
    if (getAnalysisIdentityTarget() !== 'self') return;
    if (!form.name && !form.birthDate && !form.bloodType) return;
    saveUserData({
      name: form.name,
      birthday: form.birthDate,
      bloodType: form.bloodType as BloodType,
      gender: form.gender,
    });
  }, [form.name, form.birthDate, form.bloodType, form.gender]);

  useEffect(() => {
    if (step === 0) return;
    const timer = window.setTimeout(() => {
      flowTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [step]);

  function scrollToField(field: MissingField) {
    window.setTimeout(() => {
      const fieldElement = fieldRefs.current[field];
      const alertElement = fieldElement?.querySelector('.form-missing-alert');
      const targetElement = alertElement ?? fieldElement;
      if (!targetElement) return;
      const rect = targetElement.getBoundingClientRect();
      const desiredTop = alertElement ? window.innerHeight * 0.32 : 84;
      const nextTop = Math.max(0, rect.top + window.scrollY - desiredTop);
      window.scrollTo({ top: nextTop, behavior: 'auto' });
    }, 80);
  }

  useEffect(() => {
    if (!missingField || !localError) return;
    const timer = window.setTimeout(() => {
      scrollToField(missingField);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [localError, missingField]);

  useEffect(() => {
    if (step !== 0 || !form.voiceConsent.sample || activeDataField !== 'voice') return;
    const timer = window.setTimeout(() => {
      setActiveDataField('birthDate');
      scrollToField('birthDate');
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeDataField, form.voiceConsent.sample, step]);

  function clearValidation() {
    setLocalError('');
    setMissingField(null);
  }

  function validateDataField(field: MissingField): ValidationResult | null {
    if (field === 'voice' && !form.voiceConsent.sample) return { field: 'voice', message: '\u8acb\u5148\u9078\u64c7\u8072\u97f3\u4f86\u6e90\uff1a\u8981\u9304\u97f3\u8acb\u9ede\u300c\u958b\u59cb\u9304\u97f3\u300d\uff0c\u4e0d\u9304\u97f3\u53ef\u76f4\u63a5\u9078 AI \u8072\u97f3\u3002' };
    if (field === 'birthDate' && !form.birthDate) return { field: 'birthDate', message: '\u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\uff0c\u7cfb\u7d71\u5df2\u5e36\u60a8\u56de\u5230\u9019\u4e00\u6b04\u3002' };
    if (field === 'bloodType' && !form.bloodType) return { field: 'bloodType', message: '\u8acb\u9ede\u9078\u8840\u578b\uff0c\u7d05\u8272\u767c\u5149\u7684\u5361\u7247\u5c31\u662f\u9700\u8981\u5b8c\u6210\u7684\u5730\u65b9\u3002' };
    if (field === 'name' && form.name.trim().length < 2) return { field: 'name', message: '\u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002' };
    if (field === 'name' && form.name.trim().length > 20) return { field: 'name', message: '\u59d3\u540d\u8acb\u63a7\u5236\u5728 20 \u500b\u5b57\u4ee5\u5167\u3002' };
    if (field === 'gender' && !selectionConfirm.gender) return { field: 'gender', message: '\u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002' };
    if (field === 'shichen' && form.shichen === null) return { field: 'shichen', message: '\u8acb\u9078\u64c7\u51fa\u751f\u6642\u8fb0\uff1b\u82e5\u4e0d\u77e5\u9053\uff0c\u8acb\u9ede\u9078\u300c\u4e0d\u77e5\u9053\u6642\u8fb0\u300d\u3002' };
    return null;
  }

  function validateStep(targetStep = step): ValidationResult | null {
    if (targetStep === 0) return validateDataField(activeDataField);
    if (targetStep === 1 && !form.songEnergyStyle) return { field: 'voice', message: '\u8acb\u9078\u64c7\u6b4c\u66f2\u611f\u89ba\u3002' };
    return null;
  }

  const showMissingBirthDate = missingField === 'birthDate' && step === 0 && !form.birthDate;
  const showMissingBloodType = missingField === 'bloodType' && step === 0 && !form.bloodType;
  const showMissingName = missingField === 'name' && step === 0 && (form.name.trim().length < 2 || form.name.trim().length > 20);
  const showMissingGender = missingField === 'gender' && step === 0 && !selectionConfirm.gender;
  const showMissingShichen = missingField === 'shichen' && step === 0 && form.shichen === null;
  const showMissingVoice = missingField === 'voice' && step === 0 && activeDataField === 'voice' && !form.voiceConsent.sample;

  function goToDataField(field: MissingField) {
    setActiveDataField(field);
    window.setTimeout(() => scrollToField(field), 30);
  }

  function handleNext() {
    const error = validateStep();
    if (error) {
      setLocalError(error.message);
      setMissingField(error.field);
      scrollToField(error.field);
      return;
    }

    clearValidation();
    if (step === 0) {
      const currentIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
      const nextField = DATA_FIELD_ORDER[currentIndex + 1];
      if (nextField) {
        goToDataField(nextField);
        return;
      }
      setStep(1);
      return;
    }

    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }

    void onSubmit(form);
  }

  function submitWithVoice(voiceConsent: VoiceConsentState, aiVoiceGender?: AiVoiceGender) {
    const nextForm = {
      ...form,
      voiceConsent,
      vocalGenderPreference: aiVoiceGender ?? form.vocalGenderPreference,
    };
    setForm(nextForm);
    clearValidation();
    void onSubmit(nextForm);
  }

  const currentDataIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
  const currentDataMeta = DATA_FIELD_LABELS[activeDataField];
  const canGoBack = step > 0 || (step === 0 && activeDataField !== 'voice');

  function getPrimaryButtonLabel() {
    if (loading) return 'AI \u6b63\u5728\u751f\u6210\u6b4c\u66f2...';
    if (step === 0) {
      if (activeDataField === 'voice') return '\u4e0b\u4e00\u6b65\uff1a\u586b\u5beb\u751f\u65e5';
      if (activeDataField === 'birthDate') return '\u4e0b\u4e00\u6b65\uff1a\u9ede\u9078\u8840\u578b';
      if (activeDataField === 'bloodType') return '\u4e0b\u4e00\u6b65\uff1a\u586b\u5beb\u59d3\u540d';
      if (activeDataField === 'name') return '\u4e0b\u4e00\u6b65\uff1a\u9ede\u9078\u6027\u5225';
      if (activeDataField === 'gender') return '\u4e0b\u4e00\u6b65\uff1a\u9078\u64c7\u6642\u8fb0';
      return '\u4e0b\u4e00\u6b65\uff1a\u9078\u64c7\u6b4c\u66f2\u611f\u89ba';
    }
    if (step === 1) return '\u4e0b\u4e00\u6b65\uff1a\u78ba\u8a8d\u6b4c\u66f2\u8a9e\u8a00';
    return '\u751f\u6210\u5c08\u5c6c\u6d41\u884c\u6b4c\u66f2';
  }

  function handleBack() {
    clearValidation();
    if (step === 0) {
      const currentIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
      const previousField = DATA_FIELD_ORDER[currentIndex - 1];
      if (previousField) goToDataField(previousField);
      return;
    }
    if (step === 1) {
      setStep(0);
      window.setTimeout(() => goToDataField(LAST_DATA_FIELD), 30);
      return;
    }
    setStep(1);
  }

  return (
    <div ref={flowTopRef} className="space-y-8">
      {step === 0 && activeDataField === 'voice' && (
        <div ref={(node) => { fieldRefs.current.voice = node; }} className={`music-required-field music-direct-recorder-dock music-direct-recorder-dock--first ${showMissingVoice ? 'music-required-field--missing' : ''}`} aria-label="\u76f4\u63a5\u9ea5\u514b\u98a8\u9304\u97f3\u7cfb\u7d71">
          {form.voiceConsent.sample ? (
            <div className="music-voice-selected-note">
              <strong>{"\u8072\u97f3\u4f86\u6e90\u5df2\u5b8c\u6210"}</strong>
              <span>{"\u5df2\u7d93\u8a18\u9304\u60a8\u9078\u64c7\u7684\u8072\u97f3\u65b9\u5f0f\u3002\u63a5\u4e0b\u4f86\u8acb\u4f9d\u7d05\u8272\u63d0\u793a\u6216\u4e0b\u65b9\u6b04\u4f4d\u5b8c\u6210\u8cc7\u6599\u3002"}</span>
            </div>
          ) : (
            <>
              <div className="music-direct-recorder-dock__title">
                <strong>{"\u9ea5\u514b\u98a8\u9304\u97f3\u7cfb\u7d71"}</strong>
                <span>{"\u5148\u9078\u4e00\u500b\u65b9\u5f0f\uff1a\u9304\u81ea\u5df1\u7684\u8072\u97f3\uff0c\u6216\u76f4\u63a5\u7528 AI \u8072\u97f3\u3002"}</span>
              </div>
              <VoiceConsentRecorder
                value={form.voiceConsent}
                disabled={loading}
                required
                showMissing={showMissingVoice}
                aiVoiceGender={form.vocalGenderPreference}
                onAiVoiceGenderChange={(gender) => {
                  setForm((prev) => ({ ...prev, vocalGenderPreference: gender }));
                  clearValidation();
                }}
                onChange={(voiceConsent) => {
                  setForm((prev) => ({ ...prev, voiceConsent }));
                  clearValidation();
                  if (voiceConsent.sample) scrollToField('birthDate');
                }}
              />
            </>
          )}
        </div>
      )}

      <div className="music-current-step-card" aria-live="polite">
        <span>{step === 0 ? `\u7b2c ${currentDataIndex + 1} \u6b65 / ${DATA_FIELD_ORDER.length}` : step === 1 ? '\u7b2c 7 \u6b65 / 8' : '\u6700\u5f8c\u4e00\u6b65'}</span>
        <strong>{step === 0 ? currentDataMeta.label : step === 1 ? '\u9078\u64c7\u6b4c\u66f2\u611f\u89ba' : '\u78ba\u8a8d\u6b4c\u66f2\u8a9e\u8a00'}</strong>
        <p>{step === 0 ? currentDataMeta.hint : step === 1 ? '\u9019\u4e00\u9801\u53ea\u9078\u6b4c\u66f2\u98a8\u683c\uff0c\u5176\u4ed6\u5167\u5bb9\u5148\u96b1\u85cf\u3002' : '\u9078\u5b8c\u8a9e\u8a00\u5f8c\uff0c\u5c31\u53ef\u4ee5\u751f\u6210\u5c08\u5c6c\u6b4c\u66f2\u3002'}</p>
      </div>

      {step === 0 && activeDataField === 'birthDate' && (
        <div ref={(node) => { fieldRefs.current.birthDate = node; }} className={`music-required-field music-flow-stage-card music-flow-stage-card--data space-y-4 ${showMissingBirthDate ? 'music-required-field--missing' : ''}`}>
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">{'\u751f\u65e5\u6703\u4f5c\u70ba\u6b4c\u66f2\u4eba\u683c\u5e95\u8272\uff0c\u8acb\u7528\u624b\u6a5f\u5bb9\u6613\u8f38\u5165\u7684\u6c11\u570b\u5e74\u683c\u5f0f\u586b\u5beb\u3002'}</p>
          <LunarBirthdayInput
            value={form.birthDate}
            onChange={(solarDate) => {
              setForm((prev) => ({ ...prev, birthDate: solarDate }));
              clearValidation();
            }}
            accent="violet"
          />
          {showMissingBirthDate && <p className="form-missing-alert">{'\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\uff0c\u9019\u6b04\u9084\u6c92\u6709\u586b\u5beb\u3002'}</p>}
        </div>
      )}

      {step === 0 && activeDataField === 'bloodType' && (
        <div ref={(node) => { fieldRefs.current.bloodType = node; }} className={`music-required-field space-y-4 ${showMissingBloodType ? 'music-required-field--missing' : ''}`}>
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
                  clearValidation();
                }}
                tone={index % 2 === 0 ? 'violet' : 'cyan'}
                attention={showMissingBloodType}
              />
            ))}
          </div>
        </div>
      )}

      {step === 0 && (activeDataField === 'name' || activeDataField === 'gender') && (
        <div className="space-y-5">
          <div ref={(node) => { fieldRefs.current.name = node; }} className={`music-required-field ${activeDataField === 'name' ? '' : 'hidden'} ${showMissingName ? 'music-required-field--missing' : ''}`}>
            <p className="mb-4 text-sm leading-6 text-[color:var(--text-sub)]">{'\u59d3\u540d\u6703\u7528\u4f86\u5efa\u7acb\u6b4c\u66f2\u4e3b\u89d2\uff0c\u8b93\u6b4c\u8a5e\u66f4\u50cf\u5728\u8ddf\u81ea\u5df1\u8aaa\u8a71\u3002'}</p>
            <input
              type="text"
              value={form.name}
              maxLength={20}
              placeholder={'\u8acb\u8f38\u5165\u59d3\u540d'}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }));
                clearValidation();
              }}
              className={`form-input w-full text-base neon-input-focus neon-card-hover glass-input glass-input-cyan ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
            />
            {showMissingName && <p className="form-missing-alert">{'\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002'}</p>}
          </div>

          <div ref={(node) => { fieldRefs.current.gender = node; }} className={`music-required-field ${activeDataField === 'gender' ? '' : 'hidden'} ${showMissingGender ? 'music-required-field--missing' : ''}`}>
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
                    clearValidation();
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

      {step === 0 && activeDataField === 'shichen' && (
        <div ref={(node) => { fieldRefs.current.shichen = node; }} className={`music-required-field space-y-5 ${showMissingShichen ? 'music-required-field--missing' : ''}`}>
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">{'\u6642\u8fb0\u6703\u8b93\u6b4c\u66f2\u591a\u4e00\u5c64\u7bc0\u594f\u611f\u3002\u82e5\u4e0d\u78ba\u5b9a\uff0c\u76f4\u63a5\u9078\u4e0d\u77e5\u9053\uff0c\u7cfb\u7d71\u6703\u7528\u4fdd\u5b88\u65b9\u5f0f\u63a8\u4f30\u3002'}</p>
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({ ...prev, shichen: 'unknown' }));
              clearValidation();
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
                    clearValidation();
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

      {step === 1 && (
        <div className="space-y-4">
          <div className="music-flow-stage-card music-flow-stage-card--voice">
            <div className="music-flow-stage-heading">
              <p>{"\u7b2c\u4e03\u6b65"}</p>
              <h3>{"\u9078\u64c7\u6b4c\u66f2\u611f\u89ba"}</h3>
              <span>{"\u9019\u4e00\u6b65\u53ea\u9078\u66f2\u98a8\uff0c\u4e0d\u518d\u986f\u793a\u9304\u97f3\u5361\u7247\u6216\u5176\u4ed6\u8f38\u5165\u3002"}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {SONG_ENERGY_OPTIONS.map((option) => {
                const selected = form.songEnergyStyle === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, songEnergyStyle: option.key }));
                      clearValidation();
                    }}
                    className={`song-energy-choice ${selected ? 'song-energy-choice--selected' : ''}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-black">{option.label}</span>
                      {option.badge && <span className="rounded-full border border-amber-200/35 px-2 py-0.5 text-[10px] text-amber-100">{option.badge}</span>}
                    </span>
                    <span className="mt-1.5 block text-[11px] leading-5 text-[color:var(--text-muted)]">{option.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="music-flow-stage-card music-flow-stage-card--generate">
            <div className="music-flow-stage-heading">
              <p>{"\u6700\u5f8c\u4e00\u6b65"}</p>
              <h3>{"\u78ba\u8a8d\u6b4c\u66f2\u8a9e\u8a00"}</h3>
              <span>{"\u9019\u4e00\u6b65\u53ea\u9078\u8a9e\u8a00\uff0c\u78ba\u8a8d\u5f8c\u5c31\u80fd\u751f\u6210\u6b4c\u66f2\u3002"}</span>
            </div>
            <div className="music-generate-ready-note">
              <strong>{'\u5df2\u9032\u5165\u6700\u5f8c\u4e00\u6b65'}</strong>
              <span>{'\u6309\u4e0b\u65b9\u300c\u751f\u6210\u5c08\u5c6c\u6d41\u884c\u6b4c\u66f2\u300d\u5f8c\uff0cAI \u6703\u81ea\u52d5\u5b8c\u6210\u6b4c\u8a5e\u3001\u66f2\u98a8\u8207\u88fd\u4f5c\u65b9\u5411\u3002'}</span>
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
        </div>
      )}

      {localError && <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-3 text-sm text-rose-300">{localError}</div>}

      <div className="flex gap-3">
        {canGoBack && (
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className="rounded-full border border-white/10 bg-slate-900/60 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition-all duration-300 hover:border-cyan-500/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {'\u4e0a\u4e00\u6b65'}
          </button>
        )}
        <button type="button" onClick={handleNext} disabled={loading} className="vip-gold-btn shimmer-btn flex-1 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">
          {getPrimaryButtonLabel()}
        </button>
      </div>
    </div>
  );
}