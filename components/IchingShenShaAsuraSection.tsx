/**
 * 阿修羅老師解盤（戰神話術分身）
 * ============================================================================
 * 只照印後端 buildShenShaAsura 的結果
 * 後端已產出：五層敘事層 (破/鎖/斷/立/行) + 四柱分組 + 整盤陣法 + 收場宣言
 * 前端零編結論，禁止運算
 *
 * 名稱轉譯層：所有神煞名稱自動用 asuraNameMap 轉譯成鬼魅阿修羅版本
 */

import type { DualChartResult } from '@/lib/dual-chart';
import styles from '@/app/dual-chart/dual-chart.module.css';

export function IchingShenShaAsuraSection({ view }: { view?: DualChartResult['specialStars']['asura'] }) {
  if (!view) return null;
  if (view.state === 'BLOCKED') {
    return (
      <section className={styles.shenshaAsura} aria-label="阿修羅解盤內容">
        <p role="status">{view.reason}</p>
      </section>
    );
  }

  return (
    <section className={styles.shenshaAsura} aria-label="阿修羅解盤內容">
      {/* 開場 — 阿修羅本人的宣言 */}
      <p className={styles.asuraOpening}>{view.opening}</p>

      {/* 四柱分組 — 每個神煞一份敘事層輸出 */}
      {view.groups && view.groups.length > 0 && (
        <>
          <h4 className={styles.asuraTitle}>四柱宣言</h4>
          {view.groups.map((group) => (
            <div key={group.pillar} className={styles.asuraGroup}>
              <h5>{group.pillar}</h5>
              {group.intro && <p className={styles.asuraPillarIntro}>{group.intro}</p>}
              <ul>
                {group.lines.map((line, index) => (
                    <li key={`${line.originalName}:${index}`} data-shensha-tone={line.tone ?? undefined}>
                      {line.narrative ? (
                        <details className={styles.asuraMore}>
                          <summary>
                            <span className={styles.asuraHook}>
                              {line.displayName}
                              <span className={styles.moreHint}>完整敘述</span>
                            </span>
                          </summary>
                          <div className={styles.asuraNarrativeLayers}>
                            <p><b>【破】</b> {line.narrative.breakPoint}</p>
                            <p><b>【鎖】</b> {line.narrative.lockCore}</p>
                            <p><b>【斷】</b> {line.narrative.severing}</p>
                            <p><b>【立】</b> {line.narrative.establish}</p>
                            <p><b>【行】</b> {line.narrative.action}</p>
                          </div>
                        </details>
                      ) : (
                        <p>
                          <b>{line.displayName}</b>
                        </p>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {/* 整盤陣法 — 組合的阿修羅視角 */}
      {view.formations && view.formations.length > 0 && (
        <>
          <h4 className={styles.asuraTitle}>整盤戰局</h4>
          <ul className={styles.asuraFormations}>
            {view.formations.map((f, index) => (
              <li key={`${f.title}:${index}`}>
                <details className={styles.formationFold}>
                  <summary>
                    <b>{f.title}</b>
                  </summary>
                  <p>{f.narrative}</p>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 收場 — 戰鬥宣言 */}
      <p className={styles.asuraClosing}>{view.closing}</p>

      {/* 免責聲明 */}
      <p className={styles.asuraDisclaimer}>{view.disclaimer}</p>
    </section>
  );
}
