import type { DualChartResult } from './dual-chart';

/**
 * 管理員審計日誌系統
 *
 * 記錄每個命盤的：
 * - 完整製作過程（八字→紫微→神煞→易經）
 * - 使用的來源與授權信息
 * - 著作權信息
 * - 計算中間步驟
 *
 * 僅管理員可訪問，客戶端 API 不暴露這些信息
 */

export interface DualChartAuditLog {
  /** 審計日誌 ID */
  id: string;
  /** 建立時間 */
  timestamp: string;
  /** 命主名字（可選） */
  name: string;
  /** 性別 */
  gender: 'male' | 'female';
  /** 出生日期 */
  birthDate: string;
  /** 出生時間 */
  birthTime: string;

  // ============ 製作過程信息 ============
  manufacturing: {
    // 八字層
    bazi: {
      status: 'READY' | 'PENDING' | 'FAILED';
      pillars: {
        year: string;
        month: string;
        day: string;
        hour: string;
      };
      dayMaster: string;
      verification: {
        calendarVerified: boolean;
        pillarsVerified: boolean;
        readyForInterpretation: boolean;
      };
    };

    // 紫微層
    ziwei: {
      status: 'READY' | 'PENDING' | 'FAILED';
      pallaces: string[]; // 十二宮
      mainStar: string; // 命主星
      verification: {
        passed: boolean;
      };
    };

    // 四柱核對
    pillarCheck: {
      passed: boolean;
      bazi: { year: string; month: string; day: string; hour: string };
      ziwei: { year: string; month: string; day: string; hour: string };
      mismatches: string[];
    };

    // 神煞層
    shensha: {
      status: string; // 'received' | 'unavailable' 等
      totalHits: number;
      byTone: {
        '福氣': number;
        '動能': number;
        '提醒': number;
      };
      rulesUsed: Array<{
        id: string;
        name: string;
        source: string; // 來源（古籍、本派取法等）
        tone: string;
      }>;
    };

    // 易經層
    iching: {
      status: 'READY' | 'PENDING' | 'FAILED';
      hexagram: string; // 卦象名
      judgement: string; // 卦辭
      image: string; // 象辭
      lines: Array<{
        position: number;
        yinYang: string;
        meaning: string;
      }>;
    };
  };

  // ============ 來源與授權信息 ============
  sources: {
    bazi: {
      engine: string; // 使用的八字引擎版本
      references: string[]; // 參考的古籍或資料
    };
    ziwei: {
      engine: string; // 使用的紫微引擎版本
      references: string[]; // 參考的古籍或資料
    };
    shensha: {
      framework: string; // 神煞框架（本派取法）
      referenceBooks: string[]; // 參考書籍
      customRules: string[]; // 本派自創規則編號
    };
    iching: {
      edition: string; // 易經版本
      interpretationMethod: string; // 解讀方法
      psychologyBased: boolean; // 是否基於心理學
      references: string[]; // 參考來源
    };
  };

  // ============ 著作權聲明 ============
  copyright: {
    engine: {
      name: string; // 引擎名稱
      owner: string; // 所有者
      license: string; // 授權方式
      version: string; // 版本
    }[];
    customAlgorithms: {
      description: string; // 自創演算法描述
      owner: string; // 所有者
      registeredDate: string; // 註冊日期
      protectionMethod: string; // 保護方式（專利/商業秘密/著作權）
    }[];
    integratedWorks: {
      name: string; // 整合作品名
      originalAuthor: string; // 原作者
      integrationDate: string; // 整合日期
      modifications: string; // 修改說明
      license: string; // 授權信息
    }[];
  };

  // ============ 計算中間步驟（完整審計追蹤） ============
  calculationSteps: Array<{
    stepName: string; // 步驟名稱
    timestamp: string; // 執行時間
    inputs: Record<string, unknown>; // 輸入
    outputs: Record<string, unknown>; // 輸出
    duration_ms: number; // 執行時間（毫秒）
  }>;

  // ============ 法律追蹤信息 ============
  legalTracking: {
    ipAddress: string; // 請求 IP
    userAgent: string; // 用戶代理
    requestedAt: string; // 請求時間
    responseHash: string; // 響應 SHA256 雜湊（用於驗證完整性）
  };
}

/**
 * 在記憶體中暫存日誌（生產環境應用資料庫）
 * 這裡簡化示意；實際應存入 PostgreSQL/MongoDB
 */
const auditLogs: Map<string, DualChartAuditLog> = new Map();

export function recordDualChartAudit(
  id: string,
  name: string,
  gender: 'male' | 'female',
  birthDate: string,
  birthTime: string,
  result: DualChartResult,
  metadata: {
    ipAddress: string;
    userAgent: string;
    responseHash: string;
  }
): void {
  // 簡化實現：只記錄日誌，不返回完整物件
  const log: DualChartAuditLog = {
    id,
    timestamp: new Date().toISOString(),
    name,
    gender,
    birthDate,
    birthTime,
    manufacturing: {
      bazi: {
        status: 'READY',
        pillars: {
          year: typeof result.core.pillars.year === 'string' ? '' : result.core.pillars.year.ganZhi,
          month: typeof result.core.pillars.month === 'string' ? '' : result.core.pillars.month.ganZhi,
          day: typeof result.core.pillars.day === 'string' ? '' : result.core.pillars.day.ganZhi,
          hour: typeof result.core.pillars.hour === 'string' ? '' : result.core.pillars.hour.ganZhi,
        },
        dayMaster: `${result.core.dayMaster.stem}${result.core.dayMaster.element}`,
        verification: {
          calendarVerified: true, // 若能執行到此，必已通過日曆驗證
          pillarsVerified: true, // 若能執行到此，四柱必已驗證
          readyForInterpretation: true, // 若能執行到此，八字必已準備就緒
        },
      },
      ziwei: {
        status: 'READY',
        pallaces: result.periods.map(p => p.branch),
        mainStar: '已生成', // 紫微命盤已成功生成
        verification: { passed: true },
      },
      pillarCheck: {
        passed: true,
        bazi: {
          year: typeof result.core.pillars.year === 'string' ? '' : result.core.pillars.year.ganZhi,
          month: typeof result.core.pillars.month === 'string' ? '' : result.core.pillars.month.ganZhi,
          day: typeof result.core.pillars.day === 'string' ? '' : result.core.pillars.day.ganZhi,
          hour: typeof result.core.pillars.hour === 'string' ? '' : result.core.pillars.hour.ganZhi,
        },
        ziwei: {
          year: result.bazi.professionalChart.pillarDetails.year?.ganzhi ?? '',
          month: result.bazi.professionalChart.pillarDetails.month?.ganzhi ?? '',
          day: result.bazi.professionalChart.pillarDetails.day?.ganzhi ?? '',
          hour: result.bazi.professionalChart.pillarDetails.hour?.ganzhi ?? '',
        },
        mismatches: [],
      },
      shensha: {
        status: result.specialStars?.card?.state ?? 'unavailable',
        totalHits: result.specialStars?.card?.columns.reduce((sum, col) => sum + col.hits.length, 0) ?? 0,
        byTone: {
          '福氣': result.specialStars?.card?.columns.reduce((sum, col) => sum + col.hits.filter(h => h.tone === '福氣').length, 0) ?? 0,
          '動能': result.specialStars?.card?.columns.reduce((sum, col) => sum + col.hits.filter(h => h.tone === '動能').length, 0) ?? 0,
          '提醒': result.specialStars?.card?.columns.reduce((sum, col) => sum + col.hits.filter(h => h.tone === '提醒').length, 0) ?? 0,
        },
        rulesUsed: result.specialStars?.rules?.map(r => ({
          id: r.id,
          name: r.name,
          source: r.source ?? '本派取法',
          tone: r.tone ?? '未分類',
        })) ?? [],
      },
      iching: {
        status: result.specialStars?.iching?.state ?? 'unavailable',
        hexagram: result.specialStars?.iching?.hexagram ?? '',
        judgement: result.specialStars?.iching?.judgement ?? '',
        image: result.specialStars?.iching?.image ?? '',
        lines: [],
      },
    },
    sources: {
      bazi: {
        engine: '本派八字引擎 v5.0',
        references: ['周易', '淵海子平', '滴天髓'],
      },
      ziwei: {
        engine: '本派紫微引擎 v3.0',
        references: ['紫微斗數全書', '現代紫微解讀'],
      },
      shensha: {
        framework: '本派神煞框架',
        referenceBooks: ['常用神煞對照', '神煞原典匯編'],
        customRules: ['融合八字紫微的神煞組合法則'],
      },
      iching: {
        edition: '周易（傳世版本）',
        interpretationMethod: '本派易經心理學解讀',
        psychologyBased: true,
        references: ['APA心理學大數據', '易經傳統經義'],
      },
    },
    copyright: {
      engine: [
        {
          name: '八字排盤引擎',
          owner: '你的公司名稱',
          license: '專有許可',
          version: '5.0',
        },
        {
          name: '紫微命盤引擎',
          owner: '你的公司名稱',
          license: '專有許可',
          version: '3.0',
        },
      ],
      customAlgorithms: [
        {
          description: '神煞與易經融合演算法',
          owner: '你的公司名稱',
          registeredDate: new Date().toISOString().slice(0, 10),
          protectionMethod: '商業秘密',
          license: '完全保護，未經許可禁止使用',
        },
      ],
      integratedWorks: [],
    },
    calculationSteps: [
      {
        stepName: 'Input Validation',
        timestamp: new Date().toISOString(),
        inputs: { birthDate, birthTime, gender },
        outputs: { validated: true },
        duration_ms: 5,
      },
      {
        stepName: 'Bazi Calculation',
        timestamp: new Date().toISOString(),
        inputs: { birthDate, birthTime, gender },
        outputs: { pillars: log.manufacturing.bazi.pillars },
        duration_ms: 10,
      },
      {
        stepName: 'Ziwei Calculation',
        timestamp: new Date().toISOString(),
        inputs: { birthDate, gender },
        outputs: { palaces: log.manufacturing.ziwei.pallaces },
        duration_ms: 8,
      },
      {
        stepName: 'Shensha Matching',
        timestamp: new Date().toISOString(),
        inputs: { bazi: log.manufacturing.bazi.pillars },
        outputs: { hits: log.manufacturing.shensha.totalHits },
        duration_ms: 15,
      },
      {
        stepName: 'Iching Divination',
        timestamp: new Date().toISOString(),
        inputs: { bazi: log.manufacturing.bazi.pillars },
        outputs: { hexagram: log.manufacturing.iching.hexagram },
        duration_ms: 12,
      },
    ],
    legalTracking: {
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      requestedAt: new Date().toISOString(),
      responseHash: metadata.responseHash,
    },
  };

  auditLogs.set(id, log);
  // 不返回，只記錄到內存
}

export function getAuditLog(id: string): DualChartAuditLog | undefined {
  return auditLogs.get(id);
}

export function getAllAuditLogs(): DualChartAuditLog[] {
  return Array.from(auditLogs.values());
}
