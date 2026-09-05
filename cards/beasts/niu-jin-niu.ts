/**
 * 神獸卡｜牛金牛（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a09',
  name: '牛金牛',
  category: 'DIVINE_BEAST',
  element: 'SPACE',
  rarity: 'R',
  form: 'ADULT',
  cost: 3,
  stats: { hp: 103, attack: 51, defense: 47, speed: 57 },
  skills: ['skill_102'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-09.webp',
    front: '/beast-game/front/adult-09.webp',
    high: '/star-beasts/adult-divine-v2/09.png',
    back: '/beast-game/card-back.webp',
  },
  story: '玄武脖頸，二十八宿第 9 宿。核心寓意：勞碌基業。刻苦耐勞，責任感極強，極其固執；一生較為操勞，但能積攢家業。',
  mansionId: 9,
  version: '1.0.0',
};

export default card;
