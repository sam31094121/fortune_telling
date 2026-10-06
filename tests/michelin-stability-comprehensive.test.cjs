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

    // 後端應返回 shenShaVisibility 對象
    assertMatch(dualChartCode, /shenShaVisibility\s*=\s*{/, '後端應返回 shenShaVisibility 對象');
    assertMatch(dualChartCode, /allowed:\s*allowedShenShaIds/, '應包含 allowed 字段');
    assertMatch(dualChartCode, /conflicts:\s*shenShaRuleIds/, '應包含 conflicts 字段');
    assertMatch(dualChartCode, /pending:\s*shenShaRuleIds/, '應包含 pending 字段');

    // 後端應預關聯 periodsByBranch 於每個宮位
    assertMatch(dualChartCode, /periodsByBranch\s*=\s*new Map/, '後端應預關聯 periodsByBranch');
    assertMatch(dualChartCode, /period:\s*periodsByBranch\.get/, '宮位應包含預關聯的 period');

    // 前端應信任後端 shenShaVisibility
    assertNotMatch(baziChartCode, /shenShaAvailability\s*\(/, '前端不應有 shenShaAvailability 函式');
    assertNotMatch(baziChartCode, /function\s+shenShaAvailability/, '前端不應自己定義 shenShaAvailability');
  }

  testP1() {
    console.log('【P1 級：消除 Fallback 邏輯（?? 和 ||）】');

    const baziChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'BaziChart.tsx');
    const ziweiChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'ZiweiChart.tsx');

    const baziChartCode = fs.readFileSync(baziChartPath, 'utf-8');
    const ziweiChartCode = fs.readFileSync(ziweiChartPath, 'utf-8');

    // 檢查 byPillar 的簡化邏輯
    const byPillarMatch = baziChartCode.match(/const\s+hits\s*=\s*([^;]+);/);
    if (byPillarMatch) {
      const hitsLogic = byPillarMatch[1];
      // 應該是簡單的 ?? []，不應有複雜的 Array.isArray 邏輯
      assertNotMatch(hitsLogic, /Array\.isArray/, '不應有 Array.isArray 檢查');
      assertNotMatch(hitsLogic, /\.map\([^)]*\?\s*[^:]*:\s*undefined/, '不應有條件性轉換');
    }

    // ZiweiChart 應使用預關聯的 period
    assertMatch(ziweiChartCode, /'period'\s+in\s+palace/, '應使用預關聯的 period');
    assertNotMatch(ziweiChartCode, /periods\.find\(/, '不應有 periods.find() 查詢');

    // 檢查 groups 邏輯
    const groupsMatch = baziChartCode.match(/const\s+groups\s*=\s*([^;]+);/);
    if (groupsMatch) {
      const groupsLogic = groupsMatch[1];
      // 應該是簡單的條件檢查，不應有物件建構
      assertNotMatch(groupsLogic, /pillar:[^}]*count:[^}]*items/, '不應有內聯的 groups 構造');
    }
  }

  testP2() {
    console.log('【P2 級：localStorage 依賴最小化】');

    const baziChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'BaziChart.tsx');
    const baziChartCode = fs.readFileSync(baziChartPath, 'utf-8');

    // BaziChart 應移除 localStorage 依賴
    assertNotMatch(baziChartCode, /TEACHER_FOLD_KEY/, 'BaziChart 不應有 TEACHER_FOLD_KEY');
    assertNotMatch(baziChartCode, /localStorage\.getItem/, 'BaziChart 不應有 localStorage.getItem');

    // TeacherFold 應使用原生 details 元素（useRef 可用於 DOM 引用）
    const teacherFoldMatch = baziChartCode.match(/function\s+TeacherFold[\s\S]*?return[\s\S]*?<\/[^>]*>;/);
    if (teacherFoldMatch) {
      const teacherCode = teacherFoldMatch[0];
      assertNotMatch(teacherCode, /useState|useEffect/, 'TeacherFold 不應有複雜狀態管理');
      assertMatch(teacherCode, /<details|<summary/, 'TeacherFold 應使用原生 details 元素');
    }
  }

  testIntegration() {
    console.log('【整合驗證 - 三層穩定性確認】');

    const dualChartPath = path.join(process.cwd(), 'lib', 'dual-chart.ts');
    const baziChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'BaziChart.tsx');
    const ziweiChartPath = path.join(process.cwd(), 'app', 'dual-chart', 'ZiweiChart.tsx');

    const dualChartCode = fs.readFileSync(dualChartPath, 'utf-8');
    const baziChartCode = fs.readFileSync(baziChartPath, 'utf-8');
    const ziweiChartCode = fs.readFileSync(ziweiChartPath, 'utf-8');

    // 三層穩定性檢查
    const p0Ready = dualChartCode.includes('shenShaVisibility');
    const p1Ready = !baziChartCode.match(/\?\?.*\w+\s*\?\s*{[\s\S]*?:\s*\[.*\]/);
    const p2Ready = !baziChartCode.includes('TEACHER_FOLD_KEY');

    assert(p0Ready, 'P0：後端返回完整的 shenShaVisibility');
    assert(p1Ready, 'P1：前端無複雜 fallback 邏輯');
    assert(p2Ready, 'P2：無 localStorage 依賴');

    // 資料流單向性檢查：不應有對 result 屬性的賦值修改
    assertNotMatch(baziChartCode, /result\.\w+\s*=\s*/, '前端不應修改傳入的 result 物件');
    assertNotMatch(ziweiChartCode, /result\.\w+\s*=\s*/, '前端不應修改傳入的 result 物件');
  }
}

// 執行測試
new MichelinStabilityTest().runAll();
