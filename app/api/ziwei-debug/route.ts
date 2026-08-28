import { NextResponse } from 'next/server';
import {
  createZiweiCore,
  hourToTimeIndex,
  normalizeZiweiGender,
  MAJOR_STARS,
} from '@/lib/ziwei/engine';

export const dynamic = 'force-dynamic';

/**
 * 第一層｜紫微斗數排盤 Debug 模式（只讀唯一排盤入口 createZiweiCore）
 *
 * 用法：
 *   /api/ziwei-debug?debugZiwei=1&date=1979-9-2&hour=3&gender=female
 *   /api/ziwei-debug?debugZiwei=1&date=1979-9-2&timeIndex=2&gender=女
 *   /api/ziwei-debug?debugZiwei=1&calendar=lunar&date=1979-7-11&timeIndex=2&gender=女
 *
 * 只輸出排盤驗證資訊，不觸碰塔羅牌、易經文案、卡片 UI 與客戶流程。
 * 只有全部 PASS 才回報 ZIWEI_CHART_CERTIFIED=true。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get('debugZiwei') !== '1') {
    return NextResponse.json({ error: 'debugZiwei=1 required' }, { status: 400 });
  }

  const date = url.searchParams.get('date') ?? '';
  const calendarParam = url.searchParams.get('calendarType') ?? url.searchParams.get('calendar');
  const calendarType = calendarParam === 'lunar' ? 'lunar' as const : 'solar' as const;
  const leapParam = url.searchParams.get('isLeapMonth') ?? url.searchParams.get('leap');
  const isLeapMonth = leapParam === '1' || leapParam === 'true';
  const gender = normalizeZiweiGender((url.searchParams.get('gender') ?? 'male') as '男' | '女' | 'male' | 'female');

  const timeIndexParam = url.searchParams.get('timeIndex');
  const hourParam = url.searchParams.get('hour');
  let timeIndex: number;
  if (timeIndexParam !== null) {
    timeIndex = Number(timeIndexParam);
  } else if (hourParam !== null) {
    timeIndex = hourToTimeIndex(Number(hourParam));
  } else {
    timeIndex = NaN;
  }

  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(date) || !Number.isInteger(timeIndex) || timeIndex < 0 || timeIndex > 12) {
    return NextResponse.json(
      {
        error: 'date=YYYY-M-D 與 timeIndex=0~12（或 hour=0~23）為必填',
        example: '/api/ziwei-debug?debugZiwei=1&date=1979-9-2&timeIndex=2&gender=female',
      },
      { status: 400 },
    );
  }

  try {
    const core = createZiweiCore({ calendarType, date, gender, timeIndex, isLeapMonth });

    const starPositions = MAJOR_STARS.map((star) => {
      const hit = core.majorStarPositions.find((item) => item.star === star);
      return `${star} → ${hit ? hit.palace : '（未定位）'}`;
    });

    const sanFangPassed =
      core.sanFangSiZheng.target.key === 'MING' &&
      core.sanFangSiZheng.opposite.key === 'QIAN_YI' &&
      core.sanFangSiZheng.wealth.key === 'CAI_BO' &&
      core.sanFangSiZheng.career.key === 'GUAN_LU';

    const checks = {
      命宮: core.validation.lifePalaceFound ? 'PASS' : 'FAIL',
      十二宮: core.validation.palaceCount && core.validation.missingPalaces.length === 0 ? 'PASS' : 'FAIL',
      十四主星: core.validation.majorStarsComplete && core.validation.noMajorStarDuplicate ? 'PASS' : 'FAIL',
      三方四正: sanFangPassed ? 'PASS' : 'FAIL',
    };

    const certified = core.validation.passed && sanFangPassed;

    return NextResponse.json({
      標題: '【紫微斗數排盤驗證】',
      曆法: calendarType === 'lunar' ? '農曆' : '國曆',
      出生日期: date,
      陽曆: core.raw.solarDate,
      農曆: core.raw.lunarDate,
      時辰: `${core.raw.time}（timeIndex=${timeIndex}）`,
      性別: gender,
      排盤引擎: `${core.engine} (${core.engineVersion})`,
      命宮: `${core.lifePalace.name}／${core.lifePalace.heavenlyStem}${core.lifePalace.earthlyBranch}`,
      身宮: core.bodyPalace ? `${core.bodyPalace.name}／${core.bodyPalace.heavenlyStem}${core.bodyPalace.earthlyBranch}` : '（未標記）',
      命主: core.raw.soulMaster ?? '',
      身主: core.raw.bodyMaster ?? '',
      五行局: core.raw.fiveElementsClass ?? '',
      命宮主星: core.lifePalace.majorStarDetails.map((star) => `${star.name}${star.brightness ? `(${star.brightness})` : ''}`),
      十二宮: core.palaces.map((palace) => ({
        宮位: palace.name,
        干支: `${palace.heavenlyStem}${palace.earthlyBranch}`,
        主星: palace.majorStars,
        身宮: palace.isBodyPalace,
      })),
      十四主星: starPositions,
      三方四正: {
        本宮: core.sanFangSiZheng.target.name,
        對宮: core.sanFangSiZheng.opposite.name,
        三合財帛: core.sanFangSiZheng.wealth.name,
        三合官祿: core.sanFangSiZheng.career.name,
      },
      驗證: checks,
      missing: core.validation.missingMajorStars,
      duplicate: core.validation.duplicateMajorStars,
      ZIWEI_CHART_CERTIFIED: certified,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ZIWEI_CHART_CERTIFIED: false,
        error: error instanceof Error ? error.message : 'ZIWEI_CHART_UNKNOWN_ERROR',
      },
      { status: 500 },
    );
  }
}
