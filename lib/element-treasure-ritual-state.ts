export type ElementTreasureRitualStatus = 'sealed' | 'opening' | 'released';
export const ELEMENT_TREASURE_RITUAL_MS = [0, 3_000, 6_000, 9_000, 12_000] as const;

/** The deterministic state restored by the shared 「還原封印」 action. */
export function createSealedElementTreasureRitualState() {
  return { status: 'sealed' as ElementTreasureRitualStatus, stage: null as number | null };
}
