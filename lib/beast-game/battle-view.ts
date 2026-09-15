/**
 * 戰鬥畫面要照印的判斷（後端計算）
 * ============================================================================
 *
 * 業主定調（2026-09-15，米其林分工）：後端負責品質穩定與服務，前端只負責顯示。
 *
 * 第二階段：可按的招、暴怒合體能不能用、不能用的原因、合體搭檔、合體教學——
 * 全部在這裡算好，隨戰局一起由困難戰場 API 與 turns API 送到前端。
 * 戰鬥面板、戰場、簡單頁只照印，不再自己呼叫 legalActions／rageFusionGuide。
 */
import { legalActions, rageMaterialFor, rageUnavailableReason, type Action, type Match } from './interactive';
import { rageFusionGuide, type RageGuide } from './rage-guide';
import { liveGuidesFor, type LiveGuides } from './guide-book';

export interface BattleView {
  /** 玩家這一回合可以出的招。 */
  legal: Action[];
  /** 暴怒合體不能用的原因；可用時為 null。 */
  rageReason: string | null;
  /** 暴怒合體的相生搭檔；沒有時為 null。 */
  ragePartner: { name: string; cardId: string } | null;
  /** 暴怒合體三步驟教學與等級階梯。 */
  fusionGuide: RageGuide;
  /** 場上每隻卡目前的戰力分析、主戰對位、戰果解說（後端化第三階段 3B）。 */
  guides: LiveGuides;
}

export function battleViewFor(match: Match): BattleView {
  const partner = rageMaterialFor(match, 'player');
  return {
    legal: legalActions(match, 'player'),
    rageReason: rageUnavailableReason(match, 'player'),
    ragePartner: partner ? { name: partner.name, cardId: partner.cardId } : null,
    fusionGuide: rageFusionGuide(match, 'player'),
    guides: liveGuidesFor(match),
  };
}
