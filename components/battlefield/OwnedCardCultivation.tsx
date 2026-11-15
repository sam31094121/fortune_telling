'use client';
import SharedCultivationPanel from './SharedCultivationPanel';
/** 神獸戰鬥的「我的卡片・永久強化」：純圖示版（2026-11-15 22:44 使用者指示）。 */
export default function OwnedCardCultivation(props:{onSaved:()=>void;onDone:()=>void}) {return <SharedCultivationPanel {...props} iconOnly/>;}
