/**
 * 神獸卡遊戲｜卡片登錄中心（Card Registry）
 * ============================================================================
 *
 * 規格第十七條：卡片放在 cards/，由 CardRegistry 統一讀取。
 * 規格第十八條：每新增一張卡都要通過驗證，有錯就禁止加入正式牌庫。
 *
 * 所以這裡做兩件事：把卡片收起來、把不合格的擋在外面。
 * 「擋在外面」是真的擋——invalid 的卡不會進 registry，
 * 而不是印個警告然後照樣讓它上場。
 */

import { allSkillIds } from '../../cards/skills';
import jiaoMuJiao from '../../cards/beasts/jiao-mu-jiao';
import kangJinLong from '../../cards/beasts/kang-jin-long';
import diTuHe from '../../cards/beasts/di-tu-he';
import fangRiTu from '../../cards/beasts/fang-ri-tu';
import xinYueHu from '../../cards/beasts/xin-yue-hu';
import weiHuoHu from '../../cards/beasts/wei-huo-hu';
import { validateCard, type BeastCard, type CardValidationIssue } from './schema';

/**
 * 第一階段只接 6 張（規格第二十二條）。
 *
 * 核心驗過之前不准一次導入全部——12、24、28 是後面幾批的事。
 * 要加卡就在這個陣列加一行，其他什麼都不用改。
 */
const REGISTERED: BeastCard[] = [
  jiaoMuJiao,
  kangJinLong,
  diTuHe,
  fangRiTu,
  xinYueHu,
  weiHuoHu,
];

export interface RegistryBuildResult {
  cards: BeastCard[];
  rejected: Array<{ card: BeastCard; issues: CardValidationIssue[] }>;
  issues: CardValidationIssue[];
}

/**
 * 建 registry。
 *
 * assetExists 由呼叫端注入——瀏覽器裡沒有檔案系統，只有測試與建置時才驗圖片。
 * 這樣「圖片存在」這一條在 CI 是硬的，在執行期不會白白拖慢啟動。
 */
export function buildRegistry(options?: { assetExists?: (path: string) => boolean }): RegistryBuildResult {
  const knownSkillIds = allSkillIds();
  const knownCardIds = new Set<string>();
  const cards: BeastCard[] = [];
  const rejected: RegistryBuildResult['rejected'] = [];
  const issues: CardValidationIssue[] = [];

  for (const card of REGISTERED) {
    const cardIssues = validateCard(card, { knownSkillIds, knownCardIds, assetExists: options?.assetExists });
    if (cardIssues.length > 0) {
      rejected.push({ card, issues: cardIssues });
      issues.push(...cardIssues);
      continue;
    }
    knownCardIds.add(card.id);
    cards.push(card);
  }

  return { cards, rejected, issues };
}

let cached: RegistryBuildResult | null = null;

/** 執行期用的 registry（不驗圖片存在，那是 CI 的工作）。 */
export function cardRegistry(): RegistryBuildResult {
  if (!cached) cached = buildRegistry();
  return cached;
}

export function getCard(id: string): BeastCard | undefined {
  return cardRegistry().cards.find((card) => card.id === id);
}

/** 正式牌庫。被擋下的卡不會出現在這裡。 */
export function playableCards(): BeastCard[] {
  return cardRegistry().cards;
}
