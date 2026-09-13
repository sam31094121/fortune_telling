import { combatGuideFor, elementPercent } from '@/lib/beast-game/combat-guide';
import { ELEMENTS, ELEMENT_LABEL } from '@/lib/beast-game/elements';
import type { Fighter, Match, Side } from '@/lib/beast-game/interactive';
import styles from './BattleCardGuide.module.css';

/** Display only core values and explicitly named comparisons; no invented total score or win chance. */
export default function BattlePowerAnalysis({ cardId, fighter, opponent, context }: {
  cardId: string; fighter?: Fighter; opponent?: Fighter; context?: { match: Match; side: Side };
}) {
  const guide = combatGuideFor(cardId, fighter, context);
  if (!guide) return <p>這張卡的戰鬥資料尚未取得，暫不顯示強弱數值。</p>;
  const enemy = opponent ? combatGuideFor(opponent.cardId, opponent) : null;
  const live = fighter?.cardId === cardId;
  const statLabels = { hp: '生命', attack: '攻擊', defense: '防禦', speed: '速度' } as const;
  return <div className={styles.analysis} data-power-analysis={cardId}>
    <p className={styles.relation}>五元素相剋：{guide.relation.line}</p>
    <h3>戰鬥力分析・{live ? '目前實際能力' : '出戰基礎能力'}</h3>
    <p className={styles.note}>以下與本模式實際戰鬥使用相同數值。攻擊力不等於實際扣血，勝負還取決於技能與出招。</p>
    <dl className={styles.stats} aria-label="真實戰鬥數值">
      {(Object.keys(statLabels) as Array<keyof typeof statLabels>).map(stat => <div key={stat} data-stat={stat}>
        <dt>{statLabels[stat]}</dt><dd>{guide.stats[stat]}{stat === 'hp' ? `/${guide.stats.maxHp}` : ''}</dd>
        {live && stat !== 'hp' && guide.stats[stat] !== guide.baseStats[stat] && <small>基礎 {guide.baseStats[stat]}</small>}
      </div>)}
    </dl>
    <p>護盾 {guide.stats.shield}・技能耗氣 {guide.skill.cost}・剩餘冷卻 {guide.skill.cooldown} 回合</p>
    {guide.modifiers.length > 0 && <ul className={styles.modifiers}>{guide.modifiers.map((change, i) => <li key={i}>
      {statLabels[change.stat]} {change.value > 0 ? '+' : ''}{change.value}，剩 {change.remainingTurns} 次自身行動
    </li>)}</ul>}
    {enemy && <article className={styles.relation} data-current-comparison>
      <strong>與目前對位的「{enemy.name}」比較</strong>
      {(['attack', 'defense', 'speed'] as const).map(stat => {
        const delta = guide.stats[stat] - enemy.stats[stat];
        return <span key={stat}>{statLabels[stat]} {guide.stats[stat]} 對 {enemy.stats[stat]}：{delta === 0 ? '相同' : `${delta > 0 ? '高' : '低'} ${Math.abs(delta)}`}</span>;
      })}
      <span>攻擊元素倍率：我攻對方 {elementPercent(guide.element, enemy.element)}／對方攻我 {elementPercent(enemy.element, guide.element)}</span>
      <small>比較的是目前數值；技能、換卡、護盾與先後手仍會影響結果。</small>
    </article>}
    <article className={styles.ability}>
      <h3>擅長與弱點</h3>
      <p>{guide.tactics?.strength}</p><p>{guide.tactics?.weakness}</p>
      <p>上場時機：{guide.tactics?.timing}</p>
    </article>
    <details className={styles.details}>
      <summary>與 60 張卡的同項基礎數值比較</summary>
      <p className={styles.note}>每項獨立比較，生命、防禦與速度不混成同一尺度；即時增減益另列。</p>
      {(Object.keys(statLabels) as Array<keyof typeof statLabels>).map(stat => <p key={stat}>
        {statLabels[stat]}：本卡基礎 {guide.baseStats[stat]}；全卡範圍 {guide.comparisonRange[stat].min}～{guide.comparisonRange[stat].max}
      </p>)}
    </details>
    <details className={styles.details}>
      <summary>對五元素的攻守強弱</summary>
      <table className={styles.matchups}><caption>攻擊元素倍率，尚未扣除防禦、護盾或生命上限</caption>
        <thead><tr><th>對方元素</th><th>本卡攻對方</th><th>對方攻本卡</th></tr></thead>
        <tbody>{ELEMENTS.map(element => <tr key={element}><th scope="row">{ELEMENT_LABEL[element]}</th><td>{elementPercent(guide.element, element)}</td><td>{elementPercent(element, guide.element)}</td></tr>)}</tbody>
      </table>
      <p>{guide.tactics?.teamHint.reason}</p><p>{guide.tactics?.teamHint.roleComplement}</p>
    </details>
    <details className={styles.details} data-generation-analysis>
      <summary>相生合體・條件與實際加成</summary>
      <p>{guide.generating.sourceLabel}生{guide.elementLabel}：本卡當主戰時，需要存活的{guide.generating.sourceLabel}系後備。</p>
      <p>{guide.elementLabel}生{guide.generating.targetLabel}：本卡在後備且存活時，可支援{guide.generating.targetLabel}系主戰。</p>
      <p>按下暴怒合體才生效，每方每場 1 次，不耗氣。該次以攻擊力加 {guide.generating.bonus} 進入原傷害公式，仍受相剋、防禦與護盾影響；不是固定扣血 {guide.generating.bonus}。</p>
      <p>不會因同隊相生就永久提高攻防，也不把後備數值全部加到主戰。</p>
      {guide.generating.hasContext && <p className={styles.relation}>{guide.generating.reason ?? `目前可使用・相生後備：${guide.generating.partner}`}</p>}
    </details>
  </div>;
}
