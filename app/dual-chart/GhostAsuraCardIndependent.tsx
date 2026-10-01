/**
 * 鬼魅阿修羅卡片 — 獨立完整版
 * ============================================================================
 * 工程師專用｜直接開工版 2026-09-30
 *
 * 【最高優先級】本次只改這一張卡片。其他卡片完全禁止修改。
 *
 * 規格書核心：
 * 後端神煞數量 = 鬼魅阿修羅轉譯數量 = 前端實際顯示數量
 *
 * 職責：
 * 1. 讀取後端已驗證神煞
 * 2. 轉譯為阿修羅名稱與話術
 * 3. 完整顯示（不能漏一項）
 * 4. 驗證數量一致
 * ============================================================================
 */

'use client';

import type { DualChartResult } from '@/lib/dual-chart';
import {
  translateToAsuraName,
  validateCounts,
  validateEachItemPresent,
} from '@/lib/ghost-asura-translator';
import { getAsuraWording } from '@/lib/ghost-asura-wordings-core';
import styles from './dual-chart.module.css';

/**
 * 柱位映射（規格書第九項）
 */
const PILLAR_MAP: Record<
  string,
  { asura: string; traditional: string }
> = {
  year: { asura: '祖域', traditional: '年柱' },
  month: { asura: '命境', traditional: '月柱' },
  day: { asura: '本魂', traditional: '日柱' },
  hour: { asura: '後界', traditional: '時柱' },
};

/**
 * 主組件：獨立的鬼魅阿修羅卡片
 */
export function GhostAsuraCardIndependent({
  result,
}: {
  result: DualChartResult;
}) {
  // ========== 後端數據 ==========
  const asuraView = result.specialStars?.asura;

  if (!asuraView || asuraView.state !== 'READY') {
    return null;
  }

  // ========== 規格書第二項：資料流程 ==========
  // 取得所有後端神煞
  const allLines = (asuraView.groups ?? []).flatMap(g => g.lines ?? []);
  const backendCount = allLines.length;

  if (backendCount === 0) {
    return null;
  }

  // ========== 轉譯：所有神煞都必須轉譯 ==========
  const translatedLines = allLines.map(line => ({
    ...line,
    // 規格書第八項：前端用 displayName
    displayName:
      line.displayName || translateToAsuraName(line.originalName),
    // 取得話術
    wording: getAsuraWording(
      line.displayName || translateToAsuraName(line.originalName)
    ),
  }));

  const translatedCount = translatedLines.length;

  // ========== 重組四柱 ==========
  const groupedByPillar: Record<string, typeof translatedLines> = {};

  // 按原始分組重新組織
  (asuraView.groups ?? []).forEach(group => {
    if (!groupedByPillar[group.pillar]) {
      groupedByPillar[group.pillar] = [];
    }

    const groupLines = group.lines ?? [];
    groupLines.forEach(line => {
      const translated = translatedLines.find(
        t => t.originalName === line.originalName
      );
      if (translated) {
        groupedByPillar[group.pillar].push(translated);
      }
    });
  });

  // ========== 計算顯示數量 ==========
  const displayedCount = Object.values(groupedByPillar).reduce(
    (sum, lines) => sum + lines.length,
    0
  );

  // ========== 規格書第十七項：完整度檢查 ==========
  const countValidation = validateCounts(
    backendCount,
    translatedCount,
    displayedCount
  );

  // ========== 渲染 ==========
  return (
    <section
      className={styles.ghostAsuraCard}
      aria-label="鬼魅阿修羅"
      data-card-type="ghost-asura-independent"
    >
      {/* ========== 卡片頭 ========== */}
      <header className={styles.ghostAsuraHeader}>
        <h3 style={{ color: '#D4AF37' }}>⚡ 鬼魅阿修羅</h3>
        <p className={styles.ghostAsuraSubtitle} style={{ color: '#A89860' }}>
          命魂戰局 — 三千年戰神的宣言
        </p>
      </header>

      {/* ========== 摘要 ========== */}
      <div
        style={{
          background: 'rgba(212, 175, 55, 0.05)',
          borderLeft: '3px solid #D4AF37',
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '4px',
        }}
      >
        <p
          style={{
            color: '#F5D547',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {asuraView.opening ||
            '⚡ 我是三千年戰神。看著你的盤，我只有一句話：\n命盤是戰場，不是保護區。你已經站上去了。'}
        </p>
      </div>

      {/* ========== 計數摘要 ========== */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#A89860',
        }}
      >
        <span>
          <b style={{ color: '#D4AF37' }}>{displayedCount}</b> 項印記
        </span>
        <span>
          {translatedLines.filter(l => (l as any).matched !== false).length} 覺醒
        </span>
        <span>
          {translatedLines.filter(l => (l as any).matched === false).length} 沉眠
        </span>
      </div>

      {/* ========== 四柱分組 ========== */}
      {['year', 'month', 'day', 'hour'].map(pillarKey => {
        const pillar = PILLAR_MAP[pillarKey as keyof typeof PILLAR_MAP];
        const items = groupedByPillar[pillarKey] || [];

        if (items.length === 0) return null;

        return (
          <div
            key={pillarKey}
            style={{
              marginBottom: '20px',
              background: 'rgba(20, 15, 25, 0.8)',
              borderLeft: '3px solid #D4AF37',
              padding: '12px',
              borderRadius: '4px',
            }}
          >
            {/* 柱位標題 */}
            <h4
              style={{
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#D4AF37',
                letterSpacing: '0.08em',
              }}
            >
              <span>{pillar.asura}</span>
              <span style={{ fontSize: '12px', color: '#A89860' }}>
                （{pillar.traditional}）
              </span>
              <small
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(212, 175, 55, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  color: '#D4AF37',
                  fontWeight: 600,
                }}
              >
                {items.length}
              </small>
            </h4>

            {/* 神煞列表 — 規格書第一項：完整渲染 */}
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {items.map((line, idx) => (
                <li
                  key={`${pillarKey}:${line.originalName}:${idx}`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border:
                      (line as any).matched !== false
                        ? '1px solid rgba(212, 175, 55, 0.3)'
                        : '1px solid rgba(212, 175, 55, 0.1)',
                    borderLeft:
                      (line as any).matched !== false
                        ? '3px solid #D4AF37'
                        : '3px solid #A89860',
                    padding: '10px',
                    borderRadius: '4px',
                  }}
                >
                  {/* 名稱與狀態 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px',
                    }}
                  >
                    <strong style={{ color: '#F5D547', fontSize: '14px' }}>
                      {/* 規格書第八項：前端用 displayName */}
                      {line.displayName}
                    </strong>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        background: 'rgba(212, 175, 55, 0.1)',
                        color: '#D4AF37',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {(line as any).matched !== false ? '印記覺醒' : '印記沉眠'}
                    </span>
                  </div>

                  {/* 話術 */}
                  {line.wording && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#E8E8E8',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          color: '#F5D547',
                          fontWeight: 600,
                        }}
                      >
                        {line.wording.shortDeclaration}
                      </p>
                      <p style={{ margin: 0, color: '#E8E8E8' }}>
                        {line.wording.coreWarning}
                      </p>
                    </div>
                  )}

                  {/* 除錯資訊 */}
                  {process.env.NODE_ENV === 'development' && (
                    <small
                      style={{
                        display: 'block',
                        marginTop: '6px',
                        color: '#666',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    >
                      {line.originalName}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* ========== 收場宣言 ========== */}
      <div
        style={{
          padding: '16px',
          background: 'rgba(212, 175, 55, 0.05)',
          borderLeft: '3px solid #D4AF37',
          borderRadius: '4px',
          marginTop: '20px',
        }}
      >
        <p
          style={{
            color: '#F5D547',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {asuraView.closing ||
            '⚡ 破局是我的承諾。你的命盤，就是你的武器。\n怎麼打？看你。但站起來後就別坐下。'}
        </p>
      </div>

      {/* ========== 完整度檢查（除錯） ========== */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(100, 100, 100, 0.1)',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#999',
          }}
        >
          <p style={{ margin: '0 0 4px 0' }}>
            {countValidation.message}
          </p>
          <p style={{ margin: 0, fontFamily: 'monospace' }}>
            {countValidation.backend} = {countValidation.translated} = {countValidation.displayed}
          </p>
          {!countValidation.valid && (
            <p
              style={{
                margin: '4px 0 0 0',
                color: '#ff6b6b',
                fontWeight: 600,
              }}
            >
              ❌ 完整度檢查失敗
            </p>
          )}
        </div>
      )}
    </section>
  );
}
