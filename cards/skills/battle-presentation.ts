/**
 * 三戰兩勝・演出技能登錄（對照《技能戰鬥檔案》）
 *
 * 這些 id 對應 public/技能戰鬥檔案 裡的 skill_charge / skill_hit / skill_ready_battle。
 * 它們是「儀式／演出」技能，不進 Effect Engine 結算——
 * 數值技能請繼續用同目錄 index.ts 的 skill_001… 與既有 13 種 EffectType。
 */

export const BATTLE_PRESENTATION_SKILLS = [
  {
    id: 'skill_charge',
    name: '本體衝鋒',
    archiveId: 'skill_charge',
    role: 'approach' as const,
    description: '蓋牌翻開時，本體以立體立繪從己方牌位衝向對方牌位交戰。',
    usedBy: ['戰鬥功能', '神獸卡片戰鬥功能'],
    mode: '三戰兩勝',
  },
  {
    id: 'skill_hit',
    name: '命中衝擊',
    archiveId: 'skill_hit',
    role: 'impact' as const,
    description: '衝鋒抵達對方牌位時的命中特效與音效節點。',
    usedBy: ['戰鬥功能', '神獸卡片戰鬥功能'],
    mode: '三戰兩勝',
  },
  {
    id: 'skill_ready_battle',
    name: '隨時戰鬥',
    archiveId: 'skill_ready_battle',
    role: 'ready' as const,
    description: '本體與衝鋒素材預置完成，可隨時再戰，不必現場生成。',
    usedBy: ['戰鬥功能', '神獸卡片戰鬥功能'],
    mode: '三戰兩勝',
  },
] as const;

export type BattlePresentationSkill = (typeof BATTLE_PRESENTATION_SKILLS)[number];

export function getBattlePresentationSkill(id: string): BattlePresentationSkill | undefined {
  return BATTLE_PRESENTATION_SKILLS.find((s) => s.id === id);
}
