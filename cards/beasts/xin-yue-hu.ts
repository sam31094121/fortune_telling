/**
 * 神獸卡｜心月狐（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a05',
  name: '心月狐',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'R',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 143, attack: 62, defense: 58, speed: 74 },
  skills: ['skill_103'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-05.webp',
    front: '/beast-game/front/adult-05.webp',
    high: '/star-beasts/adult-divine-v2/05.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍心臟，二十八宿第 5 宿。核心寓意：權謀多疑。心思極其細密，洞察力驚人，具神秘魅力；內心佔有慾強。',
  mansionId: 5,
  version: '1.0.0',
};

export default card;
