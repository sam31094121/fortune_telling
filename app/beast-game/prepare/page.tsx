import { redirect } from 'next/navigation';

/** 舊選卡入口接回統一戰場，由既有流程恢復戰局與收藏。 */
export default function BeastPreparationPage() {
  redirect('/beast-game/battlefield');
}
