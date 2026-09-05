/**
 * 神獸卡｜柳土獐・幼子（幼子）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_y24',
  name: '柳土獐・幼子',
  category: 'DIVINE_BEAST',
  element: 'EARTH',
  rarity: 'R',
  form: 'YOUNG',
  cost: 1,
  stats: { hp: 53, attack: 22, defense: 21, speed: 21 },
  skills: ['skill_205'],
  passive: ['skill_206'],
  art: {
    thumbnail: '/beast-game/thumb/young-24.webp',
    front: '/beast-game/front/young-24.webp',
    high: '/star-beasts/summer/24-liu-tu-zhang-young-divine.png',
    back: '/beast-game/card-back.webp',
  },
  story: '朱雀之嘴的幼子。尚未長成，靈性已顯——柔順多疑的雛形。餵養與陪伴，牠會長成成獸的模樣。',
  mansionId: 24,
  version: '1.0.0',
};

export default card;
