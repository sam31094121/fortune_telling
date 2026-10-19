/** @jest-environment node */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import type { AsuraDisplay } from '@/lib/ghost-asura-display-contract';

// Keep real origin validation, normalization, calculation and response handling.
// Only the process-wide rate budget is controlled to avoid cross-suite coupling.
jest.mock('@/lib/dual-chart-auth', () => ({
  ...jest.requireActual<typeof import('@/lib/dual-chart-auth')>('@/lib/dual-chart-auth'),
  checkAPIRateLimit: jest.fn(),
}));
const { POST } = require('@/app/api/ghost-asura/reading/route') as typeof import('@/app/api/ghost-asura/reading/route');
const { checkAPIRateLimit } = require('@/lib/dual-chart-auth') as typeof import('@/lib/dual-chart-auth');
const limit = jest.mocked(checkAPIRateLimit);
const state = globalThis as typeof globalThis & { ghostAsuraReadingCache?: Map<string, unknown> };
const birth = { name: '合成測試甲', birthDate: '1974-06-28', birthTime: '17:30', gender: 'male' };
function request(body: unknown = birth, options: { raw?: string; origin?: string; ip?: string } = {}) {
  return new NextRequest('http://localhost/api/ghost-asura/reading', {
    method: 'POST', headers: { host: 'localhost', origin: options.origin ?? 'http://localhost', 'content-type': 'application/json', 'x-forwarded-for': options.ip ?? '192.0.2.1' },
    body: options.raw ?? JSON.stringify(body),
  });
}
async function reading(body: unknown = birth, ip?: string): Promise<AsuraDisplay> {
  const response = await POST(request(body, { ip }));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const json = await response.json();
  expect(Object.keys(json)).toEqual(['data']);
  return json.data;
}
beforeEach(() => {
  state.ghostAsuraReadingCache?.clear();
  limit.mockReset().mockReturnValue({ allowed: true, remaining: 9, resetSeconds: 60 });
});
afterEach(() => { jest.useRealTimers(); state.ghostAsuraReadingCache?.clear(); });

describe('POST /api/ghost-asura/reading 現行契約', () => {
  test.each([
    ['空內容', '', '請先填寫生辰。'],
    ['超長內容', 'x'.repeat(2049), '輸入內容過長。'],
    ['壞 JSON', '{', '請求格式不正確。'],
    ['缺日期', '{}', '缺少出生日期。'],
    ['null', 'null', '缺少出生日期。'],
  ])('輸入防護：%s', async (_, raw, error) => {
    const response = await POST(request({}, { raw }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
    expect(limit).not.toHaveBeenCalled();
  });
  test('外站請求先拒絕，不運算或消耗額度', async () => {
    const response = await POST(request(birth, { origin: 'https://example.invalid' }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: '請從本站開啟。' });
    expect(limit).not.toHaveBeenCalled();
  });
  test('回傳實際顯示契約，四柱鍵與欄名順序完整', async () => {
    const data = await reading();
    expect(data.contract).toBe('ghost-asura-display/v1');
    expect(data.columns.map(c => c.key)).toEqual(['year', 'month', 'day', 'hour']);
    // Display aliases in docs/技能戰鬥檔案/鬼魅阿修羅/技能清單.md;
    // semantic pillar keys above remain year/month/day/hour.
    expect(data.columns.map(c => c.heading)).toEqual(['千歲壽', '障月', '障日', '一剎那']);
    expect(data.title.length).toBeGreaterThan(0);
    expect(data.audit.listing.ok).toBe(true);
    expect(data.hourAssumed).toBe(false);
    expect(data.targetName).toBe('合成測試甲');
    expect(data.sections.map(s => s.key)).toEqual(['hits', 'pillars', 'verdict']);
    for (const c of data.columns) for (const seal of c.seals) {
      expect(seal.id.length).toBeGreaterThan(0);
      expect(seal.name.length).toBeGreaterThan(0);
      expect(['awakened', 'dormant', 'pending']).toContain(seal.tone);
    }
    // Retired raw chart API fields must not be reintroduced into display output.
    for (const key of ['bazi', 'ziwei', 'shensha', 'teacherReading', 'visual', 'meta']) expect(data).not.toHaveProperty(key);
  });
  test('相同輸入重送逐項相等且不再扣額度', async () => {
    const first = await reading();
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('x-asura-cache')).toBe('hit');
    expect((await response.json()).data).toEqual(first);
    expect(limit).toHaveBeenCalledTimes(1);
  });
  test('換人後返回原人資料不受污染', async () => {
    const first = await reading();
    const second = await reading({ ...birth, name: '合成測試乙', birthDate: '1990-02-15', gender: 'female' });
    expect(second.targetName).toBe('合成測試乙');
    expect(second).not.toEqual(first);
    expect(await reading()).toEqual(first);
    expect(limit).toHaveBeenCalledTimes(2);
  });
  test('不同 IP 不共用命中快取', async () => {
    await reading();
    await reading(birth, '192.0.2.2');
    expect(limit).toHaveBeenCalledTimes(2);
  });
  test('十分鐘有效期屆滿重新核算，不延長安全期限', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-19T01:00:00Z') });
    await reading();
    jest.setSystemTime(new Date('2026-10-19T01:10:00.001Z'));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('x-asura-cache')).toBeNull();
    expect(limit).toHaveBeenCalledTimes(2);
  });
  test('限流回中文與重試期限，不回命盤或假成功', async () => {
    limit.mockReturnValue({ allowed: false, remaining: 0, resetSeconds: 120 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('120');
    expect(response.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(await response.json()).toEqual({ error: '戰局開得太密。刀先歇著，約 2 分鐘後再來。' });
  });
  test('無效生辰回明確失敗且不寫成功快取', async () => {
    const response = await POST(request({ ...birth, birthDate: '9999-99-99' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(typeof data.error).toBe('string');
    expect(data.error.length).toBeGreaterThan(0);
    expect(data).not.toHaveProperty('data');
    expect(state.ghostAsuraReadingCache?.size).toBe(0);
  });
});
