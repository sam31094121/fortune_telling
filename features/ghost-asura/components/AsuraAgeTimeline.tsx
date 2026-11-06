'use client';


/**
 * 鬼魅阿修羅 — 年齡時間線（十二陣・四十八道戰痕）
 * 純渲染：後端 AsuraDisplay.ageTimeline 已組好句子與排序；這裡不運算、不編句、不顯示來源標籤。
 * 資料缺席時整段不畫。
 * 洋蔥層（optional depth）：每次只剝一層；無 depth 時與舊版相同只照印 lines。
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { AsuraAgeTimeline as AsuraAgeTimelineData } from '@/lib/ghost-asura-display-contract';
import styles from './AsuraAgeTimeline.module.css';
import motion from './AsuraAgeTimeline.motion.module.css';

/** 後端尚未落地前的可選洋蔥／導覽欄位（只增不改；前端本地延伸，不改 lib/）。 */
export type AsuraLineDepth = {
  basis: { text: string; hook: string };
  history: { text: string; source: string; hook: string } | null;
  action: string[];
  /** Final closing line after action; optional until backend lands */
  close?: string | null;
};

export type AsuraAgeTimelineGuide = {
  herePrefix?: string;
  /** backend live field */
  hereLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
  toPast?: string;
  toFuture?: string;
  endLine?: string;
};

export type AsuraAgeOpening = {
  headline: string;
  /** optional subcopy under headline; backend may omit */
  text?: string;
};

export type AsuraAgeTimelineSegmentView = AsuraAgeTimelineData['segments'][number] & {
  /** string kept for older payloads; prefer { headline } */
  opening?: string | AsuraAgeOpening | null;
  depth?: AsuraLineDepth[] | null;
  /** Connecting sentence to the next segment; last segment is null → show guide.endLine */
  bridge?: string | null;
};

function readOpeningHeadline(opening: AsuraAgeTimelineSegmentView['opening']): string {
  if (!opening) return '';
  if (typeof opening === 'string') return opening.trim();
  return (opening.headline || '').trim();
}

function readOpeningText(opening: AsuraAgeTimelineSegmentView['opening']): string {
  if (!opening || typeof opening === 'string') return '';
  return (opening.text || '').trim();
}

export type AsuraPremiumTitle = {
  segmentIndex: number;
  ageLabel?: string;
  phrase?: string;
  headline?: string;
};

export type AsuraAgeTimelineView = Omit<AsuraAgeTimelineData, 'segments'> & {
  segments: AsuraAgeTimelineSegmentView[];
  guide?: AsuraAgeTimelineGuide | null;
  /** Backend list of segments whose headline carries a high-value seal phrase */
  premiumTitles?: AsuraPremiumTitle[] | null;
};

export type AsuraAgeFocusRequest = {
  segmentIndex: number;
  lineIndex?: number;
  peelTo?: 'action' | 'basis' | 'history' | 'close';
  nonce: number;
};

type PeelLayerKind = 'basis' | 'history' | 'action' | 'close';

function listAvailableLayers(depth: AsuraLineDepth | null | undefined): PeelLayerKind[] {
  if (!depth) return [];
  const layers: PeelLayerKind[] = [];
  if (depth.basis && depth.basis.text) layers.push('basis');
  if (depth.history && depth.history.text) layers.push('history');
  if (Array.isArray(depth.action) && depth.action.length > 0) layers.push('action');
  if (typeof depth.close === 'string' && depth.close.trim()) layers.push('close');
  return layers;
}

function peelLevelForTarget(layers: PeelLayerKind[], peelTo?: AsuraAgeFocusRequest['peelTo']): number {
  if (!peelTo) return 0;
  const idx = layers.indexOf(peelTo);
  return idx >= 0 ? idx + 1 : layers.length;
}

export function AsuraAgeTimeline({
  data,
  focusRequest,
}: {
  data?: AsuraAgeTimelineView | AsuraAgeTimelineData | null;
  focusRequest?: AsuraAgeFocusRequest | null;
}) {
  const view = data as AsuraAgeTimelineView | null | undefined;
  const segments = view && Array.isArray(view.segments) ? view.segments : null;

  const currentIndex = useMemo(() => {
    if (!segments) return 0;
    const idx = segments.findIndex((s) => s.isCurrent);
    return idx >= 0 ? idx : 0;
  }, [segments]);

  const [openedIndex, setOpenedIndex] = useState<number>(0);
  const [visited, setVisited] = useState<Record<number, true>>({});
  const [peelLevels, setPeelLevels] = useState<Record<string, number>>({});
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!segments || bootstrapped) return;
    setOpenedIndex(currentIndex);
    setVisited({ [currentIndex]: true });
    setBootstrapped(true);
  }, [segments, currentIndex, bootstrapped]);

  useEffect(() => {
    if (!focusRequest || !segments) return;
    const target = focusRequest.segmentIndex;
    if (target < 0 || target >= segments.length) return;

    setOpenedIndex(target);
    setVisited((prev) => (prev[target] ? prev : { ...prev, [target]: true }));

    if (focusRequest.peelTo) {
      setPeelLevels((prev) => {
        const next = { ...prev };
        const seg = segments[target];
        const depths = Array.isArray(seg.depth) ? seg.depth : [];
        const lineIndexes =
          typeof focusRequest.lineIndex === 'number'
            ? [focusRequest.lineIndex]
            : seg.lines.map((_, i) => i);
        for (const li of lineIndexes) {
          const layers = listAvailableLayers(depths[li]);
          next[`${target}-${li}`] = peelLevelForTarget(layers, focusRequest.peelTo);
        }
        return next;
      });
    }

    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const run = () => {
      const el = document.querySelector(`[data-asura-age-seg-index="${target}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    };
    window.setTimeout(run, reduce ? 0 : 40);
  }, [focusRequest, segments]);

  if (!view || !segments || segments.length === 0) return null;

  const guide = view.guide ?? null;
  // fallback 必須與後端 AGE_TIMELINE_GUIDE 逐字相同（tests/ghost-asura-palace-verses.test.cjs 檢查）
  const herePrefix = (guide?.hereLabel || guide?.herePrefix || '').trim() || '你現在在這段，往下看';
  const prevLabel = (guide?.toPast || guide?.prevLabel || '').trim() || '點這裡看上一段';
  const nextLabel = (guide?.toFuture || guide?.nextLabel || '').trim() || '點這裡看下一段';
  const endLine = (guide?.endLine || '').trim() || '往後的路你都看完了。點最上面的亮點，回到你現在這段。';
  const viewerLine = typeof view.viewerLine === 'string' ? view.viewerLine.trim() : '';
  const currentSeg = segments[currentIndex];
  const premiumIndexSet = new Set(
    (Array.isArray(view.premiumTitles) ? view.premiumTitles : [])
      .map((p) => p.segmentIndex)
      .filter((i) => typeof i === 'number' && i >= 0 && i < segments.length),
  );
  const premiumPhraseByIndex = new Map();
  for (const p of Array.isArray(view.premiumTitles) ? view.premiumTitles : []) {
    if (typeof p.segmentIndex === 'number' && p.phrase) {
      premiumPhraseByIndex.set(p.segmentIndex, p.phrase);
    }
  }

  const openSegment = (index: number) => {
    if (index < 0 || index >= segments.length) return;
    setOpenedIndex(index);
    setVisited((prev) => (prev[index] ? prev : { ...prev, [index]: true }));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.querySelector(`[data-asura-age-seg-index="${index}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  };

  const peelOnce = (segIndex: number, lineIndex: number, max: number) => {
    const key = `${segIndex}-${lineIndex}`;
    setPeelLevels((prev) => {
      const cur = prev[key] ?? 0;
      if (cur >= max) return prev;
      return { ...prev, [key]: cur + 1 };
    });
  };

  return (
    <section
      className={`${styles.root} ${motion.motionRoot} ${motion.motionEntranceStage}`}
      aria-label={view.title}
      data-asura-age-timeline
    >
      <h2 className={styles.title}>{view.title}</h2>

      <div className={`${styles.hereBar} ${motion.motionEntranceGuide}`} data-asura-age-here>
        <p className={styles.hereText}>
          {herePrefix}
          <span className={styles.hereDot}> · </span>
          <span className={styles.hereAge}>{currentSeg?.ageLabel ?? ''}</span>
        </p>
        {viewerLine ? (
          <p className={`${styles.viewerLine} ${motion.motionEntranceViewer}`} data-asura-age-viewer>
            {viewerLine}
          </p>
        ) : null}
        <ol className={styles.progress} aria-label="年齡段進度">
          {segments.map((seg, i) => {
            const state = seg.isCurrent ? 'current' : visited[i] ? 'visited' : 'idle';
            const dotClass =
              state === 'current'
                ? `${styles.progressDot} ${styles.dotCurrent}`
                : state === 'visited'
                  ? `${styles.progressDot} ${styles.dotVisited}`
                  : `${styles.progressDot} ${styles.dotIdle}`;
            return (
              <li key={`dot-${i}`} className={styles.progressItem}>
                <button
                  type="button"
                  className={dotClass}
                  aria-label={`${seg.ageLabel}・${seg.tense}`}
                  aria-current={seg.isCurrent ? 'step' : undefined}
                  onClick={() => openSegment(i)}
                />
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.track} data-asura-age-track>
        {segments.map((segment, index) => {
          const isOpened = openedIndex === index;
          const segmentClass = segment.isCurrent
            ? `${styles.segment} ${styles.segmentCurrent} ${motion.motionSegment} ${motion.motionSegmentCurrent}`
            : `${styles.segment} ${motion.motionSegment}`;
          const key = `${segment.ageLabel}-${segment.tense}-${index}`;
          const depths = Array.isArray(segment.depth) ? segment.depth : null;
          const hasPrev = index > 0;
          const hasNext = index < segments.length - 1;
          const openedClass = isOpened
            ? ` ${styles.segmentOpened} ${motion.motionSegmentOpen}`
            : '';
          const bridgeText =
            typeof segment.bridge === 'string' ? segment.bridge.trim() : '';
          const isLast = index === segments.length - 1;

          return (
            <Fragment key={key}>
            <article
              id={`asura-age-seg-${index}`}
              className={`${segmentClass}${openedClass}`}
              data-asura-age-segment={segment.tense}
              data-asura-age-seg-index={index}
              data-current={segment.isCurrent ? 'true' : undefined}
              data-opened={isOpened ? 'true' : undefined}
              data-asura-premium={premiumIndexSet.has(index) ? 'true' : undefined}
            >
              {(() => {
                const headline = readOpeningHeadline(segment.opening);
                const openingText = readOpeningText(segment.opening);
                if (!isOpened) {
                  return (
                    <button
                      type="button"
                      className={styles.collapsedHit}
                      onClick={() => openSegment(index)}
                      aria-expanded={false}
                      aria-label={segment.ageLabel + '・' + segment.tense + (headline ? '・' + headline : '')}
                    >
                      {headline ? (
                        <span
                          className={
                            premiumIndexSet.has(index)
                              ? styles.headline + ' ' + styles.headlinePremium
                              : styles.headline
                          }
                          data-asura-premium-phrase={premiumPhraseByIndex.get(index) || undefined}
                        >
                          {premiumIndexSet.has(index) ? (
                            <span className={styles.premiumSeal} aria-hidden="true">印</span>
                          ) : null}
                          <span className={styles.headlineText}>{headline}</span>
                        </span>
                      ) : (
                        <span className={styles.lineSurface}>{segment.lines[0] ?? segment.ageLabel}</span>
                      )}
                      <span className={styles.collapsedMeta}>
                        <span className={styles.ageLabel}>{segment.ageLabel}</span>
                        <span className={styles.tense}>{segment.tense}</span>
                      </span>
                    </button>
                  );
                }
                return (
                  <>
                    {headline ? (
                      <h3
                        className={
                          premiumIndexSet.has(index)
                            ? styles.headline + ' ' + styles.headlinePremium
                            : styles.headline
                        }
                        data-asura-age-opening-headline
                        data-asura-premium-phrase={premiumPhraseByIndex.get(index) || undefined}
                      >
                        {premiumIndexSet.has(index) ? (
                          <span className={styles.premiumSeal} aria-hidden="true">印</span>
                        ) : null}
                        <span className={styles.headlineText}>{headline}</span>
                      </h3>
                    ) : null}
                    <header className={styles.segmentHead}>
                      <span className={styles.ageLabel}>{segment.ageLabel}</span>
                      <span className={styles.tense}>{segment.tense}</span>
                      {segment.isCurrent ? (
                        <span className={`${styles.hereTag} ${motion.motionEntranceCurrentMark}`} data-asura-age-peel-hint>
                          再剝一層
                        </span>
                      ) : null}
                    </header>
                    {openingText ? (
                      <p className={styles.opening} data-asura-age-opening>
                        {openingText}
                      </p>
                    ) : null}
                    <ul className={styles.lines}>
                      {segment.lines.map((line, lineIndex) => {
                        const depth = depths?.[lineIndex] ?? null;
                        const layers = listAvailableLayers(depth);
                        const max = layers.length;
                        const peeled = peelLevels[`${index}-${lineIndex}`] ?? 0;
                        const canPeel = max > 0 && peeled < max;
                        const shown = layers.slice(0, peeled);
                        const expanded = peeled > 0;

                        return (
                          <li
                            key={`${key}-l${lineIndex}`}
                            className={`${styles.line} ${motion.motionLine} ${motion.motionPeel}`}
                            data-asura-age-line={lineIndex}
                            data-peeled={peeled}
                          >
                            <div className={styles.lineSurface}>{line}</div>
                            {shown.map((kind) => {
                              if (!depth) return null;
                              if (kind === 'basis') {
                                return (
                                  <div
                                    key="basis"
                                    className={`${styles.peelLayer} ${motion.motionPeelLayer}`}
                                    data-asura-peel-layer="basis"
                                  >
                                    <p className={styles.peelText}>{depth.basis.text}</p>
                                    {depth.basis.hook ? (
                                      <p className={styles.peelHook}>{depth.basis.hook}</p>
                                    ) : null}
                                  </div>
                                );
                              }
                              if (kind === 'history' && depth.history) {
                                return (
                                  <div
                                    key="history"
                                    className={`${styles.peelLayer} ${motion.motionPeelLayer}`}
                                    data-asura-peel-layer="history"
                                  >
                                    <p className={styles.peelText}>{depth.history.text}</p>
                                    {depth.history.source ? (
                                      <p className={styles.peelSource}>{depth.history.source}</p>
                                    ) : null}
                                    {depth.history.hook ? (
                                      <p className={styles.peelHook}>{depth.history.hook}</p>
                                    ) : null}
                                  </div>
                                );
                              }
                              if (kind === 'action') {
                                return (
                                  <div
                                    key="action"
                                    className={`${styles.peelLayer} ${motion.motionPeelLayer}`}
                                    data-asura-peel-layer="action"
                                  >
                                    <ul className={styles.peelActions}>
                                      {depth.action.map((a, ai) => (
                                        <li key={`a-${ai}`}>{a}</li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              }
                              if (kind === 'close' && depth.close) {
                                return (
                                  <div
                                    key="close"
                                    className={`${styles.peelLayer} ${styles.peelClose} ${motion.motionPeelLayer}`}
                                    data-asura-peel-layer="close"
                                  >
                                    <p className={styles.peelCloseText}>{depth.close}</p>
                                  </div>
                                );
                              }
                              return null;
                            })}
                            {max > 0 ? (
                              <div className={styles.peelMeta}>
                                <span className={styles.peelProgress} data-asura-peel-progress>
                                  已剝 {peeled}／{max}
                                </span>
                                {canPeel ? (
                                  <button
                                    type="button"
                                    className={
                                      segment.isCurrent
                                        ? `${styles.peelButton} ${styles.peelButtonCurrent}`
                                        : styles.peelButton
                                    }
                                    aria-expanded={expanded}
                                    aria-controls={`asura-peel-${index}-${lineIndex}`}
                                    onClick={() => peelOnce(index, lineIndex, max)}
                                  >
                                    再剝一層
                                  </button>
                                ) : (
                                  <span className={styles.peelDone} data-asura-peel-done>
                                    已剝到底
                                  </span>
                                )}
                              </div>
                            ) : null}
                            <div id={`asura-peel-${index}-${lineIndex}`} hidden={peeled === 0} />
                          </li>
                        );
                      })}
                    </ul>
                  </>
                );
              })()}

              {isOpened ? (
                <nav className={styles.segNav} aria-label="年齡段導覽">
                  {hasPrev ? (
                    <button
                      type="button"
                      className={styles.segNavLink}
                      onClick={() => openSegment(index - 1)}
                    >
                      {prevLabel}
                    </button>
                  ) : (
                    <span className={styles.segNavSpacer} />
                  )}
                  {hasNext ? (
                    <button
                      type="button"
                      className={styles.segNavLink}
                      onClick={() => openSegment(index + 1)}
                    >
                      {nextLabel}
                    </button>
                  ) : (
                    <span className={styles.segNavSpacer} />
                  )}
                </nav>
              ) : null}
            </article>
            {!isLast && bridgeText ? (
              <p
                className={`${styles.bridge} ${motion.motionBridge}`}
                data-asura-age-bridge={index}
              >
                {bridgeText}
              </p>
            ) : null}
            {isLast && !bridgeText && endLine ? (
              <p
                className={`${styles.endLine} ${motion.motionBridge}`}
                data-asura-age-endline
              >
                {endLine}
              </p>
            ) : null}
            {isLast && bridgeText ? (
              <p
                className={`${styles.bridge} ${motion.motionBridge}`}
                data-asura-age-bridge={index}
              >
                {bridgeText}
              </p>
            ) : null}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
