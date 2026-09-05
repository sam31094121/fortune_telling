/**
 * 神獸卡｜尾火虎
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 * 要調整這張卡就改這裡的數值與 version，不動遊戲核心。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_006',
  name: '尾火虎',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'SR',
  stats: { hp: 118, attack: 66, defense: 48, speed: 66 },
  skills: ['skill_008'],
  passive: ['skill_009'],
  art: {
    // 三段式（規格第十四條）：手牌只載 thumbnail，詳細頁才載 high。
    thumbnail: '/beast-game/thumb/06.webp',
    front: '/beast-game/front/06.webp',
    high: '/star-beasts/adult-divine-v2/06.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍之尾，火曜所司。虎威常在，一震奪勢——攻擊最高的一張，但雷震整場只能用一次，得挑時機。',
  mansionId: 6,
  version: '1.0.0',
};

export default card;
