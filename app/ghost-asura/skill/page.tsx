/**
 * 鬼魅阿修羅｜技能檔案（/ghost-asura/skill）
 *
 * 純靜態 Server Component：只呈現技能檔案內容與阿修羅口吻、風格。
 * 八字只在後端算 —— 本頁不排盤、不算神煞、不引用任何命理或 ghost-asura 引擎。
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './skill.module.css';
import AsuraSkillReading from './AsuraSkillReading';
import { AsuraReadingProvider } from './AsuraReadingContext';
import AsuraTimeCards from './AsuraTimeCards';

/**
 * 三張摺疊卡的原規格文字（FUNCTION_CARDS.cards）保留可還原：
 * 改為 true 即回到原本的規格說明卡；false＝顯示後端實盤時間軸（與卡頭三格同一份輸出）。
 * 原檔備份：app/ghost-asura/skill/_backup/page.tsx.bak、content.ts.bak。
 */
const SHOW_SPEC_TEXT = false;
import {
  BACKEND_LAW,
  CHECKLIST,
  CLOSING,
  COUNT_LAW,
  FIXED_COPY,
  FIXED_NAMES,
  NAME_FAMILIES,
  PILLARS,
  PILLARS_NOTE,
  PROMISES,
  READING_LEVELS,
  SCOPE,
  SECTIONS,
  SKILL_MARK,
  TERMS,
  TERMS_NOTE,
  THREE_LAYERS,
  FUNCTION_CARDS,
  USAGE_RULES,
  VISUAL,
  VOICE,
  type SealSection,
} from './content';


export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: { absolute: '鬼魅阿修羅｜技能檔案' },
  description: '鬼魅阿修羅檔案技能：後端算、前端顯。阿修羅的口吻、鐵律、真名錄與視覺規則。',
};

function SealCard({ section, children }: { section: SealSection; children: ReactNode }) {
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

function List({ items, variant }: { items: string[]; variant?: 'must' | 'deny' | 'plain' }) {
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

export default function GhostAsuraSkillPage() {
  return (
    <main className={styles.page}>
      <div className={styles.mist} aria-hidden="true" />

      <div className={styles.inner}>
        {/* 首屏：只有名字 */}
        <header className={styles.hero}>
          <h1 className={styles.heroName}>鬼魅阿修羅</h1>
        </header>

        {/* 壹 技能印記 */}
        <SealCard section={SECTIONS.mark}>
          <p className={styles.eyebrow}>技能檔案</p>
          <p className={styles.skillName}>{SKILL_MARK.name}</p>

          <div className={styles.command}>
            <span className={styles.commandLabel}>口令</span>
            <strong className={styles.commandWord}>「{SKILL_MARK.command}」</strong>
            <p className={styles.commandNote}>{SKILL_MARK.commandNote}</p>
          </div>

          <dl className={styles.facts}>
            {SKILL_MARK.facts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <blockquote className={styles.manifesto}>
            {SKILL_MARK.manifesto.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </blockquote>
        </SealCard>

        {/* 貳 最高鐵律 */}
        <SealCard section={SECTIONS.law}>
          <p className={styles.motto}>{BACKEND_LAW.motto}</p>
          <ol className={styles.ironRules}>
            {BACKEND_LAW.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>

          <h3 className={styles.subTitle}>後端維持正統</h3>
          <Chips items={BACKEND_LAW.orthodox} />

          <h3 className={styles.subTitle}>正式資料流程</h3>
          <Flow steps={BACKEND_LAW.flow} />
          <p className={styles.code}>{BACKEND_LAW.endpoint}</p>

          <h3 className={styles.subTitle}>最終鎖定</h3>
          <dl className={styles.division}>
            {BACKEND_LAW.division.map((row) => (
              <div key={row.layer}>
                <dt>{row.layer}</dt>
                <dd>{row.duty}</dd>
              </div>
            ))}
          </dl>

          <div className={styles.twoCol}>
            <div>
              <h3 className={styles.subTitle}>前端紅線</h3>
              <List items={BACKEND_LAW.redLines} variant="deny" />
            </div>
            <div>
              <h3 className={styles.subTitle}>前端只做</h3>
              <List items={BACKEND_LAW.allowed} variant="must" />
            </div>
          </div>
        </SealCard>

        {/* 參 三張功能卡：過去／現在／未來 */}
        <SealCard section={SECTIONS.cards}>
          <p className={styles.motto}>{FUNCTION_CARDS.rule}</p>
          <List items={FUNCTION_CARDS.shared} variant="must" />

          <details className={styles.details}>
            <summary>引自《神煞異君》：兩張卡，一神一魔</summary>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">項目</th>
                    <th scope="col">{FUNCTION_CARDS.yijunHead.a}</th>
                    <th scope="col">{FUNCTION_CARDS.yijunHead.b}</th>
                  </tr>
                </thead>
                <tbody>
                  {FUNCTION_CARDS.yijun.map((row) => (
                    <tr key={row.aspect}>
                      <th scope="row">{row.aspect}</th>
                      <td>{row.a}</td>
                      <td>{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>{FUNCTION_CARDS.yijunBackend}</p>
            <p className={styles.sourceNote}>{FUNCTION_CARDS.source}</p>
          </details>

          <AsuraReadingProvider>
          <div className={styles.mockStage}>
            <div className={styles.mockTable}>
              <p className={styles.mockTableLabel}>{FUNCTION_CARDS.tableLabel}</p>
              <ul className={styles.mockPillars}>
                {FUNCTION_CARDS.tablePillars.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            {SHOW_SPEC_TEXT ? (
              <div className={styles.mockCards}>
                {FUNCTION_CARDS.cards.map((card) => (
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

          {/* 新增：生辰 → 後端 /api/ghost-asura/reading → 鬼魅阿修羅卡（過去／現在／未來）；上方三張時間軸卡共用同一份結果 */}
          <AsuraSkillReading />
          </AsuraReadingProvider>
        </SealCard>

        {/* 肆 話術核心 */}
        <SealCard section={SECTIONS.voice}>
          <ul className={styles.coreLines}>
            {VOICE.core.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className={styles.note}>{VOICE.notFear}</p>
          <h3 className={styles.subTitle}>目的</h3>
          <Chips items={VOICE.purpose} />
          <h3 className={styles.subTitle}>文案必須</h3>
          <Chips items={VOICE.tone} tone="ember" />

          <p className={styles.persona}>{VOICE.persona}</p>

          <div className={styles.twoCol}>
            <div>
              <h3 className={styles.subTitle}>必須清單</h3>
              <List items={VOICE.must} variant="must" />
            </div>
            <div>
              <h3 className={styles.subTitle}>禁止清單</h3>
              <List items={VOICE.forbidVoice} variant="deny" />
            </div>
          </div>
          <h3 className={styles.subTitle}>規格禁止</h3>
          <List items={VOICE.forbidSpec} variant="deny" />

          <h3 className={styles.subTitle}>宣言</h3>
          <dl className={styles.creed}>
            {VOICE.creed.map((c) => (
              <div key={c.line}>
                <dt>{c.line}</dt>
                <dd>{c.note}</dd>
              </div>
            ))}
          </dl>
        </SealCard>

        {/* 伍 三層話術結構 */}
        <SealCard section={SECTIONS.layers}>
          <ol className={styles.layers}>
            {THREE_LAYERS.map((layer) => (
              <li key={layer.name}>
                <strong>【{layer.name}】</strong>
                <span>{layer.desc}</span>
              </li>
            ))}
          </ol>

          <h3 className={styles.subTitle}>固定話術方向</h3>
          <div className={styles.showcase}>
            {FIXED_COPY.map((copy) => (
              <article key={copy.asura} className={styles.scroll}>
                <header className={styles.scrollHead}>
                  <strong>{copy.asura}</strong>
                  <span>（原始神煞：{copy.original}）</span>
                </header>
                <CopyLines lines={copy.lines} />
              </article>
            ))}
          </div>
        </SealCard>

        {/* 陸 數量鐵律 + 禁止隨機命名 */}
        <SealCard section={SECTIONS.count}>
          <div className={styles.formula} role="group" aria-label="數量鐵律">
            {COUNT_LAW.formula.map((term, i) => (
              <div key={term} className={styles.formulaRow}>
                {i > 0 && (
                  <span className={styles.eq} aria-hidden="true">
                    ＝
                  </span>
                )}
                <span className={styles.formulaTerm}>{term}</span>
              </div>
            ))}
          </div>
          <p className={styles.verdict}>{COUNT_LAW.verdict}</p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">狀態</th>
                  <th scope="col">後端</th>
                  <th scope="col">轉譯</th>
                  <th scope="col">前端</th>
                  <th scope="col">結果</th>
                </tr>
              </thead>
              <tbody>
                {COUNT_LAW.examples.map((row) => (
                  <tr key={row.state}>
                    <td>{row.state}</td>
                    <td>{row.backend}</td>
                    <td>{row.translated}</td>
                    <td>{row.shown}</td>
                    <td>{row.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>{COUNT_LAW.never}</p>
          <p className={styles.note}>{COUNT_LAW.perItem}</p>
          <p className={styles.note}>{COUNT_LAW.notCap}</p>

          <h3 className={styles.subTitle}>新神煞延伸</h3>
          <Flow steps={COUNT_LAW.extend} />
          <p className={styles.note}>{COUNT_LAW.extendNote}</p>

          <h3 className={styles.subTitle}>禁止隨機命名</h3>
          <p className={styles.note}>同一個原始神煞，無論在：</p>
          <Chips items={COUNT_LAW.stableDevices} />
          <p className={styles.verdict}>{COUNT_LAW.stableRule}</p>
          <List items={COUNT_LAW.mapping} />
          <p className={styles.motto}>{COUNT_LAW.sameInOut}</p>
        </SealCard>

        {/* 柒 前端用語對照 + 柱位 */}
        <SealCard section={SECTIONS.terms}>
          <h3 className={styles.subTitle}>前端用語對照</h3>
          <dl className={styles.pairs}>
            {TERMS.map(([from, to]) => (
              <div key={from}>
                <dt>{from}</dt>
                <dd>{to}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.note}>{TERMS_NOTE}</p>

          <h3 className={styles.subTitle}>柱位顯示</h3>
          <dl className={styles.pillars}>
            {PILLARS.map(([from, to]) => (
              <div key={from}>
                <dt>{from}</dt>
                <dd>{to}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.note}>{PILLARS_NOTE}</p>
        </SealCard>

        {/* 捌 固定名稱表 */}
        <SealCard section={SECTIONS.names}>
          <p className={styles.note}>工程師規格〈鬼魅阿修羅固定名稱〉逐列照錄。固定名稱不是上限。</p>
          <ol className={styles.nameGrid}>
            {FIXED_NAMES.map(([original, asura]) => (
              <li key={original}>
                <strong>{asura}</strong>
                <span>原：{original}</span>
              </li>
            ))}
          </ol>

          <details className={styles.details}>
            <summary>阿修羅名稱延伸語系</summary>
            <dl className={styles.families}>
              {NAME_FAMILIES.map((f) => (
                <div key={f.name}>
                  <dt>{f.name}</dt>
                  <dd>{f.chars}</dd>
                </div>
              ))}
            </dl>
          </details>
        </SealCard>

        {/* 玖 四層解盤 */}
        <SealCard section={SECTIONS.reading}>
          <ol className={styles.levels}>
            {READING_LEVELS.map((lv) => (
              <li key={lv.level}>
                <p className={styles.levelHead}>
                  <span>{lv.level}</span>
                  <strong>{lv.name}</strong>
                </p>
                <Chips items={lv.items} />
              </li>
            ))}
          </ol>
        </SealCard>

        {/* 拾 視覺規則 */}
        <SealCard section={SECTIONS.visual}>
          <h3 className={styles.subTitle}>風格</h3>
          <Chips items={VISUAL.style} />
          <p className={styles.verdict}>{VISUAL.noCheap}</p>
          <div className={styles.twoCol}>
            <div>
              <h3 className={styles.subTitle}>畫面建議</h3>
              <List items={VISUAL.do} variant="must" />
            </div>
            <div>
              <h3 className={styles.subTitle}>禁止</h3>
              <List items={VISUAL.dont} variant="deny" />
            </div>
          </div>
          <h3 className={styles.subTitle}>卡片視覺順序</h3>
          <Flow steps={VISUAL.order} />
        </SealCard>

        {/* 拾壹 三大承諾 */}
        <SealCard section={SECTIONS.promise}>
          <ol className={styles.promises}>
            {PROMISES.map((p) => (
              <li key={p.title}>
                <h3 className={styles.promiseTitle}>{p.title}</h3>
                <List items={p.items} />
              </li>
            ))}
          </ol>

          <h3 className={styles.subTitle}>使用規則（鐵律）</h3>
          <div className={styles.twoCol}>
            <div>
              <p className={styles.miniHead}>允許</p>
              <List items={USAGE_RULES.allow} variant="must" />
            </div>
            <div>
              <p className={styles.miniHead}>禁止</p>
              <List items={USAGE_RULES.deny} variant="deny" />
            </div>
          </div>
          <p className={styles.verdict}>{USAGE_RULES.consequence}</p>
        </SealCard>

        {/* 拾貳 修改範圍 + 驗收清單 */}
        <SealCard section={SECTIONS.scope}>
          <p className={styles.motto}>{SCOPE.top}</p>
          <details className={styles.details}>
            <summary>禁止項與防誤改</summary>
            <List items={SCOPE.forbid} variant="deny" />
            <p className={styles.note}>{SCOPE.isolation}</p>
            <p className={styles.note}>{SCOPE.regression}</p>
          </details>
          <details className={styles.details}>
            <summary>工程師驗收清單</summary>
            <ul className={styles.checklist}>
              {CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </SealCard>

        <footer className={styles.closing}>
          <p className={styles.closingVoice}>{CLOSING.voice}</p>
          <p className={styles.signature}>{CLOSING.signature}</p>
          <p className={styles.status}>{CLOSING.status}</p>
        </footer>
      </div>
    </main>
  );
}
