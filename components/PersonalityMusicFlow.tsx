'use client';

import { useEffect, useRef, useState } from 'react';
import LunarBirthdayInput from './LunarBirthdayInput';
import FriendlyChoiceCard from './FriendlyChoiceCard';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { saveUserData, loadUserData } from '@/lib/storage';
import { getAnalysisIdentityTarget } from '@/lib/identity-split-client';
import { MAGNETIC_VOICE_ARCHETYPES, DEFAULT_MAGNETIC_VOICE_TYPE, type MagneticVoiceType } from '@/lib/magnetic-voice';

type BloodType = 'A' | 'B' | 'AB' | 'O';
type Gender = 'male' | 'female';
type PreferredSongLanguage = 'mandarin' | 'english' | 'taiwanese';
type SongEnergyStyle = 'dance-pop' | 'emotional-pop' | 'club-edm';
type LifeSongGoal = 'dream' | 'work' | 'love' | 'family' | 'health' | 'wealth' | 'healing' | 'relax';
type SongCreativeStyle = 'pop' | 'piano' | 'healing' | 'ancient' | 'rock' | 'electronic' | 'jazz' | 'cinematic';
type SelectionConfirm = { gender: boolean };
type MissingField = 'goal' | 'style' | 'voice' | 'birthDate' | 'bloodType' | 'name' | 'gender' | 'shichen';
type DataField = Exclude<MissingField, 'goal' | 'style' | 'voice'>;
type ValidationResult = { field: MissingField; message: string };

export type ShichenChoice = number | 'unknown' | null;
export type VocalGenderPreference = 'male' | 'female' | null;

interface VoiceSampleSummary {
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

interface VoiceConsentState {
  accepted: boolean;
  version: string;
  confirmedOwnVoice: boolean;
  allowSongGeneration: boolean;
  recordedAt?: string;
  sample?: VoiceSampleSummary;
}

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
  magneticVoice: boolean;
  magneticVoiceType: MagneticVoiceType;
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
const DATA_FIELD_ORDER: DataField[] = ['birthDate', 'bloodType', 'name', 'gender', 'shichen'];
const LAST_DATA_FIELD = DATA_FIELD_ORDER[DATA_FIELD_ORDER.length - 1];
const AI_VOICE_DIRECT_MIME = 'application/x-ai-voice-direct';

const DATA_FIELD_LABELS: Record<DataField, { label: string; hint: string }> = {
  birthDate: { label: '生日資料', hint: '生日用來建立歌曲的人格節奏，讓旋律更貼近你的故事。' },
  bloodType: { label: '血型氣質', hint: '血型只做輔助，不會取代真正的姓名與生日資料。' },
  name: { label: '姓名', hint: '姓名會變成歌詞裡最重要的情緒核心。' },
  gender: { label: '性別', hint: '性別協助 易經調整敘事角度與歌曲口吻。' },
  shichen: { label: '出生時辰', hint: '知道時辰會更完整；不知道也可以選擇不確定。' },
};

const GOAL_OPTIONS: Array<{ key: LifeSongGoal; label: string; hint: string; tone: 'violet' | 'amber' | 'cyan' | 'pink' }> = [
  { key: 'dream', label: '夢想', hint: '把還沒說出口的願望，唱成可以往前走的副歌。', tone: 'violet' },
  { key: 'work', label: '事業', hint: '把壓力、責任與想被看見的努力唱出來。', tone: 'cyan' },
  { key: 'love', label: '感情', hint: '把想念、等待與還在乎的心情唱成旋律。', tone: 'pink' },
  { key: 'family', label: '家庭', hint: '把牽掛、感謝與沒說出口的愛留下來。', tone: 'amber' },
  { key: 'health', label: '健康', hint: '把疲憊放慢，唱成照顧自己的提醒。', tone: 'cyan' },
  { key: 'wealth', label: '財富', hint: '把安全感、累積與下一步方向唱清楚。', tone: 'amber' },
  { key: 'healing', label: '療癒', hint: '把受過的傷整理成一首能陪你的歌。', tone: 'violet' },
  { key: 'relax', label: '放鬆', hint: '把緊繃卸下來，唱成一段舒服的呼吸。', tone: 'cyan' },
];

const STYLE_OPTIONS: Array<{ key: SongCreativeStyle; label: string; hint: string; energy: SongEnergyStyle; tone: 'violet' | 'amber' | 'cyan' | 'pink' }> = [
  { key: 'pop', label: '流行抒情', hint: '主歌靠近耳邊，副歌清楚好記。', energy: 'dance-pop', tone: 'amber' },
  { key: 'piano', label: '鋼琴告白', hint: '保留呼吸感，適合真心、想念與感謝。', energy: 'emotional-pop', tone: 'violet' },
  { key: 'healing', label: '療癒氛圍', hint: '柔和、溫暖，像有人陪你慢慢走。', energy: 'emotional-pop', tone: 'cyan' },
  { key: 'ancient', label: '東方古風', hint: '用詩意與留白，唱出命運感。', energy: 'emotional-pop', tone: 'amber' },
  { key: 'rock', label: '搖滾釋放', hint: '把壓抑變成力量，適合重新站起來。', energy: 'club-edm', tone: 'pink' },
  { key: 'electronic', label: '電子律動', hint: '節奏明亮，適合想要被推動的狀態。', energy: 'club-edm', tone: 'cyan' },
  { key: 'jazz', label: '爵士夜色', hint: '成熟、有空氣感，適合細膩情緒。', energy: 'emotional-pop', tone: 'violet' },
  { key: 'cinematic', label: '電影主題', hint: '像一段人生預告片，情緒層次更大。', energy: 'dance-pop', tone: 'amber' },
];

const EMOTIONAL_VOICE_OPTIONS: Array<{
  key: Exclude<VocalGenderPreference, null>;
  label: string;
  badge: string;
  headline: string;
  hint: string;
  previewLine: string;
  tone: 'violet' | 'amber' | 'cyan' | 'pink';
  characteristics: string[];
}> = [
  {
    key: 'female',
    label: '催淚女聲',
    badge: '溫柔女聲',
    headline: '清澈、靠近、像把心事唱給你聽。',
    hint: '適合告白、想念、療癒與「終於被理解」的歌曲。',
    previewLine: '我會把你的故事唱成一首，聽完還想再抱抱自己的歌。',
    tone: 'pink',
    characteristics: ['ai_voice_female', 'female_emotional_lead', 'tearful_breath', 'warm_close_vocal', 'cinematic_heartbreak'],
  },
  {
    key: 'male',
    label: '深情男聲',
    badge: '厚度男聲',
    headline: '溫厚、克制、像把沒說出口的話唱完。',
    hint: '適合承擔、守護、遺憾後的力量與人生主題曲。',
    previewLine: '我會把你撐過來的路，唱成一句終於被懂得的副歌。',
    tone: 'cyan',
    characteristics: ['ai_voice_male', 'male_emotional_lead', 'warm_low_register', 'restrained_then_release', 'cinematic_confession'],
  },
];

const BLOOD_DESC: Record<BloodType, string> = {
  A: '細膩、穩定，適合慢慢堆疊情緒。',
  B: '自由、直覺，適合有畫面感的旋律。',
  AB: '多層次、敏銳，適合轉折明顯的歌曲。',
  O: '直接、有力量，適合副歌清楚的主題曲。',
};

const SONG_LANGUAGE_OPTIONS: Array<{ key: PreferredSongLanguage; label: string; hint: string; badge?: string }> = [
  { key: 'mandarin', label: '國語歌曲', hint: '最貼近台灣聽眾，適合情緒與故事都清楚傳達。', badge: '推薦' },
  { key: 'english', label: '英文歌曲', hint: '適合電影感、國際感與更大的舞台氛圍。' },
];

function buildVoiceConsent(characteristics: string[]): VoiceConsentState {
  const recordedAt = new Date().toISOString();
  return {
    accepted: true,
    version: 'voice-song-consent-v2-emotional',
    confirmedOwnVoice: false,
    allowSongGeneration: true,
    recordedAt,
    sample: {
      durationSeconds: 0,
      averageVolume: 0.08,
      dynamicRange: 0.16,
      brightness: characteristics.includes('ai_voice_female') ? 0.68 : 0.48,
      tempoPulse: 0.62,
      qualityScore: 100,
      inferredCharacteristics: ['ai_voice_direct', 'ai_voice_auto', 'life_song_vocal', ...characteristics],
      recordedAt,
      mimeType: AI_VOICE_DIRECT_MIME,
      localOnly: true,
    },
  };
}

function playVoicePreview(option: (typeof EMOTIONAL_VOICE_OPTIONS)[number]) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(option.previewLine);
  utterance.lang = 'zh-TW';
  utterance.rate = option.key === 'female' ? 0.86 : 0.82;
  utterance.pitch = option.key === 'female' ? 1.18 : 0.78;
  utterance.volume = 1;

  const voices = synth.getVoices();
  const zhVoices = voices.filter((voice) => /zh|tw|taiwan|chinese|han/i.test(`${voice.lang} ${voice.name}`));
  const genderMatch = option.key === 'female'
    ? /female|woman|mei|ting|xiaoxiao|hanhan|yaoyao|huei/i
    : /male|man|yun|kang|hao|zhi|ching/i;
  utterance.voice = zhVoices.find((voice) => genderMatch.test(voice.name)) ?? zhVoices[0] ?? null;
  synth.speak(utterance);
}

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
    magneticVoice: false,
    magneticVoiceType: 'chest',
    preferredSongLanguage: 'mandarin',
    songEnergyStyle: 'dance-pop',
    voiceConsent: buildVoiceConsent([]),
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
  const [activeDataField, setActiveDataField] = useState<DataField>('birthDate');

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
    if (field === 'birthDate' && !form.birthDate) return { field: 'birthDate', message: '請先完成生日資料，易經才能建立歌曲節奏。' };
    if (field === 'bloodType' && !form.bloodType) return { field: 'bloodType', message: '請選擇血型，讓歌曲氣質更完整。' };
    if (field === 'name' && form.name.trim().length < 2) return { field: 'name', message: '姓名至少需要 2 個字。' };
    if (field === 'name' && form.name.trim().length > 20) return { field: 'name', message: '姓名不可超過 20 個字。' };
    if (field === 'gender' && !selectionConfirm.gender) return { field: 'gender', message: '請確認性別，讓歌曲敘事更貼近。' };
    if (field === 'shichen' && form.shichen === null) return { field: 'shichen', message: '請選擇出生時辰；不知道可以選「不確定」。' };
    return null;
  }

  function validateStep(targetStep = step): ValidationResult | null {
    if (targetStep === 0 && !form.lifeGoal) return { field: 'goal', message: '請先選擇這首歌最想陪你完成的事情。' };
    if (targetStep === 1 && !form.songCreativeStyle) return { field: 'style', message: '請選擇一種歌曲質感。' };
    if (targetStep === 2 && !form.vocalGenderPreference) return { field: 'voice', message: '請選擇男聲或女聲，易經才能鎖定演唱情緒。' };
    if (targetStep === 3) return validateDataField(activeDataField);
    return null;
  }

  function goToDataField(field: DataField) {
    setActiveDataField(field);
    window.setTimeout(() => scrollToField(field), 30);
  }

  function selectVoice(option: (typeof EMOTIONAL_VOICE_OPTIONS)[number]) {
    setForm((prev) => {
      const archetype = MAGNETIC_VOICE_ARCHETYPES.find((item) => item.key === prev.magneticVoiceType) ?? MAGNETIC_VOICE_ARCHETYPES[0];
      const chars = archetype.characteristics(option.key);
      return {
        ...prev,
        vocalGenderPreference: option.key,
        magneticVoice: true,
        voiceCharacteristics: ['ai_voice_direct', 'ai_voice_auto', 'life_song_vocal', ...chars],
        voiceConsent: buildVoiceConsent(chars),
      };
    });
    clearValidation();
  }

  function selectMagneticVoiceType(type: MagneticVoiceType) {
    setForm((prev) => {
      const archetype = MAGNETIC_VOICE_ARCHETYPES.find((item) => item.key === type) ?? MAGNETIC_VOICE_ARCHETYPES[0];
      if (!prev.vocalGenderPreference) {
        return { ...prev, magneticVoiceType: type };
      }
      const chars = archetype.characteristics(prev.vocalGenderPreference);
      return {
        ...prev,
        magneticVoiceType: type,
        voiceCharacteristics: ['ai_voice_direct', 'ai_voice_auto', 'life_song_vocal', ...chars],
        voiceConsent: buildVoiceConsent(chars),
      };
    });
    clearValidation();
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
      setStep(3);
      return;
    }
    if (step === 3) {
      const currentIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
      const nextField = DATA_FIELD_ORDER[currentIndex + 1];
      if (nextField) {
        goToDataField(nextField);
        return;
      }
      setStep(4);
      return;
    }

    void onSubmit(form);
  }

  function handleBack() {
    clearValidation();
    if (step === 0) return;
    if (step === 3) {
      const currentIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
      const previousField = DATA_FIELD_ORDER[currentIndex - 1];
      if (previousField) {
        goToDataField(previousField);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 4) {
      setStep(3);
      window.setTimeout(() => goToDataField(LAST_DATA_FIELD), 30);
      return;
    }
    setStep(step - 1);
  }

  const showMissingGoal = missingField === 'goal' && step === 0 && !form.lifeGoal;
  const showMissingStyle = missingField === 'style' && step === 1 && !form.songCreativeStyle;
  const showMissingVoice = missingField === 'voice' && step === 2 && !form.vocalGenderPreference;
  const showMissingBirthDate = missingField === 'birthDate' && step === 3 && !form.birthDate;
  const showMissingBloodType = missingField === 'bloodType' && step === 3 && !form.bloodType;
  const showMissingName = missingField === 'name' && step === 3 && (form.name.trim().length < 2 || form.name.trim().length > 20);
  const showMissingGender = missingField === 'gender' && step === 3 && !selectionConfirm.gender;
  const showMissingShichen = missingField === 'shichen' && step === 3 && form.shichen === null;

  const currentDataIndex = DATA_FIELD_ORDER.indexOf(activeDataField);
  const currentDataMeta = DATA_FIELD_LABELS[activeDataField];
  const canGoBack = step > 0;
  const selectedGoal = GOAL_OPTIONS.find((item) => item.key === form.lifeGoal);
  const selectedStyle = STYLE_OPTIONS.find((item) => item.key === form.songCreativeStyle);
  const selectedVoice = EMOTIONAL_VOICE_OPTIONS.find((item) => item.key === form.vocalGenderPreference);

  function getPrimaryButtonLabel() {
    if (loading) return '易經正在準備你的生命歌曲...';
    if (step === 0) return '下一步：選擇歌曲質感';
    if (step === 1) return '下一步：選擇主唱聲線';
    if (step === 2) return '下一步：填寫資料';
    if (step === 3) {
      if (activeDataField === 'birthDate') return '下一步：選擇血型';
      if (activeDataField === 'bloodType') return '下一步：輸入姓名';
      if (activeDataField === 'name') return '下一步：確認性別';
      if (activeDataField === 'gender') return '下一步：選擇時辰';
      return '下一步：確認生成';
    }
    return '開始生成 易經生命歌曲';
  }

  const stepLabel = step === 0
    ? 'STEP 1 / 5'
    : step === 1
      ? 'STEP 2 / 5'
      : step === 2
        ? 'STEP 3 / 5'
        : step === 3
          ? `STEP 4 / 5 資料 ${currentDataIndex + 1}/${DATA_FIELD_ORDER.length}`
          : 'STEP 5 / 5';
  const stepTitle = step === 0
    ? '這首歌要陪你完成什麼'
    : step === 1
      ? '選擇歌曲的情緒質感'
      : step === 2
        ? '先聽見主唱的情緒'
        : step === 3
          ? currentDataMeta.label
          : '易經已準備好開始創作';
  const stepHint = step === 0
    ? '先鎖定人生主題，歌曲才會像寫給你。'
    : step === 1
      ? '選擇曲風，決定這首歌是溫柔、釋放、還是電影感。'
      : step === 2
        ? '這一步會把男聲或女聲的情緒標籤送到後端，讓 易經依照聲線創作。'
        : step === 3
          ? currentDataMeta.hint
          : '確認後，易經會整合生命主題、聲線、資料與五元素，產生歌曲方向。';

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
            <p>第一道</p>
            <h3>先選這首歌的心事</h3>
            <span>不要一次塞滿資訊，先讓 易經知道這首歌要陪你面對哪件事。</span>
          </div>
          {showMissingGoal && <p className="form-missing-alert">請先選擇一個生命主題。</p>}
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
            placeholder="可以補一句心裡話，例如：我想把撐了很久的自己唱出來。"
            onChange={(event) => setForm((prev) => ({ ...prev, lifeGoalNote: event.target.value }))}
            className="form-input min-h-[96px] w-full resize-none text-base neon-input-focus glass-input glass-input-cyan"
          />
        </div>
      )}

      {step === 1 && (
        <div ref={(node) => { fieldRefs.current.style = node; }} className={`music-flow-stage-card music-flow-stage-card--generate space-y-5 ${showMissingStyle ? 'music-required-field--missing' : ''}`}>
          <div className="music-flow-stage-heading">
            <p>第二道</p>
            <h3>選擇歌曲的鏡頭感</h3>
            <span>這裡決定客戶聽到時，是想哭、想擁抱自己，還是想重新出發。</span>
          </div>
          {showMissingStyle && <p className="form-missing-alert">請選擇一種歌曲質感。</p>}
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

      {step === 2 && (
        <div ref={(node) => { fieldRefs.current.voice = node; }} className={`music-flow-stage-card music-flow-stage-card--voice space-y-5 ${showMissingVoice ? 'music-required-field--missing' : ''}`}>
          <div className="music-flow-stage-heading">
            <p>第三道</p>
            <h3>選擇會打動人的主唱</h3>
            <span>先選一種「全世界最有磁性、聽了會噴淚」的聲線類型，再選男聲或女聲。聲音與歌詞會綁在一起生成。</span>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-black text-amber-100">磁性聲線類型（每種都能配男聲／女聲）</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MAGNETIC_VOICE_ARCHETYPES.map((archetype) => {
                const active = form.magneticVoiceType === archetype.key;
                return (
                  <button
                    key={archetype.key}
                    type="button"
                    onClick={() => selectMagneticVoiceType(archetype.key)}
                    aria-pressed={active}
                    className={`rounded-[20px] border p-4 text-left transition-all ${active ? 'border-amber-300/75 bg-amber-300/12 shadow-[0_0_26px_rgba(251,191,36,0.18)]' : 'border-white/10 bg-white/[0.04] hover:border-amber-200/35 hover:bg-white/[0.07]'}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black tracking-[0.16em] text-amber-100/80">{archetype.badge}</span>
                      <span className={`text-[10px] font-black ${active ? 'text-amber-200' : 'text-white/40'}`}>{active ? '已選' : '選擇'}</span>
                    </span>
                    <span className="mt-1.5 block text-lg font-black leading-tight text-[color:var(--text-main)]">{archetype.label}</span>
                    <span className="mt-2 block text-xs font-semibold leading-6 text-violet-50">{archetype.headline}</span>
                    <span className="mt-1 block text-[11px] font-semibold leading-5 text-[color:var(--text-sub)]">{archetype.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {showMissingVoice && <p className="form-missing-alert">請先選擇一種主唱聲線。</p>}
          <p className="text-sm font-black text-amber-100">選擇主唱性別</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {EMOTIONAL_VOICE_OPTIONS.map((option) => {
              const active = form.vocalGenderPreference === option.key;
              return (
                <article
                  key={option.key}
                  className={`rounded-[22px] border p-4 transition-all ${active ? 'border-amber-300/70 bg-amber-300/12 shadow-[0_0_28px_rgba(251,191,36,0.18)]' : showMissingVoice ? 'border-rose-400/80 bg-rose-500/10' : 'border-white/10 bg-white/[0.04] hover:border-cyan-200/35'}`}
                >
                  <button
                    type="button"
                    onClick={() => selectVoice(option)}
                    className="w-full text-left"
                    aria-pressed={active}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-[11px] font-black tracking-[0.18em] text-amber-100/80">{option.badge}</span>
                        <span className="mt-1 block text-xl font-black leading-tight text-[color:var(--text-main)]">{option.label}</span>
                      </span>
                      <span className={`choice-signal ${active ? 'choice-signal--done' : 'choice-signal--idle'}`}>
                        {active ? '已選' : '選擇'}
                      </span>
                    </span>
                    <span className="mt-3 block text-sm font-black leading-7 text-violet-50">{option.headline}</span>
                    <span className="mt-2 block text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{option.hint}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      selectVoice(option);
                      playVoicePreview(option);
                    }}
                    className="mt-4 w-full rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-xs font-black text-cyan-100 transition hover:border-cyan-200/55 hover:bg-cyan-300/16"
                  >
                    試聽這個聲線
                  </button>
                </article>
              );
            })}
          </div>
          {selectedVoice && (
            <div className="music-voice-selected-note">
              <strong>已鎖定：{selectedVoice.label}</strong>
              <span>後端會以「{selectedVoice.headline}」作為主唱方向，讓歌曲更有情緒記憶點。</span>
            </div>
          )}
        </div>
      )}

      {step === 3 && activeDataField === 'birthDate' && (
        <div ref={(node) => { fieldRefs.current.birthDate = node; }} className={`music-required-field music-flow-stage-card music-flow-stage-card--data space-y-4 ${showMissingBirthDate ? 'music-required-field--missing' : ''}`}>
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">生日協助 易經找出節奏與生命週期，讓歌曲不只是好聽，而是更像你的故事。</p>
          <LunarBirthdayInput
            value={form.birthDate}
            onChange={(solarDate) => {
              setForm((prev) => ({ ...prev, birthDate: solarDate }));
              clearValidation();
            }}
            accent="violet"
          />
          {showMissingBirthDate && <p className="form-missing-alert">請完成生日資料。</p>}
        </div>
      )}

      {step === 3 && activeDataField === 'bloodType' && (
        <div ref={(node) => { fieldRefs.current.bloodType = node; }} className={`music-required-field space-y-4 ${showMissingBloodType ? 'music-required-field--missing' : ''}`}>
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">血型作為輔助氣質，協助 易經調整歌曲的速度、情緒厚度與表達方式。</p>
          {showMissingBloodType && <p className="form-missing-alert">請選擇血型。</p>}
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

      {step === 3 && (activeDataField === 'name' || activeDataField === 'gender') && (
        <div className="space-y-5">
          <div ref={(node) => { fieldRefs.current.name = node; }} className={`music-required-field ${activeDataField === 'name' ? '' : 'hidden'} ${showMissingName ? 'music-required-field--missing' : ''}`}>
            <p className="mb-4 text-sm leading-6 text-[color:var(--text-sub)]">姓名會被轉成歌曲的核心稱呼與情緒記憶點。</p>
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
            {showMissingName && <p className="form-missing-alert">姓名至少需要 2 個字，且不可超過 20 個字。</p>}
          </div>

          <div ref={(node) => { fieldRefs.current.gender = node; }} className={`music-required-field ${activeDataField === 'gender' ? '' : 'hidden'} ${showMissingGender ? 'music-required-field--missing' : ''}`}>
            <p className="mb-2 text-xs text-[color:var(--text-muted)]">性別只用來調整歌曲敘事視角，不會限制歌曲內容。</p>
            {showMissingGender && <p className="form-missing-alert">請確認性別。</p>}
            <div className="grid grid-cols-2 gap-3">
              {(['female', 'male'] as Gender[]).map((gender) => (
                <FriendlyChoiceCard
                  key={gender}
                  active={selectionConfirm.gender && form.gender === gender}
                  title={gender === 'female' ? '女性' : '男性'}
                  description={gender === 'female' ? '細膩、溫柔、情緒層次清楚。' : '沉穩、直接、力量感明確。'}
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

      {step === 3 && activeDataField === 'shichen' && (
        <div ref={(node) => { fieldRefs.current.shichen = node; }} className={`music-required-field space-y-5 ${showMissingShichen ? 'music-required-field--missing' : ''}`}>
          <p className="text-sm leading-6 text-[color:var(--text-sub)]">時辰能補足歌曲裡的時間感與命運感；不知道時辰也可以繼續。</p>
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({ ...prev, shichen: 'unknown' }));
              clearValidation();
            }}
            className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${form.shichen === 'unknown' ? 'border-emerald-400 bg-emerald-400/15' : showMissingShichen ? 'border-rose-400/85 bg-rose-500/12 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : 'border-white/15 bg-white/5 hover:border-white/25'}`}
          >
            <p className={`text-base font-bold ${form.shichen === 'unknown' ? 'text-emerald-300' : 'text-[color:var(--text-main)]'}`}>不確定出生時辰</p>
            <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">易經會以已知資料生成，不會卡住流程。</p>
          </button>
          {showMissingShichen && <p className="form-missing-alert">請選擇時辰，或選擇不確定。</p>}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="shrink-0 text-xs text-[color:var(--text-muted)]">知道時辰可以直接選</span>
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

      {step === 4 && (
        <div className="space-y-4">
          <div className="music-flow-stage-card music-flow-stage-card--generate">
            <div className="music-flow-stage-heading">
              <p>最後一道</p>
              <h3>確認後，易經開始為你出歌</h3>
              <span>不是單純分析，而是把人生主題、主唱聲線、資料與五元素整合成一首歌。</span>
            </div>
            <div className="music-generate-ready-note">
              <strong>易經已完成歌曲準備</strong>
              <span>主題：{selectedGoal?.label}。質感：{selectedStyle?.label}。主唱：{selectedVoice?.label}。下一步將產生歌名、歌詞方向、演唱建議與完整創作藍圖。</span>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="mb-3 space-y-1">
                <p className="text-sm font-semibold text-amber-100">歌曲語言</p>
                <p className="text-xs leading-6 text-[color:var(--text-muted)]">預設使用國語，讓台灣客戶更容易聽懂情緒。</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
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
