/**
 * 神獸卡｜尾火虎（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a06',
  name: '尾火虎',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'SR',
  form: 'ADULT',
  cost: 3,
  stats: { hp: 86, attack: 55, defense: 35, speed: 58 },
  skills: ['skill_104', 'skill_109'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-06.webp',
    front: '/beast-game/front/adult-06.webp',
    high: '/star-beasts/adult-divine-v2/06.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍之尾，二十八宿第 6 宿。核心寓意：爭鬥好勝。戰鬥力旺盛，不服輸，喜好競爭；逆境中爆發力強，需防暴躁。',
  mansionId: 6,
  version: '1.0.0',
};

export default card;
