import { createBaziCore, type BaziBirthInput } from './bazi/engine';
import { SHICHEN_LIST } from './shichen-engine';
import {
  annualBranchOf,
  buildBaziLovePersonSignal,
  buildZiweiLovePersonSignal,
  redLuanBranchOf,
  tianXiBranchOf,
} from './red-luan-heartbeat-engine';

export type RedLuanEngineeringAuditInput = {
  birthDate: string;
  gender: 'male' | 'female';
  birthHourBranch?: string;
  fromYear: number;
  toYear: number;
  includeBirthIChing?: boolean;
};

type KnownHour = typeof SHICHEN_LIST[number]['branch'];

function hasKnownHour(branch?: string): branch is KnownHour {
  return Boolean(branch && SHICHEN_LIST.some((item) => item.branch === branch));
}

/**
 * Engineering-only audit: all rows are deterministic rule evidence. It
 * intentionally has no AI layer, no event prediction, and no month/day claim.
 */
export function runRedLuanEngineeringAudit(input: RedLuanEngineeringAuditInput) {
  if (!Number.isInteger(input.fromYear) || !Number.isInteger(input.toYear) || input.fromYear > input.toYear) {
    throw new Error('RED_LUAN_AUDIT_INVALID_YEAR_RANGE');
  }
  if (input.toYear - input.fromYear > 120) throw new Error('RED_LUAN_AUDIT_YEAR_RANGE_TOO_LARGE');

  const hourKnown = hasKnownHour(input.birthHourBranch);
  const knownHour = hourKnown ? input.birthHourBranch as KnownHour : undefined;
  const baziInput: BaziBirthInput = {
    birthDate: input.birthDate,
    gender: input.gender,
    birthTimeKnown: hourKnown,
    traditionalHour: knownHour,
    calendarType: 'SOLAR',
    birthCountry: 'TW',
    birthCity: 'Taipei',
  };
  const chart = createBaziCore(baziInput);
  const presentBranches = [
    { pillar: '年' as const, branch: chart.pillars.year.earthlyBranch },
    { pillar: '月' as const, branch: chart.pillars.month.earthlyBranch },
    { pillar: '日' as const, branch: chart.pillars.day.earthlyBranch },
    ...(chart.pillars.hour === 'UNKNOWN' ? [] : [{ pillar: '時' as const, branch: chart.pillars.hour.earthlyBranch }]),
  ];
  const natal = buildBaziLovePersonSignal({
    yearBranch: chart.pillars.year.earthlyBranch,
    dayBranch: chart.pillars.day.earthlyBranch,
    presentBranches,
    hourKnown,
    annualYear: input.fromYear,
  });
  const timeIndex = SHICHEN_LIST.find((item) => item.branch === knownHour)?.branchIndex;
  const ziwei = buildZiweiLovePersonSignal({
    birth: timeIndex === undefined ? null : {
      calendarType: 'solar',
      date: input.birthDate,
      gender: input.gender === 'female' ? '女' : '男',
      timeIndex,
    },
  });
  const annualSignals = Array.from({ length: input.toYear - input.fromYear + 1 }, (_, index) => {
    const year = input.fromYear + index;
    const signal = buildBaziLovePersonSignal({
      yearBranch: chart.pillars.year.earthlyBranch,
      dayBranch: chart.pillars.day.earthlyBranch,
      presentBranches,
      hourKnown,
      annualYear: year,
    });
    return {
      year,
      annualBranch: annualBranchOf(year),
      redLuanTarget: redLuanBranchOf(chart.pillars.year.earthlyBranch),
      tianXiTarget: tianXiBranchOf(chart.pillars.year.earthlyBranch),
      annualTriggers: signal.annualTriggers,
      status: signal.annualTriggers.length > 0 ? 'RULE_HIT' as const : 'NO_RULE_HIT' as const,
    };
  });

  const iching = input.includeBirthIChing
    ? hourKnown && timeIndex !== undefined
      ? {
        status: 'READY' as const,
        rule: '梅花易數・生辰起卦',
        inputBasis: `生日 ${input.birthDate}／時辰索引 ${timeIndex + 1}`,
        limitation: '本工具只確認可追溯的起卦規則與輸入完整度；若需輸出正式卦象，應由已審核的易經結果層呼叫。',
      }
      : { status: 'UNAVAILABLE_BIRTH_TIME_REQUIRED' as const, limitation: '此稽核只在已知出生時辰時執行生辰起卦；未知時辰不採預設午時。' }
    : { status: 'NOT_REQUESTED' as const, limitation: '未要求易經補卦；年度紅鸞稽核不以卦象補足。' };

  return {
    auditVersion: 'RED_LUAN_ENGINEERING_AUDIT_V1',
    scope: '工程師本機規則稽核，非客戶解讀、非事件預測。',
    inputCompleteness: hourKnown ? '完整出生時辰' : '時辰未知',
    bazi: {
      ruleVersion: natal.ruleVersion,
      source: natal.sources,
      natalEvidence: natal.natalEvidence,
      pillars: presentBranches,
      limitations: natal.limitations,
    },
    annualSignals,
    ziwei: {
      status: ziwei.status,
      ruleVersion: ziwei.ruleVersion,
      inputCompleteness: ziwei.inputCompleteness,
      spousePalaceEvidence: ziwei.palaces,
      limitations: ziwei.limitations,
    },
    iching,
    precisionBoundary: '僅列年度干支命中；月、日、时精度尚未選定可追溯規則，故不輸出。',
  };
}
