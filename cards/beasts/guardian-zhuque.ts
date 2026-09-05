/**
 * 神獸卡｜朱雀（四象）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_g_zhuque',
  name: '朱雀',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'UR',
  form: 'GUARDIAN',
  cost: 8,
  stats: { hp: 141, attack: 88, defense: 53, speed: 87 },
  skills: ['skill_302', 'skill_104'],
  passive: ['skill_113'],
  art: {
    thumbnail: '/beast-game/thumb/guardian-zhuque.webp',
    front: '/beast-game/front/guardian-zhuque.webp',
    high: '/star-beasts/four-guardians/zhuque.png',
    back: '/beast-game/card-back.webp',
  },
  story: '南方朱雀，統井、鬼、柳、星、張、翼、軫七宿。夏之主宰，主熱烈與昭彰——展翼之時，天地俱明。',
  mansionId: 22,
  version: '1.0.0',
};

export default card;
