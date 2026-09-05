/**
 * 神獸卡｜室火豬（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a13',
  name: '室火豬',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'R',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 111, attack: 68, defense: 44, speed: 66 },
  skills: ['skill_104'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-13.webp',
    front: '/beast-game/front/adult-13.webp',
    high: '/star-beasts/adult-divine-v2/13.png',
    back: '/beast-game/card-back.webp',
  },
  story: '玄武宮室，二十八宿第 13 宿。核心寓意：建設剛猛。行動力驚人，性格豪爽直率，具開拓精神；適合建築、創業、軍警。',
  mansionId: 13,
  version: '1.0.0',
};

export default card;
