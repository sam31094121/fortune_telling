import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DualChartResult } from '@/lib/dual-chart';
import type { ShenShaFlowYear } from '@/lib/iching-shensha-flow-year';
import styles from './dual-chart.module.css';
import { SharedElementSealPaper } from '@/components/bazi/customer/SharedElementSealPaper';
import ElementRing from './ElementRing';
import ShenShaSourceEvidence, { ShenShaComparisonSummary, ShenShaEvidenceLinks } from '@/components/bazi/customer/ShenShaSourceEvidence';
import { shenShaDisplayCopy, shenShaDisplayNames } from '@/lib/iching-shensha-display-copy'; // imported correctly
import { buildGhostAsuraReading } from '@/features/ghost-asura';
import { GhostAsuraCard } from '@/features/ghost-asura/components/GhostAsuraCard';

const order = ['hour', 'day', 'month', 'year'] as const;
const labels = { hour: '時', day: '日', month: '月', year: '年' };
const shenShaLabels = shenShaDisplayNames.zh;

// 【米其林穩定化】後端已預計算，前端直接取用
function shenShaAvailability(result: DualChartResult) {
  const { allowed, conflicts, pending } = result.shenShaVisibility;
  const hasData = Array.isArray(result.core.shenSha);
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
        // 【米其林穩定化 P1-2】後端已預組織 byPillar，前端直接取用（無 fallback）
        const hits = result.specialStars?.byPillar?.[key as keyof typeof result.specialStars.byPillar] ?? [];
        return hits.length ? hits.map(hit => <span className={styles.stack} key={hit.name} title={hit.rule}>{hit.name}{hit.source && <a className={styles.shenshaSource} href={hit.source.url} target="_blank" rel="noreferrer" aria-label={`${hit.name}來源：${hit.source.title}，卷上${hit.source.printedPage}頁`}>原典 {hit.source.printedPage}頁</a>}</span>) : null;
      }, styles.shenshaRow))}
    </tbody>
  </table>;
}

type ShenShaIChingView = NonNullable<DualChartResult['specialStars']['iching']>;
type ShenShaIChingReady = Extract<ShenShaIChingView, { state: 'READY' }>;

/** 逐項細看的一張卡：導師話術 → 洋蔥三層 → 推導 → 字的意境。只照印後端欄位。 */
function ShenShaItemCard({ item, grouped = false }: { item: ShenShaIChingReady['items'][number]; grouped?: boolean }) {
  const head = <p className={styles.shenshaItemHead}><b>{item.name}{item.reference ? '＊' : ''}</b>{!grouped && <span>{item.pillar}</span>}{item.teacher && <em>{item.teacher.tone}｜{item.teacher.theme}</em>}</p>;
  // 舊版結果沒有 hook：照舊整段展開。
  if (!item.hook) return <li id={item.anchor} data-shensha-tone={item.teacher?.tone}>{head}<ShenShaItemBody item={item} /></li>;
  // 整張卡頭（名稱＋重點句）就是點擊區，不另佔一排按鈕；長輩也好點。
  return <li id={item.anchor} data-shensha-tone={item.teacher?.tone}>
    <details className={styles.shenshaMore}>
      <summary><span className={styles.shenshaItemHead}><b>{item.name}{item.reference ? '＊' : ''}</b>{!grouped && <span>{item.pillar}</span>}{item.teacher && <em>{item.teacher.tone}｜{item.teacher.theme}</em>}</span><span className={styles.shenshaHook}>{item.hook}<span className={styles.moreHint}>完整解讀</span></span></summary>
      <ShenShaItemBody item={item} /><a className={styles.shenshaBack} href="#shensha-grid">回四柱</a>
    </details>
  </li>;
}

function ShenShaItemBody({ item }: { item: ShenShaIChingReady['items'][number] }) {
  return <>
    {item.tradition && <p className={styles.shenshaBasis}>{item.tradition}</p>}
    {item.teacher && <p className={styles.shenshaTeacher}>{item.teacher.text}</p>}
    {item.onion && <div className={styles.shenshaOnion} aria-label={`${item.name}洋蔥心理學`}>{item.onion.layers.map(layer => <p key={layer.layer}><b>{layer.layer}</b><small>{layer.label}</small><span>{layer.text}</span></p>)}
      {item.onion.term && <p className={styles.shenshaTerm}><b>心理學</b><span>{item.onion.term.name}｜{item.onion.term.link}<cite>{item.onion.term.citation}</cite></span></p>}</div>}
    {item.imagery?.chars?.length > 0 && <ul className={styles.shenshaImagery} aria-label={`${item.name}字的意境`}>{item.imagery.chars.map((c, index) => <li key={index}><b>{c.char}</b><small>{c.element}</small><span>{c.senseText ?? c.sense}</span></li>)}</ul>}
    <p className={styles.shenshaDerive}>推導：{item.derivation}</p>
  </>;
}

/** 點四柱格子裡的神煞：打開易經老師與那一項的完整解讀，捲過去（只做畫面跳轉，不運算）。 */
function openShenShaItem(anchor: string) {
  const target = document.getElementById(anchor);
  if (!target) return false;
  for (let el: HTMLElement | null = target; el; el = el.parentElement) if (el instanceof HTMLDetailsElement) el.open = true;
  target.querySelector('details')?.setAttribute('open', '');
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

/** 《神煞易經》第④層：只照印後端 buildShenShaIChing 的結果，不自己組句、不自己算。 */
function ShenShaIChingSection({ view }: { view?: DualChartResult['specialStars']['iching'] }) {
  if (!view) return null;
  // 【米其林穩定化 P1-3-2】後端保證 groups 始終存在，前端無需 fallback
  const groups = view.state === 'READY' && view.groups ? view.groups : [];
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
        <ol className={styles.shenshaCombos} aria-label="整盤合看">{view.combos.map(combo => <li key={`${combo.id}:${combo.pillar ?? ''}`} data-shensha-combo={combo.id}><details className={styles.comboFold}><summary><span className={styles.comboHead}><b>{combo.title}</b>{combo.pillar && <small>{combo.pillar}</small>}</span><span className={styles.comboMembers}>{combo.members.map(name => <span key={name}>{name}</span>)}<span className={styles.moreHint}>看說明</span></span></summary><p>{combo.text}</p></details></li>)}</ol>
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
function TeacherFold({ teacher, summary, children }: { teacher: 'iching' | 'ghost' | 'asura' | 'flow'; summary: ReactNode; children: ReactNode }) {
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

/** 分享卡：把後端 buildShenShaShare 組好的內容畫成一張圖（只排版，不組句、不運算；不含出生資料）。 */
const SHARE_TONE_COLOR: Record<string, string> = { 福氣: '#f2cf7a', 動能: '#c9a8ff', 提醒: '#9fd3f0' };
function drawShareCard(share: NonNullable<DualChartResult['specialStars']['share']>): HTMLCanvasElement {
  const W = 1080, H = 1350, canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#231d38'); bg.addColorStop(1, '#0e0c18');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(231,204,255,.35)'; ctx.lineWidth = 3; ctx.strokeRect(36, 36, W - 72, H - 72);
  const font = (weight: number, size: number) => `${weight} ${size}px "Noto Serif TC", "Noto Sans TC", serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f3e6ff'; ctx.font = font(700, 76); ctx.fillText(share.title, W / 2, 150);
  ctx.fillStyle = '#b9a9d6'; ctx.font = font(400, 32); ctx.fillText(share.subtitle, W / 2, 205);
  const colW = (W - 160 - 3 * 24) / 4, top = 250, rowH = 54;
  const tallest = Math.max(1, ...share.columns.map(col => col.names.length));
  const boxH = 90 + tallest * rowH;
  share.columns.forEach((col, index) => {
    const x = 80 + index * (colW + 24);
    ctx.fillStyle = 'rgba(42,36,64,.9)'; ctx.fillRect(x, top, colW, boxH);
    ctx.strokeStyle = 'rgba(231,204,255,.25)'; ctx.lineWidth = 2; ctx.strokeRect(x, top, colW, boxH);
    ctx.fillStyle = '#e7ccff'; ctx.font = font(700, 36); ctx.fillText(col.label, x + colW / 2, top + 55);
    ctx.font = font(500, 36);
    (col.names.length ? col.names : [{ name: share.emptyColumn, tone: null }]).forEach((item, row) => {
      ctx.fillStyle = (item.tone && SHARE_TONE_COLOR[item.tone]) || '#f2dba8';
      ctx.fillText(item.name, x + colW / 2, top + 115 + row * rowH, colW - 16);
    });
  });
  let y = top + boxH + 90;
  ctx.fillStyle = '#f2cf7a'; ctx.font = font(700, 44); ctx.fillText(share.hexagram, W / 2, y);
  ctx.textAlign = 'left';
  const wrap = (text: string, x: number, maxWidth: number, lineHeight: number) => {
    let line = '';
    for (const ch of [...text]) {
      if (ctx.measureText(line + ch).width > maxWidth && line) { ctx.fillText(line, x, y); y += lineHeight; line = ch; } else line += ch;
    }
    if (line) { ctx.fillText(line, x, y); y += lineHeight; }
  };
  for (const line of share.lines) {
    if (y > H - 220) break;
    y += 70;
    ctx.fillStyle = '#e7ccff'; ctx.font = font(700, 34); ctx.fillText(line.label, 100, y); y += 52;
    ctx.fillStyle = '#efe7f7'; ctx.font = font(400, 34); wrap(line.text, 100, W - 200, 50);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b9a9d6'; ctx.font = font(400, 28); ctx.fillText(share.footer, W / 2, H - 110);
  ctx.fillStyle = '#8f82aa'; ctx.font = font(400, 26); ctx.fillText(share.site, W / 2, H - 70);
  return canvas;
}

function ShenShaShare({ share }: { share?: DualChartResult['specialStars']['share'] }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'fail'>('idle');
  const [image, setImage] = useState<string | null>(null);
  if (!share) return null;
  const make = async () => {
    setStatus('busy');
    try {
      const canvas = drawShareCard(share);
      const url = canvas.toDataURL('image/png');
      setImage(url);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = blob ? new File([blob], share.fileName, { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: share.shareText }).catch(() => undefined);
      setStatus('done');
    } catch { setStatus('fail'); }
  };
  return <div className={styles.shareCard} aria-label="分享卡">
    <button type="button" className={styles.shareButton} onClick={make} disabled={status === 'busy'}>{status === 'busy' ? share.busyLabel : share.buttonLabel}</button>
    <small>{share.privacyNote}</small>
    {status === 'done' && <p role="status">{share.doneLabel}</p>}
    {status === 'fail' && <p role="status">{share.failLabel}</p>}
    {image && <figure><img src={image} alt={share.shareText} /><a href={image} download={share.fileName}>{share.fileName}</a></figure>}
  </div>;
}

/** 流年運勢簡要卡片：當年一覽 */
function FlowYearSummaryCard({ year }: { year: ShenShaFlowYear }) {
  const goodCount = year.touched.filter(s => s.tone === '福氣').length + year.suiShen.filter(s => s.tone === '福氣').length;
  const cautionCount = year.touched.filter(s => s.tone === '提醒').length + year.suiShen.filter(s => s.tone === '提醒').length;
  const totalCount = year.touched.length + year.suiShen.length;
  const vibe = totalCount === 0 ? '平順' : goodCount > cautionCount ? '吉' : cautionCount > goodCount ? '需注意' : '平衡';

  return <div className={styles.flowYearSummary} data-vibe={vibe}>
    <div className={styles.flowSummaryHeader}>
      <h4>{year.label}</h4>
      <span className={styles.vibeTag} data-vibe={vibe}>{vibe}</span>
    </div>
    <p className={styles.flowSummaryMotto}>{year.oneLiner}</p>
    {totalCount > 0 && <div className={styles.flowSummaryStats}>
      <span><b>{totalCount}</b>項神煞</span>
      {goodCount > 0 && <span data-tone="福氣">吉 {goodCount}</span>}
      {cautionCount > 0 && <span data-tone="提醒">需注意 {cautionCount}</span>}
    </div>}
    <p className={styles.flowSummaryHint}>👇 點下方展開詳細</p>
  </div>;
}

/** 流年神煞：只照印後端 buildShenShaFlow 的結果（本命被觸動／今年歲神，今年＋明年）。 */
function ShenShaFlowSection({ view }: { view?: DualChartResult['specialStars']['flow'] }) {
  if (!view) return null;
  if (view.state === 'BLOCKED') return <section className={styles.shenshaFlow} aria-label="流年神煞內容"><p role="status">{view.reason}</p></section>;
  const list = (items: typeof view.years[number]['touched'], empty: string) => items.length
    ? <ul className={styles.flowItems}>{items.map((item, index) => <li key={`${item.id}:${item.pillar}:${index}`} data-shensha-tone={item.tone ?? undefined}>
      <p className={styles.shenshaItemHead}><b>{item.name}</b><span>{item.pillar}</span>{item.theme && <em>{item.tone}｜{item.theme}</em>}</p>
      <p>{item.text}</p><p className={styles.shenshaDerive}>推導：{item.derivation}</p></li>)}</ul>
    : <p className={styles.flowEmpty}>{empty}</p>;
  return <section className={styles.shenshaFlow} aria-label="流年神煞內容">
    <p className={styles.flowIntro}>{view.intro}</p>
    {view.years.map((year, idx) => <div key={year.year}>
      {idx === 0 && <FlowYearSummaryCard year={year} />}
      <div className={styles.flowYear} data-flow-year={year.year}>
        <h4 className={styles.shenshaSectionTitle}>{year.label}</h4>
        <p className={styles.flowOneLiner}>{year.oneLiner}</p>
        <h5 className={styles.flowSubTitle}>{view.touchedTitle}</h5>{list(year.touched, view.emptyTouched)}
        <h5 className={styles.flowSubTitle}>{view.suiShenTitle}</h5>{list(year.suiShen, view.emptySuiShen)}
      </div>
    </div>)}
    <p className={styles.shenshaSources}>{view.note}</p>
  </section>;
}

/** 鬼魅老師解盤（茅山道士話術分身）：只照印後端 buildShenShaGhost 的結果。 */
function ShenShaGhostSection({ view }: { view?: DualChartResult['specialStars']['ghost'] }) {
  if (!view) return null;
  // 封印中：本文一個字都不畫（後端本來也不送）。
  if (view.state === 'SEALED') return null;
  if (view.state === 'BLOCKED') return <section className={styles.shenshaGhost} aria-label="鬼魅老師解盤內容">{view.ageGate && <p className={styles.ageGateBanner}>{view.ageGate}</p>}<p role="status">{view.reason}</p></section>;
  return <section className={styles.shenshaGhost} aria-label="鬼魅老師解盤內容">
    {view.ageGate && <p className={styles.ageGateBanner}>{view.ageGate}</p>}
    <p className={styles.ghostOpening}>{view.opening}</p>
    <h4 className={styles.ghostTitle}>拆卦</h4>
    <ul className={styles.ghostDecoding}>{view.decoding.map(d => <li key={d.label}><b>{d.label}</b><p>{d.text}</p></li>)}</ul>
    {view.groups.length > 0 && <>
      <h4 className={styles.ghostTitle}>逐柱點氣</h4>
      {view.groups.map(group => <div key={group.pillar} className={styles.ghostGroup}><h5>{group.pillar}</h5>{group.intro && <p className={styles.ghostPillarIntro}>{group.intro}</p>}
        <ul>{group.lines.map((line, index) => <li key={`${line.name}:${index}`} data-shensha-tone={line.tone ?? undefined}>{line.hook
          ? <details className={styles.ghostMore}><summary><span className={styles.ghostHook}>{line.hook}<span className={styles.moreHint}>完整鬼語</span></span></summary><p>{line.text}</p></details>
          : line.text}</li>)}</ul></div>)}
    </>}
    {view.formations.length > 0 && <>
      <h4 className={styles.ghostTitle}>陣法</h4>
      <ul className={styles.ghostFormations}>{view.formations.map((f, index) => <li key={`${f.title}:${index}`}><details className={styles.formationFold}><summary><b>{f.title}</b></summary><p>{f.text}</p></details></li>)}</ul>
    </>}
    <p className={styles.ghostClosing}>{view.closing}</p>
    <p className={styles.ghostDisclaimer}>{view.disclaimer}</p>
  </section>;
}

/** 點四柱格子裡的神煞：打開易經老師與那一項的完整解讀，捲過去（只做畫面跳轉，不運算）。 */
function openShenShaItemCard(anchor: string) {
  const target = document.getElementById(anchor);
  if (!target) return false;
  for (let el: HTMLElement | null = target; el; el = el.parentElement) if (el instanceof HTMLDetailsElement) el.open = true;
  target.querySelector('details')?.setAttribute('open', '');
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

/** Independent card. The pillar grid is always visible; the three teacher readings fold. Every word comes from the backend. */
export function ShenShaCard({ result, printMode = false, hideShenShaGrid = false }: { result: DualChartResult; printMode?: boolean; hideShenShaGrid?: boolean }) {
  const card = result.specialStars?.card;
  const state = card?.state ?? 'unavailable';
  const [shenshaTab, setShenShaTab] = useState<'iching' | 'ghost' | 'asura'>('iching'); // 三卡選擇：易經老師 / 鬼魅 / 阿修羅
  return <section className={styles.shenshaCard} aria-label="特星神煞" data-screen-arrow-target="dual-chart-special-stars" data-shensha-card-state={state}>
    <header className={styles.shenshaHeader}>
      <h3>{printMode ? '特星神煞' : '神煞易經'}</h3>
      {!printMode && <p className={styles.shenshaSubtitle}>八字 → 紫微 → 特星神煞 → 易經</p>}
    </header>
    {/* 🆕 四柱神煞摘要：移到最前面（在標題下方，作為第一個內容塊） */}
    {!hideShenShaGrid && card && card.columns.length > 0 && <div className={styles.shenshaSummary} aria-label="四柱神煞摘要">
      <h4>本命盤命中</h4>
      <div className={styles.shenshaSummaryStats}>
        {(() => {
          const allHits = card.columns.flatMap(col => col.hits);
          const totalCount = allHits.length;
          const byTone = { 福氣: allHits.filter(h => h.tone === '福氣').length, 動能: allHits.filter(h => h.tone === '動能').length, 提醒: allHits.filter(h => h.tone === '提醒').length };
          return <><span className={styles.summaryTotal}><b>{totalCount}</b> 項神煞</span>
            <span className={styles.summaryTone} data-tone="福氣">福氣 {byTone.福氣}</span>
            <span className={styles.summaryTone} data-tone="動能">動能 {byTone.動能}</span>
            <span className={styles.summaryTone} data-tone="提醒">提醒 {byTone.提醒}</span></>;
        })()}
      </div>
      <p className={styles.shenshaSummaryHint}>以下依年、月、日、時柱顯示本次結果</p>
    </div>}
    {/* 四柱神煞網格表 */}
    {!hideShenShaGrid && card && card.columns.length > 0 && <div id="shensha-grid" className={styles.shenshaPillars}>{card.columns.map(col =>
      <div key={col.pillar} data-shensha-column={col.pillar} data-shensha-column-state={col.state}><h4>{col.label}</h4>
        {col.hits.length > 0 && <ul aria-label={`${col.label}神煞`}>{col.hits.map(hit => <li key={`${hit.id}:${hit.name}`} data-shensha-result={hit.id} data-shensha-method={hit.reference ? 'reference' : 'source'} data-shensha-tone={hit.tone ?? undefined} aria-label={hit.tone ? `${hit.name}（${hit.tone}）` : undefined} title={`${hit.name}${hit.tone ? `（${hit.tone}）` : ''}｜${hit.rule}｜${hit.sourceLabel}`}>{hit.anchor ? <a href={`#${hit.anchor}`} onClick={event => { if (openShenShaItemCard(hit.anchor)) event.preventDefault(); }}>{hit.name}</a> : hit.name}</li>)}</ul>}
        {col.emptyText && <span className={styles.shenshaEmpty} aria-label={col.state === 'PENDING' ? `結果尚未完整：${col.pendingNames.join('、')}` : '本次未命中本站既有規則'}>{col.emptyText}</span>}
        {col.note && <small className={styles.shenshaPillarNote}>{col.note}</small>}
      </div>)}</div>}
    {!hideShenShaGrid && card && card.columns.length > 0 && <p className={styles.shenshaLegend} aria-label="圖例"><span data-shensha-tone="福氣">福氣</span><span data-shensha-tone="動能">動能</span><span data-shensha-tone="提醒">提醒</span><span>＊ 本派取法</span></p>}
    {!printMode && card?.notice && <p role="status">{card.notice}</p>}
    {!printMode && !card && <p role="status">神煞資料尚未完整，暫不能判斷有無結果。</p>}
    {!printMode && card?.footnote && <p className={styles.shenshaFootnote}>{card.footnote}</p>}
    {!printMode && result.specialStars?.flow?.state === 'READY' && <div className={styles.flowStrip} aria-label="流年一句話">{result.specialStars.flow.years.map(year => <p key={year.year}><b>{year.label}</b>{year.oneLiner}</p>)}</div>}
    {!printMode && result.specialStars?.iching?.state === 'READY' && <div className={styles.teacherTriple} aria-label="三位老師一句話">
      <div className={styles.teacherTabs} role="tablist">
        <button
          role="tab"
          aria-selected={shenshaTab === 'iching'}
          onClick={() => setShenShaTab('iching')}
          className={shenshaTab === 'iching' ? styles.tabActive : ''}
        >
          易經老師
        </button>
        {result.specialStars?.ghost?.state === 'READY' && (
          <button
            role="tab"
            aria-selected={shenshaTab === 'ghost'}
            onClick={() => setShenShaTab('ghost')}
            className={shenshaTab === 'ghost' ? styles.tabActive : ''}
          >
            鬼魅老師
          </button>
        )}
        {result.specialStars?.asura?.state === 'READY' && (
          <button
            role="tab"
            aria-selected={shenshaTab === 'asura'}
            onClick={() => setShenShaTab('asura')}
            className={shenshaTab === 'asura' ? styles.tabActive : ''}
          >
            阿修羅
          </button>
        )}
      </div>
      <div className={styles.teacherQuotes}>
        {shenshaTab === 'iching' && <p data-teacher="iching"><b>易經老師</b>{result.specialStars.iching.oneLiner}</p>}
        {shenshaTab === 'ghost' && result.specialStars?.ghost?.state === 'READY' && <p data-teacher="ghost"><b>鬼魅老師</b>{result.specialStars.ghost.oneLiner}</p>}
        {shenshaTab === 'asura' && result.specialStars?.asura?.state === 'READY' && <p data-teacher="asura"><b>鬼魅阿修羅</b>破局是我的承諾。</p>}
      </div>
    </div>}
    {/* 三位老師卡片 — 按 shenshaTab 狀態切換顯示 */}
    {!printMode && shenshaTab === 'iching' && result.specialStars?.iching && (
      <TeacherFold teacher="iching" summary={<summary><span className={styles.teacherHead}><b>易經老師解盤</b><small>神　溫和的智慧</small></span>{result.specialStars.iching.state === 'READY' && <span className={styles.teacherTeaser}>{result.specialStars.iching.teaser}</span>}</summary>}>
        <ShenShaIChingSection view={result.specialStars.iching} />
      </TeacherFold>
    )}

    {/* 鬼魅老師封印中（業主定案 2026-09-28）：貼現有封印符，卡頭可見、點不開；解封改 lib/shensha-ghost.ts 的 GHOST_SEALED。 */}
    {!printMode && shenshaTab === 'ghost' && result.specialStars?.ghost?.state === 'SEALED' && (
      <div className={`${styles.teacherCard} ${styles.ghostSealed}`} data-teacher="ghost" data-sealed="true" aria-label={result.specialStars.ghost.sealNotice}>
        <div className={styles.ghostSealedHead}><span className={styles.teacherHead}><b>鬼魅老師解盤</b><small>魔　茅山門外低語</small><em className={styles.ageGate}>{result.specialStars.ghost.ageGate}</em></span><span className={styles.teacherTeaser}>{result.specialStars.ghost.teaser}</span><span className={styles.ghostSealNotice}>{result.specialStars.ghost.sealNotice}</span></div>
        <SharedElementSealPaper />
      </div>
    )}
    {!printMode && shenshaTab === 'ghost' && result.specialStars?.ghost && result.specialStars.ghost.state !== 'SEALED' && (
      <TeacherFold teacher="ghost" summary={<summary><span className={styles.teacherHead}><b>鬼魅老師解盤</b><small>魔　茅山門外低語</small>{result.specialStars.ghost.ageGate && <em className={styles.ageGate}>{result.specialStars.ghost.ageGate}</em>}</span><span className={styles.teacherTeaser}>{result.specialStars.ghost.teaser}</span></summary>}>
        <ShenShaGhostSection view={result.specialStars.ghost} />
      </TeacherFold>
    )}

    {/* 阿修羅解盤 — 正式解盤接線（080-14：coverage → adapter → … → 卡片） */}
    {!printMode && shenshaTab === 'asura' && (() => {
      const reading = buildGhostAsuraReading({ result });
      if (reading.items.length === 0 && reading.guard.status === 'FAILED' && reading.pendingEntries[0]?.resultId === 'ADAPTER_BLOCKED') {
        return null;
      }
      return (
        <TeacherFold teacher="asura" summary={<summary><span className={styles.teacherHead}><b>鬼魅阿修羅</b><small>戰　破局是承諾</small></span><span className={styles.teacherTeaser}>命魂戰局 — 同盤三視角</span></summary>}>
          <GhostAsuraCard reading={reading} />
        </TeacherFold>
      );
    })()}

    {!printMode && result.specialStars?.flow && <TeacherFold teacher="flow" summary={<summary><span className={styles.teacherHead}><b>流年神煞</b><small>今年與明年</small></span>{result.specialStars.flow.state === 'READY' && <span className={styles.teacherTeaser}>{result.specialStars.flow.teaser}</span>}</summary>}>
      <ShenShaFlowSection view={result.specialStars.flow} />
    </TeacherFold>}
    {!printMode && <ShenShaShare share={result.specialStars?.share} />}
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

export default function BaziChart({ result, monochrome = false, language = 'zh', hideShenShaCard = false }: { result: DualChartResult; monochrome?: boolean; language?: string; hideShenShaCard?: boolean }) {
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
  </div>{!monochrome && !hideShenShaCard && <ShenShaCard result={result} />}
  {/* 🔒 舊卡片已隱藏：2026-09-30 準備用新版本替換 */}
  {/* {!monochrome && !hideShenShaCard && <GhostAsuraCardIndependent result={result} />} */}
  </div><section className={styles.screenShenShaNotes} aria-label={language === 'en' ? 'Shensha source status' : '神煞來源狀態'}>{sourceNotes}</section></>;
}
