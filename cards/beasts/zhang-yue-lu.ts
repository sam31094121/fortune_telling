/**
 * 神獸卡｜張月鹿（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a26',
  name: '張月鹿',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'SR',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 134, attack: 60, defense: 57, speed: 75 },
  skills: ['skill_103', 'skill_108'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-26.webp',
    front: '/beast-game/front/adult-26.webp',
    high: '/star-beasts/adult-divine-v2/26.png',
    back: '/beast-game/card-back.webp',
  },
  story: '朱雀羽翼，二十八宿第 26 宿。核心寓意：華麗受矚。愛漂亮，喜歡成為全場焦點，表演慾強；具備極佳的公關與演藝天賦。',
  mansionId: 26,
  version: '1.0.0',
};

export default card;
