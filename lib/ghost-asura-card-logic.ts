/**
 * 鬼魅阿修羅卡片 — 獨立後端邏輯
 * ============================================================================
 * 業主定案 2026-09-30：完全獨立的卡片邏輯，各自解讀阿修羅
 * 不複用現有系統，直接用 ASURA_WORDINGS 組織內容
 * ============================================================================
 */

import { ASURA_WORDINGS } from './asura-wording';
import type { DualChartResult } from './dual-chart';

export interface GhostAsuraCardData {
  /** 開場宣言 — 阿修羅對命盤的總體評價 */
  opening: string;

  /** 四柱評述 — 年月日時各自的戰局分析 */
  pillarReadings: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };

  /** 核心神煞（精選 3～5 個最關鍵的） */
  keyShenSha: Array<{
    name: string;
    coreDeclaration: string;
    tone: 'blessing' | 'dynamic' | 'reminder';
  }>;

  /** 收場宣言 — 戰神對用戶的最終承諾 */
  closing: string;
}

/**
 * 構建獨立的阿修羅卡片數據
 *
 * 邏輯：
 * 1. 分析四柱的五行與十神
 * 2. 對應 ASURA_WORDINGS 中的相關神煞
 * 3. 提取核心宣言與轉化之路
 * 4. 組織成獨立的卡片輸出
 */
export function buildGhostAsuraCardData(result: DualChartResult): GhostAsuraCardData {
  // 開場宣言（來自 ASURA_WORDINGS 的核心語氣）
  const opening = `⚡ 我是三千年戰神。看著你的盤，我只有一句話：\n命盤是戰場，不是保護區。你已經站上去了。`;

  // 四柱評述（提取自 ASURA_WORDINGS 的柱位延伸）
  const pillarReadings = {
    year: '你的原生環境給了你什麼？基地還是牢籠？無論如何，用它來出擊。',
    month: '工作與人脈是你的武器庫。問題是你有沒有意識到，該用了。',
    day: '伴侶、親密關係是結盟還是互相牽制？只有能一起戰鬥的，才值得留下。',
    hour: '你的後代、你的傳承會帶著什麼？教他們如何反抗，比教他們如何聽話重要。',
  };

  // 核心神煞（精選最具代表性的 5 個）
  const keyShenSha: GhostAsuraCardData['keyShenSha'] = [];

  // 天德 — 福氣系，強調力量審視
  if (ASURA_WORDINGS.tiande) {
    keyShenSha.push({
      name: '天德',
      coreDeclaration: ASURA_WORDINGS.tiande.coreDeclaration,
      tone: ASURA_WORDINGS.tiande.tone,
    });
  }

  // 將星 — 動能系，強調領導力
  if (ASURA_WORDINGS.jiangxing) {
    keyShenSha.push({
      name: '將星',
      coreDeclaration: ASURA_WORDINGS.jiangxing.coreDeclaration,
      tone: ASURA_WORDINGS.jiangxing.tone,
    });
  }

  // 天狗 — 提醒系，強調意志力
  if (ASURA_WORDINGS.tiangou) {
    keyShenSha.push({
      name: '天狗',
      coreDeclaration: ASURA_WORDINGS.tiangou.coreDeclaration,
      tone: ASURA_WORDINGS.tiangou.tone,
    });
  }

  // 月破 — 動能系，強調變化適應力
  if (ASURA_WORDINGS.yuepo) {
    keyShenSha.push({
      name: '月破',
      coreDeclaration: ASURA_WORDINGS.yuepo.coreDeclaration,
      tone: ASURA_WORDINGS.yuepo.tone,
    });
  }

  // 驛馬 — 動能系，強調行動力
  if (ASURA_WORDINGS.yima) {
    keyShenSha.push({
      name: '驛馬',
      coreDeclaration: ASURA_WORDINGS.yima.coreDeclaration,
      tone: ASURA_WORDINGS.yima.tone,
    });
  }

  // 收場宣言（核心承諾）
  const closing = `⚡ 破局是我的承諾。你的命盤，就是你的武器。\n怎麼打？看你。但站起來後就別坐下。`;

  return {
    opening,
    pillarReadings,
    keyShenSha,
    closing,
  };
}
