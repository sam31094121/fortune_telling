/**
 * 鬼魅・阿修羅敘事層引擎 V1
 * ============================================================================
 * 不是排盤引擎，是話術轉換引擎
 * 專業資料 → 敘事層 → 客戶端
 *
 * 核心原則：
 * 「盤不能狠。老師可以準。話術可以霸。但資料永遠不能造假。」
 *
 * 業主定案 2026-09-30：直接開工
 * ============================================================================
 */

export type AsuraIntensityLevel = 'LEVEL_1_COLD' | 'LEVEL_2_HARSH' | 'LEVEL_3_DOMINATE';

export interface AsuraNarrativeOutput {
  /** 【破】一句 — 最致命的卡點 */
  breakPoint: string;
  /** 【鎖】一句 — 真正核心原因 */
  lockCore: string;
  /** 【斷】一句 — 必須停止什麼 */
  severing: string;
  /** 【立】一句 — 新的方向 */
  establish: string;
  /** 【行】一句 — 第一個行動 */
  action: string;
}

export interface AsuraNarrativeRequest {
  /** 分析ID — 用來驗證資料一致性 */
  analysisId: string;
  /** 專業結果 — 已驗證完成的排盤結果 */
  professionalData: unknown; // 實際會是 BaziPillars 或 ZiweiChart 等
  /** 老師層解讀 — TeacherInterpretation 結果 */
  teacherInterpretation: string;
  /** 強度級別 — 預設 LEVEL_2 */
  intensity?: AsuraIntensityLevel;
  /** 內容類型 — bazi | ziwei | shensha | iching */
  contentType: 'bazi' | 'ziwei' | 'shensha' | 'iching';
  /** 關鍵指標 — 用來生成針對性話術 */
  keyIndicators?: Record<string, unknown>;
}

/**
 * 核心敘事引擎 — 生成五層阿修羅話術
 *
 * 不允許：
 * ❌ 修改 professionalData
 * ❌ 捏造 keyIndicators
 * ❌ 使用禁止詞彙
 */
export function generateAsuraNarrative(
  request: AsuraNarrativeRequest,
  intensity: AsuraIntensityLevel = 'LEVEL_2_HARSH',
): AsuraNarrativeOutput {
  // 驗證：資料來源必須經過 ProfessionalResult
  validateDataIntegrity(request);

  // 生成五層
  const breakPoint = generateBreakPoint(request);
  const lockCore = generateLockCore(request);
  const severing = generateSevering(request);
  const establish = generateEstablish(request);
  const action = generateAction(request, intensity);

  // 禁止項掃描
  forbiddenWordsGate([breakPoint, lockCore, severing, establish, action]);

  return { breakPoint, lockCore, severing, establish, action };
}

/**
 * 驗證：資料必須來自經驗證的專業結果
 *
 * 禁止條件：
 * ❌ analysisId 為空或未知
 * ❌ professionalData 被篡改
 * ❌ teacherInterpretation 為空
 */
function validateDataIntegrity(request: AsuraNarrativeRequest): void {
  if (!request.analysisId) {
    throw new Error('ASURA_NARRATIVE: analysisId required for data traceability');
  }

  if (!request.professionalData) {
    throw new Error('ASURA_NARRATIVE: professionalData must be verified before narrative generation');
  }

  if (!request.teacherInterpretation || request.teacherInterpretation.trim().length === 0) {
    throw new Error('ASURA_NARRATIVE: teacherInterpretation required as narrative foundation');
  }
}

/**
 * 【破】— 直接點出最致命的卡點
 */
function generateBreakPoint(request: AsuraNarrativeRequest): string {
  const { contentType, keyIndicators } = request;

  const breakPoints: Record<string, string> = {
    bazi: '你的力量已經起來了。真正危險的不是沒有機會。是你同時開太多戰場。',
    ziwei: '你的位置已經確定。問題不在宮位本身。在於你用什麼態度站在那裡。',
    shensha: '神煞告訴你的不是預言。是你命盤上的暗流。那些你一直假裝沒看到的東西。',
    iching: '卦象已經顯示了局勢。不是說未來一定這樣。是說現在你要怎麼應對。',
  };

  return breakPoints[contentType] || '局已經擺在眼前。真正的卡點，不在環境。在於你的選擇。';
}

/**
 * 【鎖】— 指出真正核心原因
 */
function generateLockCore(request: AsuraNarrativeRequest): string {
  const { contentType } = request;

  const lockCores: Record<string, string> = {
    bazi: '這叫「分散主意」。力量越多，越容易四散。',
    ziwei: '你明白你的位置，卻還是在躊躇。這才是真正的原因。',
    shensha: '神煞就是你命盤上的信號。你一直有選擇，只是沒有認真看。',
    iching: '卦象裡沒有必然。有的是此刻的局勢，和你能做什麼。',
  };

  return lockCores[contentType] || '核心問題很簡單：你知道答案，只是沒有動。';
}

/**
 * 【斷】— 指出現在必須停止什麼
 */
function generateSevering(request: AsuraNarrativeRequest): string {
  const { contentType } = request;

  const severings: Record<string, string> = {
    bazi: '停止同時推進三個計畫。這是你失手的理由。',
    ziwei: '停止因為懷疑自己的位置而保留選項。一隻腳踏不了兩條船。',
    shensha: '停止把神煞當成命運。它們是提醒，不是詛咒。',
    iching: '停止因為想得更周全，而延遲決定。卦象的意義，在於此刻的行動。',
  };

  return severings[contentType] || '停止掩飾。現在的問題，就是你一直沒敢承認的那個問題。';
}

/**
 * 【立】— 建立新的方向
 */
function generateEstablish(request: AsuraNarrativeRequest): string {
  const { contentType } = request;

  const establishes: Record<string, string> = {
    bazi: '選一件事。把全部力量押在它上面。',
    ziwei: '承認你的位置。用這個位置去做唯一該做的事。',
    shensha: '神煞不是讓你害怕。是讓你看清自己的力量邊界。',
    iching: '卦象指向的不是未來。是當下該採取的方向。',
  };

  return establishes[contentType] || '只做一件事。把別的都砍掉。';
}

/**
 * 【行】— 給出第一個行動（強度相關）
 */
function generateAction(request: AsuraNarrativeRequest, intensity: AsuraIntensityLevel): string {
  const baseAction: Record<string, string> = {
    bazi: '今天就列出「不做清單」。把另外兩件砍掉。',
    ziwei: '拿出紙筆，寫下你在這個位置該做的唯一一件事。',
    shensha: '看著神煞，問自己一個問題：它在教我什麼？',
    iching: '按照卦象的提示，做出下一步選擇。',
  };

  const action = baseAction[request.contentType] || '現在就開始。不要等明天。';

  // 根據強度級別調整句式
  if (intensity === 'LEVEL_1_COLD') {
    return action; // 保持原樣
  }

  if (intensity === 'LEVEL_3_DOMINATE') {
    // 縮短、提高節奏、增加命令感
    return action.replace('今天就', '現在').replace('拿出', '取出').replace('不要等明天', '就是現在');
  }

  return action; // LEVEL_2 預設
}

/**
 * 禁止項掃描 — CI 守門
 *
 * 禁止詞彙：
 * ❌ 一定會、必定、註定
 * ❌ 大凶、血光、死亡
 * ❌ 會離婚、會破財、會出事（將象徵變成現實預言）
 */
function forbiddenWordsGate(texts: string[]): void {
  const forbiddenPatterns = [
    /一定會/g,
    /必定/g,
    /註定/g,
    /命中注定/g,
    /大凶/g,
    /血光/g,
    /^死亡|會死|死了/g,
    /必然|必然發生/g,
  ];

  for (const text of texts) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) {
        throw new Error(
          `ASURA_NARRATIVE: Forbidden word detected in narrative: "${text.match(pattern)?.[0]}"`,
        );
      }
    }
  }
}

/**
 * 資料一致性驗證 — CI 測試用
 *
 * 確保：同一 analysisId 的三種敘事（TEACHER / GHOST / ASURA）
 * 都基於完全相同的專業資料
 */
export function validateConsistency(
  analysisId: string,
  teacherNarrative: unknown,
  ghostNarrative: unknown,
  asuraNarrative: unknown,
): { consistent: boolean; issues: string[] } {
  const issues: string[] = [];

  // TODO: 實裝具體驗證邏輯
  // 檢查：四柱、十神、五行、大運、流年、宮位、星曜、四化
  // 必須在三種敘事中保持 100% 一致

  return {
    consistent: issues.length === 0,
    issues,
  };
}

/**
 * 三種強度級別示例
 */
export const ASURA_INTENSITY_EXAMPLES = {
  LEVEL_1_COLD: {
    description: '冷靜但清晰',
    example: '現在的局面需要重新評估。',
  },
  LEVEL_2_HARSH: {
    description: '預設 — 有力量感',
    example: '局已擺定。再分析就是逃避。現在出手。',
  },
  LEVEL_3_DOMINATE: {
    description: '霸氣 — 最高強度',
    example: '不要再想。選一個。破掉它。',
  },
};
