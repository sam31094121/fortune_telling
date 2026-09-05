/**
 * 神獸卡｜氐土貉
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 * 要調整這張卡就改這裡的數值與 version，不動遊戲核心。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_003',
  name: '氐土貉',
  category: 'DIVINE_BEAST',
  element: 'EARTH',
  rarity: 'N',
  stats: { hp: 130, attack: 48, defense: 62, speed: 48 },
  skills: ['skill_004'],
  passive: [],
  art: {
    // 三段式（規格第十四條）：手牌只載 thumbnail，詳細頁才載 high。
    thumbnail: '/beast-game/thumb/03.webp',
    front: '/beast-game/front/03.webp',
    high: '/star-beasts/adult-divine-v2/03.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍之根，伏土而居。氐為根柢，不爭先而難撼——受創之後反而更沉得住，是一張耐得住長局的卡。',
  mansionId: 3,
  version: '1.0.0',
};

export default card;
