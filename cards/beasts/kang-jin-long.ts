/**
 * 神獸卡｜亢金龍
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 * 要調整這張卡就改這裡的數值與 version，不動遊戲核心。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_002',
  name: '亢金龍',
  category: 'DIVINE_BEAST',
  element: 'SPACE',
  rarity: 'SSR',
  stats: { hp: 105, attack: 58, defense: 52, speed: 70 },
  skills: ['skill_001', 'skill_003'],
  passive: [],
  art: {
    // 三段式（規格第十四條）：手牌只載 thumbnail，詳細頁才載 high。
    thumbnail: '/beast-game/thumb/02.webp',
    front: '/beast-game/front/02.webp',
    high: '/star-beasts/adult-divine-v2/02.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍之頸，金鱗覆身。亢者高也，居高而不折——守勢中帶著反擊的餘裕，護體與吐息同源。',
  mansionId: 2,
  version: '1.0.0',
};

export default card;
