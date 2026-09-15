/**
 * 相剋戰力手冊（後端計算）
 * ============================================================================
 *
 * 業主定調（2026-09-15，米其林分工）：後端負責品質穩定與服務，前端只負責顯示。
 *
 * 後端化第三階段 3B：五元素攻守倍率、相剋說明、卡片戰力分析、戰果解說，
 * 全部在這裡用戰鬥核心同一份規則算好：
 *   buildGuideBook()     靜態手冊——六十張卡的出戰基礎分析、五元素攻守表（/api/beast-game/guide-book）
 *   liveGuidesFor(match) 戰況——場上每隻卡目前的能力（含增減益、合體條件）、主戰對位、戰果解說（隨 battleViewFor 送出）
 * 前端元件只照印，不再呼叫 combatGuideFor／describeMatchup／elementMultiplier 等。
 */
import { interactiveCatalog, type Match, type Side } from './interactive';
import { combatGuideFor, elementGuideRows, elementPercent } from './combat-guide';
import { ELEMENTS, type BeastElement } from './elements';
import { describeMatchup, explainOutcome, type ElementMatchup } from '../beast-element-guide';

export type CombatGuide = NonNullable<ReturnType<typeof combatGuideFor>>;
export type ElementCell = ElementMatchup & { percent: string };
export type ElementRows = ReturnType<typeof elementGuideRows>;

export interface GuideBook {
  /** 六十張卡的出戰基礎分析。 */
  cards: Record<string, CombatGuide>;
  /** 五元素相剋方向與攻守倍率表。 */
  elementRows: ElementRows;
  /** matchups[攻方元素][守方元素]：倍率、百分比、相剋說明。 */
  matchups: Record<BeastElement, Record<BeastElement, ElementCell>>;
}

export interface LiveGuides {
  player: Record<string, CombatGuide>;
  opponent: Record<string, CombatGuide>;
  /** 雙方主戰的對位（我方攻易經）。 */
  matchup: ElementCell;
  /** 打完才有：戰果與末段對位的解說。 */
  outcome: string | null;
}

let cachedBook: GuideBook | null = null;

function cellFor(attacker: BeastElement, defender: BeastElement): ElementCell {
  return { ...describeMatchup(attacker, defender), percent: elementPercent(attacker, defender) };
}

export function buildGuideBook(): GuideBook {
  if (cachedBook) return cachedBook;
  const cards: Record<string, CombatGuide> = {};
  for (const card of interactiveCatalog()) {
    const guide = combatGuideFor(card.id);
    if (guide) cards[card.id] = guide;
  }
  const matchups = Object.fromEntries(ELEMENTS.map((attacker) => [
    attacker,
    Object.fromEntries(ELEMENTS.map((defender) => [defender, cellFor(attacker, defender)])),
  ])) as GuideBook['matchups'];
  cachedBook = { cards, elementRows: elementGuideRows(), matchups };
  return cachedBook;
}

export function liveGuidesFor(match: Match): LiveGuides {
  const sideGuides = (side: Side) => {
    const out: Record<string, CombatGuide> = {};
    for (const fighter of match[side].team) {
      const guide = combatGuideFor(fighter.cardId, fighter, { match, side });
      if (guide) out[fighter.cardId] = guide;
    }
    return out;
  };
  const mine = match.player.team[match.player.active].element as BeastElement;
  const foe = match.opponent.team[match.opponent.active].element as BeastElement;
  const matchup = cellFor(mine, foe);
  return {
    player: sideGuides('player'),
    opponent: sideGuides('opponent'),
    matchup,
    outcome: match.status === 'FINISHED' ? explainOutcome(match.winner, matchup) : null,
  };
}
