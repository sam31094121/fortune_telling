/**
 * 神獸卡｜壁水貐（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a14',
  name: '壁水貐',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'SR',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 137, attack: 65, defense: 57, speed: 73 },
  skills: ['skill_103', 'skill_108'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-14.webp',
    front: '/beast-game/front/adult-14.webp',
    high: '/star-beasts/adult-divine-v2/14.png',
    back: '/beast-game/card-back.webp',
  },
  story: '玄武牆壁，二十八宿第 14 宿。核心寓意：守護智慧。喜好鑽研學問，性格沉靜，不喜衝突；扮演守護者或幕僚能大放異彩。',
  mansionId: 14,
  version: '1.0.0',
};

export default card;
