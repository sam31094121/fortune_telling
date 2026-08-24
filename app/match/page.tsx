'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import NextStepGuide from '@/components/NextStepGuide';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import MegaInputGuide from '@/components/MegaInputGuide';
import { enforceAiCopywritingTone, uniqueAiCopywritingLines } from '@/lib/ai-copywriting-style-center';
import { saveUserData, loadUserData } from '@/lib/storage';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import type { GrowthElement } from '@/lib/growth-center-engine';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage, setAnalysisIdentityTarget, IDENTITY_TARGET_UPDATED_EVENT } from '@/lib/identity-split-client';
import { clearDailyAnalysis, getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';
import { WaterTreasureOrb, type ProductElement } from '@/components/bazi/customer/WaterTreasureOrb';
import { ElementUnsealSoundToggle, playElementUnsealSound } from '@/components/ElementUnsealSound';

interface PersonInput {
  name: string;
  birthDate: string;
  birthHourBranch: string;
  bloodType: 'A' | 'B' | 'AB' | 'O' | 'unknown';
  gender: 'male' | 'female';
}

interface MatchZones {
  resonance: string[];
  complement: string[];
  grinding: string[];
  conflict: string[];
}

interface MatchResult {
  match_score: number;
  resonance: number;
  communication: number;
  stability: number;
  conflict_risk: number;
  summary: string;
  zones: MatchZones;
}

interface PersonDisplay {
  name: string;
  zodiacZh: string;
  chineseZodiac: string;
  wuxing: string;
  bloodType: string;
}


type MatchFiveElementKey = 'earth' | 'water' | 'fire' | 'air' | 'space';

interface MatchFiveElementPersonResult {
  name: string;
  primaryElement: MatchFiveElementKey;
  secondaryElement: MatchFiveElementKey;
  elementScores: Record<MatchFiveElementKey, number>;
  needScores: Record<MatchFiveElementKey, number>;
  reason: string;
  changeTarget: string;
}

interface MatchFiveElementResult {
  engineVersion: 'match_five_element_v1';
  summary: string;
  relationMode: 'generating' | 'conflicting' | 'balancing';
  sharedElement: MatchFiveElementKey;
  sharedAction: string;
  relationReason: string;
  personA: MatchFiveElementPersonResult;
  personB: MatchFiveElementPersonResult;
  integratedAdvice: string;
  inlineHighlights: string[];
}

interface BaziMatchFoundation {
  source: '八字四柱合盤' | '八字三柱基礎合盤' | '八字混合合盤';
  timeNote: string;
  sceneKey: string;
  sharedElement: MatchFiveElementKey;
  personA: { dayMaster: string; primaryReinforcement: string; beastCard?: BaziBeastCard };
  personB: { dayMaster: string; primaryReinforcement: string; beastCard?: BaziBeastCard };
}

interface BaziBeastCard {
  name: string;
  image: string;
  youngDivineImage: string;
  coreMeaning: string;
  direction: string;
  productElement: '空' | '風' | '水' | '火' | '地';
  evidence: string;
  dayPillar: string;
}

interface MatchAiInterpretationLayer {
  userReadableSummary: string;
  relationshipPositioning: string;
  emotionalPattern: string;
  communicationPattern: string;
  riskTranslation: string;
}

interface MatchTeacherReadings {
  google: {
    reading: string;
    source: 'google' | 'local';
  };
  ghost?: {
    displayName: '鬼魅老師';
    internalStyle: '恐怖・驚悚';
    reading: string;
  };
}

interface MatchResponse {
  result: MatchResult;
  displayA: PersonDisplay;
  displayB: PersonDisplay;
  fiveElementMatch?: MatchFiveElementResult;
  baziFoundation?: BaziMatchFoundation;
  aiInterpretationLayer?: MatchAiInterpretationLayer;
  teacherReadings?: MatchTeacherReadings;
}

type MatchDailyResult = {
  data: MatchResponse;
  personA: PersonInput;
  personB: PersonInput;
};

type StepKey = 'personA' | 'personB' | 'review';
type SelectionConfirm = { bloodType: boolean; gender: boolean };

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const EMPTY: PersonInput = { name: '', birthDate: '', birthHourBranch: 'unknown', bloodType: 'unknown', gender: 'female' };
const EMPTY_SELECTION_CONFIRM: SelectionConfirm = { bloodType: false, gender: false };
const MATCH_DAILY_SCHEMA_VERSION = 'soul-match-bazi-beast-v4';
// 視覺尚未定稿前，先保留共同寶珠的計算與儀式邏輯，但不在客戶頁顯示。
const SHOW_SHARED_ELEMENT_PEARL = false;
const MATCH_DEMO_NAMES = new Set(['\u738b\u5c0f\u660e', '\u9673\u5c0f\u7f8e']);

function isDemoMatchName(name?: string | null) {
  return MATCH_DEMO_NAMES.has(name?.trim() ?? '');
}

function isDemoMatchDailyResult(value?: MatchDailyResult | null) {
  const names = [value?.personA?.name, value?.personB?.name].map((name) => name?.trim() ?? '');
  return names.length === 2 && names.every((name) => MATCH_DEMO_NAMES.has(name));
}

function isCurrentMatchDailyRecord(record?: DailyAnalysisRecord<MatchDailyResult> | null) {
  return Boolean(record?.meta?.schemaVersion === MATCH_DAILY_SCHEMA_VERSION && record.result?.data?.result?.summary);
}

const BLOOD_DESC: Record<Exclude<PersonInput['bloodType'], 'unknown'>, string> = {
  A: '細膩穩定，重視秩序與安全感。',
  B: '自由直覺，重視感受與關係中的空間。',
  AB: '理性與感性交織，關係節奏需要彈性。',
  O: '直接熱情，在關係裡會主動承擔與推進。',
};

const STEP_ORDER: StepKey[] = ['personA', 'personB', 'review'];

function getPersonError(label: string, person: PersonInput, selectionConfirm?: SelectionConfirm) {
  if (person.name.trim().length < 2) return `請先輸入${label}姓名，至少 2 個字。`;
  if (!person.birthDate) return `請先完成${label}的萬年曆生日推算。`;
  if (selectionConfirm && !selectionConfirm.gender) return `請點選${label}性別。`;
  return '';
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickStable<T>(items: T[], seed: number, salt = 0) {
  return items[(seed + salt) % items.length];
}

function maskGameName(name?: string | null) {
  const trimmed = name?.trim() ?? '';
  return trimmed.length >= 2 ? trimmed.slice(-2) : trimmed || '旅人';
}

function getAgeFromBirthDate(birthDate?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate?.trim() ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const now = new Date();
  return now.getFullYear() - year - (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day) ? 1 : 0);
}

function MatchTeacherReadings({ data }: { data: MatchResponse }) {
  const [mode, setMode] = useState<'teacher' | 'ghost'>('teacher');
  const interpretation = data.aiInterpretationLayer;
  const names = `${maskGameName(data.displayA.name)}與${maskGameName(data.displayB.name)}`;
  const googleReading = data.teacherReadings?.google;
  const formalReading = googleReading?.reading || interpretation?.userReadableSummary || data.result.summary;
  const formalDetail = interpretation?.relationshipPositioning || data.result.zones.resonance[0] || '先看見彼此的相處節奏，再決定下一步。';
  const ghostReading = data.teacherReadings?.ghost?.reading || `燈光暗下來的瞬間，門外先傳來兩次腳步聲，第三次卻停在你們之間。封印沒有睡著。${names}每一次把話吞回去，結界上的裂縫就會亮一次；越是不說，房間裡的回音就越清楚。鬼魅只留下這一句線索：${data.result.zones.conflict[0] || data.result.zones.grinding[0] || '把在意的事說清楚'}。`;
  const ghostDetail = data.result.communication < 65
    ? '鬼魅的低語：沉默正在替你們把門鎖上。先有人伸手，封印才會開始鬆動。'
    : '鬼魅的低語：你們已經聽見彼此的回音；別讓它停在門後，留下可以一起解開的封印。';
  const ghostField = data.result.conflict_risk >= 55
    ? '張力偏高・封印正在擴散'
    : data.result.communication < 65
      ? '低語偏強・需要先有人回應'
      : '回音可控・可以進入解封';
  const sharedElementName = data.fiveElementMatch ? MATCH_ELEMENT_LABEL[data.fiveElementMatch.sharedElement] : '共同';
  const firstNeedElement = data.fiveElementMatch?.personA.primaryElement ?? 'space';
  const secondNeedElement = data.fiveElementMatch?.personB.primaryElement ?? 'air';
  const firstBeast = data.baziFoundation?.personA.beastCard?.name ?? '第一位神獸';
  const secondBeast = data.baziFoundation?.personB.beastCard?.name ?? '第二位神獸';
  const firstDayMaster = data.baziFoundation?.personA.dayMaster ?? '第一位日主';
  const secondDayMaster = data.baziFoundation?.personB.dayMaster ?? '第二位日主';
  const spiritSense: Record<MatchFiveElementKey, string> = {
    space: '鏡影感應',
    air: '耳語感應',
    water: '夢潮感應',
    fire: '燈火感應',
    earth: '地脈感應',
  };
  const loveStylePressure = data.fiveElementMatch
    ? `${maskGameName(data.displayA.name)}在這段關係裡更需要「${MATCH_ELEMENT_PROFILE[firstNeedElement].title}」，${maskGameName(data.displayB.name)}更需要「${MATCH_ELEMENT_PROFILE[secondNeedElement].title}」；愛的方式不同，才會形成壓力。`
    : '兩人需要被愛與回應的方式不同，這份落差就是本局要面對的壓力。';
  const ghostCoreReadings = [
    {
      title: '情感壓力',
      copy: `${loveStylePressure} ${firstBeast}與${secondBeast}的相處節奏要先被看見；${data.result.zones.grinding[0] || '先把真正的感受說清楚'}。`,
    },
    {
      title: '鬼魅回應',
      copy: `鬼魅對${names}留下低語：「${data.result.zones.conflict[0] || data.result.zones.grinding[0] || '別讓沉默替你們決定答案'}。」${firstDayMaster}與${secondDayMaster}的交會，決定這一句低語要指向哪條暗線。`,
    },
    {
      title: '神祕封印',
      copy: `這道封印鎖住的是兩人共同缺的${sharedElementName}元素，也就是彼此最難自然給出的回應；${firstBeast}與${secondBeast}必須用共同寶珠打開它。`,
    },
    {
      title: '靈異磁場',
      copy: `${maskGameName(data.displayA.name)}是「${spiritSense[firstNeedElement]}」、${maskGameName(data.displayB.name)}是「${spiritSense[secondNeedElement]}」；${ghostField}。這是遊戲角色設定，不是現實體質判定。`,
    },
  ];
  const showingGhost = mode === 'ghost';
  const pairStructure = (() => {
    const relationMode = data.fiveElementMatch?.relationMode;
    const sharedElement = data.fiveElementMatch ? MATCH_ELEMENT_LABEL[data.fiveElementMatch.sharedElement] : '共同';
    if (relationMode === 'generating') return { title: '相生共建格局', copy: `兩人有互相推動的基礎，先把${sharedElement}元素落實，關係會更容易向前。` };
    if (relationMode === 'conflicting') return { title: '破關轉生格局', copy: `兩人的拉扯需要先被看見；共同補好${sharedElement}元素，才能把衝突轉成合作。` };
    return { title: '互補平衡格局', copy: `兩人的差異可以互補；共同補好${sharedElement}元素，節奏會更容易對齊。` };
  })();

  return (
    <section className={`fortune-card relative overflow-hidden border p-4 shadow-[0_18px_52px_rgba(0,0,0,0.26)] sm:p-6 ${
      showingGhost
        ? 'border-rose-300/30 bg-[radial-gradient(circle_at_top,rgba(127,29,29,0.32),transparent_48%),linear-gradient(145deg,rgba(30,5,15,0.98),rgba(10,8,22,0.98))]'
        : 'border-cyan-200/25 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.22),transparent_48%),linear-gradient(145deg,rgba(8,47,73,0.72),rgba(15,23,42,0.98))]'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-black tracking-[0.24em] ${showingGhost ? 'text-rose-100/80' : 'text-cyan-100/80'}`}>{showingGhost ? '雙人封印檔案・鬼魅低語' : '兩人合盤・正式關係解讀'}</p>
          <h2 className={`mt-1 font-serif text-2xl font-black sm:text-3xl ${showingGhost ? 'text-rose-50' : 'text-cyan-50'}`}>
            {showingGhost ? '鬼魅老師' : 'Google 解盤老師'}
          </h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${showingGhost ? 'border-rose-200/25 bg-rose-300/10 text-rose-100' : 'border-cyan-200/25 bg-cyan-300/10 text-cyan-100'}`}>
          同一份配對資料
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('teacher')}
          aria-pressed={!showingGhost}
          className={`rounded-2xl border px-3 py-3 text-left transition ${!showingGhost ? 'border-cyan-200/45 bg-cyan-300/14 text-cyan-50' : 'border-white/10 bg-black/16 text-white/55'}`}
        >
          <p className="text-xs font-black">Google 解盤老師</p>
          <p className="mt-1 text-[10px] font-semibold leading-4">清楚說明兩人的關係主軸</p>
        </button>
        <button
          type="button"
          onClick={() => setMode('ghost')}
          aria-pressed={showingGhost}
          className={`rounded-2xl border px-3 py-3 text-left transition ${showingGhost ? 'border-rose-200/45 bg-rose-300/14 text-rose-50' : 'border-white/10 bg-black/16 text-white/55'}`}
        >
          <p className="text-xs font-black">鬼魅老師</p>
          <p className="mt-1 text-[10px] font-semibold leading-4">用神祕壓迫感收束同一個答案</p>
        </button>
      </div>

      <div className={`mt-3 rounded-2xl border px-3 py-3 ${showingGhost ? 'border-rose-200/20 bg-rose-950/20' : 'border-cyan-200/20 bg-cyan-950/20'}`}>
          <p className={`text-[10px] font-black tracking-[0.18em] ${showingGhost ? 'text-rose-100/75' : 'text-cyan-100/75'}`}>{showingGhost ? '封印檔案・關係結界' : '兩人關係格局'}</p>
          <p className={`mt-1 text-base font-black ${showingGhost ? 'text-rose-50' : 'text-cyan-50'}`}>{pairStructure.title}</p>
        <p className="mt-1 text-[11px] font-semibold leading-5 text-white/70">{showingGhost ? `鬼魅將它標記為「${pairStructure.title}」：${pairStructure.copy}` : pairStructure.copy}</p>
      </div>

      {showingGhost && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ghostCoreReadings.map((item, index) => (
            <div key={item.title} className="rounded-xl border border-rose-200/18 bg-[linear-gradient(135deg,rgba(127,29,29,0.28),rgba(0,0,0,0.48))] px-2.5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.24)]">
              <p className="text-[11px] font-black text-rose-100">{item.title}</p>
              <div className="relative mx-auto mt-2 h-8 w-12 drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]" style={{ transform: `rotate(${index % 2 === 0 ? -3 : 3}deg)` }}>
                <span className="absolute inset-0 rounded-[2px] border border-amber-950/60 bg-[linear-gradient(135deg,#f5e8be_0%,#c6a86c_46%,#f0d69a_100%)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.62),inset_-2px_-2px_4px_rgba(78,35,12,0.42)]" />
                <span className="absolute inset-x-[11%] top-[18%] h-px bg-amber-950/40" />
                <span className="absolute inset-x-[18%] bottom-[17%] h-px bg-amber-950/35" />
                <span className="absolute left-1/2 top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm border border-rose-950/70 bg-[radial-gradient(circle_at_35%_28%,#ef6e64,#7f1d1d_58%,#3f0714)] text-[10px] font-black text-amber-50 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.7)]">封</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <article className={`mt-3 rounded-[22px] border p-4 ${showingGhost ? 'border-rose-200/28 bg-[linear-gradient(145deg,rgba(64,7,23,0.58),rgba(0,0,0,0.52))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'border-cyan-200/20 bg-black/20'}`}>
        {!showingGhost && googleReading?.source === 'local' && (
          <p className="mb-2 text-[10px] font-semibold leading-5 text-amber-100/85">Google 解盤暫時未回覆，這次先顯示同一份資料的系統基礎解讀。</p>
        )}
        {showingGhost && <p className="mb-2 text-[10px] font-black tracking-[0.24em] text-rose-100/65">鬼魅回應・封印低語</p>}
        <p className={`text-sm font-black leading-7 ${showingGhost ? 'font-serif text-rose-50' : 'text-cyan-50'}`}>{showingGhost ? ghostReading : formalReading}</p>
        <p className={`mt-3 border-t pt-3 text-xs font-semibold leading-6 ${showingGhost ? 'border-rose-200/15 font-serif text-rose-100/80' : 'border-cyan-200/15 text-cyan-100/80'}`}>{showingGhost ? ghostDetail : formalDetail}</p>
      </article>
      <p className={`mt-3 text-center text-[11px] font-black leading-6 ${showingGhost ? 'text-rose-100/80' : 'text-cyan-100/80'}`}>
        {SHOW_SHARED_ELEMENT_PEARL
          ? showingGhost
            ? '鬼魅留下唯一出口：兩人一起拿到下方的五元素封印寶珠，解除結界。'
            : '下一步：兩人一起拿到下方的五元素封印寶珠，解除結界，完成這一局的共同任務。'
          : '共同寶珠儀式暫時保持封印，等待視覺定稿後再開放。'}
      </p>
    </section>
  );
}

function buildMysteryMatchGame(data: MatchResponse, personABirthDate?: string, personBBirthDate?: string) {
  const aName = maskGameName(data.displayA.name);
  const bName = maskGameName(data.displayB.name);
  // Ages already appear once on the two personal beast cards. Keep the game
  // header clean so customers do not mistake the repeated numbers for a score.
  const aIdentity = aName;
  const bIdentity = bName;
  const result = data.result;
  const seed = stableHash(data.baziFoundation?.sceneKey ?? [aName, bName, result.match_score, result.resonance, result.communication, result.stability, result.conflict_risk].join('|'));
  const strongest = [
    ['共鳴感', result.resonance],
    ['溝通感', result.communication],
    ['穩定度', result.stability],
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const weakest = [
    ['共鳴感', result.resonance],
    ['溝通感', result.communication],
    ['穩定度', result.stability],
    ['衝突風險', 100 - result.conflict_risk],
  ].sort((a, b) => Number(a[1]) - Number(b[1]))[0];
  const realmByElement: Record<MatchFiveElementKey, { title: string; location: string; omen: string; exit: string; treasure: string; treasurePower: string; events: string[] }> = {
    water: { title: '沉水回聲館', location: '雨聲貼著玻璃、地面倒映著不存在腳步的長廊', omen: '每一次沒說出口的委屈，都會化成牆上的水痕往下蔓延', exit: '先接住情緒，再談答案', treasure: '潮汐回音珠', treasurePower: '把彼此沒有說出口的感受，化成能被好好聽見的回音。', events: ['積水裡先映出一扇沒有開過的門，下一秒才傳來敲門聲。', '走廊盡頭的水痕逆流而上，停在兩人一直避開的那句話前。', '玻璃上的霧氣浮出兩個名字，又被一陣冷風抹去。'] },
    fire: { title: '燼火密室', location: '燈火忽明忽暗、影子在牆面延遲半拍的密室', omen: '每一次急著證明自己，都會讓出口的火光再縮小一圈', exit: '先放低音量，再保留彼此的餘地', treasure: '燼火共鳴晶', treasurePower: '把衝動的火光收成勇氣，讓兩人敢把在意說出口。', events: ['蠟燭同時熄滅，牆上的影子卻還停在原地。', '門把燙得不能碰，只有把話說慢，火光才會退回燈芯。', '天花板落下一點灰燼，在地面拼出尚未說出口的問題。'] },
    air: { title: '無聲風廊', location: '風從空門穿過、卻只帶回斷裂耳語的長廊', omen: '每一次猜測都會把耳語吹得更遠，直到兩人聽不見彼此', exit: '把真正的意思說清楚，再等待回應', treasure: '風語引路鈴', treasurePower: '讓斷裂的訊息重新連線，替彼此留下等待回應的空間。', events: ['沒有開的門後傳來兩人的聲音，卻把每一句話都說反了。', '風鈴無人碰觸卻響了三次，最後一次剛好停在沉默處。', '走廊裡的紙片被風吹起，拼成一封沒寄出的回覆。'] },
    earth: { title: '封印地窖', location: '門縫滲出冷光、地面留著兩串忽近忽遠足跡的地窖', omen: '每一次逃開承諾，地窖的封印就會再往下沉一寸', exit: '把承諾說成能做到的一件事', treasure: '地脈守約印', treasurePower: '把飄忽的關係拉回可靠的行動，讓承諾有能落地的重量。', events: ['地面傳來第二組腳步聲，停在兩人中間卻看不見任何人。', '石壁裂開一道縫，裡面傳來重複的承諾，直到有人說出能做到的那一句。', '封印上的灰塵自行落下，露出一條只容兩人並肩走過的路。'] },
    space: { title: '空域觀測塔', location: '鏡面映出兩個方向不同身影、回音比腳步更早抵達的觀測塔', omen: '每一次沉默都會讓鏡裡的距離拉長，直到彼此只剩輪廓', exit: '在沉默變成距離前，先伸手確認彼此', treasure: '星隙磁引石', treasurePower: '象徵兩人願意靠近的方向感；它是遊戲裡的共鳴線索，不替現實關係下保證。', events: ['鏡裡多出第三道背影，轉身時卻只剩兩人的倒影。', '塔頂的星圖忽然熄掉一角，只有兩人同時靠近才重新亮起。', '空白的牆面傳來低語，像有人把未寄出的心事念了一遍。'] },
  };
  const sharedElement = data.baziFoundation?.sharedElement ?? data.fiveElementMatch?.sharedElement ?? 'space';
  const realm = realmByElement[sharedElement];
  const paranormalEvent = pickStable(realm.events, seed + 17);
  const baziOpening = data.baziFoundation
    ? '這一局會依兩人的八字與配對結果，找出最需要一起面對的關係線索。'
    : '這一局會依兩人的配對資料，找出最需要一起面對的關係線索。';
  const resonanceScene = pickStable([
    '燈沒有熄滅，卻只照出你們彼此靠近時才會出現的影子。',
    '門後傳來兩次相同的敲擊聲；不是催促，而是提醒你們有一段話尚未說完。',
    '鏡面映出兩個方向不同的身影，但只要願意停下來聽，回音會慢慢重合。',
  ], seed);
  const friction = result.zones.conflict[seed % Math.max(1, result.zones.conflict.length)] ?? result.zones.grinding[0] ?? '把真正的感受說清楚';
  const pairTrigger = result.communication < 65
    ? `在遊戲裡，${aName}停下回應時，${bName}身後的影子就會先往前一步；直到兩人把真正的意思說出來，影子才退回原位。`
    : result.conflict_risk >= 55
      ? `在遊戲裡，只要${aName}與${bName}同時想證明自己是對的，兩人中間的燈光就會瞬間熄滅，只留下門後逐漸靠近的回音。`
      : `在遊戲裡，${aName}與${bName}靠近時，鏡面才會出現完整倒影；只要其中一人退開，倒影就會多出一道陌生輪廓。`;
  const ending = result.communication < 65
    ? '當警報停下，唯一的出口是：先聽完彼此的感受，再決定答案。'
    : '當最後一盞燈亮起，唯一的出口是：把在意說出口，別讓沉默替你們下結論。';
  const soulEcho = result.resonance >= 75 && result.communication >= 65
    ? {
        label: '回音明顯',
        copy: `${aName}與${bName}的共鳴與溝通訊號都偏亮，容易在相處後留下牽掛；這代表更容易想起彼此，不等於能讀到對方當下正在想什麼。`,
        tone: 'border-cyan-200/30 bg-cyan-950/35 text-cyan-100',
      }
    : result.resonance >= 60
      ? {
          label: '回音存在',
          copy: `${aName}與${bName}之間有牽掛的訊號，但容易被忙碌、沉默或猜測蓋住。想確認彼此是否在意，最可靠的方式仍是主動而清楚的聯絡。`,
          tone: 'border-violet-200/30 bg-violet-950/35 text-violet-100',
        }
      : {
          label: '回音微弱',
          copy: `目前關係磁場的回音較淡，不能從分數推定誰一定在想誰。先用一次真誠、無壓力的聯絡，讓關係有重新被聽見的機會。`,
          tone: 'border-slate-200/25 bg-slate-950/40 text-slate-100',
        };

  return {
    aName,
    bName,
    aIdentity,
    bIdentity,
    initiator: aIdentity,
    initiatorCopy: `${aIdentity}先開啟本局，代表他先主動把這段關係放進心裡、願意理解你們的磁場。這是發起探索的線索，不是對任何人內心的保證。`,
    realmTitle: realm.title,
    resonanceTreasure: {
      element: MATCH_ELEMENT_LABEL[sharedElement],
      name: realm.treasure,
      power: realm.treasurePower,
    },
    soulEcho,
    opening: `${aIdentity}與${bIdentity}，本局進入「${realm.title}」：${realm.location}。${baziOpening}`,
    acts: [
      { title: '第一幕・靈異磁場啟動', copy: `${resonanceScene} 接著，${paranormalEvent} ${pairTrigger} 這是依${aName}與${bName}這一組資料變化的虛構靈異事件，也是本局磁場入口。`, tone: 'border-violet-300/30 bg-[linear-gradient(135deg,rgba(46,16,101,0.58),rgba(10,8,22,0.88))] text-violet-100' },
      { title: '第二幕・情感壓力逼近', copy: `${realm.omen} 門外的聲音越來越近，門卻始終沒有被打開。真正逼近的是「${weakest[0]}」與「${friction}」被一直拖著不處理的壓力；越假裝沒事，封印就越緊。`, tone: 'border-rose-300/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.52),rgba(24,5,15,0.92))] text-rose-100' },
      { title: '第三幕・鬼魅低語回應', copy: `${aName}與${bName}，門後的回音不是替你們下結論；它只把你們正在避開的線索說回來：${friction}。先有人回應，這道門才會開始鬆動。`, tone: 'border-fuchsia-300/30 bg-[linear-gradient(135deg,rgba(76,29,149,0.46),rgba(28,8,38,0.92))] text-fuchsia-100' },
      { title: '第四幕・神祕封印出口', copy: `${ending} 本局的出口不是隨機，而是「${realm.exit}」。拿到下方的五元素封印寶珠、解除結界，象徵兩人願意把緊繃轉成可以一起經營的相生條件。`, tone: 'border-amber-300/35 bg-[linear-gradient(135deg,rgba(120,53,15,0.48),rgba(20,12,20,0.94))] text-amber-100' },
    ],
  };
}

function buildMatchGuidance(data: MatchResponse) {
  const aName = data.displayA.name || '第一位';
  const bName = data.displayB.name || '第二位';
  const result = data.result;
  const seed = stableHash([
    aName,
    bName,
    data.displayA.zodiacZh,
    data.displayB.zodiacZh,
    data.displayA.bloodType,
    data.displayB.bloodType,
    result.match_score,
    result.resonance,
    result.communication,
    result.stability,
    result.conflict_risk,
  ].join('|'));
  const strongestMetric = [
    ['共鳴感', result.resonance],
    ['溝通感', result.communication],
    ['穩定度', result.stability],
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const weakestMetric = [
    ['共鳴感', result.resonance],
    ['溝通感', result.communication],
    ['穩定度', result.stability],
    ['衝突風險', 100 - result.conflict_risk],
  ].sort((a, b) => Number(a[1]) - Number(b[1]))[0];
  const strongestZone = result.zones.resonance[seed % Math.max(1, result.zones.resonance.length)] ?? '彼此有值得珍惜的吸引力';
  const frictionZone = result.zones.conflict[seed % Math.max(1, result.zones.conflict.length)] ?? result.zones.grinding[0] ?? '先把溝通節奏放慢';
  const scoreLevel = result.match_score >= 80 ? '高共鳴' : result.match_score >= 65 ? '可經營' : '需要耐心磨合';

  const encouragementOptions = [
    `${aName}與${bName}的關係不是只看分數，而是看你們願不願意把「${strongestMetric[0]}」變成日常裡可被感受到的善意。`,
    `${aName}與${bName}目前屬於「${scoreLevel}」型配對；真正能讓關係往前的，是把優勢用在理解，而不是用在拉扯。`,
    `這段關係最值得珍惜的是「${strongestZone}」。只要願意把這份相應力落到行動，關係就會比現在更穩。`,
  ];
  const warningOptions = result.conflict_risk >= 60
    ? [
        `目前需要留意「${frictionZone}」。衝突不是不能化解，但一定要先停止互相猜測。`,
        `這段關係的壓力點不小，越在意彼此，越要避免用情緒逼對方立刻理解。`,
        `當衝突升高時，先暫停、再表達需求；不要把一時的語氣當成整段關係的答案。`,
      ]
    : [
        `目前最大提醒是別把好感當成理所當然，穩定關係仍需要持續回應。`,
        `即使衝突風險不高，也要避免冷處理；小事說清楚，大事才不會累積。`,
        `這段關係適合慢慢加深，但仍要定期確認彼此的安全感與期待。`,
      ];
  const actionOptions = [
    result.communication < 65
      ? '每次談重要事情前，先說清楚「我需要被聽見」還是「我需要建議」，讓對方知道怎麼愛你。'
      : '保留固定的深聊時間，把感謝、壓力與期待說成具體事件，不用讓對方猜。',
    result.stability < 65
      ? '先建立一個固定相處節奏，例如每週一次不被打擾的對話，讓安全感慢慢回來。'
      : '把已經穩定的地方延續下去，再慢慢處理需要磨合的小裂縫。',
    result.conflict_risk >= 60
      ? '約定暫停信號：任何一方情緒上來時先停五分鐘，再回來講真正需求。'
      : '主動放大對方做對的事，讓關係靠鼓勵前進，而不是靠糾錯維持。',
  ];

  return {
    level: scoreLevel,
    coreEncouragement: pickStable(encouragementOptions, seed),
    mainStrength: `目前優勢在「${strongestMetric[0]}」，代表${aName}與${bName}之間有一個可以被經營放大的正向入口。`,
    mainWarning: pickStable(warningOptions, seed, 5),
    actionAdvice: pickStable(actionOptions, seed, 9),
    growthReminder: `成長提醒：${weakestMetric[0]}不是判決，而是你們今年最適合一起練習的功課；願意改過、願意靠近，才是真正的順天。`,
  };
}

function ElderChoiceCard({
  active,
  title,
  description,
  onClick,
  tone,
  attention = false,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  tone: 'violet' | 'amber' | 'pink' | 'cyan';
  attention?: boolean;
}) {
  const tones = {
    violet: active
      ? 'border-2 border-violet-200 bg-violet-500/20 text-violet-50 shadow-[0_0_30px_rgba(167,139,250,0.42)] ring-2 ring-violet-300/50 ring-offset-2 ring-offset-[#10101a]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    amber: active
      ? 'border-2 border-amber-100 bg-amber-500/20 text-amber-50 shadow-[0_0_30px_rgba(251,191,36,0.42)] ring-2 ring-amber-200/50 ring-offset-2 ring-offset-[#10101a]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    pink: active
      ? 'border-2 border-pink-200 bg-pink-500/20 text-pink-50 shadow-[0_0_30px_rgba(244,114,182,0.42)] ring-2 ring-pink-300/50 ring-offset-2 ring-offset-[#10101a]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
    cyan: active
      ? 'border-2 border-cyan-100 bg-cyan-500/20 text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.42)] ring-2 ring-cyan-200/50 ring-offset-2 ring-offset-[#10101a]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)]',
  };

  const attentionClass = attention && !active ? 'border-rose-400/85 bg-rose-500/12 text-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.24)]' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all hover:border-white/20 ${attentionClass || tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">{title}</p>
        <span className={`choice-signal ${active ? 'choice-signal--done' : 'choice-signal--idle'}`}>
          {active ? '已選' : '點選'}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">{description}</p>
    </button>
  );
}

function ScoreRow({ label, score, tone }: { label: string; score: number; tone: 'violet' | 'amber' | 'cyan' | 'pink' }) {
  const gradients = {
    violet: 'linear-gradient(90deg, #6D4AFF, #A78BFA)',
    amber: 'linear-gradient(90deg, #C9A24A, #F4C95D)',
    cyan: 'linear-gradient(90deg, #22D3EE, #6EE7F9)',
    pink: 'linear-gradient(90deg, #EC4899, #F9A8D4)',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-[color:var(--text-sub)]">{label}</span>
        <span className="text-sm font-semibold text-[color:var(--text-main)]">{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: gradients[tone] }} />
      </div>
    </div>
  );
}

function OracleHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-2 align-middle z-20 font-sans">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)] hover:bg-cyan-500/25 transition-all focus:outline-none"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 w-56 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-3.5 text-xs leading-5 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.25)] animate-fade-in font-sans">
            {text}
            <button 
              type="button" 
              className="block mt-2 text-[10px] font-bold text-cyan-400 text-right w-full hover:underline"
              onClick={() => setOpen(false)}
            >
              我知道了 ✗
            </button>
          </span>
        </>
      )}
    </span>
  );
}

function PersonStep({
  title,
  description,
  accent,
  value,
  onChange,
  selectionConfirm,
  onSelectionConfirm,
  showValidation = false,
}: {
  title: string;
  description: string;
  accent: 'violet' | 'amber';
  value: PersonInput;
  onChange: (value: PersonInput) => void;
  selectionConfirm: SelectionConfirm;
  onSelectionConfirm: (value: SelectionConfirm) => void;
  showValidation?: boolean;
}) {
  const showMissingName = showValidation && value.name.trim().length < 2;
  const showMissingBirthDate = showValidation && !value.birthDate;
  const [showBloodOptions, setShowBloodOptions] = useState(value.bloodType !== 'unknown');
  const showMissingGender = showValidation && !selectionConfirm.gender;
  const [showShichenOptions, setShowShichenOptions] = useState(Boolean(value.birthHourBranch && value.birthHourBranch !== 'unknown'));
  return (
    <div className="fortune-card p-5 sm:p-7">
      <div className="max-w-2xl">
        <p className={`inline-flex rounded-full border px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.24em] ${accent === 'violet' ? 'border-violet-400/25 bg-violet-950/20 text-violet-300' : 'border-amber-400/25 bg-amber-950/20 text-amber-300'}`}>
          PAIRING INPUT
        </p>
        <h2 className="mt-3 font-serif text-2xl font-black leading-tight text-[color:var(--text-main)] sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{description}</p>
      </div>

      <div className="mt-6 space-y-7">
        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            1. 姓名
            <OracleHint text="🔮 姓名乃人和磁場之五格載體，大數據將通過姓名聲波諧振進行血緣與宿命課題共振。" />
          </label>
          <input
            type="text"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder="請輸入姓名，至少 2 個字"
            className={`form-input w-full text-base neon-input-focus neon-card-hover glass-input ${accent === 'violet' ? 'glass-input-cyan' : ''} ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
          />
          {showMissingName && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002"}</p>
          )}
        </div>

        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            2. 出生日期（萬年曆）
            <OracleHint text="🪐 生辰乃星曜入宮的天命坐標，系統將自動換算為紫微干支天盤以進行宿命軌道分析。" />
          </label>
          <LunarBirthdayInput
            value={value.birthDate}
            onChange={(solarDate) => onChange({ ...value, birthDate: solarDate })}
            accent={accent}
            label="請選擇國曆或農曆"
          />
          {showMissingBirthDate && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\u3002"}</p>
          )}
        </div>

        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            3. 出生時辰（可略過）
            <OracleHint text="知道時辰可生成完整四柱八字；不知道也可以直接選不知道，系統只用年、月、日三柱，不會假裝補出時柱。" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ElderChoiceCard
              active={showShichenOptions}
              title="我知道出生時辰"
              description="展開十二時辰，點選正確時辰後以完整四柱配對。"
              onClick={() => setShowShichenOptions(true)}
              tone={accent}
            />
            <ElderChoiceCard
              active={!showShichenOptions && (!value.birthHourBranch || value.birthHourBranch === 'unknown')}
              title="不知道出生時辰"
              description="直接用八字三柱基礎配對；時柱不推定。"
              onClick={() => {
                setShowShichenOptions(false);
                onChange({ ...value, birthHourBranch: 'unknown' });
              }}
              tone={accent === 'violet' ? 'cyan' : 'pink'}
            />
          </div>
          {showShichenOptions && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SHICHEN_LIST.map((shichen) => (
                <button
                  key={shichen.branch}
                  type="button"
                  onClick={() => onChange({ ...value, birthHourBranch: shichen.branch })}
                  className={`rounded-xl border px-2 py-2.5 text-center transition ${value.birthHourBranch === shichen.branch ? 'border-2 border-amber-100 bg-amber-300/20 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.26)]' : 'border-white/10 bg-white/[0.035] text-white/65 hover:border-cyan-100/40 hover:text-cyan-50'}`}
                >
                  <span className="block text-sm font-black">{shichen.label}</span>
                  <span className="mt-0.5 block text-[10px] font-bold opacity-70">{shichen.range}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            4. 血型
            <OracleHint text="🧬 血型蘊含地脈遺傳之性格吸引力密碼，決定了雙人磁場的基礎吸引力與相處共鳴率。" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ElderChoiceCard
              active={showBloodOptions}
              title="我知道血型"
              description="展開 A、B、O、AB，將血型納入配對。"
              onClick={() => setShowBloodOptions(true)}
              tone={accent}
            />
            <ElderChoiceCard
              active={!showBloodOptions && value.bloodType === 'unknown'}
              title="不知道血型"
              description="仍可繼續配對；血型維度改為中性，不假裝已知。"
              onClick={() => {
                setShowBloodOptions(false);
                onChange({ ...value, bloodType: 'unknown' });
              }}
              tone={accent === 'violet' ? 'cyan' : 'pink'}
            />
          </div>
          {showBloodOptions && <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {BLOOD_TYPES.map((bloodType, index) => (
              <ElderChoiceCard
                key={bloodType}
                active={selectionConfirm.bloodType && value.bloodType === bloodType}
                title={`${bloodType} 型`}
                description={BLOOD_DESC[bloodType]}
                onClick={() => {
                  onChange({ ...value, bloodType });
                  onSelectionConfirm({ ...selectionConfirm, bloodType: true });
                }}
                tone={index % 2 === 0 ? accent : accent === 'violet' ? 'cyan' : 'pink'}
                attention={false}
              />
            ))}
          </div>}
        </div>

        <div>
          <label className="mb-2.5 block text-sm font-black text-[color:var(--text-main)]">
            5. 性別
            <OracleHint text="✦ 性別主要作為外在表徵與修辭調整的輔助變數，不影響底層天盤骨架的因果計算。" />
          </label>
          {showMissingGender && (
            <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002"}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <ElderChoiceCard
              active={selectionConfirm.gender && value.gender === 'female'}
              title="女性"
              description="用來修飾外在表現。"
              onClick={() => {
                onChange({ ...value, gender: 'female' });
                onSelectionConfirm({ ...selectionConfirm, gender: true });
              }}
              tone="pink"
              attention={showMissingGender}
            />
            <ElderChoiceCard
              active={selectionConfirm.gender && value.gender === 'male'}
              title="男性"
              description="只做外在呈現修飾。"
              onClick={() => {
                onChange({ ...value, gender: 'male' });
                onSelectionConfirm({ ...selectionConfirm, gender: true });
              }}
              tone="cyan"
              attention={showMissingGender}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


const MATCH_ELEMENT_LABEL: Record<MatchFiveElementKey, string> = {
  space: '空元素',
  air: '風元素',
  water: '水元素',
  fire: '火元素',
  earth: '地元素',
};

const MATCH_ELEMENT_SHORT_LABEL: Record<MatchFiveElementKey, ProductElement> = {
  space: '空',
  air: '風',
  water: '水',
  fire: '火',
  earth: '地',
};

const MATCH_ELEMENT_ICON: Record<MatchFiveElementKey, string> = {
  space: '★',
  air: '◎',
  water: '◆',
  fire: '▲',
  earth: '●',
};

const MATCH_ELEMENT_ORDER: MatchFiveElementKey[] = ['space', 'air', 'water', 'fire', 'earth'];
const MATCH_GENERATING_CHAIN: MatchFiveElementKey[] = ['space', 'air', 'water', 'fire', 'earth', 'space'];
const MATCH_CONFLICT_CHAIN: MatchFiveElementKey[] = ['space', 'water', 'fire', 'air', 'earth', 'space'];

const MATCH_RELATION_LABEL: Record<MatchFiveElementResult['relationMode'], string> = {
  generating: '相生優勢',
  conflicting: '相剋調和',
  balancing: '平衡補強',
};

const MATCH_RELATION_TONE: Record<MatchFiveElementResult['relationMode'], string> = {
  generating: '兩人的能量可以互相推動，重點是把自然吸引轉成穩定互動。',
  conflicting: '兩人的節奏容易拉扯，重點是先降低摩擦，再建立共同語言。',
  balancing: '兩人的差異可以互補，重點是把快慢、冷熱與距離調到同一個頻率。',
};

const MATCH_RELATION_STORY: Record<MatchFiveElementResult['relationMode'], string> = {
  generating: '相生軌道：空定方向，風把話說清楚，水接住感受，火推進行動，地讓承諾落地。',
  conflicting: '相剋軌道：空會拉開距離，水會壓住火，火會燒急風，風會吹散地，地會壓縮空間。',
  balancing: '平衡軌道：不是誰壓過誰，而是找到兩人最能共振的位置，讓缺口變成互補。',
};

const MATCH_ELEMENT_PROFILE: Record<
  MatchFiveElementKey,
  {
    title: string;
    story: string;
    resonance: string;
    excess: string;
    action: string;
    className: string;
  }
> = {
  space: {
    title: '界線與全局',
    story: '空元素像兩人之間的呼吸距離。它讓關係有視野，也讓彼此知道什麼該靠近、什麼該保留。',
    resonance: '足夠時，兩人比較能尊重彼此，不會把愛變成壓迫。',
    excess: '太弱會黏、太強會冷，容易出現想靠近又怕被綁住的矛盾。',
    action: '先把期待說清楚：需要陪伴、需要自由、需要安全感，各自給一句明確答案。',
    className: 'border-violet-300/45 bg-violet-400/12 text-violet-100 shadow-[0_0_18px_rgba(167,139,250,0.14)]',
  },
  air: {
    title: '溝通與理解',
    story: '風元素像訊號。它決定兩人能不能把心裡的畫面翻譯成對方聽得懂的語言。',
    resonance: '足夠時，誤會比較容易被說開，關係會有輕盈感。',
    excess: '太弱會悶、太強會飄，容易講很多卻沒有真正靠近。',
    action: '每次衝突先用一句話整理重點：我在意的是什麼、我希望你怎麼回應。',
    className: 'border-cyan-300/45 bg-cyan-400/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.13)]',
  },
  water: {
    title: '情緒與修復',
    story: '水元素像共感。它讓關係不只是對錯，而是能不能聽見彼此真正的感受。',
    resonance: '足夠時，兩人比較願意示弱，也比較願意安撫彼此。',
    excess: '太弱會乾、太強會淹，容易把小情緒累積成大委屈。',
    action: '先接情緒再談解法：我知道你會難受，然後我們一起看下一步。',
    className: 'border-blue-300/45 bg-blue-400/12 text-blue-100 shadow-[0_0_18px_rgba(96,165,250,0.13)]',
  },
  fire: {
    title: '熱度與推進',
    story: '火元素像心動的引擎。它讓關係有主動、有表達，也有往前走的勇氣。',
    resonance: '足夠時，兩人不只是等待，而是會主動創造靠近的時刻。',
    excess: '太弱會冷、太強會急，容易一方想衝、一方想退。',
    action: '用小行動補火：主動邀約、主動讚美、主動確認下一次見面。',
    className: 'border-rose-300/45 bg-rose-400/12 text-rose-100 shadow-[0_0_18px_rgba(251,113,133,0.14)]',
  },
  earth: {
    title: '穩定與承諾',
    story: '地元素像日常的地基。它決定這段關係能不能從感覺，慢慢變成可靠的生活節奏。',
    resonance: '足夠時，兩人會比較有安全感，也比較願意規劃未來。',
    excess: '太弱會不安、太強會固執，容易把關係卡在規則與壓力裡。',
    action: '把承諾變小、變具體：固定聯絡、固定見面、固定完成一件共同的事。',
    className: 'border-amber-300/45 bg-amber-500/12 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.13)]',
  },
};

const MATCH_ELEMENT_ORBIT: Record<MatchFiveElementKey, { x: number; y: number; left: string; top: string }> = {
  space: { x: 50, y: 8, left: '50%', top: '8%' },
  air: { x: 86, y: 36, left: '86%', top: '36%' },
  water: { x: 72, y: 82, left: '72%', top: '82%' },
  fire: { x: 28, y: 82, left: '28%', top: '82%' },
  earth: { x: 14, y: 36, left: '14%', top: '36%' },
};

function orbitPoints(chain: MatchFiveElementKey[]) {
  return chain.map((element) => `${MATCH_ELEMENT_ORBIT[element].x},${MATCH_ELEMENT_ORBIT[element].y}`).join(' ');
}

function getElementRole(person: MatchFiveElementPersonResult, element: MatchFiveElementKey, sharedElement: MatchFiveElementKey) {
  if (element === sharedElement) return '共補';
  if (element === person.primaryElement) return '主補';
  if (element === person.secondaryElement) return '次補';
  return MATCH_ELEMENT_ICON[element];
}

function MatchNeedOrbit({
  person,
  sharedElement,
  relationMode,
  selectedElement,
  onSelect,
}: {
  person: MatchFiveElementPersonResult;
  sharedElement: MatchFiveElementKey;
  relationMode: MatchFiveElementResult['relationMode'];
  selectedElement: MatchFiveElementKey;
  onSelect: (element: MatchFiveElementKey) => void;
}) {
  const activeStroke = relationMode === 'conflicting' ? 'rgba(34,211,238,0.48)' : relationMode === 'generating' ? 'rgba(251,191,36,0.52)' : 'rgba(251,113,133,0.48)';

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[318px] min-w-0">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.7" />
        <polygon points={orbitPoints([...MATCH_ELEMENT_ORDER, 'space'])} fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
        <polyline points={orbitPoints(MATCH_GENERATING_CHAIN)} fill="none" stroke="rgba(251,191,36,0.22)" strokeWidth="0.75" strokeLinejoin="round" />
        <polyline points={orbitPoints(MATCH_CONFLICT_CHAIN)} fill="none" stroke="rgba(34,211,238,0.18)" strokeWidth="0.75" strokeLinejoin="round" />
        <polyline
          points={orbitPoints(relationMode === 'conflicting' ? MATCH_CONFLICT_CHAIN : MATCH_GENERATING_CHAIN)}
          fill="none"
          stroke={activeStroke}
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        {/* 點星升級（2026-08-13）：選中元素的生剋線路亮起，客戶看得到「這顆星連到誰」 */}
        {MATCH_GENERATING_CHAIN.slice(0, -1).map((from, index) => {
          const to = MATCH_GENERATING_CHAIN[index + 1];
          if (from !== selectedElement && to !== selectedElement) return null;
          return (
            <line
              key={`hg-${from}-${to}`}
              x1={MATCH_ELEMENT_ORBIT[from].x} y1={MATCH_ELEMENT_ORBIT[from].y}
              x2={MATCH_ELEMENT_ORBIT[to].x} y2={MATCH_ELEMENT_ORBIT[to].y}
              stroke="rgba(251,191,36,0.85)" strokeWidth="1.5" strokeLinecap="round"
              style={{ transition: 'opacity 250ms ease' }}
            />
          );
        })}
        {MATCH_CONFLICT_CHAIN.slice(0, -1).map((from, index) => {
          const to = MATCH_CONFLICT_CHAIN[index + 1];
          if (from !== selectedElement && to !== selectedElement) return null;
          return (
            <line
              key={`hc-${from}-${to}`}
              x1={MATCH_ELEMENT_ORBIT[from].x} y1={MATCH_ELEMENT_ORBIT[from].y}
              x2={MATCH_ELEMENT_ORBIT[to].x} y2={MATCH_ELEMENT_ORBIT[to].y}
              stroke="rgba(34,211,238,0.75)" strokeWidth="1.3" strokeLinecap="round"
              style={{ transition: 'opacity 250ms ease' }}
            />
          );
        })}
      </svg>

      <div className="absolute inset-[35%] grid place-items-center rounded-full border border-white/10 bg-black/36 text-center shadow-[inset_0_0_18px_rgba(255,255,255,0.055)]">
        <div>
          <p className="text-[10px] font-black tracking-[0.18em] text-white/44">共鳴</p>
          <p className="mt-1 text-xs font-black text-cyan-100">{MATCH_RELATION_LABEL[relationMode]}</p>
          <p className="mt-1 text-[10px] font-bold text-amber-100/82">共補 {MATCH_ELEMENT_SHORT_LABEL[sharedElement]}</p>
        </div>
      </div>

      {MATCH_ELEMENT_ORDER.map((element) => {
        const score = person.needScores[element];
        const size = Math.max(56, Math.min(82, 50 + score * 0.36));
        const point = MATCH_ELEMENT_ORBIT[element];
        const profile = MATCH_ELEMENT_PROFILE[element];
        const role = getElementRole(person, element, sharedElement);
        const isShared = element === sharedElement;
        const isPrimary = element === person.primaryElement;
        const isSecondary = element === person.secondaryElement;
        const isSelected = element === selectedElement;

        return (
          <button
            type="button"
            key={element}
            className={`absolute grid place-items-center rounded-full border px-2 text-center ${profile.className} ${
              isSelected
                ? 'ring-4 ring-amber-100/70 shadow-[0_0_30px_rgba(251,191,36,0.42)]'
                : isShared
                  ? 'ring-2 ring-cyan-200/60'
                : isPrimary
                  ? 'ring-2 ring-amber-200/45'
                  : isSecondary
                    ? 'ring-1 ring-white/25'
                    : 'opacity-85'
            } transition-transform active:scale-[0.98]`}
            aria-pressed={isSelected}
            aria-label={`查看${MATCH_ELEMENT_LABEL[element]}AI解讀`}
            onClick={() => onSelect(element)}
            style={{
              left: point.left,
              top: point.top,
              width: `${size}px`,
              height: `${size}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div>
              <p className="font-serif text-xl font-black leading-none">{MATCH_ELEMENT_SHORT_LABEL[element]}</p>
              <p className="mt-1 text-xs font-black leading-none">{score}</p>
              <p className={`mt-1 text-[10px] font-bold leading-tight ${isSelected ? 'text-amber-50' : 'text-white/58'}`}>{role}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MatchElementStoryGrid({ result }: { result: MatchFiveElementResult }) {
  const averageNeed = (element: MatchFiveElementKey) => Math.round((result.personA.needScores[element] + result.personB.needScores[element]) / 2);

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-5">
      {MATCH_ELEMENT_ORDER.map((element) => {
        const profile = MATCH_ELEMENT_PROFILE[element];
        const score = averageNeed(element);
        const active = element === result.sharedElement;

        return (
          <article
            key={element}
            className={`rounded-2xl border p-3 ${active ? `${profile.className} ring-1 ring-cyan-200/45` : 'border-white/10 bg-black/18 text-[color:var(--text-sub)]'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-serif text-2xl font-black leading-none">{MATCH_ELEMENT_SHORT_LABEL[element]}</p>
              <span className="rounded-full border border-white/10 bg-black/18 px-2 py-0.5 text-[10px] font-black text-amber-100">{score}</span>
            </div>
            <p className="mt-2 text-[11px] font-black leading-tight text-[color:var(--text-main)]">{profile.title}</p>
            <p className="mt-1.5 text-[11px] font-bold leading-5 text-[color:var(--text-sub)]">{profile.action}</p>
          </article>
        );
      })}
    </div>
  );
}

function MatchFiveElementPriorityCard({ result }: { result: MatchFiveElementResult }) {
  const highlights = uniqueAiCopywritingLines(result.inlineHighlights, 3);
  const people = [result.personA, result.personB];
  const sharedElement = MATCH_ELEMENT_LABEL[result.sharedElement];
  const sharedProfile = MATCH_ELEMENT_PROFILE[result.sharedElement];
  const [selectedElement, setSelectedElement] = useState<MatchFiveElementKey>(result.sharedElement);
  const sharedNeed = Math.round((result.personA.needScores[result.sharedElement] + result.personB.needScores[result.sharedElement]) / 2);
  const primaryGap = Math.abs(result.personA.needScores[result.personA.primaryElement] - result.personB.needScores[result.personB.primaryElement]);
  const selectedProfile = MATCH_ELEMENT_PROFILE[selectedElement];
  const selectedAverageNeed = Math.round((result.personA.needScores[selectedElement] + result.personB.needScores[selectedElement]) / 2);
  const selectedIsShared = selectedElement === result.sharedElement;
  /* 點星有感升級（2026-08-13）：點軌道星體 → 自動捲到 AI 點星解讀卡（原本解讀卡在畫面外，點了沒感覺） */
  const starReadingRef = useRef<HTMLDivElement | null>(null);
  const selectFromOrbit = (element: MatchFiveElementKey) => {
    setSelectedElement(element);
    window.setTimeout(() => starReadingRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
  };

  useEffect(() => {
    setSelectedElement(result.sharedElement);
  }, [result.sharedElement]);

  return (
    <section className="fortune-card relative overflow-hidden border-rose-300/28 bg-[linear-gradient(155deg,rgba(127,29,29,0.24),rgba(15,23,42,0.94)_50%,rgba(8,47,73,0.24))] p-4 shadow-[0_0_30px_rgba(251,113,133,0.12)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-300 via-cyan-300 via-rose-300 to-amber-300" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-200">AI MATCH · 五元素軌道</p>
          <h2 className="mt-2 bg-gradient-to-br from-amber-50 via-rose-100 to-cyan-100 bg-clip-text font-serif text-3xl font-black leading-tight text-transparent sm:text-5xl">
            靈魂配對五元素
          </h2>
          <p className="mt-3 text-sm font-bold leading-7 text-amber-100/78">
            AI 將兩人的生日結構、血型節奏與配對分數交叉統計，轉成五元素軌道。客戶看到的不只是分數，而是這段關係要補哪一種「聯結」與「共鳴」。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-3 py-3 text-center">
            <p className="text-[10px] font-black text-cyan-100">關係模式</p>
            <p className="mt-1 text-sm font-black text-cyan-50">{MATCH_RELATION_LABEL[result.relationMode]}</p>
          </div>
          <div className="rounded-2xl border border-amber-200/25 bg-amber-300/10 px-3 py-3 text-center">
            <p className="text-[10px] font-black text-amber-100">共鳴補強</p>
            <p className="mt-1 font-serif text-2xl font-black leading-none text-amber-50">{sharedNeed}</p>
          </div>
          <div className="rounded-2xl border border-rose-200/25 bg-rose-300/10 px-3 py-3 text-center">
            <p className="text-[10px] font-black text-rose-100">主補差距</p>
            <p className="mt-1 font-serif text-2xl font-black leading-none text-rose-50">{primaryGap}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-amber-200/22 bg-amber-300/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">共同主軸</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
          <div className={`grid h-20 w-20 place-items-center rounded-full border text-center ${sharedProfile.className}`}>
            <div>
              <p className="font-serif text-3xl font-black leading-none">{MATCH_ELEMENT_SHORT_LABEL[result.sharedElement]}</p>
              <p className="mt-1 text-[10px] font-black text-white/58">共補</p>
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl font-black leading-tight text-amber-50">{sharedElement} · {sharedProfile.title}</h3>
            <p className="mt-2 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{sharedProfile.story}</p>
            <p className="mt-2 text-xs font-black leading-6 text-cyan-100">{MATCH_RELATION_TONE[result.relationMode]}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {people.map((person) => {
          const primaryProfile = MATCH_ELEMENT_PROFILE[person.primaryElement];
          const secondaryProfile = MATCH_ELEMENT_PROFILE[person.secondaryElement];

          return (
            <article key={person.name} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-cyan-100">{person.name}</p>
                  <p className="mt-1 text-2xl font-black leading-tight text-amber-100">主補：{MATCH_ELEMENT_LABEL[person.primaryElement]}</p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-[color:var(--text-sub)]">
                  次補：{MATCH_ELEMENT_LABEL[person.secondaryElement]}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
                <MatchNeedOrbit
                  person={person}
                  sharedElement={result.sharedElement}
                  relationMode={result.relationMode}
                  selectedElement={selectedElement}
                  onSelect={selectFromOrbit}
                />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-200/18 bg-amber-300/8 p-3">
                  <p className="text-[10px] font-black text-amber-100">主補解讀</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{primaryProfile.resonance}</p>
                </div>
                <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/8 p-3">
                  <p className="text-[10px] font-black text-cyan-100">次補提醒</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{secondaryProfile.action}</p>
                </div>
              </div>

              <p className="mt-3 text-xs font-black leading-6 text-amber-100">
                AI 統計：{MATCH_ELEMENT_LABEL[person.primaryElement]}需求 {person.needScores[person.primaryElement]}，{MATCH_ELEMENT_LABEL[person.secondaryElement]}需求 {person.needScores[person.secondaryElement]}。先補主補，再用次補穩住互動。
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-[24px] border border-cyan-200/20 bg-cyan-300/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">五元素相生相剋</p>
          <span className="rounded-full border border-cyan-200/25 bg-black/20 px-3 py-1 text-[11px] font-black text-cyan-50">
            {MATCH_RELATION_LABEL[result.relationMode]}
          </span>
        </div>
        <p className="mt-2 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{MATCH_RELATION_STORY[result.relationMode]}</p>
        <p className="mt-2 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{enforceAiCopywritingTone(result.relationReason)}</p>
        <MatchElementStoryGrid result={result} />
      </div>

      <div ref={starReadingRef} className={`mt-5 scroll-mt-24 rounded-[24px] border p-4 ${selectedProfile.className}`}>
        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-black/18 text-center">
            <div>
              <p className="font-serif text-3xl font-black leading-none">{MATCH_ELEMENT_SHORT_LABEL[selectedElement]}</p>
              <p className="mt-1 text-[10px] font-black text-white/60">{selectedAverageNeed}</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">AI 點星解讀</p>
            <h3 className="mt-1 text-2xl font-black leading-tight text-[color:var(--text-main)]">
              {MATCH_ELEMENT_LABEL[selectedElement]} · {selectedProfile.title}
            </h3>
            <p className="mt-2 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{selectedProfile.story}</p>
          </div>
          {selectedIsShared && (
            <span className="rounded-full border border-amber-100/35 bg-amber-100/15 px-3 py-1 text-[11px] font-black text-amber-50">
              AI 判定必補
            </span>
          )}
        </div>

        {/* 兩人需求對比（點星有感升級）：只讀既有 needScores，讓客戶看見「這顆星，誰更需要」 */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[result.personA, result.personB].map((person) => {
            const need = person.needScores[selectedElement];
            const roleRaw = getElementRole(person, selectedElement, result.sharedElement);
            const roleLabel = ['共補', '主補', '次補'].includes(roleRaw) ? roleRaw : '平衡';
            return (
              <div key={person.name} className="rounded-2xl border border-white/12 bg-black/22 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-black text-white/85">{person.name}</p>
                  <span className="shrink-0 rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-amber-100">{roleLabel}・{need}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-amber-300/90 to-rose-300/90 transition-all duration-500"
                    style={{ width: `${Math.max(4, Math.min(100, need))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs font-black leading-6 text-amber-100/90">
          {(() => {
            const needA = result.personA.needScores[selectedElement];
            const needB = result.personB.needScores[selectedElement];
            if (needA === needB) return `兩人對${MATCH_ELEMENT_LABEL[selectedElement]}的需求同為 ${needA}，步調一致，一起補、一起穩。`;
            const lead = needA > needB ? result.personA : result.personB;
            const follow = needA > needB ? result.personB : result.personA;
            return `AI 判讀：${lead.name} 需求 ${Math.max(needA, needB)} 較高，由${lead.name}主導這一項補強，${follow.name}（${Math.min(needA, needB)}）配合節奏就好。`;
          })()}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
            <p className="text-[10px] font-black text-amber-100">補了會提升</p>
            <p className="mt-1 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{selectedProfile.resonance}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
            <p className="text-[10px] font-black text-rose-100">沒補會摩擦</p>
            <p className="mt-1 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{selectedProfile.excess}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
            <p className="text-[10px] font-black text-cyan-100">AI 建議行動</p>
            <p className="mt-1 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{selectedProfile.action}</p>
          </div>
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/18 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">AI 行動提醒</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {highlights.map((item) => (
              <p key={item} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold leading-6 text-[color:var(--text-sub)]">
                {enforceAiCopywritingTone(item)}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const ORBIT_ELEMENT_ORDER: MatchFiveElementKey[] = ['space', 'air', 'water', 'fire', 'earth'];
const ORBIT_GENERATING_CHAIN: MatchFiveElementKey[] = ['space', 'air', 'water', 'fire', 'earth', 'space'];
const ORBIT_CONFLICT_CHAIN: MatchFiveElementKey[] = ['space', 'water', 'fire', 'air', 'earth', 'space'];

const ORBIT_ELEMENT_META: Record<
  MatchFiveElementKey,
  {
    label: string;
    short: string;
    title: string;
    story: string;
    benefit: string;
    friction: string;
    action: string;
    className: string;
    halo: string;
  }
> = {
  space: {
    label: '空元素',
    short: '空',
    title: '界線、視野與距離感',
    story: '空元素代表兩人之間的呼吸空間。它讓關係有全局感，也讓彼此知道靠近與保留的界線。',
    benefit: '補足空元素後，兩人比較能尊重彼此，不會把愛變成壓迫或猜測。',
    friction: '空不足時，容易黏得太緊、想太多，或一方突然抽離，另一方感到不安。',
    action: '先約定彼此需要的陪伴頻率、獨處時間與安全感界線。',
    className: 'border-violet-300/55 bg-violet-400/14 text-violet-50',
    halo: 'rgba(167,139,250,0.5)',
  },
  air: {
    label: '風元素',
    short: '風',
    title: '溝通、理解與轉念',
    story: '風元素代表訊號與語言。它決定兩人能不能把心裡的畫面翻成對方聽得懂的話。',
    benefit: '補足風元素後，誤會比較容易被說開，兩人的互動會更輕、更清楚。',
    friction: '風不足時，話會卡住；風過亂時，會講很多卻沒有真正靠近。',
    action: '每次摩擦先說一句重點：我在意的是什麼，我希望你怎麼回應。',
    className: 'border-cyan-300/55 bg-cyan-400/14 text-cyan-50',
    halo: 'rgba(34,211,238,0.46)',
  },
  water: {
    label: '水元素',
    short: '水',
    title: '情緒、共感與修復',
    story: '水元素代表感受的流動。它讓關係不只爭對錯，而是能不能聽見彼此真正受傷的地方。',
    benefit: '補足水元素後，兩人比較願意示弱，也比較願意安撫與修復。',
    friction: '水不足時容易冷處理；水太混濁時，小情緒會累積成大委屈。',
    action: '先接住情緒再談解法：我知道你會難受，我們一起看下一步。',
    className: 'border-blue-300/55 bg-blue-400/14 text-blue-50',
    halo: 'rgba(96,165,250,0.46)',
  },
  fire: {
    label: '火元素',
    short: '火',
    title: '熱度、主動與推進',
    story: '火元素代表心動與行動力。它讓關係有主動表達、有熱情，也有往前走的勇氣。',
    benefit: '補足火元素後，兩人不只是等待，而是會主動創造靠近的時刻。',
    friction: '火不足時關係會冷；火過急時，一方想衝、一方想退，容易吵起來。',
    action: '用小行動補火：主動邀約、主動讚美、主動確認下一次見面。',
    className: 'border-rose-300/55 bg-rose-400/14 text-rose-50',
    halo: 'rgba(251,113,133,0.5)',
  },
  earth: {
    label: '地元素',
    short: '地',
    title: '穩定、承諾與落地',
    story: '地元素代表關係的地基。它讓感覺變成可靠的日常，讓承諾不只停在口頭。',
    benefit: '補足地元素後，兩人會更有安全感，也更容易把未來規劃落實。',
    friction: '地不足時，關係會像沒有地基，容易不安、拖延、沒有承諾；地過重時，會變得固執與壓迫。',
    action: '把承諾變小、變具體：固定聯絡、固定見面、固定完成一件共同的事。',
    className: 'border-amber-300/60 bg-amber-400/16 text-amber-50',
    halo: 'rgba(251,191,36,0.55)',
  },
};

const ORBIT_RELATION_COPY: Record<MatchFiveElementResult['relationMode'], { title: string; story: string; focus: string }> = {
  generating: {
    title: '相生：能量互相推動',
    story: '相生線代表這段關係有自然推進力。空定方向，風說清楚，水接住情緒，火推進行動，地把承諾落地。',
    focus: '優先把 AI 判定必補的元素補起來，兩人的吸引力才會變成穩定互動。',
  },
  conflicting: {
    title: '相剋：摩擦需要調和',
    story: '相剋線代表互動容易拉扯。不是不適合，而是某個元素缺口會讓情緒、節奏或承諾互相消耗。',
    focus: '先補 AI 判定必補的元素，降低衝突，再讓相生線重新接上。',
  },
  balancing: {
    title: '平衡：差異可以互補',
    story: '平衡代表兩人不是同一種節奏，但可以互相補位。重點是找出哪顆星最需要被點亮。',
    focus: '把共同缺口補起來，差異就不會變成壓力，而會變成共鳴。',
  },
};

const ORBIT_POINTS: Record<MatchFiveElementKey, { x: number; y: number; left: string; top: string }> = {
  space: { x: 50, y: 7, left: '50%', top: '7%' },
  air: { x: 88, y: 35, left: '88%', top: '35%' },
  water: { x: 73, y: 83, left: '73%', top: '83%' },
  fire: { x: 27, y: 83, left: '27%', top: '83%' },
  earth: { x: 12, y: 35, left: '12%', top: '35%' },
};

function orbitPointList(chain: MatchFiveElementKey[]) {
  return chain.map((element) => `${ORBIT_POINTS[element].x},${ORBIT_POINTS[element].y}`).join(' ');
}

function averageNeedScore(result: MatchFiveElementResult, element: MatchFiveElementKey) {
  return Math.round((result.personA.needScores[element] + result.personB.needScores[element]) / 2);
}

function BaziBeastPairCards({
  foundation,
  personAName,
  personBName,
  personABirthDate,
  personBBirthDate,
}: {
  foundation?: BaziMatchFoundation;
  personAName: string;
  personBName: string;
  personABirthDate?: string;
  personBBirthDate?: string;
}) {
  const beastA = foundation?.personA.beastCard;
  const beastB = foundation?.personB.beastCard;
  if (!beastA || !beastB) return null;

  const cards = [
    { label: '第一位・我的八字神獸', name: personAName, age: getAgeFromBirthDate(personABirthDate), beast: beastA, tone: 'violet' },
    { label: '第二位・對方的八字神獸', name: personBName, age: getAgeFromBirthDate(personBBirthDate), beast: beastB, tone: 'amber' },
  ] as const;

  return (
    <section className="fortune-card relative overflow-hidden border border-cyan-100/20 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_37%),radial-gradient(circle_at_82%_0%,rgba(251,191,36,0.12),transparent_37%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(17,24,39,0.95))] p-3 shadow-[0_20px_56px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
      <div className="px-1 pb-3 pt-1 text-center sm:pb-4">
        <p className="text-[10px] font-black tracking-[0.25em] text-cyan-100/80">兩人八字・二十八宿神獸</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">
          同一份出生資料，會和八字頁的日柱神獸完全一致。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {cards.map(({ label, name, age, beast, tone }) => {
          const isViolet = tone === 'violet';
          return (
            <article
              key={label}
              className={`relative min-w-0 overflow-hidden rounded-[22px] border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-4 ${
                isViolet
                  ? 'border-violet-200/35 bg-[linear-gradient(145deg,rgba(76,29,149,0.36),rgba(15,23,42,0.94)_72%)]'
                  : 'border-amber-200/35 bg-[linear-gradient(145deg,rgba(146,64,14,0.28),rgba(15,23,42,0.94)_72%)]'
              }`}
            >
              <p className={`truncate text-[9px] font-black tracking-[0.12em] ${isViolet ? 'text-violet-100/85' : 'text-amber-100/85'}`}>{label}</p>
              <p className="mt-1 truncate text-sm font-black text-[color:var(--text-main)]">{name}{age === null ? '' : `・${age}歲`}</p>

              <div className="relative mt-2 aspect-[1.04] overflow-hidden rounded-[17px] border border-white/14 bg-black/25">
                <img
                  src={beast.youngDivineImage}
                  alt={`${beast.name}星宿幼體`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent px-2 pb-2 pt-7">
                  <p className="font-serif text-xl font-black tracking-wide text-white drop-shadow-[0_2px_9px_rgba(0,0,0,0.8)] sm:text-2xl">{beast.name}</p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${isViolet ? 'border-violet-200/25 bg-violet-200/10 text-violet-100' : 'border-amber-200/25 bg-amber-200/10 text-amber-100'}`}>
                  {beast.productElement}元素
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold text-white/75">日柱 {beast.dayPillar}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-5 text-white/75 sm:text-xs">{beast.coreMeaning}</p>
              <p className="mt-2 border-t border-white/8 pt-2 text-[9px] leading-4 text-white/45">{beast.direction}</p>
            </article>
          );
        })}
      </div>

      <p className="px-1 pt-3 text-center text-[10px] font-semibold leading-5 text-white/52">
        配對順序：先各自定位神獸，再交叉解讀兩人的互動。
      </p>
    </section>
  );
}

const MATCH_PEARL_META: Record<MatchFiveElementKey, { name: string; title: string; surface: string; core: string; glow: string }> = {
  space: { name: '星淵虛空珠', title: '界線與視野', surface: 'radial-gradient(circle at 29% 22%, rgba(255,255,255,.96) 0 4%, rgba(196,181,253,.82) 13%, rgba(79,70,229,.82) 42%, rgba(15,23,42,.98) 75%)', core: 'radial-gradient(ellipse at 68% 70%, rgba(15,23,42,.88), transparent 59%), radial-gradient(ellipse at 35% 30%, rgba(221,214,254,.64), transparent 48%)', glow: 'rgba(167,139,250,0.55)' },
  air: { name: '蒼嵐御風珠', title: '溝通與理解', surface: 'radial-gradient(circle at 29% 22%, rgba(255,255,255,.96) 0 4%, rgba(165,243,252,.84) 13%, rgba(6,182,212,.8) 44%, rgba(8,47,73,.98) 76%)', core: 'radial-gradient(ellipse at 67% 70%, rgba(8,47,73,.88), transparent 59%), radial-gradient(ellipse at 31% 36%, rgba(207,250,254,.65), transparent 50%)', glow: 'rgba(34,211,238,0.5)' },
  water: { name: '潮汐回音珠', title: '情緒與修復', surface: 'radial-gradient(circle at 29% 21%, rgba(255,255,255,.98) 0 4%, rgba(186,230,253,.9) 12%, rgba(14,165,233,.78) 42%, rgba(8,47,73,.99) 77%)', core: 'radial-gradient(ellipse at 70% 72%, rgba(3,105,161,.92), transparent 56%), radial-gradient(ellipse at 33% 33%, rgba(224,242,254,.72), transparent 47%)', glow: 'rgba(56,189,248,0.56)' },
  fire: { name: '燼星業火珠', title: '熱度與推進', surface: 'radial-gradient(circle at 29% 22%, rgba(255,251,235,.96) 0 4%, rgba(253,186,116,.9) 13%, rgba(244,63,94,.8) 44%, rgba(76,5,25,.99) 77%)', core: 'radial-gradient(ellipse at 70% 70%, rgba(127,29,29,.9), transparent 57%), radial-gradient(ellipse at 33% 33%, rgba(254,215,170,.7), transparent 48%)', glow: 'rgba(251,113,133,0.52)' },
  earth: { name: '地脈琥珀珠', title: '穩定與承諾', surface: 'radial-gradient(circle at 29% 22%, rgba(255,251,235,.98) 0 4%, rgba(253,230,138,.85) 13%, rgba(217,119,6,.78) 44%, rgba(69,26,3,.99) 77%)', core: 'radial-gradient(ellipse at 70% 70%, rgba(120,53,15,.92), transparent 58%), radial-gradient(ellipse at 34% 32%, rgba(254,243,199,.65), transparent 48%)', glow: 'rgba(251,191,36,0.5)' },
};

function MatchSharedElementPearl({ result }: { result?: MatchFiveElementResult }) {
  const [ritualState, setRitualState] = useState<'sealed' | 'opening' | 'unlocked'>('sealed');
  const [initiator, setInitiator] = useState<'personA' | 'personB' | null>(null);
  const [ritualStage, setRitualStage] = useState(0);
  const ritualTimersRef = useRef<number[]>([]);

  const clearRitualTimers = () => {
    ritualTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    ritualTimersRef.current = [];
  };

  useEffect(() => {
    clearRitualTimers();
    setRitualState('sealed');
    setInitiator(null);
    setRitualStage(0);
    return clearRitualTimers;
  }, [result?.sharedElement]);

  if (!result) return null;
  const meta = MATCH_PEARL_META[result.sharedElement];
  const elementLabel = MATCH_ELEMENT_LABEL[result.sharedElement];
  const personalPriorities = [
    { label: '第一位先補', person: result.personA },
    { label: '第二位先補', person: result.personB },
  ] as const;
  const startUnseal = (nextInitiator: 'personA' | 'personB') => {
    if (ritualState !== 'sealed') return;
    playElementUnsealSound(MATCH_ELEMENT_SHORT_LABEL[result.sharedElement]);
    setInitiator(nextInitiator);
    setRitualState('opening');
    setRitualStage(1);
    clearRitualTimers();
    ritualTimersRef.current = [
      window.setTimeout(() => setRitualStage(2), 3_000),
      window.setTimeout(() => setRitualStage(3), 6_000),
      window.setTimeout(() => setRitualStage(4), 9_000),
      window.setTimeout(() => {
        setRitualStage(5);
        setRitualState('unlocked');
      }, 12_000),
    ];
  };
  const initiatorName = initiator === 'personA' ? result.personA.name : initiator === 'personB' ? result.personB.name : '';
  const ritualCopy = [
    '五元素封印寶珠・靜止等待先行者',
    '第一幕・封元素寶珠強烈破封，雙流瞬間衝出',
    '第二幕・衝出的能量慢慢回穩，內層霧流甦醒',
    '第三幕・光從球心慢慢聚集',
    '第四幕・寶珠浮出，結界即將鬆開',
    '儀式完成・五元素封印寶珠已收下',
  ][ritualStage];
  const pearlScale = [1, 1.26, 1.08, 1.12, 1.17, 1.09][ritualStage];
  const pearlBrightness = [1, 1.7, 1.15, 1.3, 1.45, 1.12][ritualStage];
  const ritualGlowOpacity = [0.36, 0.96, 0.64, 0.76, 0.88, 0.58][ritualStage];

  return (
    <section className="fortune-card relative overflow-hidden border border-white/14 bg-[linear-gradient(135deg,rgba(8,15,31,0.98),rgba(17,24,39,0.94)_56%,rgba(8,47,73,0.78))] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-5">
        <div className="relative mx-auto grid h-24 w-24 place-items-center sm:h-32 sm:w-32">
          <div className={`absolute inset-[5%] rounded-full blur-2xl transition-all ${ritualStage === 1 ? 'duration-300' : 'duration-[2800ms]'}`} style={{ backgroundColor: meta.glow, opacity: ritualGlowOpacity, transform: `scale(${ritualStage === 1 ? 1.48 : 0.9 + ritualStage * 0.05})` }} />
          <div
            className={`treasure-reveal-stage treasure-reveal-stage--hero transition-all ${ritualState === 'sealed' ? 'treasure-reveal-stage--sealed' : 'treasure-reveal-stage--collected'} ${ritualState === 'opening' ? 'treasure-reveal-stage--opening' : ''} ${ritualStage === 1 ? 'duration-300' : 'duration-[2800ms]'}`}
            style={{ transform: `translateY(${ritualStage >= 4 ? -5 : 0}px) scale(${pearlScale})`, filter: `brightness(${pearlBrightness}) saturate(${1 + ritualStage * 0.05})` }}
            aria-hidden="true"
          >
            <WaterTreasureOrb element={MATCH_ELEMENT_SHORT_LABEL[result.sharedElement]} released={ritualState !== 'sealed'} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[0.22em] text-cyan-100/80">
            {ritualState === 'unlocked' ? '五元素封印寶珠・本局已解除' : ritualState === 'opening' ? '五元素封印寶珠・結界解除中' : '五顆封印寶珠・從這一顆開始解除'}
          </p>
          <h2 className="mt-1 font-serif text-2xl font-black tracking-wide text-amber-50 sm:text-3xl">{meta.name}</h2>
          <p className="mt-1 text-sm font-black text-cyan-100">{elementLabel}元素・{meta.title}</p>
          <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
            這一顆是兩人目前共同要補的元素。兩位老師會先解讀原因，最後由你們一起拿到這顆五元素封印寶珠、解除結界並收下它。
          </p>
          <p className="mt-2 text-[11px] font-black leading-5 text-amber-100/90">
            五元素共有五顆封印寶珠：空、風、水、火、地。五顆都在等待解封；本局必須先解除這一顆共同優先寶珠，完成後才能繼續下一顆。
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        {personalPriorities.map(({ label, person }) => {
          const personalMeta = MATCH_PEARL_META[person.primaryElement];
          return (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] font-black tracking-wide text-white/50">{label}</p>
              <p className="mt-1 text-sm font-black text-amber-50">{MATCH_ELEMENT_LABEL[person.primaryElement]}元素</p>
              <p className="mt-0.5 text-[10px] font-semibold text-cyan-100/80">{personalMeta.name}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold leading-5 text-white/45">
        {ritualCopy}
      </p>
      {ritualState === 'sealed' ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { key: 'personA' as const, label: `${result.personA.name}拿起封印寶珠` },
            { key: 'personB' as const, label: `${result.personB.name}拿起封印寶珠` },
          ].map(({ key, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => startUnseal(key)}
              className="rounded-2xl border border-amber-200/45 bg-amber-300/14 px-2 py-3 text-center text-xs font-black leading-5 text-amber-50 transition active:scale-[0.99]"
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className={`mt-3 rounded-2xl border px-4 py-3 text-center text-sm font-black ${
          ritualState === 'unlocked'
            ? 'border-emerald-200/35 bg-emerald-300/14 text-emerald-50'
            : 'border-cyan-200/35 bg-cyan-300/14 text-cyan-50 animate-pulse'
        }`}>
          {ritualState === 'unlocked'
            ? `${initiatorName}已先解除五元素封印寶珠・收下${meta.name}`
            : `${initiatorName}正在解除結界・請等待十二秒`}
        </div>
      )}
      <div className="mt-2 flex justify-end"><ElementUnsealSoundToggle /></div>
    </section>
  );
}

function MatchFiveElementOrbitSystem({ result }: { result: MatchFiveElementResult }) {
  const [selectedElement, setSelectedElement] = useState<MatchFiveElementKey>(result.sharedElement);
  const selectedMeta = ORBIT_ELEMENT_META[selectedElement];
  const sharedMeta = ORBIT_ELEMENT_META[result.sharedElement];
  const relationCopy = ORBIT_RELATION_COPY[result.relationMode];
  const sharedNeed = averageNeedScore(result, result.sharedElement);
  const selectedNeed = averageNeedScore(result, selectedElement);
  const rankedElements = [...ORBIT_ELEMENT_ORDER].sort((a, b) => averageNeedScore(result, b) - averageNeedScore(result, a));
  const activePath = result.relationMode === 'conflicting' ? ORBIT_CONFLICT_CHAIN : ORBIT_GENERATING_CHAIN;

  useEffect(() => {
    setSelectedElement(result.sharedElement);
  }, [result.sharedElement]);

  return (
    <section className="fortune-card relative overflow-hidden border-cyan-200/25 bg-[linear-gradient(145deg,rgba(8,47,73,0.32),rgba(15,23,42,0.94)_42%,rgba(76,29,149,0.24))] p-4 shadow-[0_0_34px_rgba(34,211,238,0.12)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-300 via-cyan-300 via-rose-300 to-amber-300" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-start">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">AI ORBIT ENGINE</p>
          <h2 className="mt-2 bg-gradient-to-br from-cyan-50 via-amber-50 to-rose-100 bg-clip-text font-serif text-3xl font-black leading-tight text-transparent sm:text-5xl">
            五元素星軌配對
          </h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">
            系統會把兩人的資料轉成五顆星的補強比例。最亮的星，就是 AI 判定這段關係必須優先補上的元素；點星可看原因、摩擦點與行動建議。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-3 py-3 text-center">
            <p className="text-[10px] font-black text-cyan-100">關係軌道</p>
            <p className="mt-1 text-sm font-black text-cyan-50">{ORBIT_RELATION_COPY[result.relationMode].title}</p>
          </div>
          <div className="rounded-2xl border border-amber-200/30 bg-amber-300/12 px-3 py-3 text-center">
            <p className="text-[10px] font-black text-amber-100">AI 必補</p>
            <p className="mt-1 font-serif text-2xl font-black leading-none text-amber-50">{sharedMeta.short}</p>
          </div>
          <div className="rounded-2xl border border-rose-200/25 bg-rose-300/10 px-3 py-3 text-center">
            <p className="text-[10px] font-black text-rose-100">補強值</p>
            <p className="mt-1 font-serif text-2xl font-black leading-none text-rose-50">{sharedNeed}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(330px,420px)_minmax(0,1fr)] lg:items-stretch">
        <div className="rounded-[28px] border border-white/10 bg-black/24 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">五星軌道</p>
            <div className="flex gap-2 text-[10px] font-black">
              <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2 py-1 text-amber-100">金色相生</span>
              <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-cyan-100">青色相剋</span>
            </div>
          </div>

          <div className="relative mx-auto mt-3 aspect-square w-full max-w-[390px] min-w-0">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.014)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.9" />
              <circle cx="50" cy="50" r="31" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />
              <polygon points={orbitPointList([...ORBIT_ELEMENT_ORDER, 'space'])} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
              <polyline points={orbitPointList(ORBIT_GENERATING_CHAIN)} fill="none" stroke="rgba(251,191,36,0.34)" strokeWidth="1.35" strokeLinejoin="round" />
              <polyline points={orbitPointList(ORBIT_CONFLICT_CHAIN)} fill="none" stroke="rgba(34,211,238,0.28)" strokeWidth="1.15" strokeDasharray="2.4 2.2" strokeLinejoin="round" />
              <polyline
                points={orbitPointList(activePath)}
                fill="none"
                stroke={result.relationMode === 'conflicting' ? 'rgba(34,211,238,0.82)' : 'rgba(251,191,36,0.78)'}
                strokeWidth="2.05"
                strokeLinejoin="round"
              />
            </svg>

            <div className="absolute inset-[35%] grid place-items-center rounded-full border border-white/12 bg-slate-950/72 text-center shadow-[inset_0_0_24px_rgba(255,255,255,0.06)]">
              <div>
                <p className="text-[10px] font-black tracking-[0.18em] text-white/45">AI 必補</p>
                <p className="mt-1 font-serif text-3xl font-black leading-none text-amber-100">{sharedMeta.short}</p>
                <p className="mt-1 text-[10px] font-bold text-cyan-100">點星看解讀</p>
              </div>
            </div>

            {ORBIT_ELEMENT_ORDER.map((element) => {
              const meta = ORBIT_ELEMENT_META[element];
              const score = averageNeedScore(result, element);
              const isShared = element === result.sharedElement;
              const isSelected = element === selectedElement;
              const size = Math.max(66, Math.min(98, 58 + score * 0.45));

              return (
                <button
                  type="button"
                  key={element}
                  aria-pressed={isSelected}
                  aria-label={`查看${meta.label}解讀`}
                  onClick={() => setSelectedElement(element)}
                  className={`absolute grid place-items-center rounded-full border px-2 text-center ${meta.className} ${
                    isSelected
                      ? 'ring-4 ring-amber-100/80'
                      : isShared
                        ? 'ring-2 ring-amber-200/55'
                        : 'ring-1 ring-white/10'
                  } transition-transform active:scale-[0.98]`}
                  style={{
                    left: ORBIT_POINTS[element].left,
                    top: ORBIT_POINTS[element].top,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: isSelected || isShared ? `0 0 ${isSelected ? 38 : 24}px ${meta.halo}` : undefined,
                  }}
                >
                  <span className="sr-only">{meta.label}</span>
                  <span className="font-serif text-2xl font-black leading-none">{meta.short}</span>
                  <span className="mt-1 text-xs font-black leading-none">{score}</span>
                  <span className={`mt-1 text-[10px] font-black leading-tight ${isShared ? 'text-amber-50' : 'text-white/58'}`}>{isShared ? 'AI 必補' : isSelected ? '解讀中' : '點選'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`rounded-[28px] border p-4 ${selectedMeta.className}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">AI 點星解讀</p>
              <h3 className="mt-1 text-3xl font-black leading-tight text-[color:var(--text-main)]">
                {selectedMeta.label} · {selectedMeta.title}
              </h3>
            </div>
            <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-black text-amber-50">
              補強值 {selectedNeed}
            </span>
          </div>

          <p className="mt-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{selectedMeta.story}</p>

          <div className="mt-4 grid gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
              <p className="text-[10px] font-black text-amber-100">為什麼要補</p>
              <p className="mt-1 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{selectedMeta.benefit}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
              <p className="text-[10px] font-black text-rose-100">沒補會產生的摩擦</p>
              <p className="mt-1 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{selectedMeta.friction}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
              <p className="text-[10px] font-black text-cyan-100">AI 建議行動</p>
              <p className="mt-1 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{selectedMeta.action}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[24px] border border-cyan-200/20 bg-cyan-300/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">相生相剋故事</p>
            <span className="rounded-full border border-cyan-200/25 bg-black/20 px-3 py-1 text-[11px] font-black text-cyan-50">{ORBIT_RELATION_COPY[result.relationMode].title}</span>
          </div>
          <p className="mt-2 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{relationCopy.story}</p>
          <p className="mt-2 text-xs font-black leading-6 text-amber-100">{relationCopy.focus}</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/18 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">AI 補強排序</p>
          <div className="mt-3 space-y-2">
            {rankedElements.map((element, index) => {
              const meta = ORBIT_ELEMENT_META[element];
              const score = averageNeedScore(result, element);
              return (
                <button
                  type="button"
                  key={element}
                  onClick={() => setSelectedElement(element)}
                  className={`grid w-full grid-cols-[1.5rem_1fr_2.25rem] items-center gap-2 rounded-xl border px-3 py-2 text-left ${
                    selectedElement === element ? 'border-amber-200/45 bg-amber-300/12' : 'border-white/10 bg-white/[0.035]'
                  }`}
                >
                  <span className="text-xs font-black text-white/55">{index + 1}</span>
                  <span className="text-xs font-black text-[color:var(--text-main)]">{meta.label}</span>
                  <span className="text-right text-xs font-black text-amber-100">{score}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[result.personA, result.personB].map((person) => (
          <article key={person.name} className="rounded-[24px] border border-white/10 bg-black/18 p-4">
            <p className="text-xs font-black text-cyan-100">{person.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-amber-200/20 bg-amber-300/10 p-3">
                <p className="text-[10px] font-black text-amber-100">主補</p>
                <p className="mt-1 text-lg font-black text-amber-50">{ORBIT_ELEMENT_META[person.primaryElement].label}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3">
                <p className="text-[10px] font-black text-cyan-100">次補</p>
                <p className="mt-1 text-lg font-black text-cyan-50">{ORBIT_ELEMENT_META[person.secondaryElement].label}</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{enforceAiCopywritingTone(person.reason)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
export default function MatchPage() {
  const [step, setStep] = useState<StepKey>('personA');
  const [personA, setPersonA] = useState<PersonInput>({ ...EMPTY, gender: 'female' });
  const [personB, setPersonB] = useState<PersonInput>({ ...EMPTY, gender: 'male' });
  const [personASelectionConfirm, setPersonASelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [personBSelectionConfirm, setPersonBSelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MatchResponse | null>(null);
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<MatchDailyResult> | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!getAnalysisIdentityTarget()) {
      setAnalysisIdentityTarget('self');
    }
  }, []);

  useEffect(() => {
    const clearIdentityError = () => {
      setError((prev) => (prev === getIdentityRequiredMessage() ? '' : prev));
    };
    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
  }, []);

  // 載入 localStorage 預填到 personA
  useEffect(() => {
    const saved = loadUserData();
    if (saved && !isDemoMatchName(saved.name)) {
      setPersonA((prev) => ({
        ...prev,
        name: saved.name || prev.name,
        birthDate: saved.birthday || prev.birthDate,
        bloodType: saved.bloodType || prev.bloodType,
        gender: saved.gender || prev.gender,
      }));
    }
  }, []);

  // 同步 personA 的變更到 localStorage
  useEffect(() => {
    if (getAnalysisIdentityTarget() !== 'self') return;
    if (isDemoMatchName(personA.name)) return;
    if (personA.name || personA.birthDate) {
      saveUserData({
        name: personA.name,
        birthday: personA.birthDate,
        bloodType: personA.bloodType === 'unknown' ? '' : personA.bloodType,
        gender: personA.gender,
      });
    }
  }, [personA.name, personA.birthDate, personA.bloodType, personA.gender]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const personAError = getPersonError('第一位', personA, personASelectionConfirm);
  const personBError = getPersonError('第二位', personB, personBSelectionConfirm);

  const reviewReady = !personAError && !personBError;

  function restoreDailyRecord(record: DailyAnalysisRecord<MatchDailyResult>) {
    setDailyRecord(record);
    setPersonA(record.result.personA);
    setPersonB(record.result.personB);
    setData(record.result.data);
    setStep('review');
    setError('');
    setLoading(false);
    window.setTimeout(() => {
      document.getElementById('match-result-anchor')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
  }

  useEffect(() => {
    const record = readDailyAnalysis<MatchDailyResult>('match');
    if (!record) return;
    if (isDemoMatchDailyResult(record.result) || !isCurrentMatchDailyRecord(record)) {
      clearDailyAnalysis('match');
      setDailyRecord(null);
      return;
    }
    restoreDailyRecord(record);
  }, []);

  const reviewCards = useMemo(
    () => [
      { label: '第一位', person: personA, accent: 'violet' as const },
      { label: '第二位', person: personB, accent: 'amber' as const },
    ],
    [personA, personB],
  );

  function goNext() {
    setError('');

    if (step === 'personA') {
      if (personAError) {
        setError(personAError);
        return;
      }
      setStep('personB');
      return;
    }

    if (step === 'personB') {
      if (personBError) {
        setError(personBError);
        return;
      }
      setStep('review');
    }
  }

  function goBack() {
    setError('');

    if (step === 'personB') {
      setStep('personA');
      return;
    }

    if (step === 'review') {
      setStep('personB');
    }
  }

  async function handleSubmit() {
    // 手機上點擊到 setLoading(true) 生效前有極短暫的視窗，快速重複點擊會同時
    // 建立兩個請求。用同步的 ref 鎖擋住同一次點擊的重複觸發（跟八字/西洋星座同一類修復）。
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      const existingDaily = readDailyAnalysis<MatchDailyResult>('match');
      if (existingDaily) {
        if (!isDemoMatchDailyResult(existingDaily.result) && isCurrentMatchDailyRecord(existingDaily)) {
          restoreDailyRecord(existingDaily);
          return;
        }
        clearDailyAnalysis('match');
        setDailyRecord(null);
      }

      if (!getAnalysisIdentityTarget()) {
        setError(getIdentityRequiredMessage());
        return;
      }

      if (!reviewReady) {
        setError(personAError || personBError || '請先把兩位資料填完整。');
        return;
      }

      setError('');
      setData(null);
      setLoading(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20_000);

      // 帶重試機制的 fetch
      async function fetchWithRetry(maxRetries = 2) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch('/api/match-generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({ personA, personB }),
            });
            return response;
          } catch (error) {
            if (attempt === maxRetries) throw error;
            // 等待後重試，時間遞增
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }

      try {
        const response = await fetchWithRetry();
        if (!response) {
          throw new Error('未收到伺服器回應');
        }

        const json = (await response.json()) as MatchResponse & { error?: string };

        if (!response.ok) {
          setError(json.error ?? '配對分析失敗，請稍後再試。');
          return;
        }

        const nextDailyResult: MatchDailyResult = { data: json, personA, personB };
        setData(json);
        if (isDemoMatchDailyResult(nextDailyResult)) {
          clearDailyAnalysis('match');
          setDailyRecord(null);
        } else {
          setDailyRecord(saveDailyAnalysis<MatchDailyResult>('match', nextDailyResult, { schemaVersion: MATCH_DAILY_SCHEMA_VERSION }));
        }
        markGrowthModuleCompleted('soul_match', json.fiveElementMatch ? (json.fiveElementMatch.sharedElement.toUpperCase() as GrowthElement) : undefined);
      } catch (error) {
        setError(error instanceof DOMException && error.name === 'AbortError'
          ? '配對分析等候時間過長，請稍後再試。'
          : '目前無法連線到配對服務，請稍後再試。');
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    } finally {
      submitLockRef.current = false;
    }
  }

  function resetAll() {
    const existingDaily = readDailyAnalysis<MatchDailyResult>('match');
    if (existingDaily) {
      if (!isDemoMatchDailyResult(existingDaily.result) && isCurrentMatchDailyRecord(existingDaily)) {
        restoreDailyRecord(existingDaily);
        return;
      }
      clearDailyAnalysis('match');
      setDailyRecord(null);
    }

    setData(null);
    setError('');
    setLoading(false);
    setStep('personA');
    setPersonA({ ...EMPTY, gender: 'female' });
    setPersonB({ ...EMPTY, gender: 'male' });
    setPersonASelectionConfirm(EMPTY_SELECTION_CONFIRM);
    setPersonBSelectionConfirm(EMPTY_SELECTION_CONFIRM);
  }

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        {!data && (
          <div className="space-y-6">
            <DailyAnalysisNotice record={dailyRecord} className="mt-4" moduleName="AI 靈魂配對" onViewResult={dailyRecord ? () => restoreDailyRecord(dailyRecord) : undefined} />
            <MegaInputGuide
              title="先填第一個人，再填第二個人"
              steps={['第一位：姓名、生日、血型、性別', '第二位：同樣填一次', '最後確認兩人的資料再送出']}
              example="不知道時辰也可以先選不知道。"
              tone="rose"
            />
            {step === 'personA' && (
              <PersonStep
                title="第一位資料"
                description="先輸入第一位的姓名、生日、時辰、血型和性別。時辰不知道可直接略過。"
                accent="violet"
                value={personA}
                onChange={setPersonA}
                selectionConfirm={personASelectionConfirm}
                onSelectionConfirm={setPersonASelectionConfirm}
                showValidation={Boolean(error) && step === 'personA'}
              />
            )}

            {step === 'personB' && (
              <PersonStep
                title="第二位資料"
                description="接著輸入第二位。時辰知道就選十二時辰，不知道可直接略過。"
                accent="amber"
                value={personB}
                onChange={setPersonB}
                selectionConfirm={personBSelectionConfirm}
                onSelectionConfirm={setPersonBSelectionConfirm}
                showValidation={Boolean(error) && step === 'personB'}
              />
            )}

            {step === 'review' && (
              <div className="space-y-6">
                <div className="fortune-card p-6 sm:p-8">
                  <p className="text-xs tracking-[0.3em] text-rose-300">最後確認</p>
                  <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">確認資料後開始配對</h2>
                  <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
                    名字、生日、血型都沒問題，就可以開始。這一步讓你安心確認，不怕按太快。
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {reviewCards.map(({ label, person, accent }) => (
                    <div key={label} className="fortune-card p-5 sm:p-6">
                      <p className={`inline-flex rounded-full border px-4 py-1 text-xs tracking-[0.3em] ${accent === 'violet' ? 'border-violet-400/25 bg-violet-950/20 text-violet-300' : 'border-amber-400/25 bg-amber-950/20 text-amber-300'}`}>
                        {label}
                      </p>
                      <div className="mt-5 space-y-3 text-sm text-[color:var(--text-sub)]">
                        <div>
                          <span className="text-[color:var(--text-muted)]">姓名：</span>
                          <span className="text-[color:var(--text-main)]">{person.name || '未填'}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-muted)]">西元生日：</span>
                          <span className="text-[color:var(--text-main)]">{person.birthDate || '未換算完成'}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-muted)]">出生時辰：</span>
                          <span className="text-[color:var(--text-main)]">{person.birthHourBranch && person.birthHourBranch !== 'unknown' ? `${person.birthHourBranch}時` : '不知道（以三柱計算）'}</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-muted)]">血型：</span>
                          <span className="text-[color:var(--text-main)]">{person.bloodType} 型</span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-muted)]">性別：</span>
                          <span className="text-[color:var(--text-main)]">{person.gender === 'female' ? '女性' : '男性'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {step !== 'personA' && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一步
                </button>
              )}

              {step !== 'review' ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={loading}
                  className="vip-gold-btn flex-1 py-5 text-base disabled:cursor-not-allowed disabled:opacity-50 shimmer-btn"
                >
                  {step === 'personA' ? '下一步：填第二位' : '下一步：確認資料'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!reviewReady || loading}
                  className="vip-gold-btn flex-1 py-5 text-base disabled:cursor-not-allowed disabled:opacity-40 shimmer-btn"
                >
                  {loading ? '正在整理配對結果…' : getDailyAnalysisButtonLabel(dailyRecord)}
                </button>
              )}
            </div>

            <div className="grid gap-3 rounded-3xl border border-rose-300/22 bg-gradient-to-br from-rose-950/22 via-rose-950/10 to-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_30px_rgba(76,5,25,0.18)] sm:grid-cols-[minmax(0,1fr)_minmax(220px,300px)_auto] sm:items-center sm:p-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200/72">目前進度</p>
                <p className="mt-1 bg-gradient-to-r from-rose-50 via-white to-rose-200/90 bg-clip-text font-serif text-xl font-black leading-tight tracking-[0.03em] text-transparent drop-shadow-[0_0_14px_rgba(251,113,133,0.16)]">
                  {step === 'personA' ? '先填第一位' : step === 'personB' ? '再填第二位' : '確認後開始配對'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 justify-self-center sm:w-full">
                {STEP_ORDER.map((item, index) => {
                  const active = item === step;
                  const done = index < stepIndex;
                  return (
                    <div
                      key={item}
                      className={`rounded-xl border px-2.5 py-2.5 text-center transition-all ${
                        active
                          ? 'border-rose-300/60 bg-rose-500/16 shadow-[0_0_14px_rgba(251,113,133,0.16)]'
                          : done
                            ? 'border-violet-400/30 bg-violet-500/10'
                            : 'border-white/10 bg-white/5 opacity-75'
                      }`}
                    >
                      <p className={`text-base font-black leading-none ${active ? 'text-rose-100' : done ? 'text-violet-200' : 'text-[color:var(--text-main)]'}`}>{done ? '✓' : index + 1}</p>
                      <p className={`mt-1 text-[10px] font-bold tracking-wide ${active ? 'text-rose-100/90' : 'text-[color:var(--text-sub)]'}`}>
                        {item === 'personA' ? '第一位' : item === 'personB' ? '第二位' : '確認'}
                      </p>
                    </div>
                  );
                })}
              </div>

              <Link
                href="/"
                className="feature-home-link feature-home-link--rose shrink-0 justify-self-end"
                aria-label={"\u8fd4\u56de\u9996\u9801"}
              >
                {"\u8fd4\u56de\u9996\u9801"}
              </Link>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <DailyAnalysisNotice record={dailyRecord} className="mb-5" moduleName="AI 靈魂配對" onViewResult={dailyRecord ? () => restoreDailyRecord(dailyRecord) : undefined} />
            <MatchTeacherReadings data={data} />
            <BaziBeastPairCards
              foundation={data.baziFoundation}
              personAName={data.displayA.name}
              personBName={data.displayB.name}
              personABirthDate={personA.birthDate}
              personBBirthDate={personB.birthDate}
            />
            {SHOW_SHARED_ELEMENT_PEARL && <MatchSharedElementPearl result={data.fiveElementMatch} />}
            {(() => {
              const mysteryGame = buildMysteryMatchGame(data, personA.birthDate, personB.birthDate);
              return (
                <div className="fortune-card overflow-hidden border border-rose-300/35 bg-[radial-gradient(circle_at_18%_0%,rgba(127,29,29,0.38),transparent_36%),radial-gradient(circle_at_86%_14%,rgba(76,29,149,0.32),transparent_38%),linear-gradient(145deg,rgba(22,5,16,0.99),rgba(18,9,30,0.98)_55%,rgba(4,8,18,0.99))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.52)] sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black tracking-[0.3em] text-rose-100">鬼魅・神祕・靈異磁場遊戲</p>
                      <p className="mt-1 text-[10px] font-black tracking-[0.16em] text-rose-100/70">鬼魅儀式・虛構遊戲劇情</p>
                      <h2 className="mt-3 font-serif text-3xl font-black text-amber-100 sm:text-4xl">
                        {mysteryGame.aIdentity} × {mysteryGame.bIdentity}
                      </h2>
                      <p className="mt-2 text-sm font-black tracking-[0.12em] text-fuchsia-100/85">本局關卡・{mysteryGame.realmTitle}</p>
                    </div>
                    <span className="rounded-full border border-rose-200/30 bg-rose-300/10 px-3 py-1 text-xs font-semibold text-rose-100/85">
                      {data.baziFoundation ? '八字基礎合盤驅動' : '虛構遊戲情境'}
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-bold leading-8 text-amber-50/90">{mysteryGame.opening}</p>

                  <article className={`mt-4 rounded-2xl border p-4 ${mysteryGame.soulEcho.tone}`}>
                    <p className="text-xs font-black tracking-[0.2em]">靈魂回音・{mysteryGame.soulEcho.label}</p>
                    <p className="mt-2 text-sm font-semibold leading-7 text-white/82">{mysteryGame.soulEcho.copy}</p>
                  </article>

                  <div className="mt-5 grid gap-3">
                    {mysteryGame.acts.map((act) => (
                      <article key={act.title} className={`rounded-2xl border p-4 ${act.tone}`}>
                        <h3 className="text-base font-black tracking-wide">{act.title}</h3>
                        <p className="mt-2 text-sm font-semibold leading-7 text-white/82">{act.copy}</p>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="fortune-card p-6 sm:p-8 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-rose-300">配對結果</p>
              <h2 className="mt-3 font-serif text-5xl text-[color:var(--text-main)]">{data.result.match_score}</h2>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">相處共鳴指數</p>
              <p className="mx-auto mt-6 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">{data.result.summary}</p>
              {data.fiveElementMatch && (
                <>
                  <p className="mx-auto mt-5 max-w-3xl text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">5 元素後端判定</p>
                  <p className="mx-auto mt-2 max-w-3xl text-sm font-black leading-7 text-emerald-50">{data.fiveElementMatch.summary}</p>
                  <p className="mx-auto mt-2 max-w-3xl text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.fiveElementMatch.relationReason}</p>
                </>
              )}
            </div>

            {data.fiveElementMatch && <MatchFiveElementOrbitSystem result={data.fiveElementMatch} />}

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">四項核心指標</p>
                <div className="space-y-5">
                  <ScoreRow label="共鳴感" score={data.result.resonance} tone="violet" />
                  <ScoreRow label="溝通感" score={data.result.communication} tone="cyan" />
                  <ScoreRow label="穩定度" score={data.result.stability} tone="amber" />
                  <ScoreRow label="衝突風險" score={data.result.conflict_risk} tone="pink" />
                </div>
              </div>

              <div className="fortune-card p-6 sm:p-8">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-rose-300">雙方宿命星盤軌道</p>
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="font-semibold text-violet-300">{data.displayA.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayA.zodiacZh} · {data.displayA.chineseZodiac} · {data.displayA.bloodType} 型
                    </p>
                    {data.fiveElementMatch && (
                      <p className="mt-2 text-xs font-semibold leading-6 text-emerald-100/90">{data.fiveElementMatch.personA.reason} {data.fiveElementMatch.personA.changeTarget}</p>
                    )}
                  </div>
                  <div className="h-px bg-white/10" />
                  <div>
                    <p className="font-semibold text-amber-300">{data.displayB.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayB.zodiacZh} · {data.displayB.chineseZodiac} · {data.displayB.bloodType} 型
                    </p>
                    {data.fiveElementMatch && (
                      <p className="mt-2 text-xs font-semibold leading-6 text-amber-100/90">{data.fiveElementMatch.personB.reason} {data.fiveElementMatch.personB.changeTarget}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: '最有共鳴', items: data.result.zones.resonance, tone: 'violet' },
                { title: '互補優勢', items: data.result.zones.complement, tone: 'amber' },
                { title: '需要磨合', items: data.result.zones.grinding, tone: 'cyan' },
                { title: '注意衝突', items: data.result.zones.conflict, tone: 'pink' },
              ].map((section) => (
                <div key={section.title} className="fortune-card p-5 sm:p-6">
                  <p className={`text-sm font-semibold ${section.tone === 'violet' ? 'text-violet-300' : section.tone === 'amber' ? 'text-amber-300' : section.tone === 'cyan' ? 'text-cyan-300' : 'text-pink-300'}`}>
                    {section.title}
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--text-sub)]">
                    {section.items.slice(0, 3).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => window.print()} className="vip-gold-btn flex-1 py-4 text-sm">
                匯出配對報告
              </button>
              <Link
                href="/"
                className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-6 py-4 text-center text-sm font-black text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
              >
                回到主頁
              </Link>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
              >
                重新輸入
              </button>
            </div>

            <NextStepGuide current="match" hideDestinations={['music', 'insight']} />
          </div>
        )}
      </main>
    </div>
  );
}
