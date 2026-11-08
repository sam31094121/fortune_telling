/** Displays the server-computed attack charge without battle text. */
export default function EnemyActionIndicator({ energy, down, ended, waiting, controlled, attacking, className }: {
  energy: number; down: boolean; ended: boolean; waiting: boolean; controlled: boolean; attacking: boolean; className: string;
}) {
  const state = down ? 'down' : ended ? 'ended' : attacking ? 'attacking' : waiting ? 'waiting' : controlled ? 'controlled' : energy >= 100 ? 'ready' : 'charging';
  const labels = { down: '已倒下', ended: '戰鬥結束', waiting: '待命', controlled: '受控', attacking: '攻擊中', ready: '能量已滿，等待出手', charging: '蓄力中' };
  return <span className={className} data-testid="enemy-action-state" data-state={state} role="progressbar" aria-label={labels[state]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={energy}><span style={{ width: energy + '%' }} /></span>;
}
