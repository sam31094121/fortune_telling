/**
 * 神獸卡｜井木犴（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a22',
  name: '井木犴',
  category: 'DIVINE_BEAST',
  element: 'AIR',
  rarity: 'SSR',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 101, attack: 53, defense: 37, speed: 71 },
  skills: ['skill_101', 'skill_106'],
  passive: ['skill_111'],
  art: {
    thumbnail: '/beast-game/thumb/adult-22.webp',
    front: '/beast-game/front/adult-22.webp',
    high: '/star-beasts/adult-divine-v2/22.png',
    back: '/beast-game/card-back.webp',
  },
  story: '朱雀之冠，二十八宿第 22 宿。核心寓意：敏銳陰鬱。直覺驚人，體質敏感，常察覺他人不見的細節；性格溫和但內心悲觀。',
  mansionId: 22,
  version: '1.0.0',
};

export default card;
