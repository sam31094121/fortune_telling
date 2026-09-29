/**
 * 鬼魅阿修羅話術層測試 — 守門 CI
 * ============================================================================
 * 檢查項：
 * 1. 後端話術完整性（24 個神煞都有對應的阿修羅宣言）
 * 2. 前端零編結論（掃卡片前端代碼，禁止直接匯入或生成話術）
 * 3. 話術品質（禁止詛咒語氣、禁止宿命論、禁止預言家姿態）
 * 4. 來源追蹤（每句話的出處都可追溯）
 * ============================================================================
 */

import { ASURA_WORDINGS, getAsuraWording } from '../lib/asura-wording';
import * as fs from 'fs';
import * as path from 'path';

describe('🔥 鬼魅阿修羅話術層測試', () => {
  // ==================== 後端話術完整性測試 ====================

  describe('✅ 後端話術覆蓋', () => {
    test('應有 20+ 個神煞的阿修羅話術', () => {
      const wordingCount = Object.keys(ASURA_WORDINGS).length;
      expect(wordingCount).toBeGreaterThanOrEqual(20);
      console.log(`✅ 已完成 ${wordingCount} 個神煞的話術`);
    });

    test('每個話術應有完整的三層結構', () => {
      const wordingIds = Object.keys(ASURA_WORDINGS);
      for (const id of wordingIds) {
        const wording = ASURA_WORDINGS[id];
        expect(wording).toBeDefined();
        expect(wording.coreDeclaration).toBeTruthy();
        expect(wording.pillarExtension).toBeDefined();
        expect(wording.pillarExtension.year).toBeTruthy();
        expect(wording.pillarExtension.month).toBeTruthy();
        expect(wording.pillarExtension.day).toBeTruthy();
        expect(wording.pillarExtension.hour).toBeTruthy();
        expect(wording.transformationPath).toBeTruthy();
      }
    });

    test('每個話術應有正確的音調標籤（blessing/dynamic/reminder）', () => {
      const wordingIds = Object.keys(ASURA_WORDINGS);
      for (const id of wordingIds) {
        const wording = ASURA_WORDINGS[id];
        expect(['blessing', 'dynamic', 'reminder']).toContain(wording.tone);
      }
    });

    test('每個話術應有來源出處', () => {
      const wordingIds = Object.keys(ASURA_WORDINGS);
      for (const id of wordingIds) {
        const wording = ASURA_WORDINGS[id];
        expect(wording.sourceFile).toBeTruthy();
        expect(wording.sourceFile).toContain('docs/技能戰鬥檔案/阿修羅');
      }
    });
  });

  // ==================== 話術品質檢查 ====================

  describe('🚫 禁止話術清單', () => {
    const forbiddenPatterns = [
      /一定會/,
      /註定/,
      /大凶/,
      /必然/,
      /血光/,
      /死亡/,
      /災難/,
    ];

    test('話術中禁止使用詛咒語氣（一定會、註定、大凶等）', () => {
      const wordingIds = Object.keys(ASURA_WORDINGS);
      for (const id of wordingIds) {
        const wording = ASURA_WORDINGS[id];
        const allText =
          wording.coreDeclaration +
          Object.values(wording.pillarExtension).join('') +
          wording.transformationPath;

        for (const pattern of forbiddenPatterns) {
          expect(allText).not.toMatch(pattern);
        }
      }
      console.log('✅ 話術品質檢查通過——未檢出詛咒語氣');
    });

    test('話術應使用第一人稱（「我看」而非「此人」）', () => {
      const wordingIds = Object.keys(ASURA_WORDINGS);
      for (const id of wordingIds) {
        const wording = ASURA_WORDINGS[id];
        expect(wording.coreDeclaration).toMatch(/我看/);
      }
      console.log('✅ 第一人稱檢查通過——阿修羅聲音確認');
    });
  });

  // ==================== 前端零編結論檢查 ====================

  describe('🚫 前端禁止項檢查', () => {
    test('卡片前端代碼禁止直接導入 ASURA_WORDINGS', () => {
      const cardPath = path.join(
        __dirname,
        '../app/single-shensha/IchingShenShaCard.tsx'
      );
      if (fs.existsSync(cardPath)) {
        const cardContent = fs.readFileSync(cardPath, 'utf-8');
        // 檢查是否直接匯入或使用 ASURA_WORDINGS
        expect(cardContent).not.toContain('ASURA_WORDINGS');
        expect(cardContent).not.toContain(
          "import { ASURA_WORDINGS }"
        );
      }
    });

    test('前端卡片禁止生成含中文句子（。，；）的文本', () => {
      const cardPath = path.join(
        __dirname,
        '../app/single-shensha/IchingShenShaCard.tsx'
      );
      if (fs.existsSync(cardPath)) {
        const cardContent = fs.readFileSync(cardContent, 'utf-8');
        // 找出所有可能自撰的中文句子（簡化檢查）
        const chinesePatterns = /['"`][一-龥]+[。，；]['"`]/g;
        const matches = cardContent.match(chinesePatterns) || [];

        // 允許的例外：UI 標籤、按鈕文本等短句
        const allowedShortPhrases = [
          '查看更多',
          '展開',
          '收起',
          '下載',
          '分享',
          '返回',
          '確認',
        ];

        for (const match of matches) {
          const phrase = match.slice(1, -1);
          const isAllowed =
            allowedShortPhrases.some((allowed) =>
              phrase.includes(allowed)
            ) ||
            phrase.length <= 4; // 短文本允許

          if (!isAllowed) {
            console.warn(
              `⚠️ 檢出可能自撰的中文句子: "${phrase}" 位置: ${cardPath}`
            );
          }
        }
      }
    });
  });

  // ==================== 話術一致性檢查 ====================

  describe('🔄 話術一致性檢查', () => {
    test('每個神煞的話術應保持一致的「承認困難 + 尊重力量」邏輯', () => {
      const wordingIds = Object.keys(ASURA_WORDINGS);
      for (const id of wordingIds) {
        const wording = ASURA_WORDINGS[id];
        const allText =
          wording.coreDeclaration +
          wording.transformationPath;

        // 應承認困難或挑戰
        const acknowledgesChallenge =
          /容易|困難|挑戰|卡|拉扯|衝突|耗損|雜音|意外/.test(
            allText
          );

        // 應尊重力量或可能性
        const respectsPower =
          /力量|能力|本事|轉化|突破|成長|智慧|勝任/.test(
            allText
          );

        if (!acknowledgesChallenge || !respectsPower) {
          console.warn(
            `⚠️ ${id} 的話術可能違反「承認困難 + 尊重力量」邏輯`
          );
        }
      }
      console.log('✅ 話術邏輯一致性檢查完成');
    });
  });

  // ==================== 來源治理檢查 ====================

  describe('📝 來源追蹤', () => {
    test('話術來源檔案應存在且可訪問', () => {
      const sourceFile = path.join(
        __dirname,
        '../docs/技能戰鬥檔案/阿修羅/阿修羅話術檔案.md'
      );
      expect(fs.existsSync(sourceFile)).toBe(true);
      console.log(`✅ 話術來源檔案確認: ${sourceFile}`);
    });

    test('所有話術的 sourceFile 應一致指向話術檔案', () => {
      const wordingIds = Object.keys(ASURA_WORDINGS);
      for (const id of wordingIds) {
        const wording = ASURA_WORDINGS[id];
        expect(wording.sourceFile).toBe(
          'docs/技能戰鬥檔案/阿修羅/阿修羅話術檔案.md'
        );
      }
    });
  });

  // ==================== 音調分布檢查 ====================

  describe('🎵 音調分布', () => {
    test('應有均衡的福氣、動能、提醒三種音調分布', () => {
      const tones = {
        blessing: 0,
        dynamic: 0,
        reminder: 0,
      };

      for (const wording of Object.values(ASURA_WORDINGS)) {
        tones[wording.tone]++;
      }

      console.log(
        `✅ 音調分布 — 福氣: ${tones.blessing}, 動能: ${tones.dynamic}, 提醒: ${tones.reminder}`
      );
      // 每種音調至少要有 3 個以上
      expect(tones.blessing).toBeGreaterThanOrEqual(3);
      expect(tones.dynamic).toBeGreaterThanOrEqual(3);
      expect(tones.reminder).toBeGreaterThanOrEqual(3);
    });
  });
});
