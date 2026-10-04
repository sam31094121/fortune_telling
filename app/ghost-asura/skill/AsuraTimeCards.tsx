/**
 * 技能頁三張摺疊卡（時間軸）：①過去｜命中神煞 ②現在｜柱位與封印 ③未來｜阿修羅判語。
 * 內容＝與卡頭三格完全相同的後端輸出（同一份 AsuraDisplay.sections），前端只照印：
 * 不排盤、不算神煞、不另篩選。生辰未送出前，三張卡照留，只放一句阿修羅口吻。
 */

'use client';

import { Fragment } from 'react';

import { ASURA_AWAIT_BIRTH } from '@/lib/ghost-asura-display-contract';
import { useAsuraReading } from './AsuraReadingContext';
import skill from './skill.module.css';
import styles from './asura-skill-reading.module.css';

const CARD_FRAME = [
  { key: 'hits', no: '①', heading: '過去', label: '命中神煞' },
  { key: 'pillars', no: '②', heading: '現在', label: '柱位與封印' },
  { key: 'verdict', no: '③', heading: '未來', label: '阿修羅判語' },
] as const;

export default function AsuraTimeCards() {
  const display = useAsuraReading()?.display ?? null;
  return (
    <div className={`${skill.mockCards} ${styles.timeCards}`} data-asura-time-cards={display ? 'ready' : 'idle'}>
      {CARD_FRAME.map((frame) => {
        const section = display?.sections.find((s) => s.key === frame.key) ?? null;
        const heading = section?.heading ?? frame.heading;
        const label = section?.label ?? frame.label;
        return (
          <details key={frame.key} className={`${skill.mockCard} ${styles.timeCard}`} data-asura-time-card={frame.key}>
            <summary>
              <span className={skill.mockNo}>
                {frame.no} {heading}
              </span>
              <strong>
                {heading}｜{label}
              </strong>
              <span className={skill.mockLevel}>後端照印</span>
            </summary>
            <div className={skill.mockBody}>
              {!display && <p className={styles.timeAwait}>{ASURA_AWAIT_BIRTH}</p>}
              {display?.hourNote && <p className={styles.timeHourNote}>{display.hourNote}</p>}
              {section?.lead && <p className={styles.timeLead}>{section.lead}</p>}
              {/* 讀盤逐段照印，每段後緊接該段印記的白話；0 印＝後端不給任何字，卡內只留標題列 */}
              {section?.blocks && section.blocks.length > 0 && (
                <div className={styles.timeNarrative} data-asura-narrative data-asura-interleaved>
                  {section.blocks.map((block, i) => (
                    <Fragment key={i}>
                      <p>{block.text}</p>
                      {block.plain.map((line) => (
                        <div key={line.label} className={styles.timePlainLine} data-asura-plain>
                          <span className={styles.timePlainTag}>白話</span>
                          <strong>{line.label}</strong>
                          {line.plain}
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>
              )}
              {section?.coda && (
                <p className={styles.timeCoda} data-asura-coda>
                  {section.coda}
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
