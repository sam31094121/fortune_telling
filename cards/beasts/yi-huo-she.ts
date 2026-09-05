/**
 * 神獸卡｜翼火蛇（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a27',
  name: '翼火蛇',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'R',
  form: 'ADULT',
  cost: 3,
  stats: { hp: 89, attack: 58, defense: 39, speed: 58 },
  skills: ['skill_104'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-27.webp',
    front: '/beast-game/front/adult-27.webp',
    high: '/star-beasts/adult-divine-v2/27.png',
    back: '/beast-game/card-back.webp',
  },
  story: '朱雀翅膀，二十八宿第 27 宿。核心寓意：輔助飛翔。擅長輔佐領導者，心思慎密，行動快如閃電；是不可或缺的靈魂幕僚。',
  mansionId: 27,
  version: '1.0.0',
};

export default card;
