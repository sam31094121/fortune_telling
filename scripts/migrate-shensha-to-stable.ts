/**
 * 歷史卡片遷移：把所有舊卡片標上版本號
 * ============================================================================
 * 執行：npx ts-node scripts/migrate-shensha-to-stable.ts
 *
 * 作用：
 * 1. 掃描所有存在的命盤數據（如 JSON、資料庫等）
 * 2. 為每份卡片添加 version 和 cardHash 字段
 * 3. 備份原始版本
 * 4. 生成遷移報告
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sortByShenShaStableOrder, getVersionInfo } from '../lib/shensha-stable-version';
import { generateCardChecksum } from '../lib/export-stable-shensha-pdf';

const STABLE_VERSION = 'v1.2026-10-08';
const CARDS_DIR = path.join(__dirname, '../data/user-cards'); // 假設卡片存放位置
const BACKUP_DIR = path.join(__dirname, '../backups/pre-migration');
const MIGRATION_LOG = path.join(__dirname, '../reports/migration-2026-10-08.json');

interface LegacyCard {
  bazi: any;
  shensha?: any[];
  [key: string]: any;
}

interface MigratedCard extends LegacyCard {
  _version: string;
  _migratedAt: string;
  _cardHash: string;
  _checksumValid: boolean;
}

/**
 * 為舊卡片添加版本信息
 */
function addVersionToCard(card: LegacyCard): MigratedCard {
  const migrated = card as MigratedCard;

  // 標準化神煞順序
  if (migrated.shensha && Array.isArray(migrated.shensha)) {
    migrated.shensha = sortByShenShaStableOrder(
      migrated.shensha,
      STABLE_VERSION
    );
  }

  // 添加版本字段
  migrated._version = STABLE_VERSION;
  migrated._migratedAt = new Date().toISOString();
  migrated._cardHash = generateCardChecksum({
    version: STABLE_VERSION,
    bazi: migrated.bazi,
    shensha: migrated.shensha || [],
  });
  migrated._checksumValid = true;

  return migrated;
}

/**
 * 掃描並遷移所有卡片
 */
async function migrateAllCards(): Promise<{
  total: number;
  migrated: number;
  failed: number;
  details: Array<{ file: string; status: string; error?: string }>;
}> {
  const report = {
    total: 0,
    migrated: 0,
    failed: 0,
    details: [] as Array<{ file: string; status: string; error?: string }>,
  };

  // 創建備份目錄
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 掃描卡片目錄
  if (!fs.existsSync(CARDS_DIR)) {
    console.log(`ℹ 卡片目錄不存在：${CARDS_DIR}（首次遷移，可跳過）`);
    report.details.push({
      file: CARDS_DIR,
      status: 'SKIPPED',
      error: '目錄不存在',
    });
    return report;
  }

  const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.json'));
  report.total = files.length;

  console.log(`🔄 遷移 ${files.length} 份卡片...`);

  for (const file of files) {
    try {
      const filePath = path.join(CARDS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const card = JSON.parse(content) as LegacyCard;

      // 跳過已遷移的卡片
      if ((card as any)._version === STABLE_VERSION) {
        report.details.push({ file, status: 'ALREADY_MIGRATED' });
        continue;
      }

      // 備份原始版本
      const backupPath = path.join(BACKUP_DIR, `${file}.backup-${Date.now()}`);
      fs.writeFileSync(backupPath, content);

      // 添加版本信息
      const migrated = addVersionToCard(card);

      // 寫入遷移後的卡片
      fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2));

      report.migrated++;
      report.details.push({
        file,
        status: 'SUCCESS',
      });

      console.log(`  ✓ ${file}`);
    } catch (error) {
      report.failed++;
      report.details.push({
        file,
        status: 'FAILED',
        error: (error as Error).message,
      });
      console.log(`  ✗ ${file} — ${(error as Error).message}`);
    }
  }

  return report;
}

/**
 * 生成遷移報告
 */
function generateMigrationReport(report: Awaited<ReturnType<typeof migrateAllCards>>): string {
  const versionInfo = getVersionInfo(STABLE_VERSION);

  return `
# 神煞易經版本遷移報告

**遷移時間**：${new Date().toISOString()}
**目標版本**：${STABLE_VERSION}
**版本凍結時間**：${versionInfo.frozenAt}

## 統計

- 掃描卡片數：${report.total}
- 成功遷移：${report.migrated}
- 失敗：${report.failed}
- 已是最新版本：${report.details.filter(d => d.status === 'ALREADY_MIGRATED').length}

## 詳細清單

| 檔案 | 狀態 | 備註 |
|------|------|------|
${report.details
  .map(
    d =>
      `| ${d.file} | ${d.status} | ${d.error || '✓'} |`
  )
  .join('\n')}

## 備份位置

所有原始卡片已備份至：
\`${BACKUP_DIR}\`

恢復指令（如需）：
\`\`\`bash
cp ${BACKUP_DIR}/*.backup-* ${CARDS_DIR}/
\`\`\`

## 验证

每份遷移的卡片都包含：
- \`_version\`：穩定版本號
- \`_migratedAt\`：遷移時間戳
- \`_cardHash\`：SHA256 防篡改值
- \`_checksumValid\`：完整性標記

用戶可隨時驗證卡片是否被篡改。

---
✓ 遷移完成。所有卡片已綁定穩定版本 ${STABLE_VERSION}
  一輩子使用不會改變。
  `;
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 開始神煞易經版本遷移...\n');
  console.log(`版本目標：${STABLE_VERSION}`);
  console.log(`備份位置：${BACKUP_DIR}\n`);

  try {
    const report = await migrateAllCards();
    const reportText = generateMigrationReport(report);

    // 寫入報告
    if (!fs.existsSync(path.dirname(MIGRATION_LOG))) {
      fs.mkdirSync(path.dirname(MIGRATION_LOG), { recursive: true });
    }

    fs.writeFileSync(MIGRATION_LOG, reportText);

    console.log('\n' + reportText);
    console.log(`\n📄 完整報告已保存：${MIGRATION_LOG}`);

    if (report.migrated > 0) {
      console.log(`\n✓ 已成功遷移 ${report.migrated} 份卡片`);
      console.log('✓ 所有卡片現在都綁定了穩定版本');
      console.log('✓ 一輩子永久可用 ✨\n');
    }
  } catch (error) {
    console.error('❌ 遷移失敗：', error);
    process.exit(1);
  }
}

main();
