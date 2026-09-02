export type AnalysisModuleId = 'NUMBER' | 'NAMEOLOGY' | 'ZIWEI' | 'BAZI' | 'ZODIAC';
export type AnalysisType = 'number' | 'nameology' | 'insight' | 'bazi' | 'zodiac';

export type AnalysisModuleDefinition = {
  moduleId: AnalysisModuleId;
  analysisType: AnalysisType;
  displayName: string;
  routePath: string;
  loadingCopy: {
    queued: string;
    validating: string;
    processing: string;
    finalizing: string;
  };
};

export const ANALYSIS_MODULES: Record<AnalysisModuleId, AnalysisModuleDefinition> = {
  NUMBER: {
    moduleId: 'NUMBER',
    analysisType: 'number',
    displayName: '\u6578\u5b57\u8ad6\u5409\u51f6',
    routePath: '/numerology',
    loadingCopy: {
      queued: '\u6578\u5b57\u6a21\u7d44\u5df2\u63a5\u6536\uff0c\u6b63\u5728\u5b89\u6392\u7368\u7acb\u904b\u7b97\u3002',
      validating: '\u6b63\u5728\u78ba\u8a8d\u6578\u5b57\u683c\u5f0f\u3002',
      processing: '\u6b63\u5728\u4f9d\u7167\u6578\u5b57\u898f\u5247\u771f\u5be6\u904b\u7b97\u3002',
      finalizing: '\u6b63\u5728\u6574\u7406\u6578\u5b57\u5206\u6790\u7d50\u679c\u3002',
    },
  },
  NAMEOLOGY: {
    moduleId: 'NAMEOLOGY',
    analysisType: 'nameology',
    displayName: 'AI \u59d3\u540d\u5b78',
    routePath: '/nameology',
    loadingCopy: {
      queued: '\u59d3\u540d\u5b78\u6a21\u7d44\u5df2\u63a5\u6536\uff0c\u6b63\u5728\u5b89\u6392\u7368\u7acb\u904b\u7b97\u3002',
      validating: '\u6b63\u5728\u78ba\u8a8d\u59d3\u540d\u5b78\u8cc7\u6599\u3002',
      processing: '\u6b63\u5728\u904b\u7b97\u59d3\u540d\u7b46\u756b\u3001\u4e94\u683c\u8207\u6027\u60c5\u77e9\u9663\u3002',
      finalizing: '\u6b63\u5728\u6574\u7406\u59d3\u540d\u5b78\u7368\u7acb\u7d50\u679c\u3002',
    },
  },
  ZIWEI: {
    moduleId: 'ZIWEI',
    analysisType: 'insight',
    displayName: 'AI \u7d2b\u5fae\u6597\u6578',
    routePath: '/insight',
    loadingCopy: {
      queued: '\u7d2b\u5fae\u6597\u6578\u6a21\u7d44\u5df2\u63a5\u6536\uff0c\u6b63\u5728\u5b89\u6392\u7368\u7acb\u904b\u7b97\u3002',
      validating: '\u6b63\u5728\u78ba\u8a8d\u7d2b\u5fae\u5206\u6790\u8cc7\u6599\u3002',
      processing: '\u6b63\u5728\u4f9d\u7d2b\u5fae\u6a21\u7d44\u904b\u7b97\u547d\u76e4\u3001\u4e09\u65b9\u56db\u6b63\u8207\u4eca\u5e74\u904b\u52e2\u3002',
      finalizing: '\u6b63\u5728\u6574\u7406\u7d2b\u5fae\u6597\u6578\u7368\u7acb\u7d50\u679c\u3002',
    },
  },
  BAZI: {
    moduleId: 'BAZI',
    analysisType: 'bazi',
    displayName: '易經八字命盤',
    routePath: '/bazi',
    loadingCopy: {
      queued: '\u516b\u5b57\u6a21\u7d44\u5df2\u63a5\u6536\uff0c\u6b63\u5728\u5b89\u6392\u7368\u7acb\u904b\u7b97\u3002',
      validating: '\u6b63\u5728\u78ba\u8a8d\u51fa\u751f\u5e74\u6708\u65e5\u3001\u6642\u9593\u8207\u6027\u5225\u3002',
      processing: '\u6b63\u5728\u6392\u958b\u516b\u5b57\u56db\u67f1\u3001\u5929\u5e72\u5730\u652f\u8207\u65e5\u4e3b\u5f37\u5f31\u3002',
      finalizing: '正在整理八字命盤摘要與 易經白話說明。',
    },
  },
  ZODIAC: {
    moduleId: 'ZODIAC',
    analysisType: 'zodiac',
    displayName: '易經西洋星座',
    routePath: '/zodiac',
    loadingCopy: {
      queued: '西洋星座模組已接收，正在安排獨立運算。',
      validating: '正在確認出生年月日。',
      processing: '正在判定十二星座並整理人格特質。',
      finalizing: '正在整理西洋星座獨立分析結果。',
    },
  },
};

export const SUPPORTED_ANALYSIS_TYPES = Object.values(ANALYSIS_MODULES).map((module) => module.analysisType);

export function getModuleByAnalysisType(analysisType: AnalysisType) {
  return Object.values(ANALYSIS_MODULES).find((module) => module.analysisType === analysisType) ?? null;
}

export function normalizeAnalysisType(value: unknown): AnalysisType | null {
  return typeof value === 'string' && SUPPORTED_ANALYSIS_TYPES.includes(value as AnalysisType) ? value as AnalysisType : null;
}

export function moduleIdForAnalysisType(analysisType: AnalysisType): AnalysisModuleId {
  const analysisModule = getModuleByAnalysisType(analysisType);
  if (!analysisModule) throw new Error('\u672a\u8a3b\u518a\u7684\u5206\u6790\u6a21\u7d44\u3002');
  return analysisModule.moduleId;
}
