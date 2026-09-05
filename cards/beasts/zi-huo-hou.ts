/**
 * 神獸卡｜觜火猴（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a20',
  name: '觜火猴',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'SR',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 120, attack: 77, defense: 46, speed: 71 },
  skills: ['skill_104', 'skill_109'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-20.webp',
    front: '/beast-game/front/adult-20.webp',
    high: '/star-beasts/adult-divine-v2/20.png',
    back: '/beast-game/card-back.webp',
  },
  story: '白虎之口，二十八宿第 20 宿。核心寓意：口舌機變。言辭犀利，思維敏捷，善於辯論；臨場反應極強，但要防口舌是非。',
  mansionId: 20,
  version: '1.0.0',
};

export default card;
