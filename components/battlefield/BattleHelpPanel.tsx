'use client';

import { useState } from 'react';
import styles from './BattleHelpPanel.module.css';

export default function BattleHelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.helpContainer}>
      <button
        type="button"
        className={styles.helpButton}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="戰鬥說明"
      >
        ？
      </button>

      {open && (
        <div className={styles.helpPanel} role="region" aria-label="戰鬥規則說明">
          <div className={styles.helpContent}>
            <h3>⚔️ 戰鬥基礎</h3>
            <ul>
              <li><strong>元素相剋</strong>：風剋地、地剋水、水剋火、火剋空、空剋風</li>
              <li><strong>氣值</strong>：用來施展技能，每回合自動恢復</li>
              <li><strong>護盾</strong>：減少傷害，會優先被扣掉</li>
            </ul>

            <h3>✦ 行動選項</h3>
            <ul>
              <li><strong>⚔️ 攻擊</strong>：普通攻擊，無消耗</li>
              <li><strong>✦ 技能</strong>：消耗氣值的特殊攻擊</li>
              <li><strong>🔥 暴怒合體</strong>：有存活的相生後備時，本場可使用一次</li>
              <li><strong>⇌ 換卡</strong>：切換主戰卡片</li>
            </ul>

            <h3>📊 戰況符號</h3>
            <ul>
              <li><strong>●</strong>：主戰卡片</li>
              <li><strong>○</strong>：待命卡片</li>
              <li><strong>✕</strong>：已倒下</li>
            </ul>

            <h3>🎯 勝利條件</h3>
            <p>將對手所有卡片擊倒。善用元素相剋與技能組合！</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setOpen(false)}
            aria-label="關閉說明"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
