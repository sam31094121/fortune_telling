/**
 * 神獸卡｜軫水蚓・幼子（幼子）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_y28',
  name: '軫水蚓・幼子',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'N',
  form: 'YOUNG',
  cost: 1,
  stats: { hp: 54, attack: 28, defense: 24, speed: 27 },
  skills: ['skill_201'],
  passive: ['skill_206'],
  art: {
    thumbnail: '/beast-game/thumb/young-28.webp',
    front: '/beast-game/front/young-28.webp',
    high: '/star-beasts/summer/28-zhen-shui-yin-young-divine-v24-ratio-fixed.jpg',
    back: '/beast-game/card-back.webp',
  },
  story: '朱雀尾端的幼子。尚未長成，靈性已顯——車輿協調的雛形。餵養與陪伴，牠會長成成獸的模樣。',
  mansionId: 28,
  version: '1.0.0',
};

export default card;
