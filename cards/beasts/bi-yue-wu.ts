/**
 * 神獸卡｜畢月烏（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a19',
  name: '畢月烏',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'R',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 126, attack: 57, defense: 54, speed: 64 },
  skills: ['skill_103'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-19.webp',
    front: '/beast-game/front/adult-19.webp',
    high: '/star-beasts/adult-divine-v2/19.png',
    back: '/beast-game/card-back.webp',
  },
  story: '白虎邊疆，二十八宿第 19 宿。核心寓意：堅韌守衛。意志力驚人，性格剛毅，能吃苦耐勞；適合在逆境與高難度環境生存。',
  mansionId: 19,
  version: '1.0.0',
};

export default card;
