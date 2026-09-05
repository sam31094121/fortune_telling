/**
 * 神獸卡｜角木蛟（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a01',
  name: '角木蛟',
  category: 'DIVINE_BEAST',
  element: 'AIR',
  rarity: 'SSR',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 98, attack: 56, defense: 38, speed: 71 },
  skills: ['skill_101', 'skill_106'],
  passive: ['skill_111'],
  art: {
    thumbnail: '/beast-game/thumb/adult-01.webp',
    front: '/beast-game/front/adult-01.webp',
    high: '/star-beasts/adult-divine-v2/01.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍之角，二十八宿第 1 宿。核心寓意：突破開創。具領導才能，直覺敏銳，善破僵局；性格過於剛烈，不易妥協。',
  mansionId: 1,
  version: '1.0.0',
};

export default card;
