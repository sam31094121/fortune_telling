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
type LifeSongGoal = 'dream' | 'work' | 'love' | 'family' | 'health' | 'wealth' | 'healing' | 'relax';
type SongCreativeStyle = 'pop' | 'piano' | 'healing' | 'ancient' | 'rock' | 'electronic' | 'jazz' | 'cinematic';
type SelectionConfirm = { gender: boolean };
type MissingField = 'goal' | 'style' | 'voice' | 'birthDate' | 'bloodType' | 'name' | 'gender' | 'shichen';
type DataField = Exclude<MissingField, 'goal' | 'style'>;
type ValidationResult = { field: MissingField; message: string };

export type ShichenChoice = number | 'unknown' | null;
export type VocalGenderPreference = 'male' | 'female' | null;

export interface MusicFormData {
  lifeGoal: LifeSongGoal | '';
  lifeGoalNote: string;
  songCreativeStyle: SongCreativeStyle | '';
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
const DATA_FIELD_ORDER: DataField[] = ['voice', 'birthDate', 'bloodType', 'name', 'gender', 'shichen'];
const LAST_DATA_FIELD = DATA_FIELD_ORDER[DATA_FIELD_ORDER.length - 1];

const DATA_FIELD_LABELS: Record<DataField, { label: string; hint: string }> = {
  voice: { label: '選擇聲音來源', hint: '決定要錄自己的聲音，或直接使用 AI 聲音。聲音只用來校準歌曲語氣。' },
  birthDate: { label: '填寫生日', hint: '生日會成為歌曲的命盤底色，AI 會讀取年代、生肖與五元素節奏。' },
  bloodType: { label: '點選血型', hint: '血型會協助 AI 判定情緒速度、表達方式與副歌推進感。' },
  name: { label: '填寫姓名', hint: '姓名會成為歌曲主角，讓歌詞更像在對這個人說話。' },
  gender: { label: '點選性別', hint: '性別只用來調整語氣與敘事角度，不限制歌曲風格。' },
  shichen: { label: '選擇出生時辰', hint: '時辰會補上節奏層；不知道也可以交給系統保守推估。' },
};

const GOAL_OPTIONS: Array<{ key: LifeSongGoal; label: string; hint: string; tone: 'violet' | 'amber' | 'cyan' | 'pink' }> = [
  { key: 'dream', label: '夢想', hint: '把還沒完成的願望寫成一首推著你前進的歌。', tone: 'violet' },
  { key: 'work', label: '工作', hint: '把壓力、方向與突破感轉成清楚有力量的節奏。', tone: 'cyan' },
  { key: 'love', label: '愛情', hint: '讓歌曲承接關係中的渴望、理解與溫柔。', tone: 'pink' },
  { key: 'family', label: '家庭', hint: '把牽掛、責任與守護感整理成穩定的旋律。', tone: 'amber' },
  { key: 'health', label: '健康', hint: '讓音樂更重視安定、呼吸、復原與日常節奏。', tone: 'cyan' },
  { key: 'wealth', label: '財富', hint: '把目標、行動與資源感轉成更聚焦的歌曲主題。', tone: 'amber' },
  { key: 'healing', label: '療癒', hint: '把沒有說出口的疲憊變成被理解、被陪伴的歌。', tone: 'violet' },
  { key: 'relax', label: '放鬆', hint: '讓歌曲降低負重，成為可以慢慢呼吸的陪伴。', tone: 'cyan' },
];

const STYLE_OPTIONS: Array<{ key: SongCreativeStyle; label: string; hint: string; energy: SongEnergyStyle; tone: 'violet' | 'amber' | 'cyan' | 'pink' }> = [
  { key: 'pop', label: '流行', hint: '旋律清楚、Hook 好記，適合變成完整生命主題曲。', energy: 'dance-pop', tone: 'amber' },
  { key: 'piano', label: '鋼琴', hint: '留白多、情緒細，適合自我對話與溫柔鼓勵。', energy: 'emotional-pop', tone: 'violet' },
  { key: 'healing', label: '療癒', hint: '音色柔和，重視陪伴、安定與補強感。', energy: 'emotional-pop', tone: 'cyan' },
  { key: 'ancient', label: '古風', hint: '用詩意、弦樂與東方意境承接命盤故事。', energy: 'emotional-pop', tone: 'amber' },
  { key: 'rock', label: '搖滾', hint: '強化行動、突破與站起來的力量。', energy: 'club-edm', tone: 'pink' },
  { key: 'electronic', label: '電子', hint: '節奏更現代，適合推動、覺醒與高能量畫面。', energy: 'club-edm', tone: 'cyan' },
  { key: 'jazz', label: '爵士', hint: '保留成熟、轉折與內在層次，適合深夜感。', energy: 'emotional-pop', tone: 'violet' },
  { key: 'cinematic', label: '電影配樂', hint: '世界觀更大，適合人生章節、使命與轉場。', energy: 'dance-pop', tone: 'amber' },
];

const BLOOD_DESC: Record<BloodType, string> = {
  A: '細膩穩定，適合整理旋律中的安全感與情緒層次。',
  B: '直覺鮮明，適合放大歌曲裡自由、節奏與自我表達。',
  AB: '理性與感性並存，適合做出雙重自我對話的段落。',
  O: '能量直接，適合強化副歌張力與面對自己的勇氣。',
};

const SONG_LANGUAGE_OPTIONS: Array<{ key: PreferredSongLanguage; label: string; hint: string; badge?: string }> = [
  { key: 'mandarin', label: '中文歌曲', hint: '最直覺、最貼近日常，也最適合完整承接生命故事。', badge: '推薦' },
  { key: 'english', label: '英文歌曲', hint: '段落感、Hook 與國際流行音樂氛圍更強。' },
  { key: 'taiwanese', label: '台語歌曲', hint: '生活厚度、土地感與真實情緒更明顯。' },
];

export default function PersonalityMusicFlow({ onSubmit, loading }: PersonalityMusicFlowProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<MusicFormData>({
    lifeGoal: '',
    lifeGoalNote: '',
    songCreativeStyle: '',
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
    goal: null,
    style: null,
    voice: null,
    birthDate: null,
    bloodType: null,
    name: null,
    gender: null,
    shichen: null,
  });
  const [missingField, setMissingField] = useState<MissingField | null>(null);
  const [activeDataField, setActiveDataField] = useState<DataField>('voice');

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

  useEffect(() => {
    if (!missingField || !localError) return;
    const timer = window.setTimeout(() => scrollToField(missingField), 140);
    return () => window.clearTimeout(timer);
  }, [localError, missingField]);

  useEffect(() => {
    if (step !== 2 || !form.voiceConsent.sample || activeDataField !== 'voice') return;
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

  function validateDataField(field: DataField): ValidationResult | null {
    if (field === 'voice' && !form.voiceConsent.sample) return { field: 'voice', message: '請先選擇聲音來源：要錄音請點「開始錄音」，不錄音可直接選 AI 聲音。' };
    if (field === 'birthDate' && !form.birthDate) return { field: 'birthDate', message: '請先完成生日資料，AI 需要它來建立命理底色。' };
    if (field === 'bloodType' && !form.bloodType) return { field: 'bloodType', message: '請點選血型，這會協助歌曲情緒與節奏校準。' };
    if (field === 'name' && form.name.trim().length < 2) return { field: 'name', message: '請填寫姓名，至少 2 個字。' };
    if (field === 'name' && form.name.trim().length > 20) return { field: 'name', message: '姓名請控制在 20 個字以內。' };
    if (field === 'gender' && !selectionConfirm.gender) return { field: 'gender', message: '請點選性別，這欄還沒有確認。' };
    if (field === 'shichen' && form.shichen === null) return { field: 'shichen', message: '請選擇出生時辰；若不知道，請點選「不知道時辰」。' };
    return null;
  }

  function validateStep(targetStep = step): ValidationResult | null {
    if (targetStep === 0 && !form.lifeGoal) return { field: 'goal', message: '請先選擇這首生命歌曲最想陪你完成的方向。' };
    if (targetStep === 1 && !form.songCreativeStyle) return { field: 'style', message: '請先選擇希望歌曲呈現的風格。' };
    if (targetStep === 2) return validateDataField(activeDataField);
    return null;
  }

  function goToDataField(field: DataField) {
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
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      const currentIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
      const nextField = DATA_FIELD_ORDER[currentIndex + 1];
      if (nextField) {
        goToDataField(nextField);
        return;
      }
      setStep(3);
      return;
    }

    void onSubmit(form);
  }

  function handleBack() {
    clearValidation();
    if (step === 0) return;
    if (step === 2) {
      const currentIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
      const previousField = DATA_FIELD_ORDER[currentIndex - 1];
      if (previousField) {
        goToDataField(previousField);
        return;
      }
      setStep(1);
      return;
    }
    if (step === 3) {
      setStep(2);
      window.setTimeout(() => goToDataField(LAST_DATA_FIELD), 30);
      return;
    }
    setStep(step - 1);
  }

  const showMissingGoal = missingField === 'goal' && step === 0 && !form.lifeGoal;
  const showMissingStyle = missingField === 'style' && step === 1 && !form.songCreativeStyle;
  const showMissingBirthDate = missingField === 'birthDate' && step === 2 && !form.birthDate;
  const showMissingBloodType = missingField === 'bloodType' && step === 2 && !form.bloodType;
  const showMissingName = missingField === 'name' && step === 2 && (form.name.trim().length < 2 || form.name.trim().length > 20);
  const showMissingGender = missingField === 'gender' && step === 2 && !selectionConfirm.gender;
  const showMissingShichen = missingField === 'shichen' && step === 2 && form.shichen === null;
  const showMissingVoice = missingField === 'voice' && step === 2 && activeDataField === 'voice' && !form.voiceConsent.sample;

  const currentDataIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
  const currentDataMeta = DATA_FIELD_LABELS[activeDataField];
  const canGoBack = step > 0 || (step === 2 && activeDataField !== 'voice');

  function getPrimaryButtonLabel() {
    if (loading) return 'AI 正在理解、分析並創作歌曲...';
    if (step === 0) return '下一步：選擇歌曲風格';
    if (step === 1) return '下一步：統整命理資料';
    if (step === 2) {
      if (activeDataField === 'voice') return '下一步：填寫生日';
      if (activeDataField === 'birthDate') return '下一步：點選血型';
      if (activeDataField === 'bloodType') return '下一步：填寫姓名';
      if (activeDataField === 'name') return '下一步：點選性別';
      if (activeDataField === 'gender') return '下一步：選擇時辰';
      return '下一步：AI 統整確認';
    }
    return '生成 AI 專屬生命歌曲';
  }

  const stepLabel = step === 0
    ? 'STEP 2 / 7'
    : step === 1
      ? 'STEP 3 / 7'
      : step === 2
        ? `STEP 4 / 7 · 資料 ${currentDataIndex + 1}/${DATA_FIELD_ORDER.length}`
        : 'STEP 5-7 / 7';
  const stepTitle = step === 0
    ? '目前最想完成什麼？'
    : step === 1
      ? '希望歌曲成為什麼風格？'
      : step === 2
        ? currentDataMeta.label
        : 'AI 統整後開始創作';
  const stepHint = step === 0
    ? '先讓 AI 理解這首歌的使命。歌曲不是娛樂，而是鼓勵、療癒、補強與陪伴。'
    : step === 1
      ? '選擇一種主要風格，AI 會再依命理、五元素與聲音資料微調。'
      : step === 2
        ? currentDataMeta.hint
        : 'AI 將整合會員資料、命理資料、五元素與補強方向，建立歌曲世界觀、主題、情境、歌名、歌詞與製作計畫。';

  return (
    <div ref={flowTopRef} className="space-y-8">
      <div className="music-current-step-card" aria-live="polite">
        <span>{stepLabel}</span>
        <strong>{stepTitle}</strong>
        <p>{stepHint}</p>
      </div>

      {step === 0 && (
        <div ref={(node) => { fieldRefs.current.goal = node; }} className={`music-flow-stage-card music-flow-stage-card--voice space-y-5 ${showMissingGoal ? 'music-required-field--missing' : ''}`}>
          <div className="music-flow-stage-heading">
            <p>AI 理解</p>
            <h3>請專注你現在最想完成的一件事</h3>
            <span>選一個方向即可，也可以補一句自己的狀態，AI 會把它變成歌曲主題。</span>
          </div>
          {showMissingGoal && <p className="form-missing-alert">⚠️ 請先選擇一個歌曲方向。</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GOAL_OPTIONS.map((option) => (
              <FriendlyChoiceCard
                key={option.key}
                active={form.lifeGoal === option.key}
                title={option.label}
                description={option.hint}
                onClick={() => {
                  setForm((prev) => ({ ...prev, lifeGoal: option.key }));
                  clearValidation();
                }}
                tone={option.tone}
                compact
                attention={showMissingGoal}
              />
            ))}
          </div>
          <textarea
            value={form.lifeGoalNote}
            maxLength={120}
            placeholder="可以補充一句，例如：我想重新找回工作信心。"
            onChange={(event) => setForm((prev) => ({ ...prev, lifeGoalNote: event.target.value }))}
            className="form-input min-h-[96px] w-full resize-none text-base neon-input-focus glass-input glass-input-cyan"
          />
        </div>
      )}

      {step === 1 && (
        <div ref={(node) => { fieldRefs.current.style = node; }} className={`music-flow-stage-card music-flow-stage-card--generate space-y-5 ${showMissingStyle ? 'music-required-field--missing' : ''}`}>
          <div className="music-flow-stage-heading">
            <p>AI 分析</p>
            <h3>選擇生命歌曲的主要風格</h3>
            <span>AI 不會直接照抄風格，而是把風格當成創作方向，再整合命理與五元素。</span>
          </div>
          {showMissingStyle && <p className="form-missing-alert">⚠️ 請先選擇一種歌曲風格。</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STYLE_OPTIONS.map((option) => (
              <FriendlyChoiceCard
                key={option.key}
                active={form.songCreativeStyle === option.key}
                title={option.label}
                description={option.hint}
                onClick={() => {
                  setForm((prev) => ({ ...prev, songCreativeStyle: option.key, songEnergyStyle: option.energy }));
                  clearValidation();
                }}
                tone={option.tone}
                compact
                attention={showMissingStyle}
              />
            ))}
          </div>
        </div>
      )}

      {step === 2 && activeDataField === 'voice' && (
        <div ref={(node) => { fieldRefs.current.voice = node; }} className={`music-required-field music-direct-recorder-dock music-direct-recorder-dock--first ${showMissingVoice ? 'music-required-field--missing' : ''}`} aria-label="聲音來源選擇">
          {form.voiceConsent.sample ? (
            <div className="music-voice-selected-note">
              <strong>聲音來源已完成</strong>
              <span>AI 已記錄聲音方式，接下來會把它與命理資料一起統整。</span>
            </div>
          ) : (
            <>
              <div className="music-direct-recorder-dock__title">
                <strong>聲音來源</strong>
                <span>錄自己的聲音，或直接使用 AI 聲音。這一步是歌曲語氣校準，不是直接生成。</span>
              </div>
              <VoiceConsentRecorder
                value={form.voiceConsent}
                disabled={loading}
                required
                showMissing={showMissingVoice}
                aiVoiceGender={form.vocalGenderPreference}
                onAiVoiceGenderChange={(gender: AiVoiceGender) => {
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

      {step === 2 && activeDataField === 'birthDate' && (
        <div ref={(node) => { fieldRefs.current.birthDate = node; }} className={`music-required-field music-flow-stage-card music-flow-stage-card--data space-y-4 ${showMissingBirthDate ? 'music-required-field--missing' : ''}`}>
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">生日會作為歌曲人格底色，請用手機容易輸入的民國年格式填寫。</p>
          <LunarBirthdayInput
            value={form.birthDate}
            onChange={(solarDate) => {
              setForm((prev) => ({ ...prev, birthDate: solarDate }));
              clearValidation();
            }}
            accent="violet"
          />
          {showMissingBirthDate && <p className="form-missing-alert">⚠️ 請先完成生日資料。</p>}
        </div>
      )}

      {step === 2 && activeDataField === 'bloodType' && (
        <div ref={(node) => { fieldRefs.current.bloodType = node; }} className={`music-required-field space-y-4 ${showMissingBloodType ? 'music-required-field--missing' : ''}`}>
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">血型會協助 AI 校準歌曲的情緒速度與自我對話方式。</p>
          {showMissingBloodType && <p className="form-missing-alert">⚠️ 請點選血型。</p>}
          <div className="grid grid-cols-2 gap-3">
            {BLOOD_TYPES.map((bloodType, index) => (
              <FriendlyChoiceCard
                key={bloodType}
                active={form.bloodType === bloodType}
                title={`${bloodType} 型`}
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

      {step === 2 && (activeDataField === 'name' || activeDataField === 'gender') && (
        <div className="space-y-5">
          <div ref={(node) => { fieldRefs.current.name = node; }} className={`music-required-field ${activeDataField === 'name' ? '' : 'hidden'} ${showMissingName ? 'music-required-field--missing' : ''}`}>
            <p className="mb-4 text-sm leading-6 text-[color:var(--text-sub)]">姓名會用來建立歌曲主角，讓歌詞更像在跟這個人說話。</p>
            <input
              type="text"
              value={form.name}
              maxLength={20}
              placeholder="請輸入姓名"
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }));
                clearValidation();
              }}
              className={`form-input w-full text-base neon-input-focus neon-card-hover glass-input glass-input-cyan ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
            />
            {showMissingName && <p className="form-missing-alert">⚠️ 請填寫姓名，至少 2 個字。</p>}
          </div>

          <div ref={(node) => { fieldRefs.current.gender = node; }} className={`music-required-field ${activeDataField === 'gender' ? '' : 'hidden'} ${showMissingGender ? 'music-required-field--missing' : ''}`}>
            <p className="mb-2 text-xs text-[color:var(--text-muted)]">性別只用來調整語氣與敘事角度，不會限制歌曲風格。</p>
            {showMissingGender && <p className="form-missing-alert">⚠️ 請點選性別。</p>}
            <div className="grid grid-cols-2 gap-3">
              {(['female', 'male'] as Gender[]).map((gender) => (
                <FriendlyChoiceCard
                  key={gender}
                  active={selectionConfirm.gender && form.gender === gender}
                  title={gender === 'female' ? '女性' : '男性'}
                  description={gender === 'female' ? '偏向細膩、感受與旋律層次。' : '偏向力量、節奏與內在推進感。'}
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

      {step === 2 && activeDataField === 'shichen' && (
        <div ref={(node) => { fieldRefs.current.shichen = node; }} className={`music-required-field space-y-5 ${showMissingShichen ? 'music-required-field--missing' : ''}`}>
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">時辰會讓歌曲多一層節奏感。若不確定，直接選不知道，系統會用保守方式推估。</p>
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({ ...prev, shichen: 'unknown' }));
              clearValidation();
            }}
            className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${form.shichen === 'unknown' ? 'border-emerald-400 bg-emerald-400/15' : showMissingShichen ? 'border-rose-400/85 bg-rose-500/12 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : 'border-white/15 bg-white/5 hover:border-white/25'}`}
          >
            <p className={`text-base font-bold ${form.shichen === 'unknown' ? 'text-emerald-300' : 'text-[color:var(--text-main)]'}`}>不知道時辰 / 交給系統推估</p>
            <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">不會卡住流程，也不會讓結果過度武斷。</p>
          </button>
          {showMissingShichen && <p className="form-missing-alert">⚠️ 請選擇出生時辰；若不知道，請點選「不知道時辰」。</p>}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="shrink-0 text-xs text-[color:var(--text-muted)]">知道時辰可直接點選</span>
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

      {step === 3 && (
        <div className="space-y-4">
          <div className="music-flow-stage-card music-flow-stage-card--generate">
            <div className="music-flow-stage-heading">
              <p>AI 創作</p>
              <h3>確認歌曲語言與 AI 統整內容</h3>
              <span>確認後，AI 會先建立歌曲世界觀、主題與情境，再生成歌名、介紹、歌詞、曲風與製作計畫。</span>
            </div>
            <div className="music-generate-ready-note">
              <strong>AI 將讀取並統整</strong>
              <span>目標：{GOAL_OPTIONS.find((item) => item.key === form.lifeGoal)?.label}。風格：{STYLE_OPTIONS.find((item) => item.key === form.songCreativeStyle)?.label}。資料：會員/親友模式、生日、血型、姓名、性別、時辰、聲音來源、五元素與補強方向。</span>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="mb-3 space-y-1">
                <p className="text-sm font-semibold text-amber-100">歌曲語言</p>
                <p className="text-xs leading-6 text-[color:var(--text-muted)]">中文最直覺，英文偏流行段落，台語更有生活厚度。</p>
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
            上一步
          </button>
        )}
        <button type="button" onClick={handleNext} disabled={loading} className="vip-gold-btn shimmer-btn flex-1 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">
          {getPrimaryButtonLabel()}
        </button>
      </div>
    </div>
  );
}