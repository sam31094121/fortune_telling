/** 寶珠奢華設計 token（與 styles/orb-luxury-tokens.module.css 同值；給需要在 TS 端取色的元件用，純視覺）。 */
export const ORB_LUXURY = {
  ink: '#14121a',
  board: '#1c1922',
  leather: '#3a2a20',
  gold: '#d6b86a',
  goldDeep: '#8a6c33',
  goldPale: '#f6d98f',
  magicGold: '#ffe3a1',
  bone: '#e8e1d3',
  ivory: '#d9cfbb',
} as const;
export type OrbLuxuryToken = keyof typeof ORB_LUXURY;
