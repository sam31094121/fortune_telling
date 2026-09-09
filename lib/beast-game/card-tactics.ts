/** Read-only tactical guidance for the actual interactive profile, not a rarity ranking. */
import { profile } from './interactive';
import { getCard } from './registry';
import { describeCardElement } from '../beast-element-guide';

export function cardTactics(cardId: string) {
  const card = getCard(cardId);
  if (!card) return null;
  const skill = profile(cardId);
  const relation = describeCardElement(card.element);
  const roles = {
    主攻: { strength: '用傷害技能集中壓低對手生命。', weakness: '沒有自身回復或護盾，持續換血會累積傷勢。', timing: '氣量足夠、需要收掉對手主戰時考慮上場。' },
    守護: { strength: '較高防禦配合自身護盾，承受持續攻擊。', weakness: '盾上限70；接近上限再施放會浪費部分效果，也會放棄一次攻擊。', timing: '預期要承受攻擊、目前護盾不高時使用。' },
    控制: { strength: '攻擊並降低目前敵方主戰攻擊，影響其後續行動。', weakness: '對手可以換卡避開當前主戰的減攻；也不能阻止治療或加盾。', timing: '對手主要靠攻擊、準備連續交手時使用。' },
    輔助: { strength: '回復自己的生命，延長留場時間。', weakness: '不治療隊友；滿血施放沒有收益，先被擊倒也不能回復。', timing: '已有缺血、仍有機會活到出手時使用；不必滿血搶放。' },
    反擊: { strength: '先加自身護盾，受擊且存活時反擊24點。', weakness: '對手不攻擊就不觸發反擊；被直接擊倒也無法反擊。', timing: '預期對手攻擊、自己能撐住這一下時使用。' },
    速度: { strength: '傷害技能同時提高自身速度，爭取之後先行。', weakness: '速度不增加生命或防禦；已有先手時額外加速未必有收益。', timing: '需要爭取先出手，或以先手壓低敵方生命時使用。' },
  } as const;
  return {
    ...roles[skill.role],
    favorable: `對${relation.beats}系有元素攻擊優勢；不保證獲勝。`,
    counter: `避開${relation.beatenBy}系的相剋壓力。`,
    cost: `技能耗氣${skill.cost}；仍受冷卻限制。`,
  };
}
