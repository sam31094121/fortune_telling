/** Server terminal facts. Double elimination has no agreed policy: never invent a winner. */
export type OrbOutcome = 'win' | 'lose' | 'unavailable' | null;
export function orbOutcome(team: readonly { hp: number }[], foes: readonly { hp: number }[]): OrbOutcome {
  if (!team.length || !foes.length) return 'unavailable';
  // Missing/corrupt life is not proof of death, on either side.
  if ([...team, ...foes].some(c => !Number.isFinite(c.hp) || c.hp < 0)) return 'unavailable';
  const playerAlive = team.some(c => c.hp > 0), enemyAlive = foes.some(c => c.hp > 0);
  if (!playerAlive && !enemyAlive) return 'unavailable';
  if (!enemyAlive) return 'win';
  if (!playerAlive) return 'lose';
  return null;
}
