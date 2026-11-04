import { redirect } from 'next/navigation';

/** 舊難度入口統一進入卡片闖關；收藏與結算由既有帳本接續。 */
export default function BeastGameEntry() {
  redirect('/beast-game/battlefield');
}
