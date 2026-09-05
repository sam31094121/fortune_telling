/**
 * 神獸卡｜虛日鼠（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a11',
  name: '虛日鼠',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'R',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 121, attack: 82, defense: 50, speed: 76 },
  skills: ['skill_104'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-11.webp',
    front: '/beast-game/front/adult-11.webp',
    high: '/star-beasts/adult-divine-v2/11.png',
    back: '/beast-game/card-back.webp',
  },
  story: '玄武虛位，二十八宿第 11 宿。核心寓意：空虛靈性。直覺力強，思想深邃，對神秘事物感興趣；內心常感孤獨、缺乏安全感。',
  mansionId: 11,
  version: '1.0.0',
};

export default card;
