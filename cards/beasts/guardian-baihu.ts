/**
 * 神獸卡｜白虎（四象）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_g_baihu',
  name: '白虎',
  category: 'DIVINE_BEAST',
  element: 'SPACE',
  rarity: 'UR',
  form: 'GUARDIAN',
  cost: 7,
  stats: { hp: 145, attack: 68, defense: 73, speed: 75 },
  skills: ['skill_303', 'skill_102'],
  passive: ['skill_113'],
  art: {
    thumbnail: '/beast-game/thumb/guardian-baihu.webp',
    front: '/beast-game/front/guardian-baihu.webp',
    high: '/star-beasts/four-guardians/baihu.png',
    back: '/beast-game/card-back.webp',
  },
  story: '西方白虎，統奎、婁、胃、昴、畢、觜、參七宿。秋之主宰，主肅殺與決斷——虎嘯之時，萬象歸位。',
  mansionId: 15,
  version: '1.0.0',
};

export default card;
