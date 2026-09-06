import { ELEMENTS, ELEMENT_LABEL, ELEMENT_COUNTER, elementMultiplier, type BeastElement } from './elements';
import { getCard } from './registry';

// Knowledge relationship only: this does not add a new combat buff.
const GENERATES: Record<BeastElement, BeastElement> = { SPACE:'WATER', WATER:'AIR', AIR:'FIRE', FIRE:'EARTH', EARTH:'SPACE' };
export function elementGuide() {
  return {
    rows: ELEMENTS.map(element => ({ element:ELEMENT_LABEL[element], generates:ELEMENT_LABEL[GENERATES[element]], counters:ELEMENT_LABEL[ELEMENT_COUNTER[element]] })),
    generation:'相生是滋養、支持：空生水、水生風、風生火、火生地、地生空。本版相生不額外加攻擊、回血或能量。',
    counter:'相剋是制約：剋制時攻擊項乘 1.2，被剋時乘 0.9，其餘乘 1；之後仍會計入防禦與技能。元素有利不代表一定贏。',
    mapping:'遊戲對照：空＝金、風＝木、水＝水、火＝火、地＝土。',
  };
}
export interface ElementLesson {
  judgment?: ReturnType<typeof import('./adjudication').adjudicate>;
  player:string; opponent:string; relationship:string; impact:string; verdict:string; logs:string[];
}
export function elementLesson(playerId:string, opponentId:string, winner:'player'|'opponent'|'DRAW', logs:string[]):ElementLesson {
  const player=getCard(playerId),opponent=getCard(opponentId);
  if(!player||!opponent)throw new Error('神獸不存在');
  const a=player.element,b=opponent.element,A=ELEMENT_LABEL[a],B=ELEMENT_LABEL[b];
  const relationship=a===b?`雙方同為${A}元素。`:ELEMENT_COUNTER[a]===b?`${A}剋${B}：我方剋制對手。`:ELEMENT_COUNTER[b]===a?`${B}剋${A}：對手剋制我方。`:GENERATES[a]===b?`${A}生${B}：我方元素滋養對手元素；本版沒有相生加成。`:`${B}生${A}：對手元素滋養我方元素；本版沒有相生加成。`;
  return {player:`${player.name} · ${A}元素`,opponent:`${opponent.name} · ${B}元素`,relationship,
    impact:`我方元素倍率 ×${elementMultiplier(a,b)}；對手元素倍率 ×${elementMultiplier(b,a)}。這是傷害公式中的攻擊倍率，不是最終扣血比例。`,
    verdict:winner==='player'?'本場我方獲勝':winner==='opponent'?'本場對手獲勝':'本場平手',logs};
}
