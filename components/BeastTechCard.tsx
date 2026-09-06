import styles from './BeastTechCard.module.css';
export type TechCardData={id:string;name:string;thumbnail:string;element:string;combat?:{role:string;tier:string;skillName:string;description:string;cost:number;stats:{hp:number;attack:number;defense:number;speed:number}}};
const elements:Record<string,string>={SPACE:'空',AIR:'風',WATER:'水',FIRE:'火',EARTH:'地'};
export default function BeastTechCard({card,count}:{card:TechCardData;count:number}){
 const c=card.combat;
 return <article className={styles.card} aria-label={`${card.name}功能卡`}>
  <div className={styles.head}><span>{elements[card.element]??card.element}元素</span><span>{c?`${c.tier} 階`:''}</span></div>
  <img className={styles.art} src={card.thumbnail} alt={card.name} loading="lazy" decoding="async"/>
  <h3 className={styles.name}>{card.name}</h3><p className={styles.role}>{c?`戰鬥定位 · ${c.role}`:'技能資料載入中'}</p>
  <p className={styles.owned}>{count?`已收藏 ×${count}`:'圖鑑預覽 · 尚未收藏'}</p>
  {c&&<><div className={styles.stats}><span>生命 {c.stats.hp}</span><span>攻擊 {c.stats.attack}</span><span>防禦 {c.stats.defense}</span><span>速度 {c.stats.speed}</span></div>
  <details className={styles.detail}><summary>查看技能 ↓</summary><p>{c.skillName}</p><p>{c.description}</p><p>消耗 {c.cost} 氣。實際冷卻與能否施放依戰鬥狀態顯示。</p></details></>}
 </article>;
}
