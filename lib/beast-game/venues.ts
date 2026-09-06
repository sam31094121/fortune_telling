/** Presentation only: a venue never changes stats, elements, rewards or outcomes. */
export const BATTLE_VENUES = {
  cards: {
    name: '霧林戰場',
    mode: '卡片戰鬥',
    image: '/beast-game/stage/venues/forest-battle.webp',
    source: 'https://opengameart.org/node/79322',
    author: 'Nidhoggn',
    license: 'CC0-1.0',
  },
  fighting: {
    name: '環形競技場',
    mode: '格鬥交鋒',
    image: '/beast-game/stage/venues/ring-arena.webp',
    source: 'https://polyhaven.com/a/circus_arena',
    author: 'Oliksiy Yakovlyev',
    license: 'CC0-1.0',
  },
} as const;

/** No owned stake is a battle-mode decision, not a navigation into another product. */
export const BATTLE_NO_STAKE_GUIDE = {
  headline: '目前沒有可押注的卡片',
  body: '格鬥戰須押一張持有卡；可先到卡片戰場，免押卡體驗攻擊、技能與換陣。',
  action: '進入卡片體驗戰',
  href: '/beast-game/battlefield',
} as const;
