/**
 * 鬼魅阿修羅卡片 — 只讀已核可顯示資料
 */

'use client';

import type { GhostAsuraReading } from '../types';
import { GHOST_ASURA_UI } from '../uiText';
import styles from './GhostAsuraCard.module.css';

export function GhostAsuraCard({ reading }: { reading: GhostAsuraReading }) {
  const failed = reading.guard.status === 'FAILED';
  const pillarHitCount = (label: string) => reading.items.filter(item =>
    item.sealStatus === 'awakened' && item.pillarLabels.includes(label)).length;
  const pillarLead = (label: string) => reading.items.find(item =>
    item.sealStatus === 'awakened' && item.pillarLabels.includes(label))?.displayName ?? '暫無命中';

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
        <span className={styles.crest} aria-hidden="true">修羅</span>
        <h2 className={styles.title}>{reading.cardTitle}</h2>
        <p className={styles.subtitle}>
          {GHOST_ASURA_UI.natalAsura}｜{GHOST_ASURA_UI.battleField}｜
          {GHOST_ASURA_UI.secretScroll}
        </p>
      </header>

      <p className={styles.scrollHint}>左右滑動查看四柱，印記依柱對齊。</p>
      <div
        className={styles.pillarScroll}
        role="region"
        aria-label="四柱與所屬印記，可左右捲動"
        tabIndex={0}
        data-asura-pillar-scroll
      >
      <div className={styles.pillarReadingGrid} data-asura-pillar-grid>
      {/* 柱頭與各柱印記共用四欄格線；標語和統計另置於列表下方。 */}
      <div className={styles.pillarsTable}>
        <div className={styles.pillarColumn} data-asura-pillar-head="year">
          <div className={styles.pillarLabel}>年柱</div>
          <div className={styles.pillarValue} data-asura-leading>{pillarLead('祖域（年柱）')}</div>
          <small className={styles.pillarCount}>共 {pillarHitCount('祖域（年柱）')} 枚印記</small>
        </div>
        <div className={styles.pillarColumn} data-asura-pillar-head="month">
          <div className={styles.pillarLabel}>月柱</div>
          <div className={styles.pillarValue} data-asura-leading>{pillarLead('命境（月柱）')}</div>
          <small className={styles.pillarCount}>共 {pillarHitCount('命境（月柱）')} 枚印記</small>
        </div>
        <div className={styles.pillarColumn} data-asura-pillar-head="day">
          <div className={styles.pillarLabel}>日柱</div>
          <div className={styles.pillarValue} data-asura-leading>{pillarLead('本魂（日柱）')}</div>
          <small className={styles.pillarCount}>共 {pillarHitCount('本魂（日柱）')} 枚印記</small>
        </div>
        <div className={styles.pillarColumn} data-asura-pillar-head="hour">
          <div className={styles.pillarLabel}>時柱</div>
          <div className={styles.pillarValue} data-asura-leading>{pillarLead('後界（時柱）')}</div>
          <small className={styles.pillarCount}>共 {pillarHitCount('後界（時柱）')} 枚印記</small>
        </div>
      </div>

      {failed && (
        <div className={styles.failed} role="alert" data-guard="failed">
          {GHOST_ASURA_UI.incompleteBanner}
          {reading.pendingEntries.length > 0 && (
            <div>
              待補 {reading.pendingEntries.length} 筆：
              {reading.pendingEntries
                .slice(0, 8)
                .map((entry) => entry.label || entry.resultId)
                .join('、')}
              {reading.pendingEntries.length > 8 ? '…' : ''}
            </div>
          )}
        </div>
      )}

      {/* 按四柱分組排列印記 — 年月日時順序 */}
      {(() => {
        const pillarOrder = [
          '祖域（年柱）',
          '命境（月柱）',
          '本魂（日柱）',
          '後界（時柱）',
        ];
        const pillarNames = ['年柱', '月柱', '日柱', '時柱'];
        const pillarKeys = ['year', 'month', 'day', 'hour'];
        const groupedByPillar = new Map<string, typeof reading.items>();

        reading.items.forEach((item) => {
          // 客戶列表只顯示後端已命中的印記；統計仍使用完整 reading，不改判定。
          if (item.sealStatus !== 'awakened') return;
          if (item.pillarLabels.length === 0) return;
          item.pillarLabels.forEach((pillar) => {
            if (!groupedByPillar.has(pillar)) {
              groupedByPillar.set(pillar, []);
            }
            groupedByPillar.get(pillar)!.push(item);
          });
        });

        return (
          <>
            {pillarOrder.map((fullLabel, idx) => {
              const itemsForPillar = groupedByPillar.get(fullLabel) || [];

              return (
                <div
                  key={fullLabel}
                  className={styles.pillarGroup}
                  role="group"
                  aria-label={`${pillarNames[idx]}印記`}
                  data-asura-column={pillarKeys[idx]}
                >
                  {itemsForPillar.length === 0 && (
                    <p className={styles.pillarEmpty} aria-label={`${pillarNames[idx]}目前沒有對應印記`}>—</p>
                  )}
                  <ul className={styles.list} aria-label={`${pillarNames[idx]}印記`} data-asura-list={pillarNames[idx]}>
                    {itemsForPillar.map((item) => {
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
                          data-display-name={item.displayName}
                        >
                          <details className={styles.itemDetail} data-asura-detail>
                          <summary className={styles.itemHead}>
                            <strong className={styles.displayName}>{item.displayName}</strong>
                          </summary>
                          <div className={styles.itemBody}>
                            <span className={sealClass}>{item.sealLabel}</span>

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
                          </div>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </>
        );
      })()}
      </div>
      </div>

      <div className={styles.summaryFooter} data-asura-summary-footer>
        <div className={styles.banner} data-asura-banner>
          別人還沒看見風暴，阿修羅先看見。
          <br />
          命盤是戰場，不是保護區。你已經站上去了。
        </div>
        <div className={styles.stats} data-asura-stats>
          <span><b>{reading.items.length}</b> 項印記</span>
          <span><b className={styles.awakenedValue}>{reading.awakenedCount}</b> {GHOST_ASURA_UI.sealAwakened}</span>
          <span><b>{reading.dormantCount}</b> {GHOST_ASURA_UI.sealDormant}</span>
          <span><b className={styles.pendingValue}>{reading.pendingCount}</b> {GHOST_ASURA_UI.sealPending}</span>
          <small className={styles.statsHint}>統計為印記種類；同一印記命中多柱時，各柱分別呈現。</small>
        </div>
      </div>

      {reading.dualClashes.length > 0 && (
        <section className={styles.section} data-layer="dual">
          <h3 className={styles.sectionTitle}>{GHOST_ASURA_UI.printClash}</h3>
          {reading.dualClashes.map((clash) => (
            <details key={clash.comboId} className={styles.supplement} data-asura-supplement="dual">
              <summary className={styles.supplementHead}>{clash.title}</summary>
              <div className={styles.sectionBody}>
              <div className={styles.fieldRow}>
                {clash.memberDisplayNames.join(' ↔ ')}
                {clash.pillarLabel ? `｜${clash.pillarLabel}` : ''}
              </div>
              <div>{clash.evidenceText}</div>
              </div>
            </details>
          ))}
        </section>
      )}

      {reading.chains.length > 0 && (
        <section className={styles.section} data-layer="chain">
          <h3 className={styles.sectionTitle}>{GHOST_ASURA_UI.asuraChain}</h3>
          {reading.chains.map((chain) => (
            <details key={chain.comboId} className={styles.supplement} data-asura-supplement="chain">
              <summary className={styles.supplementHead}>{chain.title}</summary>
              <div className={styles.sectionBody}>
              <div className={styles.fieldRow}>
                {chain.memberDisplayNames.join('、')}
              </div>
              <div>{chain.evidenceText}</div>
              </div>
            </details>
          ))}
        </section>
      )}

      <section className={styles.section} data-layer="battlefield">
        <details className={styles.supplement} data-asura-supplement="battlefield">
        <summary className={styles.supplementHead}><h3>{GHOST_ASURA_UI.battleField}</h3></summary>
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
        </details>
      </section>
      <p className={styles.scopeNote}>印記故事用於文化象徵與自我反思，不代表心理診斷或必然發生的預言。</p>
    </section>
  );
}
