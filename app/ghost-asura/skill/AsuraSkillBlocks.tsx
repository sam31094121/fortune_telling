/**
 * 鬼魅阿修羅｜技能檔案 — 顯示層（只照印）
 *
 * 內容與順序全部來自後端 lib/ghost-asura-skill-file.ts 的 buildAsuraSkillFile()：
 * 這裡只依 block.type 選版型、依陣列原順序輸出，不內建任何技能文字，不排序、不挑選、不改寫。
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SkillBlock, SkillSection } from '@/lib/ghost-asura-skill-file';
import styles from './skill.module.css';
import AsuraSkillReading from './AsuraSkillReading';
import { AsuraReadingProvider } from './AsuraReadingContext';
import AsuraTimeCards from './AsuraTimeCards';

type Variant = 'must' | 'deny' | 'plain';

export function SealCard({ section, children }: { section: Pick<SkillSection, 'id' | 'seal' | 'title' | 'lead'>; children: ReactNode }) {
  return (
    <section className={styles.card} id={section.id} aria-labelledby={`${section.id}-title`}>
      <header className={styles.cardHead}>
        <span className={styles.seal} aria-hidden="true">
          {section.seal}
        </span>
        <div>
          <h2 id={`${section.id}-title`} className={styles.cardTitle}>
            {section.title}
          </h2>
          <p className={styles.lead}>{section.lead}</p>
        </div>
      </header>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

function List({ items, variant }: { items: string[]; variant?: Variant }) {
  const cls = variant === 'must' ? styles.listMust : variant === 'deny' ? styles.listDeny : styles.list;
  return (
    <ul className={cls}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Chips({ items, tone }: { items: string[]; tone?: 'gold' | 'ember' }) {
  return (
    <ul className={tone === 'ember' ? styles.chipsEmber : styles.chips}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CopyLines({ lines }: { lines: string[] }) {
  return (
    <div className={styles.scrollText}>
      {lines.map((line, i) =>
        line === '' ? <span key={i} className={styles.gap} aria-hidden="true" /> : <p key={i}>{line}</p>,
      )}
    </div>
  );
}

function Flow({ steps }: { steps: string[] }) {
  return (
    <ol className={styles.flow}>
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

function Block({ block }: { block: SkillBlock }): ReactNode {
  switch (block.type) {
    case 'eyebrow':
      return <p className={styles.eyebrow}>{block.text}</p>;
    case 'skillName':
      return <p className={styles.skillName}>{block.text}</p>;
    case 'command':
      return (
        <div className={styles.command}>
          <span className={styles.commandLabel}>{block.label}</span>
          <strong className={styles.commandWord}>{block.word}</strong>
          <p className={styles.commandNote}>{block.note}</p>
        </div>
      );
    case 'facts':
      return (
        <dl className={styles.facts}>
          {block.rows.map((fact) => (
            <div key={fact.label} className={styles.fact}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      );
    case 'manifesto':
      return (
        <blockquote className={styles.manifesto}>
          {block.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </blockquote>
      );
    case 'motto':
      return <p className={styles.motto}>{block.text}</p>;
    case 'ironRules':
      return (
        <ol className={styles.ironRules}>
          {block.items.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      );
    case 'subTitle':
      return <h3 className={styles.subTitle}>{block.text}</h3>;
    case 'chips':
      return <Chips items={block.items} tone={block.tone} />;
    case 'flow':
      return <Flow steps={block.steps} />;
    case 'code':
      return <p className={styles.code}>{block.text}</p>;
    case 'division':
      return (
        <dl className={styles.division}>
          {block.rows.map((row) => (
            <div key={row.layer}>
              <dt>{row.layer}</dt>
              <dd>{row.duty}</dd>
            </div>
          ))}
        </dl>
      );
    case 'twoCol':
      return (
        <div className={styles.twoCol}>
          {[block.left, block.right].map((c) => (
            <div key={c.head.text}>
              {c.head.level === 'miniHead' ? <p className={styles.miniHead}>{c.head.text}</p> : <h3 className={styles.subTitle}>{c.head.text}</h3>}
              <List items={c.items} variant={c.variant} />
            </div>
          ))}
        </div>
      );
    case 'list':
      return <List items={block.items} variant={block.variant === 'plain' ? undefined : block.variant} />;
    case 'details':
      return (
        <details className={styles.details}>
          <summary>{block.summary}</summary>
          <Blocks blocks={block.blocks} />
        </details>
      );
    case 'table':
      return (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (block.rowHeader && i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note':
      return <p className={styles.note}>{block.text}</p>;
    case 'sourceNote':
      return <p className={styles.sourceNote}>{block.text}</p>;
    case 'verdict':
      return <p className={styles.verdict}>{block.text}</p>;
    case 'liveReading':
      return (
        <AsuraReadingProvider>
          <div className={styles.mockStage}>
            <div className={styles.mockTable}>
              <p className={styles.mockTableLabel}>{block.tableLabel}</p>
              <ul className={styles.mockPillars}>
                {block.tablePillars.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            {block.specCards ? (
              <div className={styles.mockCards}>
                {block.specCards.map((card) => (
                  <details key={card.era} className={card.href ? styles.mockCard : `${styles.mockCard} ${styles.mockCardSealed}`}>
                    <summary>
                      <span className={styles.mockNo}>
                        {card.no} {card.era}
                      </span>
                      <strong>{card.name}</strong>
                      <span className={styles.mockLevel}>{card.tag}</span>
                    </summary>
                    <div className={styles.mockBody}>
                      <div className={styles.cardVoice}>
                        {card.voice.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                      <List items={card.facts} />
                      {card.note && <p className={styles.sourceNote}>{card.note}</p>}
                      {card.href && card.linkLabel && (
                        <Link href={card.href} className={styles.cardLink}>
                          {card.linkLabel}
                        </Link>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <AsuraTimeCards />
            )}
          </div>

          {/* 生辰 → 後端 /api/ghost-asura/reading → 鬼魅阿修羅卡（過去／現在／未來）；上方三張時間軸卡共用同一份結果 */}
          <AsuraSkillReading />
        </AsuraReadingProvider>
      );
    case 'coreLines':
      return (
        <ul className={styles.coreLines}>
          {block.items.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      );
    case 'persona':
      return <p className={styles.persona}>{block.text}</p>;
    case 'creed':
      return (
        <dl className={styles.creed}>
          {block.rows.map((c) => (
            <div key={c.line}>
              <dt>{c.line}</dt>
              <dd>{c.note}</dd>
            </div>
          ))}
        </dl>
      );
    case 'layers':
      return (
        <ol className={styles.layers}>
          {block.items.map((layer) => (
            <li key={layer.name}>
              <strong>{layer.name}</strong>
              <span>{layer.desc}</span>
            </li>
          ))}
        </ol>
      );
    case 'showcase':
      return (
        <div className={styles.showcase}>
          {block.items.map((copy) => (
            <article key={copy.title} className={styles.scroll}>
              <header className={styles.scrollHead}>
                <strong>{copy.title}</strong>
              </header>
              <CopyLines lines={copy.lines} />
            </article>
          ))}
        </div>
      );
    case 'formula':
      return (
        <div className={styles.formula} role="group" aria-label={block.ariaLabel}>
          {block.terms.map((term, i) => (
            <div key={term} className={styles.formulaRow}>
              {i > 0 && (
                <span className={styles.eq} aria-hidden="true">
                  {block.separator}
                </span>
              )}
              <span className={styles.formulaTerm}>{term}</span>
            </div>
          ))}
        </div>
      );
    case 'pairs':
      return (
        <dl className={styles.pairs}>
          {block.rows.map(([from, to]) => (
            <div key={from}>
              <dt>{from}</dt>
              <dd>{to}</dd>
            </div>
          ))}
        </dl>
      );
    case 'pillars':
      return (
        <dl className={styles.pillars}>
          {block.rows.map(([from, to]) => (
            <div key={from}>
              <dt>{from}</dt>
              <dd>{to}</dd>
            </div>
          ))}
        </dl>
      );
    case 'nameGrid':
      return (
        <ol className={styles.nameGrid}>
          {block.items.map((name) => (
            <li key={name}>
              <strong>{name}</strong>
            </li>
          ))}
        </ol>
      );
    case 'families':
      return (
        <dl className={styles.families}>
          {block.rows.map((f) => (
            <div key={f.name}>
              <dt>{f.name}</dt>
              <dd>{f.chars}</dd>
            </div>
          ))}
        </dl>
      );
    case 'levels':
      return (
        <ol className={styles.levels}>
          {block.items.map((lv) => (
            <li key={lv.level}>
              <p className={styles.levelHead}>
                <span>{lv.level}</span>
                <strong>{lv.name}</strong>
              </p>
              <Chips items={lv.items} />
            </li>
          ))}
        </ol>
      );
    case 'promises':
      return (
        <ol className={styles.promises}>
          {block.items.map((p) => (
            <li key={p.title}>
              <h3 className={styles.promiseTitle}>{p.title}</h3>
              <List items={p.items} />
            </li>
          ))}
        </ol>
      );
    case 'checklist':
      return (
        <ul className={styles.checklist}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'skillList':
      return (
        <ol className={styles.layers}>
          {block.items.map((s) => (
            <li key={s.anchor} id={`skill-${s.anchor}`}>
              <strong>{s.name}</strong>
              <span>{s.use}</span>
            </li>
          ))}
        </ol>
      );
    default: {
      const unknown: never = block;
      throw new Error(`Unknown skill-file block: ${JSON.stringify(unknown)}`);
    }
  }
}

export function Blocks({ blocks }: { blocks: SkillBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </>
  );
}
