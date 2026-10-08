/**
 * 《神煞易經》穩定版本系統測試
 * ============================================================================
 * 驗證：
 * 1. 穩定版本能被正確加載
 * 2. 規則順序永久固定
 * 3. 卡片版本控制有效
 * 4. 順序驗證函數正確
 */

import { describe, it, expect } from '@jest/globals';
import {
  getStableOrder,
  sortByShenShaStableOrder,
  validateShenShaOrder,
  getVersionInfo,
  isVersionValid,
  SHENSHA_STABLE_VERSIONS,
} from '../lib/shensha-stable-version';

describe('神煞易經穩定版本系統', () => {
  describe('版本管理', () => {
    it('應該能加載 v1.2026-10-08 版本', () => {
      const version = SHENSHA_STABLE_VERSIONS['v1.2026-10-08'];
      expect(version).toBeDefined();
      expect(version.metadata.totalRules).toBe(66);
    });

    it('版本資訊應該正確', () => {
      const info = getVersionInfo('v1.2026-10-08');
      expect(info.version).toBe('v1.2026-10-08');
      expect(info.totalRules).toBe(66);
      expect(info.frozenAt).toBeDefined();
    });

    it('應該能驗證版本有效性', () => {
      expect(isVersionValid('v1.2026-10-08')).toBe(true);
      expect(isVersionValid('v99.9999-99-99')).toBe(false);
    });
  });

  describe('規則順序穩定性', () => {
    it('順序映射應該有 66 項規則', () => {
      const order = getStableOrder('v1.2026-10-08');
      expect(order.size).toBe(66);
    });

    it('規則順序應該連續從 1 到 66', () => {
      const order = getStableOrder('v1.2026-10-08');
      for (let i = 1; i <= 66; i++) {
        const rulesWithOrder = Array.from(order.entries()).filter(([, o]) => o === i);
        expect(rulesWithOrder.length).toBe(1, `順序 ${i} 應該只有一條規則`);
      }
    });

    it('關鍵規則順序應該符合預期', () => {
      const order = getStableOrder('v1.2026-10-08');
      expect(order.get('tianyi')).toBe(1); // 天乙貴人第一
      expect(order.get('tiande')).toBe(2); // 天德第二
      expect(order.get('yuede')).toBe(3); // 月德第三
    });
  });

  describe('排序功能', () => {
    it('應該正確排序神煞', () => {
      const unsorted = [
        { id: 'taohua', name: '桃花' },
        { id: 'tianyi', name: '天乙貴人' },
        { id: 'yuede', name: '月德' },
      ];

      const sorted = sortByShenShaStableOrder(unsorted);

      expect(sorted[0].id).toBe('tianyi');
      expect(sorted[1].id).toBe('yuede');
      expect(sorted[2].id).toBe('taohua');
    });

    it('排序不應修改原陣列', () => {
      const original = [
        { id: 'taohua', name: '桃花' },
        { id: 'tianyi', name: '天乙貴人' },
      ];
      const originalIds = original.map(x => x.id);

      sortByShenShaStableOrder(original);

      expect(original.map(x => x.id)).toEqual(originalIds);
    });
  });

  describe('順序驗證', () => {
    it('應該驗證正確的順序', () => {
      const correct = [
        { id: 'tianyi', name: '天乙貴人' },
        { id: 'tiande', name: '天德' },
        { id: 'yuede', name: '月德' },
      ];

      const result = validateShenShaOrder(correct);
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('應該檢測出錯誤的順序', () => {
      const incorrect = [
        { id: 'yuede', name: '月德' },
        { id: 'tianyi', name: '天乙貴人' },
        { id: 'tiande', name: '天德' },
      ];

      const result = validateShenShaOrder(incorrect);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('應該報告具體的不符位置', () => {
      const incorrect = [
        { id: 'taohua', name: '桃花' },
        { id: 'tianyi', name: '天乙貴人' },
      ];

      const result = validateShenShaOrder(incorrect);
      expect(result.issues[0]).toContain('位置 0');
    });
  });

  describe('版本永久性保證', () => {
    it('同一版本的規則順序應該始終相同', () => {
      const version = 'v1.2026-10-08';
      const order1 = getStableOrder(version);
      const order2 = getStableOrder(version);

      expect(order1).toEqual(order2);
    });

    it('應該支持多個版本共存', () => {
      // 未來可能有 v2, v3 等版本
      // 此時驗證可以指定使用舊版本
      const order = getStableOrder('v1.2026-10-08');
      expect(order.size).toBeGreaterThan(0);
    });
  });
});
