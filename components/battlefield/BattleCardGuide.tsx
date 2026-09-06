'use client';

import { useState } from 'react';
import { combatGuideFor, elementGuideRows, elementPercent } from '@/lib/beast-game/combat-guide';
import { ELEMENTS, ELEMENT_LABEL, type BeastElement } from '@/lib/beast-game/elements';
import type { Fighter } from '@/lib/beast-game/interactive';
import styles from './BattleCardGuide.module.css';

export default function BattleCardGuide({ cardId, fighter, opponentElement, onClose }: {
  cardId: string; fighter?: Fighter; opponentElement?: BeastElement; onClose: () => void;
}) {
  const [tab, setTab] = useState<'card' | 'elements'>('card');
  const guide = combatGuideFor(cardId, fighter);
  if (!guide) return <button type="button" onClick={onClose}>回到操控</button>;
  const rows = elementGuideRows();

  return (
    <section className={styles.guide} aria-label={`${guide.name}的戰鬥資訊`} data-combat-guide>
      <header className={styles.header}>
        <div><strong>{guide.name}</strong><span>{guide.system}・{fighter ? '目前能力' : '出戰能力'}</span></div>
        <button type="button" onClick={onClose}>回到操控</button>
      </header>
      <div className={styles.tabs} role="group" aria-label="戰鬥資訊分類">
        <button type="button" aria-pressed={tab === 'card'} onClick={() => setTab('card')}>卡片能力</button>
        <button type="button" aria-pressed={tab === 'elements'} onClick={() => setTab('elements')}>五元素相剋</button>
      </div>
      {tab === 'card' ? (
        <>
          <dl className={styles.identity}>
            <div><dt>所屬四象</dt><dd>{guide.guardian}</dd></div>
            <div><dt>形態／類型</dt><dd>{guide.form}・{guide.role}型</dd></div>
            <div><dt>攻擊元素</dt><dd>{guide.elementLabel}系（五行：{guide.wuxing}）</dd></div>
            <div><dt>武裝風格</dt><dd>{guide.weapon.weaponClass}</dd></div>
          </dl>
          <p className={styles.relation}>{guide.relation.line}{opponentElement && <strong>對目前敵方{ELEMENT_LABEL[opponentElement]}系：攻擊元素倍率 {elementPercent(guide.element, opponentElement)}</strong>}</p>
          <dl className={styles.stats} aria-label="回合戰鬥數值">
            <div><dt>生命</dt><dd>{guide.stats.hp}/{guide.stats.maxHp}</dd></div>
            <div><dt>攻擊</dt><dd>{guide.stats.attack}</dd></div>
            <div><dt>防禦</dt><dd>{guide.stats.defense}</dd></div>
            <div><dt>速度</dt><dd>{guide.stats.speed}</dd></div>
          </dl>
          {guide.stats.shield > 0 && <p>護盾 {guide.stats.shield}，受到傷害時先扣護盾。</p>}
          <article className={styles.ability}>
            <h3>{guide.skill.name}<span>耗氣 {guide.skill.cost}{guide.skill.cooldown > 0 ? `・冷卻 ${guide.skill.cooldown} 回合` : ''}</span></h3>
            <p>{guide.skill.description}</p>
            <p className={styles.note}>{guide.passive}</p>
          </article>
          <details className={styles.details}>
            <summary>武裝部位與攻擊方式</summary>
            <p>{guide.weapon.name}・{guide.weapon.part}</p>
            <p>{guide.weapon.motion}</p>
            <p className={styles.note}>暴風型是武裝風格；這張卡的攻擊元素是{guide.elementLabel}系。</p>
          </details>
          <p className={styles.note}>主攻、守護、控制、輔助、反擊、速度是戰鬥職責，決定各卡的技能特色；相剋倍率看五元素。</p>
        </>
      ) : (
        <>
          <p className={styles.relation}>本卡：{guide.elementLabel}系・{guide.relation.line}</p>
          <div className={styles.cycle} aria-label="五元素相剋方向">
            {rows.map(row => <span key={row.element}>{row.label}剋{row.beats}</span>)}
          </div>
          <table className={styles.matrix}>
            <caption>左側攻方 → 上方守方；數字為攻擊元素倍率</caption>
            <thead><tr><th scope="col">攻＼守</th>{ELEMENTS.map(element => <th scope="col" key={element}>{ELEMENT_LABEL[element]}</th>)}</tr></thead>
            <tbody>{rows.map(row => (
              <tr key={row.element} data-current={row.element === guide.element}>
                <th scope="row">{row.label}</th>
                {row.cells.map(cell => <td key={cell.defender} data-tone={cell.multiplier > 1 ? 'up' : cell.multiplier < 1 ? 'down' : 'neutral'} data-target={row.element === guide.element && cell.defender === opponentElement}>{Math.round(cell.multiplier * 100)}%</td>)}
              </tr>
            ))}</tbody>
          </table>
          <p className={styles.note}>亮起的一列是本卡；框線標出目前敵方。元素先影響攻擊，再計算對方防禦，實際傷害可查看本回合戰報。</p>
          <details className={styles.details}>
            <summary>五元素屬於哪個系統？</summary>
            <p>空對應五行金、風對應木、水對應水、火對應火、地對應土；四象歸屬與本卡元素各自標示。</p>
            <p>普通攻擊與傷害技能使用本卡元素；同屬性技能不再額外乘一次加成。恢復與護盾依技能說明生效。</p>
          </details>
        </>
      )}
    </section>
  );
}
