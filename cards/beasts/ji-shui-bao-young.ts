/**
 * 神獸卡｜箕水豹・幼子（幼子）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_y07',
  name: '箕水豹・幼子',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'N',
  form: 'YOUNG',
  cost: 2,
  stats: { hp: 71, attack: 33, defense: 34, speed: 40 },
  skills: ['skill_201'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/young-07.webp',
    front: '/beast-game/front/young-07.webp',
    high: '/star-beasts/spring/07-ji-shui-bao-young-divine.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍尾末的幼子。尚未長成，靈性已顯——風浪漂泊的雛形。餵養與陪伴，牠會長成成獸的模樣。',
  mansionId: 7,
  version: '1.0.0',
};

export default card;
