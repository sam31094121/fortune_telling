import { runThreeInOne, assertThreeInOnePassed } from './three-in-one';

/** Only raw birth input crosses the request boundary; client conclusions are ignored. */
export async function verifiedBaziReading(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('出生資料不足，請重新排盤。');
  const request = body as Record<string, unknown>;
  const birth = request.birthInput as Record<string, unknown> | undefined;
  if (!birth || birth.calendarType !== 'solar' || birth.timezone !== 'Asia/Taipei'
    || birth.timeUnknown === true || (birth.gender !== 'male' && birth.gender !== 'female')
    || typeof birth.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birth.birthDate)
    || typeof birth.birthTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(birth.birthTime)) {
    throw new Error('出生日期或時辰不足，請重新排盤。');
  }
  const [year, month, day] = birth.birthDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  if (year < 1901 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day || birth.birthDate > today) throw new Error('出生日期無效，請重新核對。');
  const verified = await runThreeInOne({ birthDate: birth.birthDate, birthTime: birth.birthTime, gender: birth.gender });
  assertThreeInOnePassed(verified);
  return {
    shortName: typeof request.shortName === 'string' ? request.shortName.trim().slice(0, 8) || '你' : '你',
    bazi: verified.result.bazi,
    iching: verified.result.yijing.reading,
    chartFingerprint: verified.result.yijing.certificate.chartFingerprint,
  };
}
