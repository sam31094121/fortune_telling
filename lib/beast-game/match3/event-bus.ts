/**
 * window.__match3Events 的唯一型別宣告（盤面、BeadFx、動效預覽共用）。
 * 盤面推核心事件 Match3Event；動效預覽推精簡的 Match3FxEvent；訂閱端用 isMatch3FxEvent 過濾。
 */
import type { BeastElement } from '../elements';
import type { Match3Event } from './events';

export interface Match3FxEvent {
  element: BeastElement;
  count: number;
  cascadeStep: number;
  eligible: boolean;
  magic?: boolean;
  magicPower?: number;
  skill5?: boolean;
}

export type Match3BusEvent = Match3Event | Match3FxEvent;

export function isMatch3FxEvent(ev: unknown): ev is Match3FxEvent {
  const e = ev as Partial<Match3FxEvent> | null;
  return !!e && typeof e === 'object' && typeof e.count === 'number' && typeof e.cascadeStep === 'number' && typeof e.element === 'string';
}

declare global {
  interface Window { __match3Events?: Match3BusEvent[] }
}