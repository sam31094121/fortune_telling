/**
 * 神獸卡｜房日兔（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a04',
  name: '房日兔',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'SR',
  form: 'ADULT',
  cost: 4,
  stats: { hp: 104, attack: 67, defense: 38, speed: 63 },
  skills: ['skill_104', 'skill_109'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-04.webp',
    front: '/beast-game/front/adult-04.webp',
    high: '/star-beasts/adult-divine-v2/04.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍腹部，二十八宿第 4 宿。核心寓意：明朗財祿。人緣極佳，開朗樂觀，具商業頭腦；多得貴人相助，常有意外財。',
  mansionId: 4,
  version: '1.0.0',
};

export default card;
