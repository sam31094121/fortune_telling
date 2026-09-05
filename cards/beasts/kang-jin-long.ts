/**
 * 神獸卡｜亢金龍（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a02',
  name: '亢金龍',
  category: 'DIVINE_BEAST',
  element: 'SPACE',
  rarity: 'SR',
  form: 'ADULT',
  cost: 5,
  stats: { hp: 129, attack: 62, defense: 64, speed: 69 },
  skills: ['skill_102', 'skill_107'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-02.webp',
    front: '/beast-game/front/adult-02.webp',
    high: '/star-beasts/adult-divine-v2/02.png',
    back: '/beast-game/card-back.webp',
  },
  story: '蒼龍咽喉，二十八宿第 2 宿。核心寓意：正直威權。風骨高尚，嫉惡如仇，重視名譽；性格倔強，不願流於俗套。',
  mansionId: 2,
  version: '1.0.0',
};

export default card;
