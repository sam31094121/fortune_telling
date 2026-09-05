/**
 * 神獸卡｜危月燕（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a12',
  name: '危月燕',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'SR',
  form: 'ADULT',
  cost: 3,
  stats: { hp: 106, attack: 49, defense: 43, speed: 56 },
  skills: ['skill_103', 'skill_108'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-12.webp',
    front: '/beast-game/front/adult-12.webp',
    high: '/star-beasts/adult-divine-v2/12.png',
    back: '/beast-game/card-back.webp',
  },
  story: '玄武屋脊，二十八宿第 12 宿。核心寓意：高危機警。危機意識極高，做事謹慎，性格剛直；一生多大風大浪，靠機智化險。',
  mansionId: 12,
  version: '1.0.0',
};

export default card;
