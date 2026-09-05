/**
 * 神獸卡｜婁金狗（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a16',
  name: '婁金狗',
  category: 'DIVINE_BEAST',
  element: 'SPACE',
  rarity: 'SR',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 112, attack: 56, defense: 55, speed: 62 },
  skills: ['skill_102', 'skill_107'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-16.webp',
    front: '/beast-game/front/adult-16.webp',
    high: '/star-beasts/adult-divine-v2/16.png',
    back: '/beast-game/card-back.webp',
  },
  story: '白虎聚眾，二十八宿第 16 宿。核心寓意：繁衍利索。做事乾脆利落，善於理財，家庭觀念重；具服務精神，常為人解難。',
  mansionId: 16,
  version: '1.0.0',
};

export default card;
