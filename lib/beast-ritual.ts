export type RitualTurn = { turn: number; side: string; phase: string; note: string };

/** Select actual opening, middle and final exchanges; never invent an attack. */
export function selectRitualHighlights(timeline: RitualTurn[] = []): RitualTurn[] {
  const exchanges = timeline.filter((entry) =>
    (entry.side === 'PLAYER' || entry.side === 'OPPONENT')
    && ((entry.phase === 'BATTLE' && /[1-9]\d* 次交戰|[1-9]\d* 次直擊/.test(entry.note))
      || (entry.phase === 'DRAW' && entry.note.includes('疲勞'))));
  if (exchanges.length <= 3) return exchanges;
  return [exchanges[0], exchanges[Math.floor(exchanges.length / 2)], exchanges[exchanges.length - 1]];
}
