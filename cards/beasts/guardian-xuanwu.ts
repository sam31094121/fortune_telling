/**
 * 神獸卡｜玄武（四象）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_g_xuanwu',
  name: '玄武',
  category: 'DIVINE_BEAST',
  element: 'WATER',
  rarity: 'UR',
  form: 'GUARDIAN',
  cost: 8,
  stats: { hp: 164, attack: 77, defense: 71, speed: 82 },
  skills: ['skill_304', 'skill_103'],
  passive: ['skill_112'],
  art: {
    thumbnail: '/beast-game/thumb/guardian-xuanwu.webp',
    front: '/beast-game/front/guardian-xuanwu.webp',
    high: '/star-beasts/four-guardians/xuanwu.png',
    back: '/beast-game/card-back.webp',
  },
  story: '北方玄武，統斗、牛、女、虛、危、室、壁七宿。冬之主宰，主收藏與守成——負淵而立，不動如山。',
  mansionId: 8,
  version: '1.0.0',
};

export default card;
