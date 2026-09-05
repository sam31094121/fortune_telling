/**
 * 神獸卡｜牛金牛・幼子（幼子）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_y09',
  name: '牛金牛・幼子',
  category: 'DIVINE_BEAST',
  element: 'SPACE',
  rarity: 'R',
  form: 'YOUNG',
  cost: 2,
  stats: { hp: 69, attack: 34, defense: 30, speed: 39 },
  skills: ['skill_204'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/young-09.webp',
    front: '/beast-game/front/young-09.webp',
    high: '/star-beasts/winter/09-niu-jin-niu-young-divine.png',
    back: '/beast-game/card-back.webp',
  },
  story: '玄武脖頸的幼子。尚未長成，靈性已顯——勞碌基業的雛形。餵養與陪伴，牠會長成成獸的模樣。',
  mansionId: 9,
  version: '1.0.0',
};

export default card;
