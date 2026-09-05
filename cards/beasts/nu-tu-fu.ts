/**
 * 神獸卡｜女土蝠（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a10',
  name: '女土蝠',
  category: 'DIVINE_BEAST',
  element: 'EARTH',
  rarity: 'SR',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 127, attack: 48, defense: 60, speed: 55 },
  skills: ['skill_105', 'skill_110'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-10.webp',
    front: '/beast-game/front/adult-10.webp',
    high: '/star-beasts/adult-divine-v2/10.png',
    back: '/beast-game/card-back.webp',
  },
  story: '玄武身軀，二十八宿第 10 宿。核心寓意：技能內斂。專注力強，擁有一技之長；性格偏向保守內向，不喜與人爭鋒。',
  mansionId: 10,
  version: '1.0.0',
};

export default card;
