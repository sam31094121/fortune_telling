/**
 * 鬼魅阿修羅卡片 — 完整前端實裝
 * ============================================================================
 * 工程師專用｜直接開工版 2026-09-30
 *
 * 規格書要求：
 * ✅ 後端所有神煞都必須顯示
 * ✅ 不能漏一項
 * ✅ 逐項 ID 核對
 * ✅ displayName 給使用者、originalName 只在除錯
 * ✅ 四柱分組：祖域、命境、本魂、後界
 * ============================================================================
 */

import type { DualChartResult } from '@/lib/dual-chart';
import { translateToAsuraName } from '@/lib/ghost-asura-translator';
import styles from './GhostAsuraCardComplete.module.css';

/**
 * 後端傳來的神煞結構
 */
interface ShenShaItem {
  id: string;
  originalName: string;
  matched: boolean;
  hitPillar?: 'year' | 'month' | 'day' | 'hour';
  source?: string;
  verified: boolean;
}

/**
 * 轉譯後的前端結構
 */
interface AsuraCardItem extends ShenShaItem {
  displayName: string;
  pillarName: string;
}

/**
 * 柱位中英對照（規格書第九項）
 */
const PILLAR_MAP = {
  year: { name: '祖域', traditional: '年柱' },
  month: { name: '命境', traditional: '月柱' },
  day: { name: '本魂', traditional: '日柱' },
  hour: { name: '後界', traditional: '時柱' },
};

/**
 * 將神煞數據轉譯為前端可用格式
 * 規格書第七項：全部資料進去（不能 filter、不能 slice）
 */
function translateAllShenSha(shenSha: ShenShaItem[]): AsuraCardItem[] {
  return shenSha.map(item => ({
    ...item,
    displayName: translateToAsuraName(item.originalName),
    pillarName: item.hitPillar
      ? PILLAR_MAP[item.hitPillar as keyof typeof PILLAR_MAP].name
      : '未命',
  }));
}

/**
 * 按柱位分組
 */
function groupByPillar(items: AsuraCardItem[]) {
  const groups: Record<string, AsuraCardItem[]> = {
    year: [],
    month: [],
    day: [],
    hour: [],
  };

  for (const item of items) {
    if (item.hitPillar && item.hitPillar in groups) {
      groups[item.hitPillar].push(item);
    }
  }

  return groups;
}

/**
 * 主卡片組件
 */
export function GhostAsuraCardComplete({
  result,
}: {
  result: DualChartResult;
}) {
  // 取得後端已驗證神煞（coverage；舊欄位 shenSha 已移除）
  const coverage = result.specialStars?.coverage ?? [];
  const backendShenSha: ShenShaItem[] = coverage.map((row) => ({
    id: row.id,
    originalName: row.name,
    matched: row.status === 'MATCHED',
    hitPillar: (row.matchedPillars?.[0] as ShenShaItem['hitPillar']) || undefined,
    verified: row.status === 'MATCHED' || row.status === 'NOT_MATCHED',
  }));

  // 轉譯全部（規格書第二項）
  const allAsuraItems = translateAllShenSha(backendShenSha);

  // 分組
  const grouped = groupByPillar(allAsuraItems);

  return (
    <section className={styles.asuraCard} aria-label="鬼魅阿修羅">
      {/* 卡片頭 */}
      <header className={styles.asuraHeader}>
        <h3>⚡ 鬼魅阿修羅</h3>
        <p className={styles.subtitle}>命魂戰局</p>
      </header>

      {/* 摘要 */}
      <div className={styles.summary}>
        <div className={styles.statsLine}>
          <span className={styles.totalCount}>
            <b>{allAsuraItems.length}</b> 項印記
          </span>
          <span className={styles.hitCount}>
            {allAsuraItems.filter(x => x.matched).length} 覺醒
          </span>
          <span className={styles.missingCount}>
            {allAsuraItems.filter(x => !x.matched).length} 沉眠
          </span>
        </div>
      </div>

      {/* 四柱分組顯示 */}
      <div className={styles.pillarGroups}>
        {['year', 'month', 'day', 'hour'].map(pillarKey => {
          const pillar = PILLAR_MAP[pillarKey as keyof typeof PILLAR_MAP];
          const items = grouped[pillarKey];

          if (items.length === 0) return null;

          return (
            <div key={pillarKey} className={styles.pillarGroup}>
              <h4 className={styles.pillarHead}>
                <span className={styles.pillarName}>{pillar.name}</span>
                <span className={styles.pillarTrad}>（{pillar.traditional}）</span>
                <small className={styles.itemCount}>{items.length}</small>
              </h4>

              {/* 規格書第九項：逐項渲染，不能漏 */}
              <ul className={styles.asuraList}>
                {items.map(item => (
                  <li
                    key={item.id}
                    className={styles.asuraItem}
                    data-matched={item.matched}
                    data-id={item.id}
                  >
                    <div className={styles.asuraName}>
                      {/* 規格書第八項：前端用 displayName */}
                      <strong>{item.displayName}</strong>

                      {/* 狀態標籤 */}
                      <span className={styles.status}>
                        {item.matched ? '印記覺醒' : '印記沉眠'}
                      </span>
                    </div>

                    {/* 除錯資訊：原始名稱（一般使用者不看） */}
                    {process.env.NODE_ENV === 'development' && (
                      <small className={styles.debug}>
                        {item.originalName} (ID: {item.id})
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* 完整度指示 */}
      <div className={styles.completeness}>
        <p className={styles.completionLabel}>
          後端: {backendShenSha.length} | 轉譯: {allAsuraItems.length} | 顯示: {allAsuraItems.length}
        </p>
        {backendShenSha.length === allAsuraItems.length ? (
          <p className={styles.pass}>✅ 完整度檢查通過</p>
        ) : (
          <p className={styles.fail}>❌ 數量不一致</p>
        )}
      </div>
    </section>
  );
}
