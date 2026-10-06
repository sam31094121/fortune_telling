/**
 * P2-2 級 localStorage 審查 — 防止業務決策類依賴回流
 *
 * 目的：確保任何新增的 localStorage 都是「便利性」而非「業務決策」
 *
 * 允許的用途：
 * - UI 狀態（折疊/展開、標籤頁選擇）
 * - 使用者偏好（語言、主題、視圖大小）
 * - 便利性緩存（草稿保存、最近訪問）
 *
 * 禁止的用途：
 * - 業務決策邏輯（「已付款」「已驗證」「版本需升級」）
 * - 認證令牌或密碼
 * - 命盤資料或其他核心計算結果
 * - 用戶必須依賴本地存儲才能完成任務
 */

const fs = require('fs');
const path = require('path');

class LocalStorageAudit {
  runAll() {
    console.log('\n🔍 P2-2 級 localStorage 審查\n');

    try {
      this.auditStorageKeys();
      this.auditUsagePatterns();

      console.log('\n✅ localStorage 審查通過：無業務決策類依賴\n');
    } catch (error) {
      console.error('\n❌ 審查失敗：\n', error.message, '\n');
      process.exit(1);
    }
  }

  auditStorageKeys() {
    console.log('【localStorage Keys 審查】');

    const storageFile = path.join(process.cwd(), 'lib', 'storage.ts');
    const storageCode = fs.readFileSync(storageFile, 'utf-8');

    // 列出所有定義的 storage key
    const keyMatches = storageCode.match(/const\s+\w*STORAGE_KEY\s*=\s*['"](.*?)['"]/g) || [];
    console.log(`  找到 ${keyMatches.length} 個 storage key：`);

    keyMatches.forEach(match => {
      const keyName = match.match(/['"](.*?)['"]/)[1];
      console.log(`    • ${keyName}`);
    });

    // 認證類關鍵字檢查
    const forbiddenPatterns = [
      /auth.*storage|token.*storage|password.*storage/i,
      /paid|verified|license|subscription.*storage/i,
      /decrypted|secret|private.*storage/i,
    ];

    forbiddenPatterns.forEach(pattern => {
      if (pattern.test(storageCode)) {
        throw new Error(`❌ 發現禁止用途的 storage key：${pattern}`);
      }
    });

    console.log('  ✓ 無業務決策類 storage key');
  }

  auditUsagePatterns() {
    console.log('【localStorage 使用模式審查】');

    const filesToCheck = [
      'lib/storage.ts',
      'app/growth-center/page.tsx',
      'app/numerology/page.tsx',
      'app/match/page.tsx',
      'app/insight/page.tsx',
      'app/beast-game/battlefield/page.tsx',
    ];

    const forbiddenPatterns = [
      // 業務決策模式
      { regex: /if\s*\([^)]*localStorage.*then\s*process/i, msg: '不應基於 localStorage 決定業務邏輯' },
      { regex: /(?:isVerified|isPaid|needsUpgrade).*=.*localStorage/i, msg: '不應用 localStorage 標記認證狀態' },
      { regex: /\.then\(.*=>.*?localStorage.*?return\s*result/, msg: '不應在異步流程中通過 localStorage 傳遞決策' },

      // 緩存敏感資料
      { regex: /localStorage.*set.*password|localStorage.*set.*token/i, msg: '禁止在 localStorage 中存儲密碼或令牌' },
    ];

    filesToCheck.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) return;

      const code = fs.readFileSync(fullPath, 'utf-8');

      forbiddenPatterns.forEach(({ regex, msg }) => {
        if (regex.test(code)) {
          throw new Error(`❌ ${filePath}: ${msg}`);
        }
      });
    });

    console.log('  ✓ 無業務決策類使用模式');
    console.log('  ✓ 無敏感資料存儲');
  }
}

// 執行審查
new LocalStorageAudit().runAll();
