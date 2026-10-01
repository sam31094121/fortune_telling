/**
 * 鬼魅阿修羅卡片 — 只讀已核可顯示資料
 */

'use client';

import type { GhostAsuraReading } from '../types';
import { GHOST_ASURA_UI } from '../uiText';
import styles from './GhostAsuraCard.module.css';

export function GhostAsuraCard({ reading }: { reading: GhostAsuraReading }) {
  const failed = reading.guard.status === 'FAILED';

  return (
    <section
      className={styles.card}
      aria-label={reading.cardTitle}
      data-card-type="ghost-asura-reading"
      data-result-batch={reading.resultBatchId}
      data-guard-status={reading.guard.status}
      data-item-count={reading.items.length}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{reading.cardTitle}</h2>
        <p className={styles.subtitle}>
          {GHOST_ASURA_UI.natalAsura}｜{GHOST_ASURA_UI.battleField}｜
          {GHOST_ASURA_UI.secretScroll}
        </p>
      </header>

      <div className={styles.banner}>
        別人還沒看見風暴，阿修羅先看見。
        <br />
        命盤是戰場，不是保護區。你已經站上去了。
      </div>

      <div className={styles.stats}>
        <span>
          <b>{reading.items.length}</b> 項印記
        </span>
        <span>
          <b style={{ color: '#fca5a5' }}>{reading.awakenedCount}</b>{' '}
          {GHOST_ASURA_UI.sealAwakened}
        </span>
        <span>
          <b>{reading.dormantCount}</b> {GHOST_ASURA_UI.sealDormant}
        </span>
        <span>
          <b style={{ color: '#fde68a' }}>{reading.pendingCount}</b>{' '}
          {GHOST_ASURA_UI.sealPending}
        </span>
      </div>

      {failed && (
        <div className={styles.failed} role="alert" data-guard="failed">
          {GHOST_ASURA_UI.incompleteBanner}
          <div>{reading.guard.message}</div>
          {reading.pendingEntries.length > 0 && (
            <div>
              待補 {reading.pendingEntries.length} 筆：
              {reading.pendingEntries
                .slice(0, 8)
                .map((entry) => entry.originalName)
                .join('、')}
              {reading.pendingEntries.length > 8 ? '…' : ''}
            </div>
          )}
        </div>
      )}

      <ul className={styles.list} data-asura-list="full">
        {reading.items.map((item) => {
          const itemClass =
            item.sealStatus === 'awakened'
              ? `${styles.item} ${styles.itemAwakened}`
              : item.sealStatus === 'dormant'
                ? `${styles.item} ${styles.itemDormant}`
                : `${styles.item} ${styles.itemPending}`;
          const sealClass =
            item.sealStatus === 'awakened'
              ? `${styles.seal} ${styles.sealAwakened}`
              : item.sealStatus === 'dormant'
                ? `${styles.seal} ${styles.sealDormant}`
                : `${styles.seal} ${styles.sealPending}`;

          return (
            <li
              key={item.resultId}
              className={itemClass}
              data-asura-id={item.resultId}
              data-seal-status={item.sealStatus}
              data-display-name={item.displayName ?? ''}
            >
              <div className={styles.itemHead}>
                <strong className={styles.displayName}>
                  {item.displayName ?? '（名稱待核可）'}
                </strong>
                <span className={sealClass}>{item.sealLabel}</span>
              </div>

              {item.pillarLabels.length > 0 && (
                <div className={styles.pillar}>
                  落印：{item.pillarLabels.join('、')}
                </div>
              )}

              {item.sealStatus === 'pending' ? (
                <div className={styles.meaning}>
                  {item.pendingReason ?? GHOST_ASURA_UI.pendingHint}
                </div>
              ) : (
                <>
                  {item.shortDeclaration && (
                    <div className={styles.meaning}>
                      <div className={styles.meaningStrong}>
                        {item.shortDeclaration}
                      </div>
                      {item.coreMeaning}
                    </div>
                  )}
                  {(item.battleSignificance || item.verdict) && (
                    <div className={styles.battleLine}>
                      <span style={{ color: '#fca5a5' }}>
                        {GHOST_ASURA_UI.printClash}｜
                      </span>
                      {item.battleSignificance} {item.verdict}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {reading.dualClashes.length > 0 && (
        <section className={styles.section} data-layer="dual">
          <h3 className={styles.sectionTitle}>{GHOST_ASURA_UI.printClash}</h3>
          {reading.dualClashes.map((clash) => (
            <div key={clash.comboId} className={styles.sectionBody}>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{clash.title}：</span>
                {clash.memberDisplayNames.join(' ↔ ')}
                {clash.pillarLabel ? `｜${clash.pillarLabel}` : ''}
              </div>
              <div>{clash.evidenceText}</div>
            </div>
          ))}
        </section>
      )}

      {reading.chains.length > 0 && (
        <section className={styles.section} data-layer="chain">
          <h3 className={styles.sectionTitle}>{GHOST_ASURA_UI.asuraChain}</h3>
          {reading.chains.map((chain) => (
            <div key={chain.comboId} className={styles.sectionBody}>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{chain.title}：</span>
                {chain.memberDisplayNames.join('、')}
              </div>
              <div>{chain.evidenceText}</div>
            </div>
          ))}
        </section>
      )}

      <section className={styles.section} data-layer="battlefield">
        <h3 className={styles.sectionTitle}>{GHOST_ASURA_UI.battleField}</h3>
        <div className={styles.sectionBody}>
          {(
            [
              ['主戰魂', reading.battleField.mainSoul],
              ['主要護印', reading.battleField.mainGuardian],
              ['主要劫印', reading.battleField.mainTribulation],
              ['主要陰影', reading.battleField.mainShadow],
              ['魅緣力量', reading.battleField.charmPower],
              ['權勢力量', reading.battleField.authorityPower],
              ['財庫力量', reading.battleField.treasurePower],
              ['移動力量', reading.battleField.movementPower],
              ['突破口', reading.battleField.breakthrough],
              ['戰局宣判', reading.battleField.finalVerdict],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className={styles.fieldRow}>
              <span className={styles.fieldLabel}>{label}：</span>
              {value}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
