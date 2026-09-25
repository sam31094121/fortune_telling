/**
 * 傳統八字輸出守門
 * ============================================================================
 *
 * `createBaziCore()` 的 `readyForInterpretation` 只證明曆法、四柱、十神與
 * 大運等計算欄位通過工程驗證；它不等於格局、旺衰、五神或神煞已通過
 * 古籍來源治理。這裡把兩件事永久拆開，避免未核准的解釋被前端或 AI
 * 當成「正統定論」。
 *
 * 狀態必須由來源登記重新計算，不信任 JSON 內手填的 status。
 */
import baziRegistry from '../docs/技能戰鬥檔案/八字/來源登記.json';
import { evaluateClaim, indexSources, type GateStatus, type SourceRegistry } from './iching-source-gate';

export const BAZI_TRADITIONAL_GATE_VERSION = 'BAZI_TRADITIONAL_OUTPUT_V1' as const;

export const BAZI_WITHHELD_INTERPRETATION_FIELDS = [
  '旺衰定論',
  '格局定論',
  '用神',
  '喜神',
  '忌神',
  '補強排序',
  '老師解讀',
] as const;

export interface BaziTraditionalOutputGate {
  version: typeof BAZI_TRADITIONAL_GATE_VERSION;
  coreStatus: GateStatus;
  classicsStatus: GateStatus;
  fiveGodsStatus: GateStatus;
  shenShaStatus: GateStatus;
  coreReady: boolean;
  interpretationReady: boolean;
  shenShaReady: boolean;
  withheldFields: readonly string[];
  reasons: readonly string[];
  customerMessage: string;
}

const registry = baziRegistry as unknown as SourceRegistry;
const sourceIndex = indexSources(registry);
const evaluatedClaims = new Map(
  registry.claims.map((claim) => [claim.claim_id, evaluateClaim(claim, sourceIndex)] as const),
);

function statusOf(claimId: string): GateStatus {
  return evaluatedClaims.get(claimId)?.status ?? 'PENDING_POOL';
}

export function getBaziTraditionalOutputGate(coreVerified: boolean): BaziTraditionalOutputGate {
  const coreStatus = statusOf('C-BAZI-CHART');
  const classicsStatus = statusOf('C-BAZI-CLASSICS');
  const fiveGodsStatus = statusOf('C-BAZI-FIVE-GODS');
  const shenShaStatus = statusOf('C-RED-LUAN-SHENSHA');
  const coreReady = coreVerified && coreStatus === 'VERIFIED';
  const interpretationReady = coreReady && classicsStatus === 'VERIFIED' && fiveGodsStatus === 'VERIFIED';
  const shenShaReady = coreReady && shenShaStatus === 'VERIFIED';
  const reasons: string[] = [];

  if (!coreVerified) reasons.push('基礎命盤工程驗證未通過');
  if (coreStatus !== 'VERIFIED') reasons.push('四柱排盤來源閘門未通過');
  if (classicsStatus !== 'VERIFIED') reasons.push('格局、旺衰與斷語的古籍來源仍有衝突');
  if (fiveGodsStatus !== 'VERIFIED') reasons.push('用神、喜神、忌神取法仍有流派衝突');
  if (shenShaStatus !== 'VERIFIED') reasons.push('神煞規則尚未通過完整來源驗證');

  return {
    version: BAZI_TRADITIONAL_GATE_VERSION,
    coreStatus,
    classicsStatus,
    fiveGodsStatus,
    shenShaStatus,
    coreReady,
    interpretationReady,
    shenShaReady,
    withheldFields: interpretationReady ? [] : BAZI_WITHHELD_INTERPRETATION_FIELDS,
    reasons,
    customerMessage: interpretationReady
      ? '傳統八字解釋已通過來源與規則校驗。'
      : '基礎八字命盤已核對；格局、旺衰、喜用與補強結論尚未通過統一傳統規則校驗，本次不作定論。',
  };
}
