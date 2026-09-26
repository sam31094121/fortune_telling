/**
 * 神煞取法分歧的原典引文（查看依據）。
 * 只從來源登記 claims[].conflicts[].citations 讀出，不在元件內硬寫。
 * BaziChart 以動態 import 在展開「查看依據」時才載入，避免把整份登記 JSON 打進首屏 bundle。
 */
import baziRegistry from '../docs/技能戰鬥檔案/八字/來源登記.json';
import type * as TraditionalGate from './bazi-traditional-gate';

export type ShenShaRuleId = keyof typeof TraditionalGate.BAZI_SHENSHA_CLAIMS;

/** 與 bazi-traditional-gate 的 BAZI_SHENSHA_CLAIMS 同值；satisfies 讓兩邊不一致時 tsc 報錯。 */
const SHENSHA_CLAIM_IDS = {
  tianyi: 'C-BAZI-SHENSHA-TIANYI',
  wenchang: 'C-BAZI-SHENSHA-WENCHANG',
  taohua: 'C-BAZI-SHENSHA-TAOHUA',
  yima: 'C-BAZI-SHENSHA-YIMA',
  huagai: 'C-BAZI-SHENSHA-HUAGAI',
} as const satisfies typeof TraditionalGate.BAZI_SHENSHA_CLAIMS;

export interface ShenShaCitation {
  book: string;
  /** 卷／篇或頁碼、掃描頁定位 */
  locator: string;
  /** 原文照錄 */
  quote: string;
  url: string;
  /** 已核掃描原頁／僅轉錄 等核對程度 */
  verification: string;
}

export interface ShenShaConflictCitationGroup {
  id: ShenShaRuleId;
  topic: string;
  citations: ShenShaCitation[];
}

type RegistryCitation = Partial<Record<keyof ShenShaCitation, unknown>>;
type RegistryClaim = { claim_id?: unknown; conflicts?: Array<{ topic?: unknown; citations?: RegistryCitation[] }> };

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export function getShenShaConflictCitations(ids: readonly string[]): ShenShaConflictCitationGroup[] {
  const claims = (baziRegistry as unknown as { claims?: RegistryClaim[] }).claims ?? [];
  return ids
    .filter((id): id is ShenShaRuleId => Object.prototype.hasOwnProperty.call(SHENSHA_CLAIM_IDS, id))
    .flatMap(id => (claims.find(claim => claim.claim_id === SHENSHA_CLAIM_IDS[id])?.conflicts ?? []).map(conflict => ({
      id,
      topic: text(conflict.topic),
      citations: (conflict.citations ?? [])
        .map(item => ({ book: text(item.book), locator: text(item.locator), quote: text(item.quote), url: text(item.url), verification: text(item.verification) }))
        // 缺書名或原文的條目不顯示，避免出現空白「依據」。
        .filter(item => item.book && item.quote),
    })))
    .filter(group => group.citations.length > 0);
}
