import styles from './BattleResultBanner.module.css';

/**
 * 戰鬥結算橫幅：贏、輸、平手三種畫面完全不同，客戶一眼就知道結果。
 *
 * 純顯示元件：結果（outcome）由後端算好、由父層傳入，這裡不判斷勝負、不連到任何戰鬥函式。
 * 只在「戰鬥已結束」時才可以渲染——演出途中提早出現會劇透（見 tests/beast-battle-mode.test.cjs）。
 *
 * 不靠單一線索區分：圖示、大字、顏色、動作四樣都不同（色盲、螢幕偏色也看得出來）。
 */
export type BattleOutcome = 'win' | 'lose' | 'draw';

const COPY: Record<BattleOutcome, { icon: string; word: string; sub: string }> = {
  win: { icon: '🏆', word: '勝利', sub: '你贏了！' },
  lose: { icon: '💔', word: '戰敗', sub: '這一場沒有贏，再挑戰一次吧。' },
  draw: { icon: '🤝', word: '平手', sub: '雙方勢均力敵，沒有輸贏。' },
};

export default function BattleResultBanner({ outcome, subtitle }: { outcome: BattleOutcome; subtitle?: string }) {
  const copy = COPY[outcome];
  return (
    <div className={styles.banner} data-outcome={outcome} data-battle-result-banner>
      <span className={styles.icon} aria-hidden="true">{copy.icon}</span>
      <strong className={styles.word}>{copy.word}</strong>
      <span className={styles.sub}>{subtitle ?? copy.sub}</span>
    </div>
  );
}
