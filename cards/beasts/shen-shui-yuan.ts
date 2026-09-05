/**
 * 神獸卡｜參水猿（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a21',
  name: '參水猿',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'R',
  form: 'ADULT',
  cost: 3,
  stats: { hp: 108, attack: 48, defense: 42, speed: 54 },
  skills: ['skill_103'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-21.webp',
    front: '/beast-game/front/adult-21.webp',
    high: '/star-beasts/adult-divine-v2/21.png',
    back: '/beast-game/card-back.webp',
  },
  story: '白虎將軍，二十八宿第 21 宿。核心寓意：變革煞氣。性格剛烈，不畏權勢，好勇鬥狠；一生多重大變革，具大開大合之命。',
  mansionId: 21,
  version: '1.0.0',
};

export default card;
