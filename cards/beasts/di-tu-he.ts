/**
 * 神獸卡｜氐土貉（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a03',
  name: '氐土貉',
  category: 'DIVINE_BEAST',
  element: 'EARTH',
  rarity: 'R',
  form: 'ADULT',
  cost: 3,
  stats: { hp: 109, attack: 44, defense: 50, speed: 44 },
  skills: ['skill_105'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-03.webp',
    front: '/beast-game/front/adult-03.webp',
    high: '/star-beasts/adult-divine-v2/03.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍胸肋，二十八宿第 3 宿。核心寓意：承載基石。性格低調沉穩，適應力極強，善默默耕耘；屬於大器晚成型。',
  mansionId: 3,
  version: '1.0.0',
};

export default card;
