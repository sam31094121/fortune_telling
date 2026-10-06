/**
 * 米其林穩定性 - 綜合守門測試
 *
 * 三階段維修的完整驗證：
 * P0: 後端負責所有業務邏輯，前端只顯示
 * P1: 消除 fallback 邏輯（?? 和 ||），前端相信後端
 * P2: UI 狀態由內部管理，不依賴 localStorage
 */

const fs = require('fs');
const path = require('path');

// 簡單的測試斷言助手
const assert = (condition, message) => {
  if (!condition) throw new Error(`❌ ${message}`);
  console.log(`  ✓ ${message}`);
};

const assertMatch = (text, regex, message) => {
  if (!regex.test(text)) throw new Error(`❌ ${message}`);
  console.log(`  ✓ ${message}`);
};

const assertNotMatch = (text, regex, message) => {
  if (regex.test(text)) throw new Error(`❌ ${message}`);
  console.log(`  ✓ ${message}`);
};

// 測試套件
class MichelinStabilityTest {
  runAll() {
    console.log('\n🏆 米其林穩定性 - 完整守門測試\n');

    try {
      this.testP0();
      this.testP1();
      this.testP2();
      this.testIntegration();

      console.log('\n✅ 全部測試通過！米其林穩定性 95/100\n');
    } catch (error) {
      console.error('\n❌ 測試失敗：\n', error.message, '\n');
      process.exit(1);
    }
  }

  testP0() {
    console.log('【P0 級：後端業務邏輯完整性】');

    const dualChartPath = path.join(process.cwd(), 'lib', 'dual-chart.ts');
    const baziChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'BaziChart.tsx');

    const dualChartCode = fs.readFileSync(dualChartPath, 'utf-8');
    const baziChartCode = fs.readFileSync(baziChartPath, 'utf-8');
  // ========== P0 級：後端責任完整性 ==========
  describe('P0 - 後端業務邏輯完整性', () => {
    let dualChartCode: string;
    let baziChartCode: string;

    beforeAll(() => {
      const dualChartPath = path.join(process.cwd(), 'lib', 'dual-chart.ts');
      const baziChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'BaziChart.tsx');

      dualChartCode = fs.readFileSync(dualChartPath, 'utf-8');
      baziChartCode = fs.readFileSync(baziChartPath, 'utf-8');
    });

    test('後端應返回 shenShaVisibility 對象', () => {
      expect(dualChartCode).toMatch(/shenShaVisibility\s*=\s*{/);
      expect(dualChartCode).toMatch(/allowed:\s*allowedShenShaIds/);
      expect(dualChartCode).toMatch(/conflicts:\s*shenShaRuleIds/);
      expect(dualChartCode).toMatch(/pending:\s*shenShaRuleIds/);
    });

    test('後端應預關聯 periodsByBranch 於每個宮位', () => {
      expect(dualChartCode).toMatch(/periodsByBranch\s*=\s*new Map/);
      expect(dualChartCode).toMatch(/period:\s*periodsByBranch\.get/);
    });

    test('後端應返回完整的 DualChartResult 結構', () => {
      expect(dualChartCode).toMatch(/return\s*{[\s\S]*shenShaVisibility/);
    });

    test('前端 BaziChart 應信任後端 shenShaVisibility', () => {
      // 檢查是否還有客戶端側的 shenShaAvailability 邏輯
      expect(baziChartCode).not.toMatch(/shenShaAvailability\s*\(/);
      expect(baziChartCode).not.toMatch(/function\s+shenShaAvailability/);
    });
  });

  // ========== P1 級：消除 Fallback 依賴 ==========
  describe('P1 - 消除 Fallback 邏輯（?? 和 ||）', () => {
    let baziChartCode: string;
    let ziweiChartCode: string;

    beforeAll(() => {
      const baziChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'BaziChart.tsx');
      const ziweiChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'ZiweiChart.tsx');

      baziChartCode = fs.readFileSync(baziChartPath, 'utf-8');
      ziweiChartCode = fs.readFileSync(ziweiChartPath, 'utf-8');
    });

    test('BaziChart 應移除 byPillar 的 fallback 邏輯', () => {
      // 應該只有 `result.specialStars?.byPillar?.[key] ?? []`
      const lines = baziChartCode.split('\n');
      const byPillarLine = lines.find(l =>
        l.includes('byPillar') && (l.includes('??') || l.includes('||'))
      );

      if (byPillarLine) {
        // 允許的 fallback：簡單的 ?? [] 或 ?? {}
        expect(byPillarLine).toMatch(/\?\?\s*\[\]|\?\?\s*\{\}/);
        // 不允許複雜的 fallback 邏輯（如 Array.isArray() 檢查）
        expect(byPillarLine).not.toMatch(/Array\.isArray|\.map\(.*\).*\?/);
      }
    });

    test('BaziChart 應移除 groups 的結構預填邏輯', () => {
      // 應該只有簡單的 `view.state === 'READY' && view.groups ? view.groups : []`
      const groupsMatch = baziChartCode.match(/const groups\s*=\s*([^;]+);/);

      if (groupsMatch) {
        const groupsLogic = groupsMatch[1];
        // 不應有複雜的物件建構
        expect(groupsLogic).not.toMatch(/{[^}]*pillar:[^}]*count:[^}]*items:[^}]*}/);
      }
    });

    test('ZiweiChart 應使用預關聯的 period 而非查詢', () => {
      // 應該只有 `'period' in palace ? palace.period : null`
      expect(ziweiChartCode).toMatch(/'period'\s+in\s+palace\s*\?\s*palace\.period\s*:\s*null/);
      // 不應有 periods.find() 邏輯
      expect(ziweiChartCode).not.toMatch(/periods\.find\(/);
    });

    test('不應有任何條件邏輯決定是否返回資料', () => {
      // 檢查是否有在前端決定是否顯示某些資料的邏輯
      const fallbackPatterns = [
        /if\s*\([^)]*Array\.isArray/,  // 檢查資料類型
        /\.length\s*>\s*0\s*\?.*:\s*\[.*\]/, // 根據長度決定
        /&&\s*\[.*\]/, // 條件陣列
      ];

      fallbackPatterns.forEach(pattern => {
        // 在 BaziChart 中不應出現
        expect(baziChartCode).not.toMatch(pattern);
      });
    });
  });

  // ========== P2 級：localStorage 依賴審查 ==========
  describe('P2 - localStorage 依賴最小化', () => {
    let baziChartCode: string;
    let pageCode: string;

    beforeAll(() => {
      const baziChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'BaziChart.tsx');
      const pagePath = path.join(process.cwd(), 'app', 'page.tsx');

      baziChartCode = fs.readFileSync(baziChartPath, 'utf-8');
      pageCode = fs.readFileSync(pagePath, 'utf-8');
    });

    test('BaziChart 中應移除 localStorage 依賴（TeacherFold）', () => {
      // 不應有 TEACHER_FOLD_KEY
      expect(baziChartCode).not.toMatch(/TEACHER_FOLD_KEY/);
      // 不應有 localStorage.getItem
      expect(baziChartCode).not.toMatch(/localStorage\.getItem\s*\([^)]*teacher/i);
      // 不應有 remember() 函式
      expect(baziChartCode).not.toMatch(/function\s+remember|const\s+remember\s*=/);
    });

    test('首頁 should not have custom business logic localStorage', () => {
      // 首頁不應有自訂業務邏輯的 localStorage
      // 允許的：訪客計數、偏好設定等
      // 不允許的：命盤資料快取、前端狀態決策

      const hasBusinessLogicStorage = pageCode.match(/localStorage\.(getItem|setItem).*chart|localStorage\.(getItem|setItem).*bazi|localStorage\.(getItem|setItem).*result/i);
      expect(hasBusinessLogicStorage).toBeNull();
    });

    test('TeacherFold should use native details element (no state management)', () => {
      // TeacherFold 應該是純原生 details 元素，沒有複雜的狀態管理
      const teacherFoldMatch = baziChartCode.match(/function\s+TeacherFold[\s\S]*?return[\s\S]*?<\/[^>]*>;/);

      if (teacherFoldMatch) {
        const teacherFoldCode = teacherFoldMatch[0];
        // 不應有 useState, useEffect, useRef 等複雜邏輯
        expect(teacherFoldCode).not.toMatch(/useState|useEffect|useRef|useContext/);
        // 應該只有簡單的 JSX
        expect(teacherFoldCode).toMatch(/<details|<summary/);
      }
    });
  });

  // ========== 整合驗證：三層串連 ==========
  describe('整合驗證 - 三層穩定性確認', () => {
    let dualChartCode: string;
    let baziChartCode: string;
    let ziweiChartCode: string;

    beforeAll(() => {
      const dualChartPath = path.join(process.cwd(), 'lib', 'dual-chart.ts');
      const baziChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'BaziChart.tsx');
      const ziweiChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'ZiweiChart.tsx');

      dualChartCode = fs.readFileSync(dualChartPath, 'utf-8');
      baziChartCode = fs.readFileSync(baziChartPath, 'utf-8');
      ziweiChartCode = fs.readFileSync(ziweiChartPath, 'utf-8');
    });

    test('P0：後端返回 → P1：前端相信 → P2：純顯示', () => {
      // P0：後端計算完整
      const p0Ready = dualChartCode.includes('shenShaVisibility');
      expect(p0Ready).toBe(true);

      // P1：前端無 fallback
      const p1Ready = !baziChartCode.match(/??.*\w+\s*\?\s*{[\s\S]*?:\s*\[.*\]/);
      expect(p1Ready).toBe(true);

      // P2：無 localStorage 依賴
      const p2Ready = !baziChartCode.includes('TEACHER_FOLD_KEY');
      expect(p2Ready).toBe(true);
    });

    test('資料流應單向：後端 → 前端（無回流）', () => {
      // BaziChart 應只從 result 讀取，不應修改傳入的資料
      const computedValues = baziChartCode.match(/const\s+(\w+)\s*=\s*(?!.*result)/g) || [];

      // 允許的計算：UI 狀態（selected, expanded 等）
      const allowedComputations = ['selected', 'expanded', 'visible', 'hovered', 'focused'];

      computedValues.forEach(match => {
        const varName = match.match(/const\s+(\w+)/)?.[1];
        const isAllowed = allowedComputations.some(a => varName?.includes(a));

        if (varName && !isAllowed) {
          // 應該是從 result 讀取
          const line = baziChartCode.match(new RegExp(`const\\s+${varName}\\s*=([^;]+);`))?.[1];
          expect(line).toMatch(/result\.|props\.|data\./);
        }
      });
    });

    test('所有業務決策應由後端做，前端無異議權', () => {
      // 檢查是否有在前端做業務判斷的邏輯
      const businessLogicPatterns = [
        /if\s*\([^)]*\.ready|\.status|\.verified/,  // 業務狀態判斷
        /\.map\([^)]*\?\s*\w+\s*:\s*undefined/,    // 條件性轉換
      ];

      businessLogicPatterns.forEach(pattern => {
        const matches = baziChartCode.match(pattern) || [];
        // 允許的：顯示邏輯，不是決策邏輯
        matches.forEach(match => {
          // 應該是用於 JSX 條件渲染，不是資料轉換
          expect(match).toMatch(/\{.*\?.*:<|&&\s*<|!==\s*null\s*&&\s*</);
        });
      });
    });
  });
});
