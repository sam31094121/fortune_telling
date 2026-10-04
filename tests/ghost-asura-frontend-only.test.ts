/**
 * 鬼魅阿修羅 - 前端零邏輯守門測試
 *
 * 目的：掃描前端元件代碼，確保：
 * 1. 沒有 Math.random() 或任何運算函式
 * 2. 沒有自撰中文句子（含「，。；：」）
 * 3. 只有 data.*.xxx 的直接傳遞（照印）
 * 4. 沒有條件邏輯決定內容顯示
 */

import fs from 'fs';
import path from 'path';

describe('GhostAsuraCard - 前端零邏輯驗證', () => {
  let componentCode: string;

  beforeAll(() => {
    const componentPath = path.join(
      process.cwd(),
      'components',
      'GhostAsuraCard.tsx'
    );
    componentCode = fs.readFileSync(componentPath, 'utf-8');
  });

  test('不應包含 Math.random()', () => {
    expect(componentCode).not.toMatch(/Math\.random/);
  });

  test('不應包含 Math.floor, Math.ceil 等運算', () => {
    expect(componentCode).not.toMatch(/Math\.(floor|ceil|round|min|max)/);
  });

  test('不應包含自撰中文句子（不含 data.* 的中文）', () => {
    // 掃描所有中文字符串，排除來自 data 的部分
    const chineseMatches = componentCode.match(
      /["']([^"']*[一-鿿]+[^"']*)['"]/g
    ) || [];

    const selfWritten = chineseMatches.filter((str) => {
      // 排除來自 data.* 的字符串
      const beforeStr = componentCode.substring(
        Math.max(0, componentCode.indexOf(str) - 50),
        componentCode.indexOf(str)
      );
      return !beforeStr.includes('data.');
    });

    // 允許的自撰字符串（UI 標籤、ARIA）
    const allowed = [
      '四柱',
      '紫微斗數',
      '特星神煞',
      '易經卜卦',
      '阿修羅老師解盤',
      '正在覺醒',
      '無法載入命盤資訊',
      '心理學視角',
      '爻位解讀',
      '人生指引',
      '整盤神煞組合',
    ];

    const notAllowed = selfWritten.filter((str) => {
      return !allowed.some((a) => str.includes(a));
    });

    expect(notAllowed).toEqual([]);
  });

  test('不應在 JSX 中拼接中文（如 "前綴" + data.xxx + "後綴"）', () => {
    // 檢查是否有字符串拼接包含中文的模式
    const concatPattern =
      /["'`][一-鿿]+["'`]\s*\+|{\s*data\.\w+\s*}\s*["'`][一-鿿]/g;
    expect(componentCode).not.toMatch(concatPattern);
  });

  test('所有 if/else/ternary 應僅用於顯示/隱藏，不改變內容', () => {
    // 掃描條件邏輯
    const ternaryMatches =
      componentCode.match(/(\w+)\s*\?\s*<(\w+)>([^<]*)<\/\2>\s*:/g) || [];

    // 允許的模式：決定是否顯示，而不是改變內容
    const allowedPatterns = [
      'isLoading', // 載入狀態
      'data &&', // 檢查是否有資料
      'verification.status', // 顯示警告
      'item.psychology && <details>', // 條件顯示區塊
    ];

    ternaryMatches.forEach((match) => {
      const isAllowed = allowedPatterns.some((p) => match.includes(p));
      expect(isAllowed).toBe(true);
    });
  });

  test('不應有任何「生成」函式（如 generateText, buildString）', () => {
    expect(componentCode).not.toMatch(/generate|build|create|format.*Text/i);
  });

  test('CSS 應完全掌管排版（不在 style={{}} 中硬編排版規則）', () => {
    // 檢查 style={{}} 是否包含排版相關的屬性
    const styleMatches =
      componentCode.match(/style={{\s*([^}]+)\s*}}/g) || [];

    styleMatches.forEach((match) => {
      // 允許的 style 應該只有動態顏色變數
      expect(match).toMatch(
        /(--theme-color|--accent-color|borderColor|color)/
      );
      // 不允許 width, padding, margin, fontSize 在 style 中硬編
      expect(match).not.toMatch(/(width|padding|margin|fontSize):/);
    });
  });

  test('Component 簽名應只接收 data 和 isLoading', () => {
    const propsMatch = componentCode.match(/interface.*Props\s*{([^}]+)}/s);
    if (propsMatch) {
      const propsContent = propsMatch[1];
      // 應該只有 data 和 isLoading
      expect(propsContent).toMatch(/data:\s*GhostAsuraCardResponse/);
      expect(propsContent).toMatch(/isLoading/);
      // 不應有其他處理邏輯的 prop
      expect(propsContent).not.toMatch(/onFormat|transform|parse|calculate/);
    }
  });
});
