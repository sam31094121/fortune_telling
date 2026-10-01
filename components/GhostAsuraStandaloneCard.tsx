/**
 * 鬼魅阿修羅獨立卡片 — 完全阿修羅版本
 *
 * 工程師專用｜直接開工版
 *
 * 【最高優先級】
 * 本卡片完全獨立，不涉及八字、紫微、柱位算法。
 * 只顯示阿修羅轉譯結果。
 *
 * 視覺順序（附件十五）：
 * 名稱 → 印記狀態 → 落印柱位 → 阿修羅解盤 → 戰局關聯
 */

'use client';

import {
  translateAllShenSha,
  assertCompleteTranslation,
  type ShenShaRaw,
} from '@/lib/ghost-asura-complete';
import { getAsuraWording } from '@/lib/ghost-asura-wordings-core';

interface GhostAsuraStandaloneCardProps {
  /**
   * 後端已驗證的原始神煞資料
   */
  shenShaData: ShenShaRaw[];
}

const PILLAR_MAP: Record<string, { asura: string; traditional: string }> = {
  year: { asura: '祖域', traditional: '年柱' },
  month: { asura: '命境', traditional: '月柱' },
  day: { asura: '本魂', traditional: '日柱' },
  hour: { asura: '後界', traditional: '時柱' },
  年: { asura: '祖域', traditional: '年柱' },
  月: { asura: '命境', traditional: '月柱' },
  日: { asura: '本魂', traditional: '日柱' },
  時: { asura: '後界', traditional: '時柱' },
  年柱: { asura: '祖域', traditional: '年柱' },
  月柱: { asura: '命境', traditional: '月柱' },
  日柱: { asura: '本魂', traditional: '日柱' },
  時柱: { asura: '後界', traditional: '時柱' },
};

function formatPillarLabel(hitPillar?: string): string | null {
  if (!hitPillar) return null;
  const mapped = PILLAR_MAP[hitPillar];
  if (mapped) {
    return `${mapped.asura}（${mapped.traditional}）`;
  }
  return hitPillar;
}

/**
 * 主卡片：純阿修羅版本
 */
export function GhostAsuraStandaloneCard({
  shenShaData,
}: GhostAsuraStandaloneCardProps) {
  const backendCount = shenShaData.length;

  if (backendCount === 0) {
    return null;
  }

  const translatedLines = translateAllShenSha(shenShaData);
  const displayedCount = translatedLines.length;

  const validation = assertCompleteTranslation({
    backendShenSha: shenShaData,
    translatedResults: translatedLines,
    displayedResults: translatedLines,
  });

  if (!validation.passed) {
    console.error('❌ 阿修羅卡片完整度檢查失敗', validation);
    return null;
  }

  const awakenedCount = translatedLines.filter((line) => line.matched).length;
  const dormantCount = translatedLines.filter((line) => !line.matched).length;

  return (
    <section
      className="ghost-asura-standalone-card"
      aria-label="鬼魅阿修羅獨立卡片"
      data-card-type="ghost-asura-standalone"
      style={{
        background: 'linear-gradient(160deg, rgba(8,8,10,0.98), rgba(20,12,14,0.96))',
        border: '1px solid rgba(161,161,170,0.35)',
        borderRadius: 12,
        boxShadow: '0 0 28px rgba(127,29,29,0.18)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          background: 'linear-gradient(135deg, rgba(39,39,42,0.55), rgba(127,29,29,0.18))',
          borderBottom: '1px solid rgba(161,161,170,0.28)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }} aria-hidden>
            ⚡
          </span>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 'bold',
                color: '#F4F4F5',
                letterSpacing: '0.05em',
              }}
            >
              本命阿修羅
            </h2>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: 12,
                color: '#A1A1AA',
                letterSpacing: '0.05em',
              }}
            >
              命魂戰局｜阿修羅秘卷
            </p>
          </div>
        </div>
      </header>

      <div
        style={{
          background: 'rgba(127, 29, 29, 0.08)',
          borderLeft: '3px solid #7F1D1D',
          padding: 16,
          fontSize: 14,
          color: '#FECACA',
          lineHeight: 1.8,
          fontWeight: 600,
        }}
      >
        別人還沒看見風暴，阿修羅先看見。
        <br />
        命盤是戰場，不是保護區。你已經站上去了。
      </div>

      <div
        style={{
          display: 'flex',
          gap: 20,
          padding: '16px 20px',
          fontSize: 13,
          color: '#A1A1AA',
          background: 'rgba(9, 9, 11, 0.65)',
          borderBottom: '1px solid rgba(161,161,170,0.12)',
          flexWrap: 'wrap',
        }}
      >
        <span>
          <b style={{ color: '#F4F4F5' }}>{displayedCount}</b> 項印記
        </span>
        <span>
          <b style={{ color: '#FCA5A5' }}>{awakenedCount}</b> 印記覺醒
        </span>
        <span>
          <b style={{ color: '#A1A1AA' }}>{dormantCount}</b> 印記沉眠
        </span>
        <span style={{ color: '#71717A' }}>印記交鋒就緒</span>
      </div>

      <div style={{ padding: 20, background: 'rgba(9, 9, 11, 0.85)' }}>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {translatedLines.map((line, idx) => {
            const pillarLabel = formatPillarLabel(line.hitPillar);
            const wording = getAsuraWording(line.displayName);

            return (
              <li
                key={`${line.id}:${idx}`}
                data-asura-id={line.id}
                data-original-name={line.originalName}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${
                    line.matched ? 'rgba(127, 29, 29, 0.45)' : 'rgba(161, 161, 170, 0.18)'
                  }`,
                  borderLeft: `3px solid ${line.matched ? '#7F1D1D' : '#52525B'}`,
                  padding: 12,
                  borderRadius: 6,
                }}
              >
                {/* 1. 名稱 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <strong style={{ color: '#FAFAFA', fontSize: 14 }}>
                    {line.displayName}
                  </strong>

                  {/* 2. 印記狀態 */}
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: line.matched
                        ? 'rgba(127, 29, 29, 0.25)'
                        : 'rgba(63, 63, 70, 0.45)',
                      color: line.matched ? '#FECACA' : '#A1A1AA',
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {line.matched ? '印記覺醒' : '印記沉眠'}
                  </span>
                </div>

                {/* 3. 落印柱位 */}
                {pillarLabel && (
                  <div style={{ fontSize: 12, color: '#A1A1AA', marginBottom: 6 }}>
                    落印：{pillarLabel}
                  </div>
                )}

                {/* 4. 阿修羅解盤 */}
                {wording && (
                  <div
                    style={{
                      fontSize: 13,
                      color: '#D4D4D8',
                      lineHeight: 1.7,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#FECACA', marginBottom: 2 }}>
                      {wording.shortDeclaration}
                    </div>
                    <div>{wording.coreWarning}</div>
                  </div>
                )}

                {/* 5. 戰局關聯 */}
                {wording && (
                  <div style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.6 }}>
                    <span style={{ color: '#FCA5A5' }}>印記交鋒｜</span>
                    {wording.battleSignificance} {wording.verdict}
                  </div>
                )}

                {process.env.NODE_ENV === 'development' && (
                  <small
                    style={{
                      display: 'block',
                      color: '#666',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      marginTop: 8,
                    }}
                  >
                    原始：{line.originalName}
                    {line.generated ? ' (延伸生成)' : ''}
                  </small>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div
        style={{
          padding: '16px 20px',
          background: 'rgba(127, 29, 29, 0.08)',
          borderTop: '1px solid rgba(161,161,170,0.12)',
          fontSize: 14,
          color: '#FECACA',
          lineHeight: 1.8,
          fontWeight: 600,
        }}
      >
        毀滅阿修羅不問你怕不怕。只問——你能不能在劫勢成形前，先讓它消失。
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            marginTop: 0,
            padding: 12,
            background: 'rgba(100, 100, 100, 0.1)',
            fontSize: 12,
            color: '#999',
          }}
        >
          <p style={{ margin: '0 0 4px 0' }}>{validation.countCheck.message}</p>
          <p style={{ margin: 0, fontFamily: 'monospace' }}>
            {validation.countCheck.backend} = {validation.countCheck.translated} ={' '}
            {validation.countCheck.displayed}
          </p>
        </div>
      )}
    </section>
  );
}
