/**
 * 神獸卡｜星日馬（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a25',
  name: '星日馬',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'R',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 108, attack: 65, defense: 39, speed: 66 },
  skills: ['skill_104'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-25.webp',
    front: '/beast-game/front/adult-25.webp',
    high: '/star-beasts/adult-divine-v2/25.png',
    back: '/beast-game/card-back.webp',
  },
  story: '朱雀頸部，二十八宿第 25 宿。核心寓意：奔波忠烈。熱愛奔波，生命力旺盛，重視榮譽；一生多在外地發展，有大將之風。',
  mansionId: 25,
  version: '1.0.0',
};

export default card;
