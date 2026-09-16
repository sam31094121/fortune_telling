/**
 * 公信力話術（後端運算＋交叉比對）
 * ============================================================================
 *
 * 業主定案（2026-09-16）：後端運算、交叉性比對；前端只負責視覺感官。
 *
 * 讀八字、紫微斗數、易經三份來源登記，**用來源閘門重算每一項狀態**（不信任登記表上寫的），
 * 依口令《易經》先後順序組出客戶看得到的公信力句子。句子不得比閘門狀態說得更滿：
 * 只有 VERIFIED 才能說「已通過交叉比對」。
 *
 * 前端只能透過 GET /api/credibility 取結果照印，不得匯入本檔（它會把三份登記表打包進網頁）。
 * 規格：docs/技能戰鬥檔案/易經/公信力話術.md；守門：npm run test:credibility-wording
 */
import baziRegistry from '../docs/技能戰鬥檔案/八字/來源登記.json';
import ziweiRegistry from '../docs/技能戰鬥檔案/紫微斗數/來源登記.json';
import ichingRegistry from '../docs/技能戰鬥檔案/易經/來源登記.json';
import { evaluateClaim, indexSources, type GateStatus, type SourceRegistry } from './iching-source-gate';
import { APPROVED_PHRASES, CORE_ORDER, STATUS_WORDING, type CoreName } from './credibility-phrases';

const REGISTRIES: Record<CoreName, SourceRegistry> = {
  八字: baziRegistry as unknown as SourceRegistry,
  紫微斗數: ziweiRegistry as unknown as SourceRegistry,
  易經: ichingRegistry as unknown as SourceRegistry,
};

export interface ClaimCredibility {
  claimId: string;
  title: string;
  /** 閘門重算的狀態 */
  status: GateStatus;
  /** 客戶看得到的一句話 */
  customerLine: string;
}

export interface CoreCredibility {
  order: number;
  core: CoreName;
  claims: ClaimCredibility[];
  /** 來源總數、A 級來源數（權威性）、登記在案的大數據來源數 */
  sourceCount: number;
  authorityACount: number;
  bigDataSourceCount: number;
}

export interface CredibilityReport {
  generatedAt: string;
  order: readonly CoreName[];
  cores: CoreCredibility[];
  /** 三核心共同的核准說法 */
  phrases: typeof APPROVED_PHRASES;
}

export function coreCredibility(core: CoreName): CoreCredibility {
  const registry = REGISTRIES[core];
  const index = indexSources(registry);
  const claims = registry.claims.map((claim) => {
    const { status } = evaluateClaim(claim, index);
    return { claimId: claim.claim_id, title: claim.title, status, customerLine: `${claim.title}：${STATUS_WORDING[status]}` };
  });
  const bigData = new Set(registry.claims.flatMap((c) => c.big_data_sources));
  return {
    order: CORE_ORDER.indexOf(core) + 1,
    core,
    claims,
    sourceCount: registry.sources.length,
    authorityACount: registry.sources.filter((s) => s.trust === 'A').length,
    bigDataSourceCount: bigData.size,
  };
}

export function credibilityReport(now: Date = new Date()): CredibilityReport {
  return {
    generatedAt: now.toISOString(),
    order: CORE_ORDER,
    cores: CORE_ORDER.map(coreCredibility),
    phrases: APPROVED_PHRASES,
  };
}
