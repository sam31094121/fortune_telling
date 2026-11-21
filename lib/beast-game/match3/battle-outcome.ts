/** Server terminal facts. Double elimination has no agreed policy: never invent a winner. */
export type OrbOutcome = 'win' | 'lose' | 'unavailable' | null;
export function orbOutcome(team: readonly { hp: number }[], foes: readonly { hp: number }[]): OrbOutcome {
  if (!team.length || !foes.length) return 'unavailable';
  // Missing/corrupt life is not proof of death, on either side.
  if ([...team, ...foes].some(c => !Number.isFinite(c.hp) || c.hp < 0)) return 'unavailable';
  const playerAlive = team.some(c => c.hp > 0), enemyAlive = foes.some(c => c.hp > 0);
  // Owner lock: living player life always takes precedence over any loss path.
  // Neither turn count, equipment nor relative strength may predict defeat.
  if (playerAlive) return enemyAlive ? null : 'win';
  const allPlayersDown = team.every(c => c.hp === 0);
  // Defeat requires complete, explicit zero life and a surviving opponent.
  return allPlayersDown && enemyAlive ? 'lose' : 'unavailable';
}
