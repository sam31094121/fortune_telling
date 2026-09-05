/**
 * 神獸卡｜鬼金羊（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a23',
  name: '鬼金羊',
  category: 'DIVINE_BEAST',
  element: 'SPACE',
  rarity: 'R',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 130, attack: 63, defense: 66, speed: 68 },
  skills: ['skill_102'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-23.webp',
    front: '/beast-game/front/adult-23.webp',
    high: '/star-beasts/adult-divine-v2/23.png',
    back: '/beast-game/card-back.webp',
  },
  story: '朱雀之眼，二十八宿第 23 宿。核心寓意：神秘庇護。靈性極高，善解人意，常得神明或長輩庇佑；對玄學、心理學有天賦。',
  mansionId: 23,
  version: '1.0.0',
};

export default card;
