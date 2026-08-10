import { NextResponse } from 'next/server';
import {
  generateZiweiChart,
  getLifePalace,
  validateMajorStars,
  validateTwelvePalaces,
  hourToTimeIndex,
  MAJOR_STARS,
  type ZiweiGender,
} from '@/lib/ziwei/chartEngine';

export const dynamic = 'force-dynamic';

/**
 * 紫微斗數排盤 Debug 模式
 *
 * 用法：/api/ziwei-debug?debugZiwei=1&date=1974-6-28&hour=3&gender=male
 *
 * 只輸出排盤驗證資訊，不觸碰塔羅牌、AI 文案、卡片 UI 與客戶流程。
 * 只有四項全 PASS 才會回報 ZIWEI_CHART_CERTIFIED=true。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get('debugZiwei') !== '1') {
    return NextResponse.json({ error: 'debugZiwei=1 required' }, { status: 400 });
  }

  const date = url.searchParams.get('date') ?? '';
  const hour = Number(url.searchParams.get('hour') ?? '');
  const genderParam = url.searchParams.get('gender') ?? 'male';
  const gender: ZiweiGender = genderParam === 'female' || genderParam === '女' ? 'female' : 'male';

  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(date) || !Number.isFinite(hour) || hour < 0 || hour > 23) {
    return NextResponse.json(
      { error: 'date=YYYY-M-D 與 hour=0~23 為必填', example: '/api/ziwei-debug?debugZiwei=1&date=1974-6-28&hour=3&gender=male' },
      { status: 400 },
    );
  }

  try {
    const chart = generateZiweiChart({ birthDate: date, birthHour: hour, gender });
    const lifePalace = getLifePalace(chart);
    const twelve = validateTwelvePalaces(chart);
    const majors = validateMajorStars(chart);

    const starPositions = MAJOR_STARS.map((star) => {
      const hit = majors.positions.find((item) => item.star === star);
      return { star, palace: hit ? hit.palace : '（未定位）', branch: hit?.branch ?? '' };
    });

    const sanFangPassed =
      chart.sanFangSiZheng.target.key === 'MING' &&
      chart.sanFangSiZheng.opposite.key === 'QIAN_YI' &&
      chart.sanFangSiZheng.wealth.key === 'CAI_BO' &&
      chart.sanFangSiZheng.career.key === 'GUAN_LU';

    const checks = {
      命宮: lifePalace.key === 'MING' ? 'PASS' : 'FAIL',
      十二宮: twelve.passed ? 'PASS' : 'FAIL',
      十四主星: majors.passed ? 'PASS' : 'FAIL',
      三方四正: sanFangPassed ? 'PASS' : 'FAIL',
    };

    const certified = Object.values(checks).every((value) => value === 'PASS');

    return NextResponse.json({
      標題: '【紫微斗數排盤驗證】',
      出生日期: date,
      時辰: `${String(hour).padStart(2, '0')} 時（timeIndex=${hourToTimeIndex(hour)}）`,
      性別: gender === 'male' ? '男' : '女',
      排盤引擎: `${chart.engine} (${chart.engineVersion})`,
      命宮: `${lifePalace.name}／${lifePalace.heavenlyStem}${lifePalace.earthlyBranch}`,
      身宮: chart.bodyPalace ? `${chart.bodyPalace.name}／${chart.bodyPalace.heavenlyStem}${chart.bodyPalace.earthlyBranch}` : '（未標記）',
      命主: chart.soulMaster ?? '',
      身主: chart.bodyMaster ?? '',
      五行局: chart.fiveElementsClass ?? '',
      命宮主星: lifePalace.majorStars.map((star) => `${star.name}${star.brightness ? `(${star.brightness})` : ''}`),
      十二宮: chart.palaces.map((palace) => ({
        宮位: palace.name,
        干支: `${palace.heavenlyStem}${palace.earthlyBranch}`,
        主星: palace.majorStars.map((star) => star.name),
        身宮: palace.isBodyPalace,
      })),
      十四主星: starPositions.map((item) => `${item.star} → ${item.palace}`),
      三方四正: {
        本宮: chart.sanFangSiZheng.target.name,
        對宮: chart.sanFangSiZheng.opposite.name,
        三合財帛: chart.sanFangSiZheng.wealth.name,
        三合官祿: chart.sanFangSiZheng.career.name,
      },
      驗證: checks,
      missing: majors.missing,
      duplicate: majors.duplicate,
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
