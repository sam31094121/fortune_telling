/**
 * Palace Context Builder（2026-08-22）｜規格「六、七、十六」
 *
 * 純引擎、零 易經：只從已經驗證過的正式命盤（ZiweiCoreResult）抽資料、
 * 對指定宮位重新取三方四正——不重新排盤、不安星、不改四化、不猜資料。
 * 三位老師只能讀這裡輸出的 PalaceAnalysisContext，不得直接碰 ZiweiCoreResult。
 */

import {
  resolveSanFangSiZhengFor,
  type ZiweiCoreResult,
  type ZiweiMajorStarDetail,
  type ZiweiPalaceKey,
  type ZiweiPalaceResult,
  type ZiweiSupportStarDetail,
} from '../ziwei/engine';
import { ZIWEI_AUSPICIOUS_STAR_NAMES, ZIWEI_MALEFIC_STAR_NAMES } from '../ziwei-sanfang-engine';
import type { PalaceAnalysisContext, PalaceId, PalaceSnapshot, ZiweiStar, ZiweiTransformation } from './types';
import type { ZiweiVerifiedTimeSeed } from '../ziwei-chart-store';

const PALACE_ID_TO_KEY: Record<PalaceId, ZiweiPalaceKey> = {
  LIFE: 'MING',
  SIBLINGS: 'XIONG_DI',
  SPOUSE: 'FU_QI',
  CHILDREN: 'ZI_NV',
  WEALTH: 'CAI_BO',
  HEALTH: 'JI_E',
  TRAVEL: 'QIAN_YI',
  FRIENDS: 'JIAO_YOU',
  CAREER: 'GUAN_LU',
  PROPERTY: 'TIAN_ZHAI',
  FORTUNE: 'FU_DE',
  PARENTS: 'FU_MU',
};

const PALACE_KEY_TO_ID = Object.fromEntries(
  Object.entries(PALACE_ID_TO_KEY).map(([id, key]) => [key, id as PalaceId]),
) as Record<ZiweiPalaceKey, PalaceId>;

export function palaceIdToKey(id: PalaceId): ZiweiPalaceKey {
  return PALACE_ID_TO_KEY[id];
}

export function palaceKeyToId(key: ZiweiPalaceKey): PalaceId {
  return PALACE_KEY_TO_ID[key];
}

const MUTAGEN_TO_TYPE: Record<string, ZiweiTransformation['type']> = {
  祿: 'LU',
  權: 'QUAN',
  科: 'KE',
  忌: 'JI',
};

function starsToZiweiStars(
  majorStars: ZiweiMajorStarDetail[],
  minorStars: ZiweiSupportStarDetail[],
): { majorStars: ZiweiStar[]; supportingStars: ZiweiStar[]; maleficStars: ZiweiStar[] } {
  const major: ZiweiStar[] = majorStars.map((star) => ({ id: star.name, name: star.name, category: 'MAJOR' }));
  const supporting: ZiweiStar[] = [];
  const malefic: ZiweiStar[] = [];
  minorStars.forEach((star) => {
    if (ZIWEI_MALEFIC_STAR_NAMES.has(star.name)) {
      malefic.push({ id: star.name, name: star.name, category: 'MALEFIC' });
    } else if (ZIWEI_AUSPICIOUS_STAR_NAMES.has(star.name)) {
      supporting.push({ id: star.name, name: star.name, category: 'SUPPORTING' });
    }
    // 既不吉也不凶的中性星曜：不塞進格局/人生/故事老師的資料裡，避免噪音蓋過重點星曜
  });
  return { majorStars: major, supportingStars: supporting, maleficStars: malefic };
}

function starsToTransformations(majorStars: ZiweiMajorStarDetail[], minorStars: ZiweiSupportStarDetail[]): ZiweiTransformation[] {
  const all: ZiweiTransformation[] = [];
  [...majorStars, ...minorStars].forEach((star) => {
    const type = star.mutagen ? MUTAGEN_TO_TYPE[star.mutagen] : undefined;
    if (type) all.push({ starId: star.name, starName: star.name, type });
  });
  return all;
}

function toPalaceSnapshot(palace: ZiweiPalaceResult): PalaceSnapshot {
  const { majorStars, supportingStars, maleficStars } = starsToZiweiStars(palace.majorStarDetails, palace.minorStars);
  return {
    palaceId: palaceKeyToId(palace.key),
    palaceName: palace.name,
    majorStars,
    supportingStars,
    maleficStars,
    transformations: starsToTransformations(palace.majorStarDetails, palace.minorStars),
  };
}

/**
 * 建立指定宮位的完整判讀 Context。切宮位時呼叫這個函式即可——
 * 只重新取三方四正（呼叫 `resolveSanFangSiZhengFor`，內部用同一份 birthInput
 * 決定性地重建 astrolabe，不是重新排一次不一樣的盤），不重新排整張命盤。
 */
function calculateAge(birthDate?: string, now = new Date()): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDay = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  const birthMonthDay = (birth.getUTCMonth() + 1) * 100 + birth.getUTCDate();
  if (monthDay < birthMonthDay) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function buildTimeContext(seed: ZiweiVerifiedTimeSeed, now = new Date()) {
  const taipeiHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(now));
  const daytime = taipeiHour >= 5 && taipeiHour < 19;
  const sceneMoment: PalaceAnalysisContext['timeContext']['sceneMoment'] = taipeiHour < 5 ? 'MIDNIGHT'
    : taipeiHour < 8 ? 'DAWN'
      : taipeiHour < 11 ? 'MORNING'
        : taipeiHour < 14 ? 'NOON'
          : taipeiHour < 18 ? 'AFTERNOON'
            : taipeiHour < 21 ? 'EVENING'
              : 'NIGHT';
  const sceneCueByMoment = {
    DAWN: '清晨：光線剛進來、空間尚未完全醒來；用寂靜、空曠、未回覆的訊息或早班前的壓力，不用深夜鬼影。',
    MORNING: '上午：人潮與工作剛開始；用明亮中被忽略、節奏失衡、被催促或日常異常感營造張力，不用夜色。',
    NOON: '正午：大太陽、白亮光線與反常安靜；恐怖感來自曝曬下的孤獨、空無一人的走廊、刺眼螢幕或壓力無處躲藏，絕不能寫成深夜。',
    AFTERNOON: '下午：疲乏累積、光線拉長；用截止時間、空調聲、走廊陰影或未完成事項營造壓力，不用午夜場景。',
    EVENING: '傍晚：人群散去、室內外光線交替；可用半暗空間、返家前的沉默與延後面對的事情製造懸疑。',
    NIGHT: '夜晚：城市燈光與安靜房間；可用未讀訊息、窗外光影、走廊回聲與日常物件的異樣感製造鬼魅感。',
    MIDNIGHT: '深夜：大部分聲音退去；可用微弱光源、靜止時鐘、門縫、未關的螢幕與壓低的環境聲，營造幽暗但非真實靈異的畫面。',
  } as const;
  return {
    currentAge: calculateAge(seed.birthDate, now),
    annualYear: seed.annualYear ?? now.getUTCFullYear(),
    annualTheme: seed.annualTheme ?? null,
    annualLevel: seed.annualLevel ?? null,
    readingPeriod: daytime ? 'YANG_DAY' as const : 'YIN_NIGHT' as const,
    readingPeriodLabel: daytime ? '日間陽時（行動、外在互動）' : '夜間陰時（收斂、內在感受）',
    sceneMoment,
    sceneCue: sceneCueByMoment[sceneMoment],
    observedAt: now.toISOString(),
  };
}

export function buildPalaceContext(chart: ZiweiCoreResult, palaceId: PalaceId, analysisId: string, timeSeed: ZiweiVerifiedTimeSeed = {}): PalaceAnalysisContext {
  if (!chart.validation.passed) {
    throw new Error('ZIWEI_CHART_NOT_VERIFIED');
  }

  const targetKey = palaceIdToKey(palaceId);
  const selected = chart.palaces.find((palace) => palace.key === targetKey);
  if (!selected) throw new Error(`ZIWEI_PALACE_NOT_IN_CHART:${palaceId}`);

  const surrounded = resolveSanFangSiZhengFor(chart.birthInput, selected.name);

  return {
    analysisId,
    selectedPalace: toPalaceSnapshot(selected),
    threeHarmony: {
      harmonyA: toPalaceSnapshot(surrounded.wealth),
      harmonyB: toPalaceSnapshot(surrounded.career),
      opposite: toPalaceSnapshot(surrounded.opposite),
    },
    timeContext: buildTimeContext({
      ...timeSeed,
      // 舊的已驗證紀錄尚未帶 timeSeed 時，至少以正式命盤中的陽曆生日補足年齡；
      // 不重算、不改盤，僅避免新版時間層被舊快取完全掏空。
      birthDate: timeSeed.birthDate ?? chart.raw.solarDate,
    }),
    // Phase 1：大限逐宮訊號尚未補齊，先給空陣列，不假裝有資料
    decadeSignals: [],
    annualSignals: [],
    engineVersion: chart.engineVersion,
    verified: chart.validation.passed,
  };
}

export const ZIWEI_TEACHER_PALACE_ORDER: PalaceId[] = [
  'LIFE', 'SIBLINGS', 'SPOUSE', 'CHILDREN', 'WEALTH', 'HEALTH',
  'TRAVEL', 'FRIENDS', 'CAREER', 'PROPERTY', 'FORTUNE', 'PARENTS',
];
