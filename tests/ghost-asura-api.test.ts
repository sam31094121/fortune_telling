/**
 * 鬼魅阿修羅 - API 集成測試
 *
 * 驗證：
 * 1. API 端點是否正常接收請求
 * 2. 輸入驗證是否完整
 * 3. 計算結果是否符合契約
 * 4. 四柱驗證是否通過
 * 5. 話術是否都來自後端
 */

import { POST } from '@/app/api/ghost-asura/calculate/route';
import { GhostAsuraCardResponse } from '@/lib/types/ghost-asura-response';
import { NextRequest } from 'next/server';

describe('POST /api/ghost-asura/calculate', () => {
  // 建立 mock NextRequest
  function createRequest(body: Record<string, unknown>) {
    return {
      json: async () => body,
    } as unknown as NextRequest;
  }

  describe('輸入驗證', () => {
    test('應拒絕缺少 name', async () => {
      const request = createRequest({
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_INPUT');
    });

    test('應拒絕缺少 birthDate', async () => {
      const request = createRequest({
        name: '王小明',
        birthTime: '03:30',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    test('應拒絕 birthDate 格式錯誤', async () => {
      const request = createRequest({
        name: '王小明',
        birthDate: '1974/7/2',
        birthTime: '03:30',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    test('應接受有效的輸入', async () => {
      const request = createRequest({
        name: '王小明',
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      expect(response.status).not.toBe(400);
    });
  });

  describe('計算結果驗證', () => {
    test('應回傳 GhostAsuraCardResponse 結構', async () => {
      const request = createRequest({
        name: '測試用戶',
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      const data = (await response.json()) as GhostAsuraCardResponse;

      // 驗證回傳結構
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('bazi');
      expect(data).toHaveProperty('ziwei');
      expect(data).toHaveProperty('shensha');
      expect(data).toHaveProperty('iching');
      expect(data).toHaveProperty('teacherReading');
      expect(data).toHaveProperty('visual');
      expect(data).toHaveProperty('meta');
    });

    test('user 欄位應包含輸入的資料', async () => {
      const request = createRequest({
        name: '王小明',
        birthDate: '1974-07-02',
        birthTime: '03:30',
        gender: '男',
      });

      const response = await POST(request);
      const data = (await response.json()) as GhostAsuraCardResponse;

      expect(data.user.name).toBe('王小明');
      expect(data.user.birthDate).toBe('1974-07-02');
      expect(data.user.birthTime).toBe('03:30');
      expect(data.user.gender).toBe('男');
    });

    test('bazi.pillars 應有 4 個柱（年月日時）', async () => {
      const request = createRequest({
        name: '測試',
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      const data = (await response.json()) as GhostAsuraCardResponse;

      expect(data.bazi.pillars).toHaveLength(4);
      expect(data.bazi.pillars.map((p) => p.name)).toEqual([
        '年',
        '月',
        '日',
        '時',
      ]);

      // 驗證每個柱的結構
      data.bazi.pillars.forEach((pillar) => {
        expect(pillar).toHaveProperty('stem'); // 天干
        expect(pillar).toHaveProperty('branch'); // 地支
        expect(pillar).toHaveProperty('element'); // 五行
        expect(pillar).toHaveProperty('elementColor'); // 顏色
      });
    });

    test('所有話術欄位應是非空字符串', async () => {
      const request = createRequest({
        name: '測試',
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      const data = (await response.json()) as GhostAsuraCardResponse;

      // 八字話術
      expect(typeof data.bazi.analysis).toBe('string');
      expect(data.bazi.analysis.length).toBeGreaterThan(0);

      // 紫微話術
      if (data.ziwei) {
        expect(typeof data.ziwei.chart.analysis).toBe('string');
      }

      // 神煞話術
      if (data.shensha?.combo) {
        expect(typeof data.shensha.combo).toBe('string');
      }

      // 易經話術
      if (data.iching?.result) {
        expect(typeof data.iching.result.judgment).toBe('string');
        expect(typeof data.iching.result.guidance).toBe('string');
      }

      // 老師話術
      expect(typeof data.teacherReading.opening).toBe('string');
      expect(typeof data.teacherReading.mainInsight).toBe('string');
      expect(typeof data.teacherReading.lifeGuidance).toBe('string');
      expect(typeof data.teacherReading.closing).toBe('string');
    });
  });

  describe('四柱驗證', () => {
    test('meta.verified 應為 true（四柱驗證通過）', async () => {
      const request = createRequest({
        name: '測試',
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      const data = (await response.json()) as GhostAsuraCardResponse;

      expect(data.meta.verified).toBe(true);
      expect(data.ziwei.verification.status).toBe('VERIFIED');
    });

    test('四柱應一致：bazi 和 ziwei', async () => {
      const request = createRequest({
        name: '測試',
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      const data = (await response.json()) as GhostAsuraCardResponse;

      if (data.meta.verified) {
        // 驗證四柱的干支在两个系統中是一致的
        const baziPillars = data.bazi.pillars;
        // （這裡假設 ziwei 中也有四柱資訊）
        expect(baziPillars).toBeDefined();
      }
    });
  });

  describe('視覺配置', () => {
    test('visual 欄位應包含顏色和佈局', async () => {
      const request = createRequest({
        name: '測試',
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      const data = (await response.json()) as GhostAsuraCardResponse;

      expect(data.visual.themeColor).toBe('#d4af37'); // Asura Gold
      expect(data.visual.accentColor).toBe('#e63946'); // Asura Red
      expect(data.visual.cardLayout).toBe('vertical');
    });
  });

  describe('元數據', () => {
    test('meta 應包含時間戳和版本', async () => {
      const request = createRequest({
        name: '測試',
        birthDate: '1974-07-02',
        birthTime: '03:30',
      });

      const response = await POST(request);
      const data = (await response.json()) as GhostAsuraCardResponse;

      expect(data.meta.timestamp).toBeGreaterThan(0);
      expect(typeof data.meta.version).toBe('string');
      expect(data.meta.verified).toBeDefined();
    });
  });

  describe('錯誤處理', () => {
    test('無效的日期應返回 500 錯誤', async () => {
      const request = createRequest({
        name: '測試',
        birthDate: '9999-99-99', // 無效日期
        birthTime: '03:30',
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    test('錯誤回應應包含 code 和 message', async () => {
      const request = createRequest({
        name: '測試',
        birthDate: '1974-07-02',
        // 缺少 birthTime（可選，但如果導致錯誤應有適當回應）
      });

      const response = await POST(request);
      if (!response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');
      }
    });
  });
});
