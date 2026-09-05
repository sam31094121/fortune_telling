/**
 * 神獸卡｜心月狐
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 * 要調整這張卡就改這裡的數值與 version，不動遊戲核心。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_005',
  name: '心月狐',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'R',
  stats: { hp: 112, attack: 58, defense: 52, speed: 78 },
  skills: ['skill_006', 'skill_007'],
  passive: [],
  art: {
    // 三段式（規格第十四條）：手牌只載 thumbnail，詳細頁才載 high。
    thumbnail: '/beast-game/thumb/05.webp',
    front: '/beast-game/front/05.webp',
    high: '/star-beasts/adult-divine-v2/05.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍之心，月曜所司。太陰屬水，狐性多慧——不以硬碰硬取勝，靠水幕與月華把戰線拉長。',
  mansionId: 5,
  version: '1.0.0',
};

export default card;
