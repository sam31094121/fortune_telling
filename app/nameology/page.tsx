'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import FriendlyChoiceCard from '@/components/FriendlyChoiceCard';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import type { BloodType, Gender } from '@/lib/types';
import type { NameologyAnalysis, NameologyProfessionalCharacter, NameologyRitualStep } from '@/lib/nameology-engine';
import type { FiveElementIntegrationResult } from '@/lib/five-element-engine';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage, IDENTITY_TARGET_UPDATED_EVENT } from '@/lib/identity-split-client';
import { readNameologySelfProfile, saveNameologySelfProfile } from '@/lib/nameology-self-profile';
import { emptyCanonicalBirthProfile } from '@/lib/canonical-birth-profile';
import { readCanonicalBirthProfile, saveCanonicalBirthProfile } from '@/lib/canonical-birth-profile-client';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import MegaInputGuide from '@/components/MegaInputGuide';
import { clearDailyAnalysis, getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';
import { TAROT_CARD_BACK_URL } from '@/features/tarot/constants/cardBack';
import { deriveNameologyTotalBeast } from '@/lib/nameology-total-beast';
import StarBeastLineageReveal from '@/components/StarBeastLineageReveal';

type NameologyResponse = {
  ok: boolean;
  mode: 'nameology';
  analysis: NameologyAnalysis;
  fiveElement: FiveElementIntegrationResult;
};

type FormState = {
  name: string;
  birthDate: string;
  bloodType: Exclude<BloodType, ''>;
  gender: Gender;
};

type SelectionConfirm = { bloodType: boolean; gender: boolean };
type NameologyDailyResult = { analysis: NameologyAnalysis; fiveElement: FiveElementIntegrationResult };


const BLOOD_TYPES: Array<Exclude<BloodType, ''>> = ['A', 'B', 'AB', 'O'];

const initialForm: FormState = {
  name: '',
  birthDate: '',
  bloodType: 'O',
  gender: 'male',
};

const initialSelectionConfirm: SelectionConfirm = { bloodType: false, gender: false };
const NAMEOLOGY_DAILY_SCHEMA_VERSION = 'nameology-ultimate-engine-v4.0.0';

function isCurrentNameologyResult(value?: NameologyDailyResult | null) {
  return Boolean(value?.analysis?.standardOutput?.moduleVersion === '4.0.0' && value.analysis.standardOutput.verification?.readyForFrontend && value.fiveElement);
}

function isCurrentNameologyRecord(record?: DailyAnalysisRecord<NameologyDailyResult> | null) {
  return Boolean(record?.meta?.schemaVersion === NAMEOLOGY_DAILY_SCHEMA_VERSION && isCurrentNameologyResult(record.result));
}

type NameologyCharacterResult = NameologyAnalysis['characters'][number];
type NameologyEssenceSignal = NameologyAnalysis['standardOutput']['layer2']['mergedSignals'][number];

const NAMEOLOGY_ESSENCE_DIMENSION_LABEL: Record<NameologyEssenceSignal['dimension'], string> = {
  ACTION: '行動推進',
  STABILITY: '穩定累積',
  COMMUNICATION: '表達溝通',
  RELATIONSHIP: '人際信任',
  DECISION: '判斷選擇',
  CREATIVITY: '創意生成',
  DISCIPLINE: '規則紀律',
  EMOTION: '情緒感受',
  LEADERSHIP: '領導承擔',
};

const NAMEOLOGY_ESSENCE_DIMENSION_HINT: Record<NameologyEssenceSignal['dimension'], string> = {
  ACTION: '把想法變成看得見的進度。',
  STABILITY: '先穩住節奏，再累積長期信任。',
  COMMUNICATION: '把意思說清楚，讓人願意跟上。',
  RELATIONSHIP: '用互動、理解與回應建立連結。',
  DECISION: '把猶豫收斂成可以執行的選擇。',
  CREATIVITY: '把靈感整理成作品或新的可能。',
  DISCIPLINE: '用規則與持續性保護成果。',
  EMOTION: '先理解感受，再讓判斷回到清楚。',
  LEADERSHIP: '主動承擔方向，讓事情有主心骨。',
};
function isNonTaiwanScriptNameologyChar(item: NameologyCharacterResult) {
  return item.dictionaryGateStatus === 'non_taiwan_script';
}

function nameologyRadicalLine(item: NameologyCharacterResult) {
  if (item.strokeSource === 'dictionary_file') return <>部首：{item.glyph.radical} · 總筆畫：{item.strokeCount}</>;
  if (isNonTaiwanScriptNameologyChar(item)) return <>不適用臺灣字典部首</>;
  return <>部首：待補臺灣部首 · 筆畫暫估：{item.strokeCount}</>;
}

function nameologyRadicalStatusLine(item: NameologyCharacterResult) {
  if (item.strokeSource === 'dictionary_file') return `${item.element}${item.yinYang} · 臺灣字典命中 · 後端意境分析`;
  if (isNonTaiwanScriptNameologyChar(item)) return '非臺灣漢字姓名用字 · 不拆部首';
  return '待補臺灣字典 · 不猜部首';
}

const RADICAL_ELEMENT_STYLE: Record<'木' | '火' | '土' | '金' | '水', { ring: string; bg: string; text: string; glow: string }> = {
  木: { ring: 'border-emerald-300/50', bg: 'bg-emerald-950/40', text: 'text-emerald-100', glow: 'shadow-[0_0_24px_rgba(52,211,153,0.22)]' },
  火: { ring: 'border-rose-300/50', bg: 'bg-rose-950/40', text: 'text-rose-100', glow: 'shadow-[0_0_24px_rgba(251,113,133,0.22)]' },
  土: { ring: 'border-amber-300/50', bg: 'bg-amber-950/40', text: 'text-amber-100', glow: 'shadow-[0_0_24px_rgba(251,191,36,0.22)]' },
  金: { ring: 'border-zinc-200/50', bg: 'bg-zinc-800/50', text: 'text-zinc-100', glow: 'shadow-[0_0_24px_rgba(228,228,231,0.18)]' },
  水: { ring: 'border-cyan-300/50', bg: 'bg-cyan-950/40', text: 'text-cyan-100', glow: 'shadow-[0_0_24px_rgba(103,232,249,0.22)]' },
};
type NameologyBridgeElement = NameologyAnalysis['standardOutput']['integrationSignals']['firstSupportElement'];

const NAMEOLOGY_TAROT_BRIDGE: Record<NameologyBridgeElement, { label: string; cardName: string; cardNameEn: string; imageUrl: string; meaning: string; action: string }> = {
  AIR: {
    label: '風元素 · 資源轉化',
    cardName: '魔術師',
    cardNameEn: 'The Magician',
    imageUrl: '/tarot/freecodecamp-js-fortune-teller/assets/img/cards/major/magician.png',
    meaning: '姓名訊號正在提醒你把手上的資源整理成可執行的一步。',
    action: '下一步塔羅可問：我目前最該先整合哪一項資源？',
  },
  SPACE: {
    label: '空元素 · 內在答案',
    cardName: '女祭司',
    cardNameEn: 'The High Priestess',
    imageUrl: '/tarot/freecodecamp-js-fortune-teller/assets/img/cards/major/high-priestess.png',
    meaning: '姓名訊號正在提醒你先聽見內在答案，再決定要不要行動。',
    action: '下一步塔羅可問：我還沒承認的真正答案是什麼？',
  },
  WATER: {
    label: '水元素 · 修復與流動',
    cardName: '星星',
    cardNameEn: 'The Star',
    imageUrl: '/tarot/freecodecamp-js-fortune-teller/assets/img/cards/major/star.png',
    meaning: '姓名訊號正在提醒你用修復、流動與長期希望重新校準狀態。',
    action: '下一步塔羅可問：我現在最需要如何恢復力量？',
  },
  FIRE: {
    label: '火元素 · 方向推進',
    cardName: '戰車',
    cardNameEn: 'The Chariot',
    imageUrl: '/tarot/freecodecamp-js-fortune-teller/assets/img/cards/major/chariot.png',
    meaning: '姓名訊號正在提醒你把能量集中到清楚方向，不再分散衝刺。',
    action: '下一步塔羅可問：我該如何把行動集中到正確方向？',
  },
  EARTH: {
    label: '地元素 · 結構承擔',
    cardName: '皇帝',
    cardNameEn: 'The Emperor',
    imageUrl: '/tarot/freecodecamp-js-fortune-teller/assets/img/cards/major/emperor.png',
    meaning: '姓名訊號正在提醒你建立穩定規則，讓承擔變成可長久的結構。',
    action: '下一步塔羅可問：我需要建立哪一條界線或規則？',
  },
};
function RadicalPictureStory({ item }: { item: NameologyProfessionalCharacter }) {
  if (!item.taiwanDictionaryMatched) {
    return (
      <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-950/20 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-100">臺灣字典待補</p>
        <p className="mt-2 text-sm font-bold leading-7 text-rose-50">{item.char} 尚未命中臺灣繁體姓名字典，系統不猜部首。</p>
        <p className="mt-2 text-xs leading-6 text-rose-100/80">目前只保留筆畫估算與待補提示；補入官方部首、部首外筆畫、總筆畫後，後端才會產生部首意境並傳給前端。</p>
      </div>
    );
  }

  const style = RADICAL_ELEMENT_STYLE[item.element];
  const steps = [
    { label: '① 部首長什麼樣子', text: `由「${item.parts.join('、') || item.radical}」組成，結構是${item.structure}。` },
    { label: '② 部首的意象', text: item.radicalImagery },
    { label: '③ 取名的心意', text: item.namingIntent },
    { label: '④ 這個字的故事', text: item.storyLine },
  ];

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">看圖說故事 · 部首「{item.radical}」</p>
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 ${style.ring} ${style.bg} ${style.glow}`}>
          <span className={`font-serif text-4xl font-black ${style.text}`}>{item.radical}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          {steps.map((step) => (
            <div key={step.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] font-black tracking-[0.14em] text-white/50">{step.label}</p>
              <p className="mt-1 break-words text-xs leading-6 text-[color:var(--text-main)]">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfessionalNameologyLayer({ analysis }: { analysis: NameologyAnalysis }) {
  const layer = analysis.professionalLayer;
  if (!layer?.characterDecomposition?.length) return null;

  const infoItems = [
    { label: '\u59d3\u6c0f', value: layer.nameStructure.surname || '-' },
    { label: '\u540d\u5b57', value: layer.nameStructure.givenName || '-' },
    { label: '\u7e3d\u5b57\u6578', value: String(layer.nameStructure.totalCharacters) + '\u5b57' },
  ];

  return (
    <section className="fortune-card overflow-hidden border-cyan-300/20 bg-slate-950/60 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">PROFESSIONAL LAYER</p>
          <h2 className="mt-3 break-words font-serif text-3xl font-black text-cyan-100 sm:text-4xl">
            {'\u7b2c\u4e00\u5c64\uff5c\u5c08\u696d\u59d3\u540d\u62c6\u89e3'}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
            {'\u6b64\u5c64\u53ea\u5efa\u7acb\u59d3\u540d\u62c6\u89e3\u3001\u90e8\u9996\u610f\u5883\u3001\u5b57\u7fa9\u89e3\u8aaa\u8207\u540d\u5b57\u6545\u4e8b\uff0c\u4e0d\u505a\u4e94\u5143\u7d20\u88dc\u5f37\u5efa\u8b70\u3002'}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 lg:w-[280px]">
          {infoItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
              <p className="text-[11px] text-[color:var(--text-muted)]">{item.label}</p>
              <p className="mt-1 break-words text-sm font-black text-cyan-100">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {layer.characterDecomposition.map((item) => (
          <article key={String(item.position) + '-' + item.char} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(8,13,30,0.26)]">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-950/25 font-serif text-4xl font-black text-amber-100">
                {item.char}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-100">{item.role}</span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-950/20 px-3 py-1 text-xs text-amber-100">{item.taiwanDictionaryMatched ? <>{item.strokeCount}{'\u756b'} {'\u00b7'} {item.element}{item.yinYang}</> : <>{item.strokeCount}{'\u756b'}估算</>}</span>
                  <span className={`rounded-full border px-3 py-1 text-xs ${item.taiwanDictionaryMatched ? 'border-white/10 bg-black/20 text-[color:var(--text-sub)]' : 'border-rose-300/25 bg-rose-950/20 text-rose-100'}`}>{item.taiwanDictionaryMatched ? <>{'\u90e8\u9996'} {item.radical}</> : '待補臺灣部首'}</span>
                </div>
                <p className="mt-3 break-words text-sm leading-7 text-[color:var(--text-main)]">{item.glyphMeaning}</p>
                {item.sourceSummary && <p className="mt-2 rounded-xl border border-cyan-300/15 bg-cyan-950/15 px-3 py-2 text-[11px] font-bold leading-6 text-cyan-100/85">{item.sourceSummary}</p>}
                {!item.taiwanDictionaryMatched && <p className="mt-2 rounded-xl border border-rose-300/20 bg-rose-950/20 px-3 py-2 text-xs font-bold leading-6 text-rose-100">此字未命中臺灣字典，不宣告正式部首。</p>}
              </div>
            </div>

            <RadicalPictureStory item={item} />

            <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
              <p className="text-[11px] font-bold text-rose-200">{'\u5f8c\u7e8c\u6f14\u5316\u7d20\u6750'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.evolutionMaterial.slice(0, 4).map((material) => (
                  <span key={material} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[color:var(--text-sub)]">{material}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-950/15 p-4">
          <p className="text-xs font-bold text-cyan-200">{'\u90e8\u9996\u4e3b\u8ef8'}</p>
          <p className="mt-2 break-words text-sm leading-7 text-[color:var(--text-sub)]">{layer.radicalNarrative}</p>
        </div>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-950/15 p-4">
          <p className="text-xs font-bold text-amber-200">{'\u540d\u5b57\u6545\u4e8b'}</p>
          <p className="mt-2 break-words text-sm leading-7 text-[color:var(--text-sub)]">{layer.nameStory}</p>
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">NAMING STORY</p>
            <h3 className="mt-2 font-serif text-2xl font-black text-amber-100">{layer.namingStory.title}</h3>
            <p className="mt-3 break-words text-sm font-semibold leading-7 text-amber-50">{layer.namingStory.wholeNameIntent}</p>
            <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{layer.namingStory.givenNameIntent}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-violet-300/15 bg-violet-950/15 p-4">
          <p className="text-xs font-bold text-violet-200">{'\u5c08\u696d\u6458\u8981'}</p>
          <p className="mt-2 break-words text-sm leading-7 text-[color:var(--text-sub)]">{layer.professionalSummary}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-bold text-[color:var(--text-main)]">{'\u5c64\u7d1a\u908a\u754c'}</p>
        <ul className="mt-2 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
          {layer.readingBoundaries.map((item) => <li key={item}>{'\u00b7'} {item}</li>)}
        </ul>
      </div>
    </section>
  );
}

const BLOOD_DESC: Record<Exclude<BloodType, ''>, string> = {
  A: '細膩穩定，重視秩序、承諾與安全感。',
  B: '自主鮮明，重視自由、節奏與個人風格。',
  AB: '理性感性並存，觀察力與整合力較明顯。',
  O: '主動直接，行動力、號召力與外放感較強。',
};



function NameologyThreeLayerSystem({ analysis }: { analysis: NameologyAnalysis }) {
  const presentation = analysis.threeLayerPresentation;
  if (!presentation?.cards?.length) return null;

  const toneByLayer: Record<string, { border: string; bg: string; text: string; badge: string }> = {
    taiwan_dictionary_radical: { border: 'border-cyan-300/25', bg: 'bg-cyan-950/20', text: 'text-cyan-100', badge: 'bg-cyan-300 text-slate-950' },
    ai_interpretation: { border: 'border-violet-300/25', bg: 'bg-violet-950/20', text: 'text-violet-100', badge: 'bg-violet-300 text-slate-950' },
    action_reinforcement: { border: 'border-amber-300/25', bg: 'bg-amber-950/20', text: 'text-amber-100', badge: 'bg-amber-300 text-slate-950' },
  };

  return (
    <section className="fortune-card overflow-hidden border-white/10 bg-slate-950/60 p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">THREE LAYER SYSTEM</p>
          <h2 className="mt-3 break-words font-serif text-3xl font-black text-cyan-100 sm:text-4xl">{presentation.title}</h2>
          <p className="mt-3 max-w-4xl text-sm font-semibold leading-8 text-[color:var(--text-sub)]">{presentation.summary}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold leading-6 text-[color:var(--text-sub)]">後端統一運算 · 前端分層呈現</div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {presentation.cards.map((card) => {
          const tone = toneByLayer[card.layerKey] ?? toneByLayer.taiwan_dictionary_radical;
          return (
            <article key={card.layerKey} className={`min-w-0 rounded-2xl border ${tone.border} ${tone.bg} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${tone.text}`}>{card.eyebrow}</p>
                  <h3 className="mt-2 break-words font-serif text-2xl font-black text-[color:var(--text-main)]">{card.title}</h3>
                </div>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${tone.badge}`}>{card.order}</span>
              </div>
              <p className={`mt-3 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black ${tone.text}`}>{card.status}</p>
              <p className="mt-4 break-words text-sm font-black leading-7 text-[color:var(--text-main)]">{card.primary}</p>
              {card.layerKey === 'taiwan_dictionary_radical' && (
                <div className="mt-3 rounded-xl border border-amber-200/20 bg-amber-950/20 px-3 py-2">
                  <p className="text-[11px] font-black tracking-[0.16em] text-amber-100/80">取名說故事</p>
                  <p className="mt-1 line-clamp-5 break-words text-xs font-semibold leading-6 text-amber-50">{card.detail}</p>
                </div>
              )}
              {card.layerKey !== 'taiwan_dictionary_radical' && <p className="mt-3 line-clamp-4 break-words text-xs leading-6 text-[color:var(--text-sub)]">{card.detail}</p>}
              <div className="mt-4 space-y-2">
                {card.bullets.slice(0, 3).map((item) => (
                  <p key={item} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold leading-6 text-[color:var(--text-main)]">{item}</p>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NameologyAiFlowLayers({ analysis }: { analysis: NameologyAnalysis }) {
  const layer2 = analysis.aiInterpretationLayer;
  const layer3 = analysis.reinforcementLayer;
  if (!layer2?.interpretationPoints?.length || !layer3?.priorities?.length) return null;

  return (
    <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="fortune-card border-violet-300/20 bg-slate-950/55 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-300">AI INTERPRETATION</p>
        <h2 className="mt-3 break-words font-serif text-3xl font-black text-violet-100 sm:text-4xl">
          {'\u7b2c\u4e8c\u5c64\uff5cAI \u6df1\u5ea6\u89e3\u8b80'}
        </h2>
        <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{layer2.userReadableSummary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {layer2.focusElements.map((element, index) => (
            <span key={String(index) + element} className="rounded-full border border-violet-300/20 bg-violet-950/25 px-3 py-1 text-xs font-bold text-violet-100">
              {'\u89e3\u8b80\u8ef8'} {index + 1} {'\u00b7'} {element}
            </span>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {layer2.interpretationPoints.map((point) => (
            <article key={point.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold text-violet-200">{point.title}</p>
              <p className="mt-2 break-words text-sm leading-7 text-[color:var(--text-main)]">{point.reading}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {point.sourceEvidence.slice(0, 3).map((evidence) => (
                  <span key={evidence} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-[color:var(--text-sub)]">{evidence}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-bold text-cyan-200">{'\u6027\u683c\u6545\u4e8b'}</p>
            <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{layer2.personalityStory}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-bold text-amber-200">{'\u95dc\u4fc2\u98a8\u683c'}</p>
            <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{layer2.relationshipStyle}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-bold text-rose-200">{'\u96b1\u6027\u62c9\u626f'}</p>
            <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{layer2.hiddenTension}</p>
          </div>
        </div>
      </div>

      <div className="fortune-card border-amber-300/25 bg-amber-950/10 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">AI REINFORCEMENT</p>
        <h2 className="mt-3 break-words font-serif text-3xl font-black text-amber-100 sm:text-4xl">
          {'\u7b2c\u4e09\u5c64\uff5cAI \u88dc\u5f37\u65b9\u6848'}
        </h2>
        <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4 text-sm font-bold leading-8 text-amber-100">
          {layer3.clearStatement}
        </p>
        <div className="mt-5 space-y-3">
          {layer3.priorities.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[color:var(--text-main)]">{item.label}</p>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-950/30 text-lg font-black text-amber-100">{item.element}</span>
              </div>
              <p className="mt-3 text-sm font-bold leading-7 text-amber-100">{item.direction}</p>
              <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-sub)]">{item.reason}</p>
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-[color:var(--text-main)]">{item.action}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-[color:var(--text-sub)]">
          {layer3.executionPrinciple}
        </p>
      </div>
    </section>
  );
}


function NameologyCustomerSummary({ analysis }: { analysis: NameologyAnalysis }) {
  const firstPriority = analysis.reinforcementLayer?.priorities?.[0];
  const secondPriority = analysis.reinforcementLayer?.priorities?.[1];
  const topTendencies = analysis.temperamentProfile.topTendencies.slice(0, 3);
  const dictionaryStatus = analysis.dictionaryStatus;
  const dictionaryTone = dictionaryStatus.estimatedCharacters > 0
    ? `待補 ${dictionaryStatus.estimatedCharacters} 字：不猜部首`
    : dictionaryStatus.exactMatches > 0
      ? '臺灣字典全數命中'
      : '未檢出需要臺灣部首的漢字';

  return (
    <section className="fortune-card overflow-hidden border-amber-300/30 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),rgba(15,23,42,0.86)_58%,rgba(2,6,23,0.96)_100%)] p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200">NAME DICTIONARY V1</p>
          <h2 className="mt-3 break-words font-serif text-3xl font-black leading-tight text-amber-100 sm:text-5xl">
            {analysis.name} 的姓名支點
          </h2>
          <p className="mt-4 text-sm font-semibold leading-8 text-[color:var(--text-sub)]">
            AI 已先讀取臺灣繁體姓名字典，先確認每個字的部首與總筆畫，再整合生日、血型與性別。客戶第一眼只看結論：姓名如何被記住、今天先補哪一個方向、下一步怎麼做。
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:w-[260px]">
          <div className="rounded-2xl border border-amber-200/25 bg-amber-950/30 p-4 text-center">
            <p className="text-[11px] font-bold text-amber-100/75">姓名分數</p>
            <p className="mt-1 text-4xl font-black text-amber-100">{analysis.score}</p>
          </div>
          <div className="rounded-2xl border border-cyan-200/20 bg-cyan-950/25 p-4 text-center">
            <p className="text-[11px] font-bold text-cyan-100/75">字典信心</p>
            <p className="mt-1 text-4xl font-black text-cyan-100">{dictionaryStatus.confidence}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black text-amber-100">第一補強</p>
          <p className="mt-2 text-2xl font-black text-[color:var(--text-main)]">{firstPriority?.element ?? '-'}</p>
          <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{firstPriority?.direction ?? '先完成姓名學資料，系統會自動產生補強方向。'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black text-cyan-100">性格主軸</p>
          <p className="mt-2 text-sm font-bold leading-7 text-[color:var(--text-main)]">{topTendencies.map((item) => item.label).join('、')}</p>
          <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{analysis.crossCheck.alignmentLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black text-emerald-100">字典狀態</p>
          <p className="mt-2 text-sm font-bold leading-7 text-[color:var(--text-main)]">{dictionaryTone}</p>
          <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">
            命中 {dictionaryStatus.exactMatches}/{dictionaryStatus.totalCharacters} 字，估算 {dictionaryStatus.estimatedCharacters} 字。
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-200/20 bg-cyan-950/20 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">臺灣字典部首</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {analysis.characters.map((item) => (
            <div key={`${item.char}-${item.position}`} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-lg font-black text-[color:var(--text-main)]">{item.char}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-cyan-100">{nameologyRadicalLine(item)}</p>
              <p className="text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">{nameologyRadicalStatusLine(item)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-950/20 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">今天只做一件事</p>
        <p className="mt-3 text-sm font-black leading-8 text-amber-50">{firstPriority?.action ?? analysis.recommendations[0]}</p>
        {secondPriority && <p className="mt-2 text-xs leading-6 text-amber-100/75">完成後再補：{secondPriority.element}，不要一次塞太多任務。</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-[color:var(--text-muted)]">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">字典版本：{dictionaryStatus.version}</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">規則：{analysis.ruleVersion}</span>
        {dictionaryStatus.estimatedCharacterList.length > 0 && (
          <span className="rounded-full border border-rose-200/20 bg-rose-950/20 px-3 py-1 text-rose-100">待補字：{dictionaryStatus.estimatedCharacterList.join('、')}</span>
        )}
      </div>
    </section>
  );
}
function NameologyUltimateDecisionPanel({ analysis }: { analysis: NameologyAnalysis }) {
  const output = analysis.standardOutput;
  const layer1 = output.layer1;

  return (
    <section className="fortune-card overflow-hidden border-amber-300/35 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(15,23,42,0.90)_58%,rgba(2,6,23,0.98)_100%)] p-5 sm:p-7">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">AI NAME JUDGEMENT</p>
        <h2 className="mt-3 break-words font-serif text-4xl font-black leading-tight text-amber-100 sm:text-5xl">{output.name.normalized}</h2>
        <p className="mt-3 text-sm font-bold leading-7 text-cyan-100">台灣正體字典資料已確認</p>
        <p className="text-sm font-bold leading-7 text-cyan-100">後端姓名結構運算已完成</p>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200/25 bg-black/25 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">AI 最終判定</p>
        <p className="mt-3 break-words text-base font-black leading-8 text-amber-50">AI 判定：{layer1.coreJudgment}</p>
      </div>

      <div className="mt-4 grid gap-3">
        <article className="min-w-0 rounded-2xl border border-rose-200/15 bg-rose-950/15 p-4">
          <p className="text-xs font-black text-rose-100">目前必須停止</p>
          <p className="mt-2 break-words text-base font-bold leading-7 text-rose-50">{layer1.coreObstacle.replace(/^目前必須停止：/, '')}</p>
        </article>
        <article className="min-w-0 rounded-2xl border border-cyan-200/15 bg-cyan-950/15 p-4">
          <p className="text-xs font-black text-cyan-100">第一調整方向</p>
          <p className="mt-2 break-words text-base font-bold leading-7 text-cyan-50">{layer1.firstDirection.replace(/^第一調整方向：/, '')}</p>
        </article>
        <article className="min-w-0 rounded-2xl border border-amber-200/20 bg-amber-950/20 p-4">
          <p className="text-xs font-black text-amber-100">立即行動</p>
          <p className="mt-2 break-words text-base font-black leading-7 text-amber-50">{layer1.immediateAction.replace(/^立即行動：/, '')}</p>
        </article>
      </div>
    </section>
  );
}

function NameologyNamingIntentionCard({ analysis }: { analysis: NameologyAnalysis }) {
  const layer = analysis.professionalLayer;
  const surnameCount = layer.nameStructure.surnameCharacterCount;
  const givenCharacters = layer.characterDecomposition.slice(surnameCount);
  const givenName = layer.nameStructure.givenName || givenCharacters.map((item) => item.char).join('');
  const hopedQualities = Array.from(new Set(givenCharacters.flatMap((item) => item.temperamentSignals.map((signal) => signal.split('：')[0])))).slice(0, 5);

  if (!givenName || givenCharacters.length === 0) return null;

  return (
    <section className="fortune-card overflow-hidden border-amber-200/35 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),rgba(120,53,15,0.18)_38%,rgba(15,23,42,0.94)_74%,rgba(2,6,23,0.99)_100%)] p-5 shadow-[0_18px_60px_rgba(180,83,9,0.18)] sm:p-7">
      <p className="text-[10px] font-black tracking-[0.24em] text-amber-200">NAMING INTENTION</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-3xl font-black leading-tight text-amber-50 sm:text-4xl">當初取名的意境</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-amber-100/85">不是抽象吉凶，而是名字後兩字裡，放進了希望你長成的樣子。</p>
        </div>
        <span className="shrink-0 rounded-2xl border border-amber-200/30 bg-amber-100/10 px-3 py-2 text-center text-xs font-black leading-5 text-amber-100">
          名字<br /><span className="font-serif text-2xl leading-none">{givenName}</span>
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {givenCharacters.map((item) => (
          <article key={`${item.position}-${item.char}`} className="min-w-0 rounded-2xl border border-amber-100/15 bg-black/25 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-200/30 bg-amber-300/10 font-serif text-3xl font-black text-amber-100">{item.char}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-black tracking-[0.16em] text-amber-200">這個字本身的意思</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[color:var(--text-sub)]">{item.primaryMeaning}</p>
              </div>
            </div>
            <div className="mt-3 border-l-2 border-amber-200/60 pl-3">
              <p className="text-[11px] font-black text-amber-200">取名者留在這個字裡的話</p>
              <p className="mt-1 break-words text-sm font-semibold leading-7 text-amber-50">把「{item.char}」放進名字，像是在對孩子說：{item.namingIntent}</p>
            </div>
            {item.temperamentSignals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.temperamentSignals.slice(0, 3).map((signal) => (
                  <span key={signal} className="rounded-full border border-amber-100/15 bg-amber-100/[0.06] px-2.5 py-1 text-[11px] font-bold text-amber-100/85">{signal.split('：')[0]}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200/25 bg-amber-950/25 p-4">
        <p className="text-xs font-black text-amber-200">把「{givenName}」連起來，是一個怎樣的期盼</p>
        <p className="mt-2 break-words text-base font-black leading-8 text-amber-50">取名者透過這兩個字，像是在期盼你把{hopedQualities.join('、') || '自己的長處'}帶進做決定、待人處事與未來想走的路。</p>
        <p className="mt-3 break-words text-sm font-semibold leading-7 text-amber-100/85">{layer.namingStory.wholeNameIntent}</p>
        <p className="mt-3 rounded-xl border border-amber-100/10 bg-black/15 px-3 py-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">判讀邏輯：先讀名字後兩字各自的字義與部首意象，再把兩個字放在一起，整理出取名時想留給下一代的祝福、能力與人生方向。</p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-950/25 p-4">
          <p className="text-xs font-black text-cyan-200">姓氏在姓名中的位置</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-cyan-50">「{layer.nameStructure.surname || '姓氏'}」負責家族脈絡與外在識別，是姓名的根基。</p>
        </div>
        <div className="rounded-2xl border border-amber-200/20 bg-amber-950/25 p-4">
          <p className="text-xs font-black text-amber-200">名字在姓名中的位置</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-amber-50">「{givenName}」承接取名時放進去的期盼；本卡只依字義與部首意象逐字說明。</p>
        </div>
      </div>
    </section>
  );
}

function NameologyCharacterDeckPreview({ analysis }: { analysis: NameologyAnalysis }) {
  const characters = analysis.standardOutput.layer3.characters.slice(0, 4);
  const matchedCount = characters.filter((item) => item.dictionaryMatched).length;

  return (
    <section className="fortune-card overflow-hidden border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),rgba(15,23,42,0.86)_54%,rgba(2,6,23,0.96)_100%)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">NAME CARDS</p>
          <h2 className="mt-2 font-serif text-2xl font-black leading-tight text-cyan-50 sm:text-3xl">姓名拆字卡已生成</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{characters.length} 張字卡 · {matchedCount} 字台灣字典命中</p>
        </div>
        <a href="#nameology-professional-structure" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/15 px-4 text-sm font-black text-cyan-50 transition active:scale-[0.98]">
          看完整部首故事
        </a>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {characters.map((item) => (
          <article key={item.role + item.char} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_45px_rgba(2,6,23,0.24)]">
            <div className="flex items-start justify-between gap-3">
              <p className="font-serif text-5xl font-black leading-none text-amber-100">{item.char}</p>
              <span className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-950/25 px-3 py-1 text-xs font-black text-cyan-100">{item.role}</span>
            </div>
            <p className="mt-4 text-sm font-black text-cyan-100">部首 {item.radical} · {item.strokes}畫</p>
            <p className="mt-2 line-clamp-3 break-words text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item.primaryMeaning}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NameologyTotalBeastCard({ analysis }: { analysis: NameologyAnalysis }) {
  const totalGrid = analysis.grids.find((grid) => grid.key === 'total');
  if (!totalGrid) return null;
  const link = deriveNameologyTotalBeast(totalGrid, analysis.characters.map((item) => item.strokeCount));

  return (
    <section className="fortune-card relative overflow-hidden border-2 border-violet-200/45 bg-[radial-gradient(circle_at_16%_8%,rgba(196,181,253,0.24),rgba(76,29,149,0.28)_36%,rgba(15,23,42,0.96)_72%,rgba(2,6,23,0.99)_100%)] p-4 shadow-[0_20px_70px_rgba(76,29,149,0.30)] sm:p-7">
      <span aria-hidden="true" className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-violet-300/10 blur-3xl" />
      <div className="flex items-start justify-between gap-3">
        <div className="relative min-w-0">
          <p className="text-[10px] font-black tracking-[0.22em] text-violet-200">NAME · TOTAL BEAST</p>
          <h2 className="mt-2 font-serif text-[2rem] font-black leading-tight text-violet-50 sm:text-4xl">{link.beast.name}</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-violet-100/85">你的姓名整體格局，唯一對應的神獸卡</p>
        </div>
        <div className="relative shrink-0 rounded-2xl border border-violet-100/45 bg-black/30 px-3 py-2 text-center shadow-[inset_0_0_20px_rgba(196,181,253,0.10)]">
          <p className="text-[10px] font-black text-violet-100/65">總格</p>
          <p className="mt-1 text-2xl font-black text-violet-50">{totalGrid.value}</p>
          <p className="text-[10px] font-bold text-violet-100/70">{totalGrid.element}行</p>
        </div>
      </div>
      <div className="relative mt-5 grid grid-cols-[124px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[174px_minmax(0,1fr)]">
        <StarBeastLineageReveal
          beast={link.beast}
          context="姓名總格星宿卡"
          className="overflow-hidden rounded-2xl border border-violet-100/30 bg-black/30 p-1.5 shadow-[0_0_38px_rgba(167,139,250,0.36)]"
          imageClassName="aspect-[53/79] w-full rounded-xl object-cover"
          overlayClassName="absolute inset-x-1.5 bottom-1.5 rounded-b-xl bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent px-2 pb-2 pt-10"
          buttonClassName="mt-1 w-full rounded-lg border border-violet-100/30 bg-slate-950/75 px-1 py-1.5 text-[10px] font-black text-violet-50 transition hover:border-violet-100/65"
          showName={false}
        />
        <div className="min-w-0">
          <p className="text-base font-black text-violet-50">{link.beast.coreMeaning}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-violet-100/75">先認識本命神獸的守護力量；神獸幼子是主動深入查看的同血統收藏內容。</p>
          <p className="mt-3 border-l-2 border-violet-200/75 pl-3 text-xs font-semibold leading-6 text-violet-100/85">{link.evidence}</p>
          <p className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-bold leading-5 text-violet-100/85">總格先定五行，再由姓名各字筆畫順序固定選卡。</p>
        </div>
      </div>
    </section>
  );
}
function NameologyTarotBridgeCard({ analysis }: { analysis: NameologyAnalysis }) {
  const [revealed, setRevealed] = useState(false);
  const supportElement = analysis.standardOutput.integrationSignals.firstSupportElement;
  const bridge = NAMEOLOGY_TAROT_BRIDGE[supportElement];
  const firstDirection = analysis.standardOutput.layer1.firstDirection.replace(/^第一調整方向：/, '');

  return (
    <section className="fortune-card overflow-hidden border-violet-300/25 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),rgba(34,211,238,0.08)_42%,rgba(15,23,42,0.88)_100%)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="mx-auto w-[138px] shrink-0 sm:mx-0 sm:w-[156px]">
          <button
            type="button"
            aria-label={revealed ? '重新蓋上姓名塔羅象徵牌' : '翻開姓名塔羅象徵牌'}
            aria-pressed={revealed}
            onClick={() => setRevealed((current) => !current)}
            className="group block w-full overflow-hidden rounded-2xl border border-violet-200/25 bg-black/30 shadow-[0_22px_60px_rgba(88,28,135,0.34)] transition hover:border-violet-100/45 active:scale-[0.98]"
          >
            <img src={revealed ? bridge.imageUrl : TAROT_CARD_BACK_URL} alt={revealed ? `${bridge.cardName} ${bridge.cardNameEn} 塔羅象徵牌` : '蓋牌中的姓名塔羅象徵牌'} loading="lazy" className="aspect-[275/480] w-full object-cover transition duration-500 group-active:scale-[0.985]" />
          </button>
          {!revealed && (
            <p className="mt-3 rounded-full border border-violet-200/20 bg-violet-950/35 px-3 py-2 text-center text-xs font-black leading-5 text-violet-50">
              點一下翻開
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-200">NAMEOLOGY × TAROT</p>
          <h2 className="mt-2 font-serif text-2xl font-black leading-tight text-violet-50 sm:text-3xl">姓名塔羅象徵已蓋牌</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">依姓名學五元素第一補強方向，先蓋牌連接 78 張塔羅素材中的象徵牌。客戶親手翻開後才顯示牌名與下一步；正式塔羅仍由塔羅牌卡獨立完成。</p>

          {!revealed && (
            <div className="mt-4 flex justify-end rounded-2xl border border-white/10 bg-black/20 p-4">
              <button type="button" onClick={() => setRevealed(true)} className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full border border-violet-200/35 bg-violet-300/20 px-4 text-sm font-black text-violet-50 transition active:scale-[0.98]">
                翻開象徵牌
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function NameologyEssenceDetails({ analysis }: { analysis: NameologyAnalysis }) {
  const layer2 = analysis.standardOutput.layer2;
  const visibleSignals = layer2.mergedSignals.slice(0, 3);

  return (
    <details className="fortune-card overflow-hidden border-violet-300/20 bg-slate-950/55 p-5 sm:p-6">
      <summary className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 text-base font-black leading-7 text-violet-100">
        <span>一般模式 · AI 精華分析</span>
        <span className="shrink-0 text-xs font-bold text-violet-100/65">3 個重點</span>
      </summary>
      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-violet-200/15 bg-violet-950/15 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200/80">Simple View</p>
          <p className="mt-2 text-sm font-black leading-7 text-violet-50">AI 已把重複語意整理乾淨，只保留最需要先理解的三件事。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {visibleSignals.map((item, index) => {
            const label = NAMEOLOGY_ESSENCE_DIMENSION_LABEL[item.dimension];
            const hint = NAMEOLOGY_ESSENCE_DIMENSION_HINT[item.dimension];

            return (
              <article key={item.dimension} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_14px_36px_rgba(8,13,30,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-violet-200/15 bg-violet-300/10 px-3 py-1 text-[11px] font-black text-violet-100">第 {index + 1} 重點</span>
                  <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold text-[color:var(--text-sub)]">{label}</span>
                </div>
                <p className="mt-3 break-words text-base font-black leading-7 text-[color:var(--text-main)]">{item.coreJudgment}</p>
                <p className="mt-2 break-words text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{hint}</p>
                <div className="mt-3 rounded-xl border border-violet-200/15 bg-black/20 p-3">
                  <p className="text-[11px] font-black text-violet-200/80">今天可以怎麼做</p>
                  <p className="mt-1 break-words text-xs font-semibold leading-6 text-violet-50">{item.action}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function NameologyProfessionalStructureDetails({ analysis }: { analysis: NameologyAnalysis }) {
  const layer3 = analysis.standardOutput.layer3;
  const grids = [
    { label: '天格', value: layer3.fiveGrids.heaven },
    { label: '人格', value: layer3.fiveGrids.person },
    { label: '地格', value: layer3.fiveGrids.earth },
    { label: '外格', value: layer3.fiveGrids.outer },
    { label: '總格', value: layer3.fiveGrids.total },
  ];

  return (
    <details id="nameology-professional-structure" className="fortune-card scroll-mt-24 overflow-hidden border-cyan-300/20 bg-slate-950/55 p-5 sm:p-6">
      <summary className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 text-base font-black leading-7 text-cyan-100"><span>老師模式</span><span className="text-xs font-bold text-cyan-100/65">部首 / 筆畫 / 意境</span></summary>
      <div className="mt-4 space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {layer3.characters.map((item) => (
            <article key={item.role + item.char} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-serif text-4xl font-black text-amber-100">{item.char}</p>
              <p className="mt-2 text-sm font-black text-cyan-100">部首：{item.radical} · {item.strokes}畫</p>
              <p className="mt-1 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">注音：{item.pronunciation.join('、') || '字典未提供單字注音'}</p>
              <p className="mt-2 break-words text-xs leading-6 text-[color:var(--text-main)]">{item.primaryMeaning}</p>
            </article>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {grids.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <p className="text-xs text-[color:var(--text-muted)]">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-cyan-100">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black text-cyan-100">三才配置</p>
          <p className="mt-2 text-sm font-bold leading-7 text-[color:var(--text-main)]">{layer3.threeTalents.summary}</p>
          <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">資料來源版本已由後端確認，姓名學規則引擎已完成驗證。</p>
        </div>
        <ProfessionalNameologyLayer analysis={analysis} />
      </div>
    </details>
  );
}

const RITUAL_STATUS_STYLE: Record<NameologyRitualStep['status'], string> = {
  LOCKED: 'border-white/10 bg-white/[0.02] text-[color:var(--text-muted)] opacity-50',
  WAITING: 'border-white/15 bg-white/[0.04] text-[color:var(--text-sub)]',
  PROCESSING: 'border-cyan-300/40 bg-cyan-300/10 text-cyan-50',
  PASSED: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-50',
  FAILED: 'border-rose-300/50 bg-rose-500/10 text-rose-100',
};

const RITUAL_STATUS_MARK: Record<NameologyRitualStep['status'], string> = {
  LOCKED: '○',
  WAITING: '○',
  PROCESSING: '●',
  PASSED: '✓',
  FAILED: '!',
};

function RitualStepsPanel({ steps, revealCount }: { steps: NameologyRitualStep[]; revealCount: number }) {
  return (
    <section className="fortune-card border-amber-300/25 bg-amber-300/[0.05] p-5" role="status" aria-live="polite">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">NAME RITUAL · 台灣官方字典逐關驗證</p>
      <div className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const revealed = index < revealCount;
          const display: NameologyRitualStep['status'] = !revealed ? 'LOCKED' : index === revealCount - 1 && step.status === 'PASSED' && revealCount < steps.length ? 'PROCESSING' : step.status;
          return (
            <div key={step.id} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-all duration-300 ${RITUAL_STATUS_STYLE[display]}`}>
              <span className="text-sm font-black">{RITUAL_STATUS_MARK[display]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-5">{revealed ? (display === 'PASSED' ? step.passedText : display === 'FAILED' ? `${step.label}驗證失敗` : step.ritualText) : step.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NameologyBackendVerificationDetails({ analysis, revealCount }: { analysis: NameologyAnalysis; revealCount: number }) {
  const dict = analysis.dictionaryStatus;
  const verification = analysis.standardOutput.verification;
  const checks = [
    { label: '\u81fa\u7063\u5b57\u5178', value: `${dict.exactMatches}/${dict.totalCharacters}`, passed: verification.dictionaryVerified },
    { label: '\u90e8\u9996', value: `${dict.radicalMatches}/${dict.totalCharacters}`, passed: verification.dictionaryVerified },
    { label: '\u7b46\u756b', value: verification.backendCalculated ? 'PASS' : 'WAIT', passed: verification.backendCalculated },
    { label: 'AI \u53bb\u91cd', value: verification.semanticDedupCompleted ? 'PASS' : 'WAIT', passed: verification.semanticDedupCompleted },
    { label: '\u524d\u7aef\u53ef\u986f\u793a', value: verification.readyForFrontend ? 'PASS' : 'WAIT', passed: verification.readyForFrontend },
  ];

  return (
    <details className="fortune-card mt-5 overflow-hidden border-emerald-300/20 bg-emerald-950/10 p-4 sm:p-5">
      <summary className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 text-sm font-black leading-6 text-emerald-100">
        <span>{'\u5f8c\u7aef\u9a57\u8b49 PASS'}</span>
        <span className="shrink-0 text-xs font-bold text-emerald-100/70">{'\u5b57\u5178 / \u90e8\u9996 / \u7b46\u756b / AI'}</span>
      </summary>
      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {checks.map((item) => (
          <div key={item.label} className={`rounded-xl border px-3 py-2 ${item.passed ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-50' : 'border-amber-300/30 bg-amber-300/10 text-amber-50'}`}>
            <p className="text-[11px] font-black leading-5">{item.label}</p>
            <p className="mt-1 text-sm font-black leading-5">{item.value}</p>
          </div>
        ))}
      </div>
      {analysis.ritualSteps?.length > 0 && (
        <div className="mt-4">
          <RitualStepsPanel steps={analysis.ritualSteps} revealCount={revealCount} />
        </div>
      )}
    </details>
  );
}

function ResultPanel({ analysis, fiveElement }: { analysis: NameologyAnalysis; fiveElement: FiveElementIntegrationResult }) {
  return (
    <section className="space-y-5">
      <NameologyUltimateDecisionPanel analysis={analysis} />
      <NameologyNamingIntentionCard analysis={analysis} />
      <NameologyTotalBeastCard analysis={analysis} />
      <NameologyCharacterDeckPreview analysis={analysis} />
      <NameologyTarotBridgeCard analysis={analysis} />
      <FiveElementPriorityCard result={fiveElement} />
      <NameologyProfessionalStructureDetails analysis={analysis} />
    </section>
  );
}

function buildValidationMessage(form: FormState, selectionConfirm: SelectionConfirm) {
  if (form.name.trim().length < 2) return '請先輸入完整姓名，至少 2 個字。';
  if (!form.birthDate) return '請先完成生日萬年曆推算。';
  if (!selectionConfirm.bloodType) return '請點選血型，系統才會套用血型校正。';
  if (!selectionConfirm.gender) return '請點選性別，系統才會套用外在呈現校正。';
  return '';
}

function toSolarDateFromRocParts(rocYearValue: string | undefined, monthValue: string | undefined, dayValue: string | undefined) {
  const rocYear = Number.parseInt((rocYearValue ?? '').replace(/\D/g, ''), 10);
  const month = Number.parseInt((monthValue ?? '').replace(/\D/g, ''), 10);
  const day = Number.parseInt((dayValue ?? '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(rocYear) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  if (rocYear <= 0 || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const year = rocYear + 1911;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function readNameologyFormSnapshot(form: FormState, selectionConfirm: SelectionConfirm) {
  if (typeof document === 'undefined') return { form, selectionConfirm };
  const root = document.getElementById('nameology-input-form');
  if (!root) return { form, selectionConfirm };
  const inputs = Array.from(root.querySelectorAll('input'));
  const domName = (inputs[0]?.value ?? '').trim();
  const domBirthDate = toSolarDateFromRocParts(inputs[1]?.value, inputs[2]?.value, inputs[3]?.value);
  const nextForm: FormState = {
    ...form,
    name: domName || form.name,
    birthDate: form.birthDate || domBirthDate,
  };
  return {
    form: nextForm,
    selectionConfirm: {
      bloodType: selectionConfirm.bloodType || Boolean(nextForm.bloodType),
      gender: selectionConfirm.gender || Boolean(nextForm.gender),
    },
  };
}

export default function NameologyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectionConfirm, setSelectionConfirm] = useState<SelectionConfirm>(initialSelectionConfirm);
  const [result, setResult] = useState<NameologyAnalysis | null>(null);
  const [fiveElement, setFiveElement] = useState<FiveElementIntegrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<NameologyDailyResult> | null>(null);
  // 儀式感揭露：這些步驟的 PASSED/FAILED 都是後端已經算完、真實驗證過的資料
  // （見 lib/nameology-engine.ts 的 buildNameologyRitualSteps），這裡只是用節奏
  // 把「已經是真的」的結果依序顯示出來，不是用固定計時器假裝正在通過。
  const [ritualRevealCount, setRitualRevealCount] = useState(0);
  const [ritualCollapsed, setRitualCollapsed] = useState(false);
  const ritualTimerRef = useRef<number | null>(null);
  const submitLockRef = useRef(false);
  const formRef = useRef(form);
  const selectionConfirmRef = useRef(selectionConfirm);
  formRef.current = form;
  selectionConfirmRef.current = selectionConfirm;

  useEffect(() => {
    const applyIdentity = (target = getAnalysisIdentityTarget()) => {
      if (target === 'self') {
        const saved = readNameologySelfProfile();
        const canonical = readCanonicalBirthProfile();
        const current = formRef.current;
        const next: FormState = saved ?? {
          ...current,
          name: canonical?.name || current.name,
          birthDate: canonical?.birthDate || current.birthDate,
          gender: canonical?.gender === 'FEMALE' ? 'female' : canonical?.gender === 'MALE' ? 'male' : current.gender,
        };
        setForm(next);
        if (saved) {
          setSelectionConfirm({ bloodType: Boolean(saved.bloodType), gender: Boolean(saved.gender) });
        } else if (canonical?.name || canonical?.birthDate || canonical?.gender !== 'UNSPECIFIED') {
          setSelectionConfirm((previous) => ({ ...previous, gender: canonical?.gender !== 'UNSPECIFIED' || previous.gender }));
        }
      } else if (target === 'guest') {
        // 親朋好友一律從空白開始，避免把本人資料誤帶進他人的分析。
        setForm(initialForm);
        setSelectionConfirm(initialSelectionConfirm);
      }
    };
    const handleIdentityChange = (event: Event) => {
      setError((prev) => (prev === getIdentityRequiredMessage() ? '' : prev));
      const detail = (event as CustomEvent<{ target?: 'self' | 'guest' }>).detail;
      applyIdentity(detail?.target);
    };
    applyIdentity();
    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, handleIdentityChange);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, handleIdentityChange);
  }, []);

  function clearRitualTimer() {
    if (ritualTimerRef.current) {
      window.clearTimeout(ritualTimerRef.current);
      ritualTimerRef.current = null;
    }
  }

  function showRitualCompleteImmediately(steps?: NameologyRitualStep[]) {
    clearRitualTimer();
    setRitualRevealCount(steps?.length ?? 10);
    setRitualCollapsed(true);
  }

  function playRitualReveal(steps: NameologyRitualStep[]) {
    clearRitualTimer();
    setRitualCollapsed(false);
    setRitualRevealCount(0);
    const revealOne = (index: number) => {
      setRitualRevealCount(index + 1);
      const current = steps[index];
      const isLast = index >= steps.length - 1;
      if (current.status !== 'PASSED') return;
      if (isLast) {
        ritualTimerRef.current = window.setTimeout(() => {
          setRitualCollapsed(true);
          window.setTimeout(() => document.getElementById('nameology-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 520);
        }, 900);
        return;
      }
      ritualTimerRef.current = window.setTimeout(() => revealOne(index + 1), 420);
    };
    ritualTimerRef.current = window.setTimeout(() => revealOne(0), 260);
  }

  useEffect(() => () => clearRitualTimer(), []);

  useEffect(() => {
    const record = readDailyAnalysis<NameologyDailyResult>('nameology');
    if (!record) return;
    if (!isCurrentNameologyRecord(record)) {
      clearDailyAnalysis('nameology');
      setDailyRecord(null);
      return;
    }
    setDailyRecord(record);
    setResult(record.result.analysis);
    setFiveElement(record.result.fiveElement);
    showRitualCompleteImmediately(record.result.analysis.ritualSteps);
  }, []);

  const validationMessage = useMemo(() => buildValidationMessage(form, selectionConfirm), [form, selectionConfirm]);
  const canSubmit = validationMessage === '';
  const showMissingFields = Boolean(error) && !result;
  const showMissingName = showMissingFields && form.name.trim().length < 2;
  const showMissingBirthDate = showMissingFields && !form.birthDate;
  const showMissingBloodType = showMissingFields && !selectionConfirm.bloodType;
  const showMissingGender = showMissingFields && !selectionConfirm.gender;
  const progressItems = [
    { label: '姓名', done: form.name.trim().length >= 2, value: form.name.trim().length > 0 ? `${form.name.trim().length}字` : '未填' },
    { label: '生日', done: Boolean(form.birthDate), value: form.birthDate ? '已推算' : '未填' },
    { label: '血型', done: selectionConfirm.bloodType, value: selectionConfirm.bloodType ? `${form.bloodType}型` : '未選' },
    { label: '性別', done: selectionConfirm.gender, value: selectionConfirm.gender ? (form.gender === 'male' ? '男性' : '女性') : '未選' },
  ];

  async function handleSubmit() {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      await handleSubmitInner();
    } finally {
      submitLockRef.current = false;
    }
  }

  async function handleSubmitInner() {
    const existing = readDailyAnalysis<NameologyDailyResult>('nameology');
    if (existing) {
      if (isCurrentNameologyRecord(existing)) {
        setDailyRecord(existing);
        setResult(existing.result.analysis);
        setFiveElement(existing.result.fiveElement);
        showRitualCompleteImmediately(existing.result.analysis.ritualSteps);
        window.setTimeout(() => document.getElementById('nameology-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return;
      }
      clearDailyAnalysis('nameology');
      setDailyRecord(null);
    }

    if (isLoading) return;

    const snapshot = readNameologyFormSnapshot(form, selectionConfirm);
    const submitValidationMessage = buildValidationMessage(snapshot.form, snapshot.selectionConfirm);
    if (submitValidationMessage) {
      setForm(snapshot.form);
      setSelectionConfirm(snapshot.selectionConfirm);
      setError(submitValidationMessage);
      return;
    }
    if (!getAnalysisIdentityTarget()) {
      setError(getIdentityRequiredMessage());
      return;
    }
    setForm(snapshot.form);
    setSelectionConfirm(snapshot.selectionConfirm);
    setIsLoading(true);
    setError('');
    setResult(null);
    setFiveElement(null);
    clearRitualTimer();
    setRitualRevealCount(0);
    setRitualCollapsed(false);

    try {
      const response = await fetch('/api/nameology-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...snapshot.form, analysisTarget: getAnalysisIdentityTarget() }),
      });
      const data = await response.json();
      if (!response.ok || !data?.analysis || !data?.fiveElement || !data?.verification?.readyForFrontend) throw new Error(data?.message || data?.error || '目前無法完成可靠的姓名分析，請稍後重新嘗試。');
      const nextResult = {
        analysis: (data as NameologyResponse).analysis,
        fiveElement: (data as NameologyResponse).fiveElement,
      };
      if (!isCurrentNameologyResult(nextResult)) throw new Error('\u59d3\u540d\u5b78\u4e09\u5c64\u5206\u6790\u8cc7\u6599\u672a\u5b8c\u6574\uff0c\u8acb\u91cd\u65b0\u5206\u6790\u3002');
      setResult((data as NameologyResponse).analysis);
      setFiveElement((data as NameologyResponse).fiveElement);
      if (getAnalysisIdentityTarget() === 'self') {
        saveNameologySelfProfile(snapshot.form);
        const existingCanonical = readCanonicalBirthProfile();
        saveCanonicalBirthProfile({
          ...(existingCanonical ?? emptyCanonicalBirthProfile()),
          subjectType: 'SELF',
          name: snapshot.form.name,
          birthDate: snapshot.form.birthDate,
          gender: snapshot.form.gender === 'female' ? 'FEMALE' : 'MALE',
        });
      }
      if ((data as NameologyResponse).analysis.ritualSteps?.length) {
        playRitualReveal((data as NameologyResponse).analysis.ritualSteps);
      } else {
        showRitualCompleteImmediately((data as NameologyResponse).analysis.ritualSteps);
      }
      setDailyRecord(saveDailyAnalysis<NameologyDailyResult>('nameology', nextResult, { schemaVersion: NAMEOLOGY_DAILY_SCHEMA_VERSION }));
      if (getAnalysisIdentityTarget() === 'self') markGrowthModuleCompleted('nameology', (data as NameologyResponse).fiveElement.brandElement);
      window.setTimeout(() => document.getElementById('nameology-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : '目前無法完成可靠的姓名分析，請稍後重新嘗試。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <DailyAnalysisNotice record={dailyRecord} className="mb-5" moduleName="AI 姓名學" onViewResult={dailyRecord ? () => void handleSubmit() : undefined} />
        <section id="nameology-input-form" className="fortune-card p-5 sm:p-8 scroll-mt-20">
          {/* 品牌標題視覺（2026-08-13 依指示）：與八字/塔羅同語言——置中、對稱引線、金色漸層、柔光、星芒收尾 */}
          <div className="flex items-center justify-center gap-3 text-center">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300/80" aria-hidden="true" />
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-amber-300/90">NAMEOLOGY</p>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-300/80" aria-hidden="true" />
          </div>
          <h1 className="mx-auto mt-4 bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300/80 bg-clip-text text-center font-serif text-5xl font-black leading-[1.08] tracking-[0.1em] text-transparent drop-shadow-[0_0_32px_rgba(251,191,36,0.3)] sm:text-6xl lg:text-7xl">
            AI 姓名學
          </h1>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-amber-200/70" />
            <span className="text-sm text-amber-200/90">✦</span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-amber-200/70" />
          </div>
          {/* 說明文字已隱藏（2026-08-13 依指示）：客戶不必看，之後視情況把 hidden 移除即可恢復 */}
          <p className="mt-4 hidden max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
            輸入姓名與基本資料後，系統先固定台灣字典部首與筆畫，再生成姓名拆字卡與今日行動判定。
          </p>

          <IdentitySplitSelector className="mt-6" />

          <MegaInputGuide
            title="請先填完整姓名"
            steps={['姓名至少 2 個字', '再完成生日資料', '最後點選血型與性別']}
            example="王小明，或你的真實姓名"
            tone="amber"
            className="mt-6"
          />

          <div className="mt-7 grid gap-7">
            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                1. 姓名 {form.name.trim().length >= 2 && <span className="text-green-400">✓</span>}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={(event) => {
                  const trimmed = event.target.value.trim();
                  if (trimmed !== event.target.value) setForm((prev) => ({ ...prev, name: trimmed }));
                }}
                placeholder="請輸入完整姓名（至少 2 個字）"
                maxLength={20}
                className={`form-input w-full rounded-lg border border-white/10 px-4 py-3 text-base ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
                autoComplete="off"
              />
              {showMissingName && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002"}</p>
              )}
              {form.name.trim().length > 0 && form.name.trim().length < 2 && !showMissingName && (
                <p className="mt-2 text-xs text-yellow-400">姓名至少需要 2 個字。</p>
              )}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                2. 出生日期（民國年）{form.birthDate && <span className="text-green-400">✓</span>}
              </label>
              <LunarBirthdayInput
                value={form.birthDate}
                onChange={(solarDate) => setForm((prev) => ({ ...prev, birthDate: solarDate.trim() }))}
                accent="amber"
                label="出生日期（萬年曆）"
              />
              {showMissingBirthDate && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\u3002"}</p>
              )}
              {form.birthDate && <p className="mt-2 text-xs text-green-400">✓ 西元 {form.birthDate}</p>}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                3. 血型 {selectionConfirm.bloodType && <span className="text-green-400">✓</span>}
              </label>
              {showMissingBloodType && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u8840\u578b\uff0c\u9019\u6b04\u9084\u6c92\u6709\u9078\u3002"}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {BLOOD_TYPES.map((bloodType, index) => (
                  <FriendlyChoiceCard
                    key={bloodType}
                    active={selectionConfirm.bloodType && form.bloodType === bloodType}
                    title={`${bloodType} 型`}
                    description={BLOOD_DESC[bloodType]}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, bloodType }));
                      setSelectionConfirm((prev) => ({ ...prev, bloodType: true }));
                    }}
                    tone={index % 2 === 0 ? 'violet' : 'cyan'}
                    attention={showMissingBloodType}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                4. 性別 {selectionConfirm.gender && <span className="text-green-400">✓</span>}
              </label>
              {showMissingGender && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002"}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <FriendlyChoiceCard
                  active={selectionConfirm.gender && form.gender === 'female'}
                  title="女性"
                  description="用來校正姓名外在形象、柔性特質與互動呈現。"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender: 'female' }));
                    setSelectionConfirm((prev) => ({ ...prev, gender: true }));
                  }}
                  tone="pink"
                  attention={showMissingGender}
                />
                <FriendlyChoiceCard
                  active={selectionConfirm.gender && form.gender === 'male'}
                  title="男性"
                  description="用來校正姓名外在形象、行動特質與表現方向。"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender: 'male' }));
                    setSelectionConfirm((prev) => ({ ...prev, gender: true }));
                  }}
                  tone="cyan"
                  attention={showMissingGender}
                />
              </div>
            </div>

            {(error || validationMessage) && !result && (
              <p className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-400/25 bg-rose-950/20 text-rose-100' : 'border-amber-400/20 bg-amber-950/15 text-amber-100'}`}>
                {error || validationMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="vip-gold-btn w-full py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? '姓名學分析中...' : dailyRecord ? getDailyAnalysisButtonLabel(dailyRecord) : canSubmit ? '開始姓名學分析' : '請先完成上方資料'}
            </button>

            <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/15 bg-amber-950/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="mb-3 text-xs text-[color:var(--text-muted)]">資料進度</p>
                <div className="flex flex-wrap gap-2">
                  {progressItems.map((item) => (
                    <span
                      key={item.label}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.done ? 'border-green-400/30 bg-green-500/20 text-green-300' : 'border-white/10 bg-white/8 text-[color:var(--text-muted)]'}`}
                    >
                      ✓ {item.label} {item.value}
                    </span>
                  ))}
                </div>
              </div>

              <Link href="/" className="feature-home-link feature-home-link--amber shrink-0 self-start sm:self-center">{"\u8fd4\u56de\u9996\u9801"}</Link>
            </div>
          </div>
        </section>

        <div id="nameology-result" className="mt-6 scroll-mt-24">
          {result && fiveElement && (
            <div className="space-y-5 animate-fade-in">
              <ResultPanel analysis={result} fiveElement={fiveElement} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
