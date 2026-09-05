/**
 * 神獸卡｜房日兔
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 * 要調整這張卡就改這裡的數值與 version，不動遊戲核心。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_004',
  name: '房日兔',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'R',
  stats: { hp: 100, attack: 60, defense: 44, speed: 82 },
  skills: ['skill_005'],
  passive: [],
  art: {
    // 三段式（規格第十四條）：手牌只載 thumbnail，詳細頁才載 high。
    thumbnail: '/beast-game/thumb/04.webp',
    front: '/beast-game/front/04.webp',
    high: '/star-beasts/adult-divine-v2/04.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍之房，日曜所司。太陽屬火，兔性極速——先手優勢明顯，但守備薄，靠速度換節奏。',
  mansionId: 4,
  version: '1.0.0',
};

export default card;
