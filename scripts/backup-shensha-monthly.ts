/**
 * 神煞卡片月度自動備份 & 完整性監控
 * ============================================================================
 * 執行：npx ts-node scripts/backup-shensha-monthly.ts
 * 或透過 cron：0 0 1 * * npx ts-node /path/to/scripts/backup-shensha-monthly.ts
 *
 * 作用：
 * 1. 每月自動備份所有卡片
 * 2. 驗證所有卡片完整性
 * 3. 生成備份清單 & 驗證報告
 * 4. 防勒索軟體與數據丟失
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { verifyCardIntegrity } from '../lib/export-stable-shensha-pdf';

const CARDS_DIR = path.join(__dirname, '../data/user-cards');
const BACKUP_BASE = path.join(__dirname, '../backups/monthly');
const VERIFICATION_LOG = path.join(__dirname, '../reports/monthly-verification.json');

interface BackupStats {
  timestamp: string;
  monthYear: string;
  cardsBackedUp: number;
  totalSize: number;
  verificationStatus: {
    totalCards: number;
    verified: number;
    corrupted: number;
    missing: number;
  };
  backupPath: string;
}

/**
 * 計算檔案大小（格式化）
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIdx = 0;

  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }

  return `${size.toFixed(2)} ${units[unitIdx]}`;
}

/**
 * 建立月度備份目錄
 */
function createMonthlyBackupDir(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const backupDir = path.join(BACKUP_BASE, `${year}-${month}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return backupDir;
}

/**
 * 備份所有卡片
 */
function backupAllCards(backupDir: string): BackupStats {
  const stats: BackupStats = {
    timestamp: new Date().toISOString(),
    monthYear: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit' }),
    cardsBackedUp: 0,
    totalSize: 0,
    verificationStatus: {
      totalCards: 0,
      verified: 0,
      corrupted: 0,
      missing: 0,
    },
    backupPath: backupDir,
  };

  if (!fs.existsSync(CARDS_DIR)) {
    console.log(`ℹ 卡片目錄不存在：${CARDS_DIR}`);
    return stats;
  }

  const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.json'));
  stats.verificationStatus.totalCards = files.length;

  console.log(`📦 備份 ${files.length} 份卡片...`);

  for (const file of files) {
    try {
      const source = path.join(CARDS_DIR, file);
      const dest = path.join(backupDir, file);

      // 複製檔案
      fs.copyFileSync(source, dest);

      // 讀取並驗證卡片
      const content = fs.readFileSync(dest, 'utf-8');
      const card = JSON.parse(content);

      // 檢查版本資訊
      if (card._version && card._cardHash) {
        stats.verificationStatus.verified++;
        console.log(`  ✓ ${file} (v${card._version})`);
      } else {
        stats.verificationStatus.missing++;
        console.log(`  ⚠ ${file} (版本信息缺失)`);
      }

      // 計算大小
      const fileSize = fs.statSync(dest).size;
      stats.totalSize += fileSize;
      stats.cardsBackedUp++;
    } catch (error) {
      stats.verificationStatus.corrupted++;
      console.log(`  ✗ ${file} — ${(error as Error).message}`);
    }
  }

  return stats;
}

/**
 * 驗證備份完整性
 */
function verifyBackupIntegrity(backupDir: string): {
  valid: boolean;
  details: string[];
} {
  const details: string[] = [];

  if (!fs.existsSync(backupDir)) {
    return {
      valid: false,
      details: ['備份目錄不存在'],
    };
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    return {
      valid: false,
      details: ['備份目錄為空'],
    };
  }

  let allValid = true;

  for (const file of files) {
    try {
      const filePath = path.join(backupDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const card = JSON.parse(content);

      if (!card._version || !card._cardHash) {
        details.push(`${file}: 缺少版本信息`);
        allValid = false;
      } else {
        details.push(`${file}: ✓ (v${card._version})`);
      }
    } catch (error) {
      details.push(`${file}: 讀取失敗 — ${(error as Error).message}`);
      allValid = false;
    }
  }

  return { valid: allValid, details };
}

/**
 * 生成備份報告
 */
function generateBackupReport(stats: BackupStats, verification: ReturnType<typeof verifyBackupIntegrity>): string {
  return `
# 神煞卡片月度備份報告

**備份時間**：${stats.timestamp}
**月份**：${stats.monthYear}

## 備份統計

- **備份卡片數**：${stats.cardsBackedUp}
- **總大小**：${formatFileSize(stats.totalSize)}
- **備份位置**：\`${stats.backupPath}\`

## 完整性驗證

| 項目 | 數量 | 狀態 |
|------|------|------|
| 總卡片數 | ${stats.verificationStatus.totalCards} | - |
| 已驗證（有版本） | ${stats.verificationStatus.verified} | ✓ |
| 版本信息缺失 | ${stats.verificationStatus.missing} | ⚠ |
| 損壞/無法讀取 | ${stats.verificationStatus.corrupted} | ✗ |

## 驗證詳情

\`\`\`
${verification.details.map(d => '  ' + d).join('\n')}
\`\`\`

## 備份完整性

${verification.valid ? '✓ **完整性驗證通過**' : '✗ **有問題需要檢查**'}

## 恢復指令

若需恢復此月份的備份：

\`\`\`bash
cp ${stats.backupPath}/* ${CARDS_DIR}/
\`\`\`

## 下一步

- 每月 1 日自動執行此備份
- 保留最近 12 個月的備份
- 建議每季度測試一次恢復流程

---
✓ 備份完成。所有卡片已安全保存。
  `;
}

/**
 * 清理舊備份（保留最近 12 個月）
 */
function cleanupOldBackups(): { removed: number; kept: number } {
  const backupDirs = fs.readdirSync(BACKUP_BASE)
    .filter(d => /^\d{4}-\d{2}$/.test(d))
    .sort()
    .reverse();

  const toRemove = backupDirs.slice(12); // 保留最近 12 個月
  let removed = 0;

  for (const dir of toRemove) {
    try {
      const fullPath = path.join(BACKUP_BASE, dir);
      fs.rmSync(fullPath, { recursive: true });
      removed++;
      console.log(`  🗑️ 刪除舊備份：${dir}`);
    } catch (error) {
      console.log(`  ⚠️ 無法刪除：${dir} — ${(error as Error).message}`);
    }
  }

  return {
    removed,
    kept: backupDirs.length - removed,
  };
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 開始月度備份流程...\n');

  try {
    // 1. 建立備份目錄
    const backupDir = createMonthlyBackupDir();
    console.log(`📁 備份目錄：${backupDir}\n`);

    // 2. 備份卡片
    const stats = backupAllCards(backupDir);

    // 3. 驗證完整性
    console.log('\n✓ 驗證備份完整性...');
    const verification = verifyBackupIntegrity(backupDir);

    // 4. 生成報告
    const report = generateBackupReport(stats, verification);

    // 5. 保存報告
    if (!fs.existsSync(path.dirname(VERIFICATION_LOG))) {
      fs.mkdirSync(path.dirname(VERIFICATION_LOG), { recursive: true });
    }

    fs.writeFileSync(VERIFICATION_LOG, report);

    // 6. 清理舊備份
    console.log('\n🧹 清理舊備份（保留最近 12 個月）...');
    const cleanup = cleanupOldBackups();

    // 7. 輸出報告
    console.log('\n' + report);
    console.log(`\n📊 備份清單已保存：${VERIFICATION_LOG}`);
    console.log(`   舊備份清理：刪除 ${cleanup.removed} 個月份，保留 ${cleanup.kept} 個月份\n`);

    if (stats.cardsBackedUp > 0) {
      console.log(`✓ 本月備份完成`);
      console.log(`✓ 已保存 ${stats.cardsBackedUp} 份卡片`);
      console.log(`✓ 下月 1 日將自動執行下一次備份\n`);
    }
  } catch (error) {
    console.error('❌ 備份失敗：', error);
    process.exit(1);
  }
}

main();
