import type { IChingReading } from './iching-engine';

export type NameologyIChing = Pick<IChingReading, 'hexagramName' | 'kingWen' | 'glyph' | 'upper' | 'lower' | 'changingLine' | 'essence' | 'advice'> & {
  method: 'birth-date-hour' | 'name-date-symbolic';
  ruleVersion: 'nameology-iching-v1';
};

export function presentNameologyIChing(gua: IChingReading, hasHour: boolean): NameologyIChing {
  return {
    hexagramName: gua.hexagramName, kingWen: gua.kingWen, glyph: gua.glyph,
    upper: gua.upper, lower: gua.lower, changingLine: gua.changingLine,
    essence: gua.essence, advice: gua.advice,
    method: hasHour ? 'birth-date-hour' : 'name-date-symbolic',
    ruleVersion: 'nameology-iching-v1',
  };
}
