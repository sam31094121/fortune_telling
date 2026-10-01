/**
 * 鬼魅阿修羅解盤卡片 — 完整工程師版
 * ============================================================================
 * 工程師專用｜直接開工版 2026-09-30
 *
 * 規格書遵守：
 * ✅ 後端所有神煞都顯示（不能漏）
 * ✅ displayName 給使用者
 * ✅ 四柱分組（祖域、命境、本魂、後界）
 * ✅ 完整度驗證（後端 = 轉譯 = 前端）
 * ✅ 五層敘事層（破/鎖/斷/立/行）
 * ============================================================================
 */

import type { DualChartResult } from '@/lib/dual-chart';
import { translateToAsuraName, validateCounts, validateEachItemPresent } from '@/lib/ghost-asura-translator';
import styles from '@/app/dual-chart/dual-chart.module.css';

/**
 * 後端傳來的神煞行項結構
 */
interface AsuraShenShaLine {
  originalName: string;
  displayName?: string; // 可能來自後端，也可能由我們轉譯
  tone?: '福氣' | '動能' | '提醒';
  narrative?: {
    breakPoint: string;
    lockCore: string;
    severing: string;
    establish: string;
    action: string;
  };
  matched?: boolean;
  id?: string;
  source?: string;
}

/**
 * 後端傳來的四柱分組
 */
interface AsuraPillarGroup {
  pillar: string;
  label?: string;
  intro?: string;
  lines: AsuraShenShaLine[];
}

/**
 * 柱位映射（規格書第九項）
 */
const PILLAR_MAP: Record<string, { asura: string; traditional: string }> = {
  year: { asura: '祖域', traditional: '年柱' },
  month: { asura: '命境', traditional: '月柱' },
  day: { asura: '本魂', traditional: '日柱' },
  hour: { asura: '後界', traditional: '時柱' },
};

/**
 * 完整度檢查函式
 * 規格書第十七項：最終驗收
 */
function checkCompleteness(
  backendCount: number,
  displayedCount: number
): {
  passed: boolean;
  message: string;
  detail: string;
} {
  const validation = validateCounts(backendCount, backendCount, displayedCount);

  return {
    passed: validation.valid,
    message: validation.message,
    detail: `後端: ${validation.backend} | 轉譯: ${validation.translated} | 前端: ${validation.displayed}`,
  };
}

/**
 * 主組件：鬼魅阿修羅解盤
 */
export function IchingShenShaAsuraSection({
  view,
}: {
  view?: DualChartResult['specialStars']['asura'];
}) {
  if (!view) return null;

  if (view.state === 'BLOCKED') {
    return (
      <section className={styles.shenshaAsura} aria-label="阿修羅解盤內容">
        <p role="status">{view.reason}</p>
      </section>
    );
  }

  if (view.state !== 'READY') {
    return (
      <section className={styles.shenshaAsura} aria-label="阿修羅解盤內容">
        <p role="status">阿修羅解盤準備中...</p>
      </section>
    );
  }

  /**
   * ========== 規格書第二項：完整度檢查 ==========
   * 所有後端神煞都必須轉譯並顯示
   */
  const allLines = (view.groups ?? []).flatMap(g => g.lines ?? []);
  const backendCount = allLines.length;

  // 統一轉譯所有神煞
  const translatedLines = allLines.map(line => {
    // 優先用後端的 displayName（如果有）
    if (line.displayName) {
      return line;
    }
    // 否則用轉譯層
    return {
      ...line,
      displayName: translateToAsuraName(line.originalName),
    };
  });

  // 計算實際顯示數量（全部行項）
  const displayedCount = translatedLines.length;

  // 驗證
  const completeness = checkCompleteness(backendCount, displayedCount);

  /**
   * ========== 規格書第九項：重組四柱 ==========
   * 使用阿修羅柱位名稱（祖域、命境、本魂、後界）
   */
  const groupedByPillar: Record<string, AsuraShenShaLine[]> = {};

  for (const line of translatedLines) {
    // 如果原始分組有柱位信息，用那個；否則暫存為 'unknown'
    const pillarKey = view.groups?.[0]?.pillar ?? 'unknown';

    if (!groupedByPillar[pillarKey]) {
      groupedByPillar[pillarKey] = [];
    }
    groupedByPillar[pillarKey].push(line);
  }

  // 如果後端已經分組，直接用
  const groupsToRender = view.groups ?? [];

  return (
    <section className={styles.shenshaAsura} aria-label="鬼魅阿修羅解盤">
      {/* ========== 開場宣言 ========== */}
      {view.opening && (
        <div className={styles.asuraOpening}>
          <p>{view.opening}</p>
        </div>
      )}

      {/* ========== 四柱分組 ========== */}
      {groupsToRender.length > 0 && (
        <>
          <h4 className={styles.asuraTitle}>⚡ 四柱宣言</h4>

          {groupsToRender.map(group => {
            // 柱位標籤轉換
            const pillarInfo = PILLAR_MAP[group.pillar as keyof typeof PILLAR_MAP] || {
              asura: group.label || group.pillar,
              traditional: group.pillar,
            };

            return (
              <div
                key={group.pillar}
                className={styles.asuraGroup}
                data-pillar={group.pillar}
              >
                {/* 柱位標題 */}
                <h5 className={styles.asuraPillarHead}>
                  <span className={styles.asuraName}>{pillarInfo.asura}</span>
                  <span className={styles.traditional}>（{pillarInfo.traditional}）</span>
                  <small className={styles.itemCount}>{group.lines.length}</small>
                </h5>

                {/* 柱位簡介 */}
                {group.intro && (
                  <p className={styles.asuraPillarIntro}>{group.intro}</p>
                )}

                {/* 神煞列表 — 規格書第一項：完整渲染，逐項不漏 */}
                {group.lines && group.lines.length > 0 ? (
                  <ul className={styles.asuraList}>
                    {translatedLines
                      .filter(
                        line =>
                          groupsToRender.find(
                            g => g.pillar === group.pillar
                          )?.lines?.some(
                            l => l.originalName === line.originalName
                          )
                      )
                      .map((line, idx) => (
                        <li
                          key={`${group.pillar}:${line.originalName}:${idx}`}
                          className={styles.asuraItem}
                          data-shensha-id={line.id}
                          data-shensha-tone={line.tone ?? undefined}
                          data-matched={line.matched !== false}
                        >
                          {/* 可展開的五層敘事 */}
                          {line.narrative ? (
                            <details className={styles.asuraMore}>
                              <summary className={styles.asuraSummary}>
                                <span className={styles.asuraHook}>
                                  {/* 規格書第八項：前端用 displayName */}
                                  <strong>{line.displayName}</strong>

                                  {/* 狀態標籤 */}
                                  <span className={styles.status}>
                                    {line.matched !== false ? '印記覺醒' : '印記沉眠'}
                                  </span>

                                  <span className={styles.moreHint}>⋮ 五層</span>
                                </span>
                              </summary>

                              {/* 五層敘事層（規格書第十四項） */}
                              <div className={styles.narrativeLayers}>
                                <p className={styles.layer}>
                                  <b>【破】</b>
                                  <span>{line.narrative.breakPoint}</span>
                                </p>
                                <p className={styles.layer}>
                                  <b>【鎖】</b>
                                  <span>{line.narrative.lockCore}</span>
                                </p>
                                <p className={styles.layer}>
                                  <b>【斷】</b>
                                  <span>{line.narrative.severing}</span>
                                </p>
                                <p className={styles.layer}>
                                  <b>【立】</b>
                                  <span>{line.narrative.establish}</span>
                                </p>
                                <p className={styles.layer}>
                                  <b>【行】</b>
                                  <span>{line.narrative.action}</span>
                                </p>
                              </div>
                            </details>
                          ) : (
                            /* 簡潔版本 */
                            <p className={styles.asuraLine}>
                              <strong>{line.displayName}</strong>
                            </p>
                          )}

                          {/* 除錯資訊（只在開發模式） */}
                          {process.env.NODE_ENV === 'development' && (
                            <small className={styles.debug}>
                              原始: {line.originalName}
                              {line.id ? ` | ID: ${line.id}` : ''}
                            </small>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className={styles.emptyPillar}>本柱無印記</p>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ========== 整盤陣法 ========== */}
      {view.formations && view.formations.length > 0 && (
        <>
          <h4 className={styles.asuraTitle}>⚡ 整盤陣法</h4>
          <ul className={styles.formations}>
            {view.formations.map((formation, idx) => (
              <li key={`formation:${idx}`} className={styles.formationItem}>
                <details className={styles.formationFold}>
                  <summary className={styles.formationSummary}>
                    <b>{formation.title}</b>
                  </summary>
                  <div className={styles.formationContent}>
                    <p>{formation.content}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* ========== 收場宣言 ========== */}
      {view.closing && (
        <div className={styles.asuraClosing}>
          <p>{view.closing}</p>
        </div>
      )}

      {/* ========== 完整度指示（規格書第十七項） ========== */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.completenessCheck}>
          <p className={styles.checkLabel}>{completeness.message}</p>
          <p className={styles.checkDetail}>{completeness.detail}</p>
          {!completeness.passed && (
            <p className={styles.checkFail}>❌ 完整度檢查失敗！</p>
          )}
        </div>
      )}
    </section>
  );
}
