'use client';

/**
 * 長者友善準備指南
 * ============================================================================
 *
 * 為了讓所有年齡的玩家都能理解遊戲規則，
 * 特別為長者設計的大字、簡單語言、視覺清晰的引導系統
 */

import styles from './ElderlyFriendlyGuide.module.css';

export interface GuideStep {
  number: number;
  title: string;
  description: string;
  visual: string; // emoji or icon
  details: string[];
}

const PREPARATION_STEPS: GuideStep[] = [
  {
    number: 1,
    title: '第一步：選主戰卡（1張）',
    visual: '⚔️',
    description: '先選一張神獸卡當「主要戰士」——這張會第一個上場',
    details: [
      '• 點一張卡片就選定',
      '• 這張卡是你的主要攻擊手',
      '• 會從戰場中央開始對戰',
    ],
  },
  {
    number: 2,
    title: '第二步：選後備卡（最多5張）',
    visual: '🛡️',
    description: '再選最多5張後備卡——主戰卡被擊倒時，後備卡會接上場',
    details: [
      '• 後備卡排成一列在旁邊',
      '• 不一定要選滿5張，選1-5張都可以',
      '• 後備卡會依序替主戰卡上場',
    ],
  },
  {
    number: 3,
    title: '第三步：檢查相生相剋（必看）',
    visual: '⚡',
    description: '五行相生相剋——每張卡都有剋和被剋的卡',
    details: [
      '• 風剋地、地剋水、水剋火、火剋空、空剋風',
      '• 你的卡「剋」對方的卡 → 傷害 +50%',
      '• 你的卡「被剋」對方的卡 → 受傷 -25%',
      '• 不相剋 → 正常傷害',
    ],
  },
  {
    number: 4,
    title: '第四步：檢查隊伍（確認配置）',
    visual: '👥',
    description: '看一遍你選的所有卡——主戰卡加後備卡共幾張',
    details: [
      '• 主戰卡：1張（中央大卡）',
      '• 後備卡：1-5張（右邊排成一列）',
      '• 確認每張卡都是你想要的',
    ],
  },
  {
    number: 5,
    title: '第五步：確認押注（如果是正式戰）',
    visual: '💎',
    description: '正式戰要選5張收藏卡下注——輸了會被沒收，贏了得到獎勵',
    details: [
      '• 選擇5張要押注的卡片',
      '• 體驗戰不需要押注（放心玩）',
      '• 看清楚你要押注哪些卡',
    ],
  },
  {
    number: 6,
    title: '第六步：開始對戰',
    visual: '🎮',
    description: '一切準備好了，點「開始對戰」就開始',
    details: [
      '• 螢幕會顯示你的卡 vs 對方的卡',
      '• 依序翻牌看誰贏',
      '• 完全由神獸的相剋決定——沒有額外技巧',
    ],
  },
];

interface ElderlyFriendlyGuideProps {
  compact?: boolean;
  currentStep?: number;
}

export default function ElderlyFriendlyGuide({
  compact = false,
  currentStep,
}: ElderlyFriendlyGuideProps) {
  if (compact) {
    return (
      <div className={styles.compactGuide}>
        <h2 className={styles.compactTitle}>六步輕鬆上手</h2>
        <ol className={styles.quickSteps}>
          {PREPARATION_STEPS.map((step) => (
            <li key={step.number} className={currentStep === step.number ? styles.active : ''}>
              <span className={styles.stepVisual}>{step.visual}</span>
              <span className={styles.stepTitle}>{step.title}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className={styles.fullGuide}>
      <header className={styles.header}>
        <h1>🎮 新手準備指南</h1>
        <p className={styles.subtitle}>跟著以下6個步驟，就能開始玩</p>
      </header>

      <section className={styles.stepsContainer}>
        {PREPARATION_STEPS.map((step) => (
          <article
            key={step.number}
            className={styles.step}
            data-step={step.number}
          >
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>{step.number}</div>
              <div className={styles.stepVisual}>{step.visual}</div>
              <h2 className={styles.stepTitle}>{step.title}</h2>
            </div>

            <p className={styles.stepDescription}>{step.description}</p>

            <ul className={styles.stepDetails}>
              {step.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>

            {step.number < PREPARATION_STEPS.length && (
              <div className={styles.separator} />
            )}
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <p className={styles.encouragement}>
          ✨ 準備好了嗎？按「開始對戰」就開始遊戲吧！
        </p>
      </footer>
    </div>
  );
}
