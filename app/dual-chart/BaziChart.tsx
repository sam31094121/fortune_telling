import { useEffect, useRef, type ReactNode } from 'react';
import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';
import ElementRing from './ElementRing';
import ShenShaSourceEvidence, { ShenShaComparisonSummary, ShenShaEvidenceLinks } from '@/components/bazi/customer/ShenShaSourceEvidence';
import { shenShaDisplayCopy, shenShaDisplayNames } from '@/lib/shensha-display-copy';

const order = ['hour', 'day', 'month', 'year'] as const;
const labels = { hour: '時', day: '日', month: '月', year: '年' };
const shenShaLabels = shenShaDisplayNames.zh;
function shenShaAvailability(result: DualChartResult) {
  const gate = result.bazi.professionalChart.traditionalInterpretationGate;
  const allowed = new Set(Object.entries(gate?.shenShaRules ?? {}).filter(([, rule]) => gate?.coreReady && rule.ready && (rule.status === 'VERIFIED' || (rule as { referenceMethod?: boolean }).referenceMethod === true) && rule.outputStatus === 'READY').map(([id]) => id));
  const hasData = Array.isArray(result.core.shenSha);
  const restricted = Object.entries(shenShaLabels).filter(([id]) => !allowed.has(id));
  const isConflict = (id: string) => {
    const rule = gate?.shenShaRules?.[id as keyof typeof shenShaLabels];
    return rule?.status === 'CONFLICT' || rule?.outputStatus === 'BLOCKED_VARIANT';
  };
  const conflicts = restricted.filter(([id]) => isConflict(id)).map(([, name]) => name);
  const pending = restricted.filter(([id]) => !isConflict(id)).map(([, name]) => name);
  return { allowed, hasData, conflicts, pending };
}

export function ShenShaRestrictions({ result, language = 'zh' }: { result: DualChartResult; language?: string }) {
  const { conflicts, pending } = shenShaAvailability(result);
  const locale = language === 'en' ? 'en' : 'zh';
  const copy = shenShaDisplayCopy[locale];
  const names = (items: string[]) => items.map(name => locale === 'en' ? shenShaDisplayNames.en[Object.keys(shenShaLabels).find(id => shenShaLabels[id as keyof typeof shenShaLabels] === name) as keyof typeof shenShaLabels] : name).join(locale === 'en' ? ', ' : '、');
  return <>{conflicts.length > 0 && <span data-shensha-restriction="conflict">{locale === 'en' ? copy.compactConflict : copy.conflict}{names(conflicts)}{locale === 'en' ? '. ' : '。'}<ShenShaEvidenceLinks rules={result.bazi.professionalChart.traditionalInterpretationGate?.shenShaRules} ids={Object.entries(shenShaLabels).filter(([, name]) => conflicts.includes(name)).map(([id]) => id)} language={language} /> </span>}{pending.length > 0 && <span data-shensha-restriction="pending">{copy.pending}{names(pending)}{locale === 'en' ? '. ' : '。'}</span>}</>;
}

export function PillarGrid({ result, compact = false, language = 'zh' }: { result: DualChartResult; compact?: boolean; language?: string }) {
  const { core, bazi } = result;
  const pc = bazi.professionalChart;
  const { allowed, hasData, conflicts } = shenShaAvailability(result);
  const row = (title: string, render: (key: typeof order[number]) => ReactNode, className?: string) => <tr className={className}>{order.map(key => <td key={key}>{render(key)}</td>)}<th scope="row">{title}</th></tr>;
  return <table className={`${styles.pillarGrid} ${compact ? styles.compactGrid : ''}`} aria-label={compact ? '中央八字摘要' : '八字四柱時日月年主表'}>
    <thead><tr>{order.map(key => <th key={key} scope="col">{labels[key]}柱</th>)}<th>項目</th></tr></thead>
    <tbody>
      {row('主星', key => pc.pillarDetails[key].stemTenGod)}
      {row('天干', key => pc.pillarDetails[key].ganzhi[0], styles.largeGlyph)}
      {row('地支', key => pc.pillarDetails[key].ganzhi[1], styles.largeGlyph)}
      {row('藏干', key => pc.hiddenStemStructure[key].map(h => h.stem).join('　'))}
      {row('副星', key => pc.hiddenStemStructure[key].map(h => <span className={styles.stack} key={h.stem}>{h.tenGod}</span>))}
      {row('十二運', key => core.twelveStages[key])}
      {!compact && (!allowed.size || !hasData ? <tr className={styles.shenshaRow}>
        {order.map(key => <td key={key} data-shensha-pillar={key} data-shensha-state={!allowed.size ? conflicts.length ? 'restricted' : 'pending' : 'unavailable'}>
          <span className={styles.shenshaStatus}>{!allowed.size ? conflicts.length ? '取法分歧，暫未提供' : '尚待核對' : '資料待補'}</span>
        </td>)}<th scope="row">特星神煞</th>
      </tr> : row('特星神煞', key => {
        const hits = result.specialStars?.byPillar[key] ?? (Array.isArray(core.shenSha) ? [...new Map(core.shenSha.filter(s => allowed.has(s.id) && s.evidence.startsWith(key.toUpperCase() + ' ')).map(s => [s.name, s])).values()] : []);
        return hits.length ? hits.map(hit => <span className={styles.stack} key={hit.name} title={hit.rule}>{hit.name}{hit.source && <a className={styles.shenshaSource} href={hit.source.url} target="_blank" rel="noreferrer" aria-label={`${hit.name}來源：${hit.source.title}，卷上${hit.source.printedPage}頁`}>原典 {hit.source.printedPage}頁</a>}</span>) : null;
      }, styles.shenshaRow))}
    </tbody>
  </table>;
}

type ShenShaIChingView = NonNullable<DualChartResult['specialStars']['iching']>;
type ShenShaIChingReady = Extract<ShenShaIChingView, { state: 'READY' }>;

/** 逐項細看的一張卡：導師話術 → 洋蔥三層 → 推導 → 字的意境。只照印後端欄位。 */
function ShenShaItemCard({ item, grouped = false }: { item: ShenShaIChingReady['items'][number]; grouped?: boolean }) {
  return <li data-shensha-tone={item.teacher?.tone}>
    <p className={styles.shenshaItemHead}><b>{item.name}{item.reference ? '＊' : ''}</b>{!grouped && <span>{item.pillar}</span>}{item.teacher && <em>{item.teacher.tone}｜{item.teacher.theme}</em>}</p>
    {item.tradition && <p className={styles.shenshaBasis}>{item.tradition}</p>}
    {item.teacher && <p className={styles.shenshaTeacher}>{item.teacher.text}</p>}
    {item.onion && <div className={styles.shenshaOnion} aria-label={`${item.name}洋蔥心理學`}>{item.onion.layers.map(layer => <p key={layer.layer}><b>{layer.layer}</b><small>{layer.label}</small><span>{layer.text}</span></p>)}
      {item.onion.term && <p className={styles.shenshaTerm}><b>心理學</b><span>{item.onion.term.name}｜{item.onion.term.link}<cite>{item.onion.term.citation}</cite></span></p>}</div>}
    {item.imagery?.chars?.length > 0 && <ul className={styles.shenshaImagery} aria-label={`${item.name}字的意境`}>{item.imagery.chars.map((c, index) => <li key={index}><b>{c.char}</b><small>{c.element}</small><span>{c.senseText ?? c.sense}</span></li>)}</ul>}
    <p className={styles.shenshaDerive}>推導：{item.derivation}</p>
  </li>;
}

/** 《神煞易經》第④層：只照印後端 buildShenShaIChing 的結果，不自己組句、不自己算。 */
function ShenShaIChingSection({ view }: { view?: DualChartResult['specialStars']['iching'] }) {
  if (!view) return null;
  // 舊版結果沒有 groups 時，整批照原順序顯示，不在前端自己分組。
  const groups = view.state === 'READY' ? view.groups ?? [{ pillar: '', anchor: 'shensha-items', count: view.items.length, items: view.items }] : [];
  return <section className={styles.shenshaIching} aria-label="神煞易經解盤" data-shensha-iching-state={view.state}>
    <h4 className={styles.shenshaSectionTitle}>衍生鏈</h4>
    <ol className={styles.shenshaChain}>{view.chain.map(item => <li key={item.step}><b>{item.step}</b><span>{item.text}</span></li>)}</ol>
    {view.state === 'BLOCKED' ? <p role="status">{view.reason}</p> : <>
      <div className={styles.shenshaHexagram}><span aria-hidden="true">{view.hexagram.glyph}</span><p><small>本命卦</small><b>{view.hexagram.name}</b><small>{view.hexagram.changingLabel}</small></p></div>
      <h4 className={styles.shenshaSectionTitle}>導師總覽</h4>
      {view.summary && <p className={styles.shenshaSummary}>{view.summary}{view.focusLine && <span>{view.focusLine}</span>}</p>}
      {view.highlights?.length > 0 && <ul className={styles.shenshaHighlights} aria-label="三個重點">{view.highlights.map(h => <li key={h.tone} data-shensha-tone={h.tone}><b>{h.title}</b><p>{h.text}</p></li>)}</ul>}
      <div className={styles.shenshaReading}>{view.reading.map((line, index) => <p key={index}>{line}</p>)}</div>
      {view.combos?.length > 0 && <>
        <h4 className={styles.shenshaSectionTitle}>整盤合看</h4>
        <ol className={styles.shenshaCombos} aria-label="整盤合看">{view.combos.map(combo => <li key={`${combo.id}:${combo.pillar ?? ''}`} data-shensha-combo={combo.id}><p><b>{combo.title}</b>{combo.pillar && <small>{combo.pillar}</small>}</p><p>{combo.text}</p></li>)}</ol>
      </>}
      {groups.length > 0 && <>
        <h4 className={styles.shenshaSectionTitle}>逐柱細看</h4>
        {groups.length > 1 && <nav id="shensha-jump" className={styles.shenshaJump} aria-label="跳到柱位">{groups.map(group => <a key={group.anchor} href={`#${group.anchor}`}>{group.pillar}<small>{group.count}</small></a>)}</nav>}
        {groups.map(group => <div key={group.anchor} id={group.anchor} className={styles.shenshaGroup}>
          {group.pillar && <h5><span>{group.pillar}</span>{groups.length > 1 && <a href="#shensha-jump">回選單</a>}</h5>}
          {'palace' in group && group.palace && <p className={styles.shenshaGroupIntro}>{group.palace}<small>{group.toneLine}</small></p>}
          <ol className={styles.shenshaDerivation} aria-label={`${group.pillar}逐項導師解盤`}>{group.items.map(item => <ShenShaItemCard key={`${item.pillar}:${item.name}`} item={item} grouped={Boolean(group.pillar)} />)}</ol>
        </div>)}
      </>}
      <div className={styles.shenshaSources} aria-label="出處與公信力">
        <h4 className={styles.shenshaSectionTitle}>出處與公信力</h4>
        {view.imageryAttribution && <p>{view.imageryAttribution}</p>}
        {view.onionCredibility && <p>{view.onionCredibility.line}</p>}
        <p>{view.credibility.line}</p>
      </div>
    </>}
  </section>;
}

/**
 * 老師解盤折疊卡：記住這位訪客上次點開哪一張（只存在本機瀏覽器，純個人便利，不影響運算）。
 * 無痕模式或瀏覽器擋住儲存時，讀寫失敗就維持預設收起，不出錯。
 */
const TEACHER_FOLD_KEY = 'shensha-teacher-open';
function TeacherFold({ teacher, summary, children }: { teacher: 'iching' | 'ghost'; summary: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(TEACHER_FOLD_KEY) ?? '{}') as Record<string, boolean>;
      if (ref.current && saved[teacher]) ref.current.open = true;
    } catch { /* 儲存不可用：維持預設收起 */ }
  }, [teacher]);
  const remember = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(TEACHER_FOLD_KEY) ?? '{}') as Record<string, boolean>;
      saved[teacher] = Boolean(ref.current?.open);
      window.localStorage.setItem(TEACHER_FOLD_KEY, JSON.stringify(saved));
    } catch { /* 儲存不可用：不記住也不影響閱讀 */ }
  };
  return <details ref={ref} className={styles.teacherCard} data-teacher={teacher} onToggle={remember}>{summary}{children}</details>;
}

/** 鬼魅老師解盤（茅山道士話術分身）：只照印後端 buildShenShaGhost 的結果。 */
function ShenShaGhostSection({ view }: { view?: DualChartResult['specialStars']['ghost'] }) {
  if (!view) return null;
  if (view.state === 'BLOCKED') return <section className={styles.shenshaGhost} aria-label="鬼魅老師解盤內容"><p role="status">{view.reason}</p></section>;
  return <section className={styles.shenshaGhost} aria-label="鬼魅老師解盤內容">
    <p className={styles.ghostOpening}>{view.opening}</p>
    <h4 className={styles.ghostTitle}>拆卦</h4>
    <ul className={styles.ghostDecoding}>{view.decoding.map(d => <li key={d.label}><b>{d.label}</b><p>{d.text}</p></li>)}</ul>
    {view.groups.length > 0 && <>
      <h4 className={styles.ghostTitle}>逐柱點氣</h4>
      {view.groups.map(group => <div key={group.pillar} className={styles.ghostGroup}><h5>{group.pillar}</h5>{group.intro && <p className={styles.ghostPillarIntro}>{group.intro}</p>}
        <ul>{group.lines.map((line, index) => <li key={`${line.name}:${index}`} data-shensha-tone={line.tone ?? undefined}>{line.text}</li>)}</ul></div>)}
    </>}
    {view.formations.length > 0 && <>
      <h4 className={styles.ghostTitle}>陣法</h4>
      <ul className={styles.ghostFormations}>{view.formations.map((f, index) => <li key={`${f.title}:${index}`}><b>{f.title}</b><p>{f.text}</p></li>)}</ul>
    </>}
    <p className={styles.ghostClosing}>{view.closing}</p>
    <p className={styles.ghostDisclaimer}>{view.disclaimer}</p>
  </section>;
}

/** Independent card. The pillar grid is always visible; the two teacher readings fold. Every word comes from the backend. */
export function ShenShaCard({ result }: { result: DualChartResult }) {
  const card = result.specialStars?.card;
  const state = card?.state ?? 'unavailable';
  return <section className={styles.shenshaCard} aria-label="特星神煞" data-screen-arrow-target="dual-chart-special-stars" data-shensha-card-state={state}>
    <header className={styles.shenshaHeader}>
      <h3>神煞易經</h3>
      <p className={styles.shenshaSubtitle}>八字 → 紫微 → 特星神煞 → 易經</p>
    </header>
    {card?.notice && <p role="status">{card.notice}</p>}
    {!card && <p role="status">神煞資料尚未完整，暫不能判斷有無結果。</p>}
    {card && card.columns.length > 0 && <div className={styles.shenshaPillars}>{card.columns.map(col =>
      <div key={col.pillar} data-shensha-column={col.pillar} data-shensha-column-state={col.state}><h4>{col.label}</h4>
        {col.hits.length > 0 && <ul aria-label={`${col.label}神煞`}>{col.hits.map(hit => <li key={`${hit.id}:${hit.name}`} data-shensha-result={hit.id} data-shensha-method={hit.reference ? 'reference' : 'source'} data-shensha-tone={hit.tone ?? undefined} aria-label={hit.tone ? `${hit.name}（${hit.tone}）` : undefined} title={`${hit.name}${hit.tone ? `（${hit.tone}）` : ''}｜${hit.rule}｜${hit.sourceLabel}`}>{hit.name}</li>)}</ul>}
        {col.emptyText && <span className={styles.shenshaEmpty} aria-label={col.state === 'PENDING' ? `結果尚未完整：${col.pendingNames.join('、')}` : '本次未命中本站既有規則'}>{col.emptyText}</span>}
        {col.note && <small className={styles.shenshaPillarNote}>{col.note}</small>}
      </div>)}</div>}
    {card && card.columns.length > 0 && <p className={styles.shenshaLegend} aria-label="圖例"><span data-shensha-tone="福氣">福氣</span><span data-shensha-tone="動能">動能</span><span data-shensha-tone="提醒">提醒</span><span>＊ 本派取法</span></p>}
    {card?.footnote && <p className={styles.shenshaFootnote}>{card.footnote}</p>}
    {result.specialStars?.iching?.state === 'READY' && result.specialStars?.ghost?.state === 'READY' && <div className={styles.teacherDuet} aria-label="兩位老師一句話">
      <p data-teacher="iching"><b>易經老師</b>{result.specialStars.iching.oneLiner}</p>
      <p data-teacher="ghost"><b>鬼魅老師</b>{result.specialStars.ghost.oneLiner}</p>
    </div>}
    {result.specialStars?.iching && <TeacherFold teacher="iching" summary={<summary><span className={styles.teacherHead}><b>易經老師解盤</b><small>神　溫和的智慧</small></span>{result.specialStars.iching.state === 'READY' && <span className={styles.teacherTeaser}>{result.specialStars.iching.teaser}</span>}</summary>}>
      <ShenShaIChingSection view={result.specialStars.iching} />
    </TeacherFold>}
    {result.specialStars?.ghost && <TeacherFold teacher="ghost" summary={<summary><span className={styles.teacherHead}><b>鬼魅老師解盤</b><small>魔　茅山門外低語</small></span><span className={styles.teacherTeaser}>{result.specialStars.ghost.teaser}</span></summary>}>
      <ShenShaGhostSection view={result.specialStars.ghost} />
    </TeacherFold>}
  </section>;
}

export function LuckGrid({ result, compact = false }: { result: DualChartResult; compact?: boolean }) {
  const cycles = Array.isArray(result.core.daYun) ? [...result.core.daYun].reverse() : [];
  return <table className={`${styles.luckGrid} ${compact ? styles.compactGrid : ''}`} aria-label="大運年齡干支表"><tbody>
    <tr>{cycles.map(c => <td key={c.index}>{compact ? c.startAge : `${c.startAge}–${c.endAge}`}</td>)}<th scope="row">歲</th></tr>
    <tr>{cycles.map(c => <td key={c.index}><b>{c.ganZhi}</b></td>)}<th scope="row">大運</th></tr>
    {!compact && <tr>{cycles.map(c => <td key={c.index}>{c.startYear}</td>)}<th scope="row">年起</th></tr>}
  </tbody></table>;
}

export default function BaziChart({ result, monochrome = false, language = 'zh' }: { result: DualChartResult; monochrome?: boolean; language?: string }) {
  const { core, bazi, annual } = result;
  const pc = bazi.professionalChart;
  const traditionalGate = pc.traditionalInterpretationGate;
  const { allowed, hasData } = shenShaAvailability(result);
  const meta = core.daYunMeta;
  const copy = shenShaDisplayCopy[language === 'en' ? 'en' : 'zh'];
  // 來源對照只讀後端保留的原核心規則；本卡採用的參考取法不冒充原典已核對。
  const comparisonRules = result.specialStars?.sourceComparisonRules ?? traditionalGate?.shenShaRules;
  const sourceNotes = <><p className={`${styles.micro} ${styles.shenshaNote}`}>{!allowed.size
    ? '本次神煞暫未提供；不影響四柱、藏干與十神資料。'
    : !hasData
    ? '神煞資料待補，請重新排盤；暫不判定是否命中。'
    : <>{result.specialStars?.sourceNote?.[language === 'en' ? 'en' : 'zh']}{copy.compactScope} </>}<ShenShaRestrictions result={result} language={language} /><ShenShaComparisonSummary rules={comparisonRules} language={language} includeMatched={false} /></p>
    <ShenShaSourceEvidence rules={comparisonRules} language={language} className={styles.shenshaEvidence} /></>;
  return <><div className={styles.reportScroll}><div className={styles.baziReport}>
    <div className={styles.birthBand}><b>{bazi.input.name || '命主'}</b><span>{bazi.input.gender === 'male' ? '男' : '女'} · {core.pillars.year.yinYang}年</span><span>國曆 {bazi.input.birthDate}　{bazi.input.birthTime}</span><span>農曆 {core.calendar.lunarDate}</span></div>
    <div className={styles.baziColumns}>
      <aside className={styles.baziSidebar}>
        <ElementRing percentages={pc.elementStatistics.percentages} monochrome={monochrome} />
        <dl className={styles.summaryGrid}>
          {Object.entries({ 日主: `${core.dayMaster.stem}${core.dayMaster.element}（${core.dayMaster.yinYang}）`, 命宮: core.mingGong, 身宮: core.shenGong, 胎元: core.taiYuan, 胎息: core.taiXi, 年空: core.kongWang.yearXunKong, 日空: core.kongWang.dayXunKong }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <p className={styles.micro}>{traditionalGate?.customerMessage ?? '傳統解釋守門尚未完成，本次不作格局、旺衰與喜用定論。'}</p>
        <h3 className={styles.subheading}>流年 · {annual[0].year}–{annual.at(-1)?.year}</h3>
        {[0, 5, 10].map(start => <table key={start} className={styles.annualGrid} aria-label={`流年 ${annual[start].year} 年起`}><tbody>
          <tr>{annual.slice(start, start + 5).reverse().map(a => <th key={a.year}>{a.year}<small>{a.age}虛歲</small></th>)}</tr>
          <tr>{annual.slice(start, start + 5).reverse().map(a => <td key={a.year}><b>{a.ganzhi}</b><span>{a.stemGod}</span><span>{a.branchGod}</span></td>)}</tr>
        </tbody></table>)}
        <p className={styles.micro}>上列依次為干支、干十神、支主氣十神；立春換年。流年神煞未提供。</p>
      </aside>
      <section className={styles.baziMain}>
        <PillarGrid result={result} language={language} />
        <div className={styles.startLuck}>{typeof meta === 'object' ? `出生後 ${meta.startAgeYears} 年 ${meta.startAgeMonths} 月 ${meta.startAgeDays} 天起運 · ${meta.direction === 'FORWARD' ? '順行' : '逆行'}` : '起運資料未提供'}</div>
        <LuckGrid result={result} />
        <section className={styles.relations} data-density={core.interactions.length > 6 ? 'dense' : core.interactions.length > 4 ? 'compact' : 'regular'}><h3>命局合沖刑害破</h3>{core.interactions.length ? core.interactions.map((r, index) => <p key={index}><b>{r.interactionType}</b><span className={styles.relationParticipants}>{r.participants.join('、')}</span><small>{r.affectedPillars.map(key => ({ YEAR: '年柱', MONTH: '月柱', DAY: '日柱', HOUR: '時柱' })[key] ?? key).join('、')}</small></p>) : <p>本系統規則未命中</p>}</section>
        {sourceNotes}
      </section>
    </div>
    <footer className={styles.reportFooter}>節氣：{core.calendar.solarTerm} {core.calendar.solarTermTime}<br />台灣標準時間 UTC+8 · 年以立春、月以節氣為界 · 晚子時日柱不換日 · 未做真太陽時校正</footer>
  </div></div><ShenShaCard result={result} /><section className={styles.screenShenShaNotes} aria-label={language === 'en' ? 'Shensha source status' : '神煞來源狀態'}>{sourceNotes}</section></>;
}
