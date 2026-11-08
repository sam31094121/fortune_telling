import { assertThreeInOnePassed, type ThreeInOneResult } from './three-in-one';
import { getBaziTraditionalOutputGate, type BaziTraditionalOutputGate } from './bazi-traditional-gate';

/** 2026-11-03 owner-approved output policy. Only pass a freshly computed
 * server result, never request-body flags. Source review states remain intact. */
export function getReviewedBaziOutputGate(result: ThreeInOneResult): BaziTraditionalOutputGate {
  assertThreeInOnePassed(result);
  const gate = getBaziTraditionalOutputGate(true);
  if (!gate.coreReady) return gate;
  return {
    ...gate,
    interpretationReady: true,
    redLuanReady: true,
    withheldFields: [],
    customerMessage: '已依既有技能檔完成本次八字、紫微與四柱核對。',
  };
}
