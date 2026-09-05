/**
 * 神獸卡｜斗木獬（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a08',
  name: '斗木獬',
  category: 'DIVINE_BEAST',
  element: 'AIR',
  rarity: 'SSR',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 116, attack: 67, defense: 47, speed: 79 },
  skills: ['skill_101', 'skill_106'],
  passive: ['skill_111'],
  art: {
    thumbnail: '/beast-game/thumb/adult-08.webp',
    front: '/beast-game/front/adult-08.webp',
    high: '/star-beasts/adult-divine-v2/08.png',
    back: '/beast-game/card-back.webp',
  },
  story: '玄武之首，二十八宿第 8 宿。核心寓意：才華穩健。性格溫和敦厚，好學深思，具文人氣質；處事按部就班，受人信賴。',
  mansionId: 8,
  version: '1.0.0',
};

export default card;
