/**
 * 神獸卡｜箕水豹（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a07',
  name: '箕水豹',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'R',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 123, attack: 57, defense: 56, speed: 67 },
  skills: ['skill_103'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-07.webp',
    front: '/beast-game/front/adult-07.webp',
    high: '/star-beasts/adult-divine-v2/07.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍尾末，二十八宿第 7 宿。核心寓意：風浪漂泊。熱愛自由，特立獨行，口才極佳；一生多奔波，適合創意傳播。',
  mansionId: 7,
  version: '1.0.0',
};

export default card;
