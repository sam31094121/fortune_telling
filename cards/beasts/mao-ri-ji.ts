/**
 * 神獸卡｜昴日雞（成獸）
 *
 * 這是**資料**，不是程式（規格第三、十六條）。
 * 技能只寫 id，內容在 cards/skills；效果種類全部來自 Effect Engine。
 *
 * 由 scripts/gen-beast-cards.mjs 產生。手動微調過的話，在檔案開頭加一行
 * 註解標記（見產生器裡的 MANUAL_MARK），重跑時就會跳過這個檔案。
 */

import type { BeastCard } from '../../lib/beast-game/schema';

const card: BeastCard = {
  id: 'beast_a18',
  name: '昴日雞',
  category: 'DIVINE_BEAST',
  element: 'FIRE',
  rarity: 'SR',
  form: 'ADULT',
  cost: 3,
  stats: { hp: 87, attack: 58, defense: 35, speed: 56 },
  skills: ['skill_104', 'skill_109'],
  passive: [],
  art: {
    thumbnail: '/beast-game/thumb/adult-18.webp',
    front: '/beast-game/front/adult-18.webp',
    high: '/star-beasts/adult-divine-v2/18.png',
    back: '/beast-game/card-back.webp',
  },
  story: '白虎耳目，二十八宿第 18 宿。核心寓意：名聲清高。外貌出眾，氣質清高，自尊心極強；重視精神層面，容易獲得名望。',
  mansionId: 18,
  version: '1.0.0',
};

export default card;
