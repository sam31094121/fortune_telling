'use client';

import { PastCardOutput } from '@/lib/asura/past-card-interpreter';
import { PresentCardOutput } from '@/lib/asura/present-card-interpreter';
import { FutureCardOutput } from '@/lib/asura/future-card-interpreter';
import styles from './GhostAsuraTimeCardsDisplay.module.css';

/**
 * 鬼魅阿修羅時間卡片展示
 *
 * 三張卡片：
 * - 第一張（過去）：獨立完整
 * - 第二張（現在）：獨立完整
 * - 第三張（未來）：獨立完整
 *
 * 不依賴閱讀順序。不共用文案。
 */

interface TimeCardsProps {
  pastCard: PastCardOutput;
  presentCard: PresentCardOutput;
  futureCard: FutureCardOutput;
}

export default function GhostAsuraTimeCardsDisplay({
  pastCard,
  presentCard,
  futureCard,
}: TimeCardsProps) {
  return (
    <div className={styles.container}>
      {/* 第一張：過去 */}
      <TimeCard
        card={pastCard}
        position="past"
        icon="📜"
        order="第一張"
      />

      {/* 第二張：現在 */}
      <TimeCard
        card={presentCard}
        position="present"
        icon="🔥"
        order="第二張"
      />

      {/* 第三張：未來 */}
      <TimeCard
        card={futureCard}
        position="future"
        icon="✨"
        order="第三張"
      />
    </div>
  );
}

interface TimeCardProps {
  card: PastCardOutput | PresentCardOutput | FutureCardOutput;
  position: 'past' | 'present' | 'future';
  icon: string;
  order: string;
}

function TimeCard({ card, position, icon, order }: TimeCardProps) {
  const isPastCard = (c: any): c is PastCardOutput => 'formationCause' in c;
  const isPresentCard = (c: any): c is PresentCardOutput => 'currentState' in c;
  const isFutureCard = (c: any): c is FutureCardOutput => 'futureTrend' in c;

  return (
    <article
      className={`${styles.card} ${styles[`card_${position}`]}`}
      data-card-position={position}
    >
      {/* 卡片頭部 */}
      <header className={styles.cardHeader}>
        <div className={styles.titleBar}>
          <span className={styles.icon}>{icon}</span>
          <h2 className={styles.title}>{card.title}</h2>
        </div>
        <p className={styles.order}>{order}</p>
      </header>

      {/* 卡片本體：根據位置渲染不同結構 */}
      <section className={styles.cardBody}>
        {isPastCard(card) && (
          <PastCardBody card={card} />
        )}
        {isPresentCard(card) && (
          <PresentCardBody card={card} />
        )}
        {isFutureCard(card) && (
          <FutureCardBody card={card} />
        )}
      </section>

      {/* 卡片底部：證據強度 */}
      <footer className={styles.cardFooter}>
        <div className={styles.evidenceLevel}>
          <span className={styles.label}>證據強度</span>
          <span className={`${styles.badge} ${styles[`level_${card.evidenceLevel}`]}`}>
            L{card.evidenceLevel}
          </span>
        </div>
      </footer>
    </article>
  );
}

function PastCardBody({ card }: { card: PastCardOutput }) {
  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>根源</h3>
        <p className={styles.content}>{card.formationCause}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>生存模式</h3>
        <p className={styles.content}>{card.survivalPattern}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>性格痕跡</h3>
        <p className={styles.content}>{card.personalityTrace}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>現在殘留</h3>
        <p className={styles.content}>{card.currentResidue}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionHighlight}`}>
        <h3 className={styles.sectionTitle}>阿修羅揭底</h3>
        <p className={styles.content}>{card.asuraReveal}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionFinal}`}>
        <p className={styles.finalStrike}>{card.finalStrike}</p>
      </div>
    </>
  );
}

function PresentCardBody({ card }: { card: PresentCardOutput }) {
  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>當下狀態</h3>
        <p className={styles.content}>{card.currentState}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>最強力量</h3>
        <p className={styles.content}>{card.dominantForce}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>優勢</h3>
        <p className={styles.content}>{card.strength}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionWarning}`}>
        <h3 className={styles.sectionTitle}>⚠️ 盲點</h3>
        <p className={styles.content}>{card.currentBlindSpot}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionWarning}`}>
        <h3 className={styles.sectionTitle}>近期風險</h3>
        <p className={styles.content}>{card.immediateRisk}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionHighlight}`}>
        <h3 className={styles.sectionTitle}>當面點醒</h3>
        <p className={styles.content}>{card.asuraDirectHit}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>建議</h3>
        <p className={styles.content}>{card.currentAdvice}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionFinal}`}>
        <p className={styles.finalStrike}>{card.finalStrike}</p>
      </div>
    </>
  );
}

function FutureCardBody({ card }: { card: FutureCardOutput }) {
  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>趨勢</h3>
        <p className={styles.content}>{card.futureTrend}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>力量放大</h3>
        <p className={styles.content}>{card.amplification}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>轉折點</h3>
        <p className={styles.content}>{card.turningPoint}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionOpportunity}`}>
        <h3 className={styles.sectionTitle}>✨ 機會</h3>
        <p className={styles.content}>{card.opportunity}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionWarning}`}>
        <h3 className={styles.sectionTitle}>⚠️ 風險</h3>
        <p className={styles.content}>{card.risk}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>選擇</h3>
        <p className={styles.content}>{card.choiceBranch}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>代價</h3>
        <p className={styles.content}>{card.cost}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionHighlight}`}>
        <h3 className={styles.sectionTitle}>警告</h3>
        <p className={styles.content}>{card.asuraWarning}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>時間感</h3>
        <p className={styles.content}>{card.timeSense}</p>
      </div>

      <div className={`${styles.section} ${styles.sectionFinal}`}>
        <p className={styles.finalStrike}>{card.finalStrike}</p>
      </div>
    </>
  );
}
