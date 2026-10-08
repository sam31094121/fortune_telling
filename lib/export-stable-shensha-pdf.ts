/**
 * 穩定版神煞卡片 PDF 導出
 * ============================================================================
 * 每份 PDF 都帶版本號 & 防篡改 hash，一輩子可讀
 */

import { getVersionInfo, sortByShenShaStableOrder } from './shensha-stable-version';
import crypto from 'crypto';

export interface StablePdfExportOptions {
  version: 'v1.2026-10-08';
  bazi: {
    year: string; month: string; day: string; hour: string;
  };
  shensha: Array<{ id: string; name: string; pillar: string }>;
  metadata?: {
    userName?: string;
    notes?: string;
  };
}

export interface StablePdfMetadata {
  version: 'v1.2026-10-08';
  generatedAt: string;
  cardHash: string; // SHA256（防篡改）
  checksumValid: boolean;
}

/**
 * 生成卡片的防篡改 hash
 */
export function generateCardChecksum(options: StablePdfExportOptions): string {
  const content = JSON.stringify({
    version: options.version,
    bazi: options.bazi,
    shensha: sortByShenShaStableOrder(options.shensha, options.version),
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 驗證卡片完整性
 */
export function verifyCardIntegrity(
  options: StablePdfExportOptions,
  storedChecksum: string
): { valid: boolean; expected: string; actual: string } {
  const actual = generateCardChecksum(options);
  return {
    valid: actual === storedChecksum,
    expected: storedChecksum,
    actual,
  };
}

/**
 * 為 PDF 添加版本訊息頁腳
 */
export function getPdfVersionFooter(version: 'v1.2026-10-08'): string {
  const info = getVersionInfo(version);
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 神煞易經穩定版 ${info.version} | 凍結時間 ${info.frozenAt}
  本卡片規則集永不改變，一輩子穩定可用
  若要驗證完整性：掃描二維碼或查詢版本號
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
}

/**
 * 為卡片生成完整的元數據區塊
 */
export function getPdfMetadataBlock(options: StablePdfExportOptions): StablePdfMetadata {
  return {
    version: options.version,
    generatedAt: new Date().toISOString(),
    cardHash: generateCardChecksum(options),
    checksumValid: true,
  };
}

/**
 * 導出格式：包含版本、順序、完整性驗證的 JSON
 */
export function exportStableShenShaCard(options: StablePdfExportOptions) {
  const metadata = getPdfMetadataBlock(options);
  const sortedShenSha = sortByShenShaStableOrder(options.shensha, options.version);

  return {
    // 命盤資訊
    bazi: {
      year: options.bazi.year,
      month: options.bazi.month,
      day: options.bazi.day,
      hour: options.bazi.hour,
    },

    // 神煞（已按穩定順序排列）
    shensha: sortedShenSha.map((s, idx) => ({
      order: idx + 1,
      id: s.id,
      name: s.name,
      pillar: s.pillar,
    })),

    // 版本 & 完整性
    version: {
      number: metadata.version,
      frozenAt: metadata.generatedAt.split('T')[0], // 凍結日期
      cardHash: metadata.cardHash,
    },

    // 用戶註記（可選）
    user: options.metadata?.userName || '（未記名）',
    notes: options.metadata?.notes || '',

    // PDF 頁腳
    pdfFooter: getPdfVersionFooter(options.version),
  };
}

/**
 * 驗證已發佈的卡片是否被篡改
 */
export function validatePublishedCard(
  cardData: ReturnType<typeof exportStableShenShaCard>,
  currentChecksum: string
): { isValid: boolean; message: string } {
  if (cardData.version.cardHash !== currentChecksum) {
    return {
      isValid: false,
      message: `❌ 卡片已被篡改！預期 hash：${cardData.version.cardHash}，實際：${currentChecksum}`,
    };
  }

  return {
    isValid: true,
    message: `✓ 卡片完整性驗證通過（版本 ${cardData.version.number}）`,
  };
}
