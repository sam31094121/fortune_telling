/**
 * 管理員審計日誌系統（簡化版）
 *
 * 記錄每個命盤的完整製作過程（僅管理員後台可見）
 * - 製作流程
 * - 使用的來源與授權
 * - 著作權信息
 * - 法律追蹤信息
 */

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  name: string;
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';

  // 製作過程摘要
  bazi: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };

  // 來源與授權
  sources: {
    bazi: string[];
    ziwei: string[];
    shensha: string;
    iching: string;
  };

  // 著作權
  copyright: {
    owner: string;
    protection: 'patent' | 'trade-secret' | 'copyright';
  };

  // 法律追蹤
  ipAddress: string;
  userAgent: string;
  responseHash: string;
}

/**
 * 內存日誌存儲（生產環境應用數據庫）
 */
const auditLogs: Map<string, AdminAuditEntry> = new Map();

/**
 * 記錄命盤製作日誌
 *
 * 參數：
 * - id: 日誌唯一 ID
 * - name: 命主名字
 * - gender: 性別
 * - birthDate: 出生日期 (YYYY-MM-DD)
 * - birthTime: 出生時間 (HH:mm)
 * - pillars: 四柱 { year, month, day, hour }
 * - metadata: IP、User-Agent、響應雜湊
 */
export function recordDualChartAudit(
  id: string,
  name: string,
  gender: 'male' | 'female',
  birthDate: string,
  birthTime: string,
  pillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  metadata: {
    ipAddress: string;
    userAgent: string;
    responseHash: string;
  }
): void {
  const entry: AdminAuditEntry = {
    id,
    timestamp: new Date().toISOString(),
    name,
    birthDate,
    birthTime,
    gender,
    bazi: pillars,
    sources: {
      bazi: ['周易', '淵海子平', '滴天髓'],
      ziwei: ['紫微斗數全書', '現代紫微解讀'],
      shensha: '本派神煞框架（融合八字紫微易經）',
      iching: '周易傳世版本 + 本派易經心理學解讀',
    },
    copyright: {
      owner: '太極命理系統',
      protection: 'trade-secret', // 商業秘密保護
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    responseHash: metadata.responseHash,
  };

  auditLogs.set(id, entry);
  // 日誌記錄成功
}

/**
 * 查詢單個日誌
 */
export function getAuditLog(id: string): AdminAuditEntry | undefined {
  return auditLogs.get(id);
}

/**
 * 查詢所有日誌
 */
export function getAllAuditLogs(): AdminAuditEntry[] {
  return Array.from(auditLogs.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * 清除舊日誌（可選：定期清理）
 */
export function pruneOldLogs(days: number = 90): number {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let removed = 0;

  for (const [id, entry] of auditLogs.entries()) {
    if (new Date(entry.timestamp) < cutoff) {
      auditLogs.delete(id);
      removed++;
    }
  }

  return removed;
}
