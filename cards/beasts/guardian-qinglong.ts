/**
 * 神獸卡｜青龍（四象）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_g_qinglong',
  name: '青龍',
  category: 'DIVINE_BEAST',
  element: 'AIR',
  rarity: 'UR',
  form: 'GUARDIAN',
  cost: 7,
  stats: { hp: 131, attack: 74, defense: 51, speed: 94 },
  skills: ['skill_301', 'skill_101'],
  passive: ['skill_111'],
  art: {
    thumbnail: '/beast-game/thumb/guardian-qinglong.webp',
    front: '/beast-game/front/guardian-qinglong.webp',
    high: '/star-beasts/four-guardians/qinglong.png',
    back: '/beast-game/card-back.webp',
  },
  story: '東方蒼龍，統角、亢、氐、房、心、尾、箕七宿。春之主宰，主生發與開創——龍抬頭之時，萬物隨之而動。',
  mansionId: 1,
  version: '1.0.0',
};

export default card;
