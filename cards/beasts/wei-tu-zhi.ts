/**
 * 神獸卡｜胃土雉（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a17',
  name: '胃土雉',
  category: 'DIVINE_BEAST',
  element: 'EARTH',
  rarity: 'R',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 148, attack: 58, defense: 68, speed: 62 },
  skills: ['skill_105'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-17.webp',
    front: '/beast-game/front/adult-17.webp',
    high: '/star-beasts/adult-divine-v2/17.png',
    back: '/beast-game/card-back.webp',
  },
  story: '白虎之胃，二十八宿第 17 宿。核心寓意：財庫剛強。性格強勢，好勝心重，對金錢極其敏銳；具備天生的經商與管理長才。',
  mansionId: 17,
  version: '1.0.0',
};

export default card;
