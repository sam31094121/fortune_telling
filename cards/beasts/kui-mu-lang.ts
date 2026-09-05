/**
 * 神獸卡｜奎木狼（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a15',
  name: '奎木狼',
  category: 'DIVINE_BEAST',
  element: 'AIR',
  rarity: 'SSR',
  form: 'ADULT',
  cost: 3,
  stats: { hp: 89, attack: 47, defense: 34, speed: 59 },
  skills: ['skill_101', 'skill_106'],
  passive: ['skill_111'],
  art: {
    thumbnail: '/beast-game/thumb/adult-15.webp',
    front: '/beast-game/front/adult-15.webp',
    high: '/star-beasts/adult-divine-v2/15.png',
    back: '/beast-game/card-back.webp',
  },
  story: '白虎之尾，二十八宿第 15 宿。核心寓意：文采反差。外表威嚴，內在卻極具文才與浪漫；聰明好學，但感情較多波折。',
  mansionId: 15,
  version: '1.0.0',
};

export default card;
