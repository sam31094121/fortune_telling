/**
 * 神獸卡｜軫水蚓（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a28',
  name: '軫水蚓',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'SR',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 120, attack: 58, defense: 52, speed: 61 },
  skills: ['skill_103', 'skill_108'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-28.webp',
    front: '/beast-game/front/adult-28.webp',
    high: '/star-beasts/adult-divine-v2/28.png',
    back: '/beast-game/card-back.webp',
  },
  story: '朱雀尾端，二十八宿第 28 宿。核心寓意：車輿協調。擅長協調各方利益，處事圓融；一生與車船、貿易有緣，平穩向成功。',
  mansionId: 28,
  version: '1.0.0',
};

export default card;
