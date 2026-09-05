/**
 * 神獸卡｜角木蛟
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 * 要調整這張卡就改這裡的數值與 version，不動遊戲核心。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_001',
  name: '角木蛟',
  category: 'DIVINE_BEAST',
  element: 'AIR',
  rarity: 'SR',
  stats: { hp: 104, attack: 58, defense: 44, speed: 72 },
  skills: ['skill_002', 'skill_010'],
  passive: [],
  art: {
    // 三段式（規格第十四條）：手牌只載 thumbnail，詳細頁才載 high。
    thumbnail: '/beast-game/thumb/01.webp',
    front: '/beast-game/front/01.webp',
    high: '/star-beasts/adult-divine-v2/01.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍之角，二十八宿之首。角為破陣之器，先動者開局——具領導才能，直覺敏銳，善破僵局；性格過於剛烈，不易妥協。',
  mansionId: 1,
  version: '1.0.0',
};

export default card;
