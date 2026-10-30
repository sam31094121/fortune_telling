import { redirect } from 'next/navigation';

// 寶珠戰鬥（靜態遊戲位於 public/orb-battle/index.html）。
// /orb-battle 與 /orb-battle/ 皆導向靜態檔，確保相對路徑 engine.js / contrib/motion/* 正確解析。
export default function OrbBattleEntry() {
  redirect('/orb-battle/index.html');
}
