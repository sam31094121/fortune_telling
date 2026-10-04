/**
 * 鬼魅阿修羅卡片 — 只讀後端已核可顯示資料
 *
 * 主路徑（/ghost-asura）：`display` 來自 POST /api/ghost-asura/reading，
 * 已在後端分組／篩選／排序；本元件只照印文字，不做任何分組或命理判斷。
 * 卡頭下方三段原生摺疊段（收合只顯示兩字標題）：時間軸：過去（命中神煞）／現在（柱位與封印）／未來（阿修羅判語）。
 *
 * 舊路徑 `reading`：僅 /dual-chart 阿修羅分頁暫留（尚未遷移），維持原樣不動。
 */

'use client';


import { Fragment, useMemo, useState } from 'react';
import { animationConfig } from '@/lib/ghost-asura-animation';
import type { AsuraDisplay, AsuraDisplaySeal } from '@/lib/ghost-asura-display-contract';
import type { GhostAsuraReading } from '../types';
import { GHOST_ASURA_CARD_TITLE, GHOST_ASURA_UI } from '../uiText';
import styles from './GhostAsuraCard.module.css';

export function GhostAsuraCard({ display, reading }: { display?: AsuraDisplay; reading?: GhostAsuraReading }) {
  if (display) return <DisplayCard display={display} />;
  if (reading) return <LegacyReadingCard reading={reading} />;
  return null;
}

/**
 * 卡頭橫幅：標題拆成左右兩組（鬼魅｜阿修羅）貼齊兩端，中間空隙蓋一方「修羅」白文印（純裝飾，aria-hidden）。
 * 只是排版拆字，標題文字不變（h2 以 aria-label 保留完整標題）；標題若非「鬼魅阿修羅」則整句顯示、不拆。
 */
function AsuraBanner({ title }: { title: string }) {
  const split = title === GHOST_ASURA_CARD_TITLE && title.length > 2;
  return (
    <div className={styles.asuraBanner} data-asura-banner>
      <h2 className={styles.bannerTitle} aria-label={title}>
        {split ? (
          <>
            <span className={styles.bannerLeft} aria-hidden="true">{title.slice(0, 2)}</span>
            {/* 印文「修羅」由 CSS 偽元素繪出，不進入標題文字（textContent 仍為「鬼魅阿修羅」） */}
            <span className={styles.bannerSeal} aria-hidden="true" data-asura-seal>
              <span className={styles.sealInk} />
            </span>
            <span className={styles.bannerRight} aria-hidden="true">{title.slice(2)}</span>
          </>
        ) : (
          title
        )}
      </h2>
    </div>
  );
}

/** 尚未送出生辰時的空框：只有標題與三格標題，不可展開、不含任何資料。 */
export function GhostAsuraCardShell() {
  return (
    <section className={styles.card} aria-label={GHOST_ASURA_CARD_TITLE} data-card-type="ghost-asura-reading" data-asura-shell>
      <header className={styles.asuraTopRow} data-asura-top-row>
        <AsuraBanner title={GHOST_ASURA_CARD_TITLE} />
        <div className={styles.asuraTiles}>
          {(['過去', '現在', '未來'] as const).map((heading) => (
            <button key={heading} type="button" className={`${styles.tileSquare} ${styles.tileSquareIdle}`} disabled aria-disabled="true">
              {heading}
            </button>
          ))}
        </div>
      </header>
    </section>
  );
}

/** 業主 2026-10-04：標題下小字（副標「本命阿修羅｜命魂戰局｜阿修羅秘卷」）暫不渲染；改 true 即恢復。 */
const SHOW_HEADER_SUBTITLE = false;

const TONE_ITEM: Record<AsuraDisplaySeal['tone'], string> = {
  awakened: `${styles.item} ${styles.itemAwakened}`,
  dormant: `${styles.item} ${styles.itemDormant}`,
  pending: `${styles.item} ${styles.itemPending}`,
};
const TONE_SEAL: Record<AsuraDisplaySeal['tone'], string> = {
  awakened: `${styles.seal} ${styles.sealAwakened}`,
  dormant: `${styles.seal} ${styles.sealDormant}`,
  pending: `${styles.seal} ${styles.sealPending}`,
};

function DisplayCard({ display }: { display: AsuraDisplay }) {
  const baseDelay =
    animationConfig.cardReveal.delay + animationConfig.cardReveal.duration + animationConfig.impressionGlow.delay;
  const [openKey, setOpenKey] = useState<string | null>(null);
  let glowIndex = 0;
  const nextDelay = () => baseDelay + glowIndex++ * animationConfig.impressionGlow.staggerDelay;

  return (
    <section
      className={styles.card}
      aria-label={display.title}
      data-card-type="ghost-asura-reading"
      data-guard-status={display.alert ? 'FAILED' : 'PASSED'}
      data-display-contract={display.contract}
    >
      {/* 橫幅「鬼魅［修羅印］阿修羅」＋下方過去／現在／未來一列三格：點格在下方全寬展開，再點收合。 */}
      <header className={styles.asuraTopRow} data-asura-top-row>
        <AsuraBanner title={display.title} />
        {SHOW_HEADER_SUBTITLE && <p className={styles.subtitle}>{display.subtitle}</p>}
        <div className={styles.asuraTiles}>
          {display.sections.map((section) => {
            const open = openKey === section.key;
            return (
              <button
                key={section.key}
                type="button"
                className={open ? `${styles.tileSquare} ${styles.tileSquareOn}` : styles.tileSquare}
                aria-expanded={open}
                aria-controls={`asura-fn-panel-${section.key}`}
                data-asura-tile={section.key}
                onClick={() => setOpenKey(open ? null : section.key)}
              >
                {section.heading}
              </button>
            );
          })}
        </div>
      </header>

      {display.hourNote && (
        <p className={styles.fnHourNote} data-asura-hour-note>
          {display.hourNote}
        </p>
      )}

      {display.alert && (
        <p className={`${styles.failed} ${styles.fnAlert}`} role="alert" data-guard="failed">
          {display.alert}
        </p>
      )}

      {display.sections.map((section) => (
        <section
          key={section.key}
          id={`asura-fn-panel-${section.key}`}
          className={styles.fnPanel}
          role="region"
          aria-label={section.heading}
          data-asura-function={section.key}
          hidden={openKey !== section.key}
        >
          {openKey === section.key && (
            <div className={styles.fnBody}>
              {section.lead && <p className={styles.fnLead}>{section.lead}</p>}
              {/* 讀盤逐段照印，每段後緊接該段印記的白話；0 印＝後端不給任何字，這裡就不印 */}
              {section.blocks && section.blocks.length > 0 && (
                <div className={styles.fnNarrative} data-asura-narrative data-asura-interleaved>
                  {section.blocks.map((block, i) => (
                    <Fragment key={i}>
                      <p>{block.text}</p>
                      {block.plain.map((line) => (
                        <div key={line.label} className={styles.fnPlainLine} data-asura-plain>
                          <span className={styles.fnPlainTag}>白話</span>
                          <strong>{line.label}</strong>
                          {line.plain}
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>
              )}
              {section.coda && (
                <p className={styles.fnCoda} data-asura-coda>
                  {section.coda}
                </p>
              )}
            </div>
          )}
        </section>
      ))}

      <p className={styles.scrollHint}>{display.scrollHint}</p>
      <div
        className={styles.pillarScroll}
        role="region"
        aria-label="四有與所屬印記，可左右捲動"
        tabIndex={0}
        data-asura-pillar-scroll
      >
        <div className={styles.pillarReadingGrid} data-asura-pillar-grid>
          <div className={styles.pillarsTable}>
            {display.columns.map((column) => (
              <div key={column.key} className={styles.pillarColumn} data-asura-pillar-head={column.key}>
                <div className={styles.pillarLabel}>{column.heading}</div>
                <div className={styles.pillarValue} data-asura-leading>{column.lead}</div>
                <small className={styles.pillarCount}>{column.countText}</small>
              </div>
            ))}
          </div>

          {display.columns.map((column) => (
            <div
              key={column.key}
              className={styles.pillarGroup}
              role="group"
              aria-label={`${column.heading}印記`}
              data-asura-column={column.key}
            >
              {column.seals.length === 0 && (
                <p className={styles.pillarEmpty} aria-label={`${column.heading}目前沒有對應印記`}>—</p>
              )}
              <ul className={styles.list} aria-label={`${column.heading}印記`} data-asura-list={column.heading}>
                {column.seals.map((seal) => (
                  <li
                    key={seal.id}
                    className={TONE_ITEM[seal.tone]}
                    data-asura-id={seal.id}
                    data-seal-status={seal.tone}
                    data-display-name={seal.name}
                    style={
                      seal.tone === 'awakened'
                        ? {
                            animation: 'asuraImpressionGlow 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                            animationDelay: `${nextDelay()}ms`,
                          }
                        : {}
                    }
                  >
                    <details className={styles.itemDetail} data-asura-detail>
                      <summary className={styles.itemHead}>
                        <strong className={styles.displayName}>{seal.name}</strong>
                      </summary>
                      <div className={styles.itemBody}>
                        <span className={TONE_SEAL[seal.tone]}>{seal.sealLabel}</span>
                        {(seal.declaration || seal.meaning) && (
                          <div className={styles.meaning}>
                            {seal.declaration && <div className={styles.meaningStrong}>{seal.declaration}</div>}
                            {seal.meaning}
                          </div>
                        )}
                        {seal.clash && (
                          <div className={styles.battleLine}>
                            <span style={{ color: '#fca5a5' }}>{GHOST_ASURA_UI.printClash}｜</span>
                            {seal.clash}
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.summaryFooter} data-asura-summary-footer>
        <div className={styles.banner} data-asura-banner>
          {display.lines.map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </div>
        <div className={styles.stats} data-asura-stats>
          {display.stats.map((stat) => (
            <span key={stat.label}>
              <b
                className={
                  stat.tone === 'awakened' ? styles.awakenedValue : stat.tone === 'pending' ? styles.pendingValue : undefined
                }
              >
                {stat.value}
              </b>{' '}
              {stat.label}
            </span>
          ))}
          <small className={styles.statsHint}>{display.statsHint}</small>
        </div>
      </div>

      {display.supplements.map((group) => (
        <section key={group.key} className={styles.section} data-layer={group.key}>
          <h3 className={styles.sectionTitle}>{group.heading}</h3>
          {group.entries.map((entry) => (
            <details key={entry.id} className={styles.supplement} data-asura-supplement={group.key}>
              <summary className={styles.supplementHead}>{entry.title}</summary>
              <div className={styles.sectionBody}>
                <div className={styles.fieldRow}>{entry.members}</div>
                <div>{entry.text}</div>
              </div>
            </details>
          ))}
        </section>
      ))}

      <section className={styles.section} data-layer="battlefield">
        <details className={styles.supplement} data-asura-supplement="battlefield">
          <summary className={styles.supplementHead}><h3>{display.battleField.heading}</h3></summary>
          <div className={styles.sectionBody}>
            {display.battleField.rows.map((row) => (
              <div key={row.label} className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{row.label}：</span>
                {row.text}
              </div>
            ))}
          </div>
        </details>
      </section>
      <p className={styles.scopeNote}>{display.scopeNote}</p>
    </section>
  );
}

function LegacyReadingCard({ reading }: { reading: GhostAsuraReading }) {
  const failed = reading.guard.status === 'FAILED';
  const pillarHitCount = (label: string) => reading.items.filter(item =>
    item.sealStatus === 'awakened' && item.pillarLabels.includes(label)).length;
  const pillarLead = (label: string) => reading.items.find(item =>
    item.sealStatus === 'awakened' && item.pillarLabels.includes(label))?.displayName ?? '暫無命中';

  // 計算印記動畫延遲：卡片展開後才逐個亮起
  const getImpressionAnimationDelay = useMemo(() => {
    let globalIndex = 0;
    return () => {
      const delay =
        animationConfig.cardReveal.delay +
        animationConfig.cardReveal.duration +
        animationConfig.impressionGlow.delay +
        globalIndex * animationConfig.impressionGlow.staggerDelay;
      globalIndex++;
      return delay;
    };
  }, []);

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
        aria-label="四有與所屬印記，可左右捲動"
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
                          style={
                            item.sealStatus === 'awakened'
                              ? {
                                  animation: `asuraImpressionGlow 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                                  animationDelay: `${getImpressionAnimationDelay()}ms`,
                                }
                              : {}
                          }
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
