/**
 * TeacherConsensusEngine（2026-08-22）｜規格「十二」
 *
 * 不是投票算命。三位老師各自的結構化輸出裡本來就已經有各自的收尾欄位
 * （格局老師的 conclusion／人生老師的 practicalDirection／故事老師的 finalMetaphor），
 * 這裡只是把三個既有欄位整理成「核心力量／核心課題／第一方向」，
 * 不重新呼叫 AI、不做語意合併猜測。
 */

import { INSUFFICIENT_DATA, type LifeTeacherResult, type NarrativeTeacherResult, type PalaceAnalysisContext, type PalaceId, type StructureTeacherResult, type TeacherConsensus } from './types';

export interface TeacherResultBundle {
  structure: StructureTeacherResult | typeof INSUFFICIENT_DATA;
  life: LifeTeacherResult | typeof INSUFFICIENT_DATA;
  narrative: NarrativeTeacherResult | typeof INSUFFICIENT_DATA;
}

function buildEvidenceRefs(context: PalaceAnalysisContext): string[] {
  return [
    `宮位:${context.selectedPalace.palaceName}`,
    `三合宮A:${context.threeHarmony.harmonyA.palaceName}`,
    `三合宮B:${context.threeHarmony.harmonyB.palaceName}`,
    `對宮:${context.threeHarmony.opposite.palaceName}`,
  ];
}

export function buildTeacherConsensus(palaceId: PalaceId, context: PalaceAnalysisContext, results: TeacherResultBundle): TeacherConsensus {
  const { structure, life, narrative } = results;
  const allInsufficient = structure === INSUFFICIENT_DATA && life === INSUFFICIENT_DATA && narrative === INSUFFICIENT_DATA;

  const differences: TeacherConsensus['differences'] = [];
  if (structure !== INSUFFICIENT_DATA) differences.push({ teacher: 'STRUCTURE_MASTER', insight: structure.conclusion });
  if (life !== INSUFFICIENT_DATA) differences.push({ teacher: 'LIFE_MASTER', insight: life.practicalDirection });
  if (narrative !== INSUFFICIENT_DATA) differences.push({ teacher: 'NARRATIVE_MASTER', insight: narrative.finalMetaphor });

  return {
    palaceId,
    consensus: {
      coreStrength: structure !== INSUFFICIENT_DATA ? structure.structuralStrength : life !== INSUFFICIENT_DATA ? life.strengthInReality : INSUFFICIENT_DATA,
      coreChallenge: structure !== INSUFFICIENT_DATA ? structure.structuralPressure : life !== INSUFFICIENT_DATA ? life.blindSpot : INSUFFICIENT_DATA,
      firstDirection: life !== INSUFFICIENT_DATA ? life.practicalDirection : structure !== INSUFFICIENT_DATA ? structure.conclusion : INSUFFICIENT_DATA,
    },
    differences,
    evidenceRefs: buildEvidenceRefs(context),
    verified: context.verified && !allInsufficient,
  };
}
