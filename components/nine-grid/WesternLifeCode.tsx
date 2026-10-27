'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LifeCodeCard, LifeCodeResult } from '@/lib/western-life-code/engine';
import styles from './WesternLifeCode.module.css';

function ResultCard({ card, expanded = false, compact = false }: { card: LifeCodeCard; expanded?: boolean; compact?: boolean }) {
  return <details open={expanded || undefined} className={styles.resultCard} data-status={card.status} data-module={card.id}>
    <summary>{!compact && <><span className={styles.cardTitle}>{card.title}</span><strong>{card.display}</strong><span className={styles.cardStatus}>{card.statusText}</span></>}<span className={styles.openLabel}>查看過程與來源 ＋</span></summary>
    <div className={styles.cardBack}>
      {card.note && <p>{card.note}</p>}
      {card.steps.length > 0 && <ol>{card.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
      {card.calculation_method && <p>{card.calculation_method}</p>}
      {card.source && <div className={styles.citation}>
        <p>{card.source.author} · {card.source.title}</p>
        <p>{card.source.edition}</p>
        {card.source_location && <p>{card.source_location}</p>}
        {card.source.url && <a href={card.source.url} target="_blank" rel="noopener noreferrer">查看原始來源 ↗</a>}
      </div>}
    </div>
  </details>;
}

// Local presentation sounds only. No sound, network call or AudioContext on page load.
function createNumberSound() {
  let context: AudioContext | null = null;
  const voices = new Set<OscillatorNode>();
  function stop() { for (const voice of voices) { try { voice.stop(); } catch {} } voices.clear(); }
  return { stop, dispose() { stop(); if (context) void context.close().catch(() => undefined); context = null; },
    play(kind: 'take' | 'combine' | 'subtract' | 'answer') {
      try {
        if (!context) {
          const Audio = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!Audio) return;
          context = new Audio();
        }
        if (context.state === 'suspended') void context.resume().catch(() => undefined);
        const notes = kind === 'answer' ? [293.66, 369.99, 440, 587.33] : kind === 'combine' ? [440, 587.33] : kind === 'subtract' ? [587.33, 440] : [587.33];
        const duration = kind === 'answer' ? .45 : kind === 'take' ? .1 : .2;
        notes.forEach((frequency, i) => {
          const audio = context!; const at = audio.currentTime + i * .09;
          const voice = audio.createOscillator(), gain = audio.createGain();
          voice.type = 'sine'; voice.frequency.value = frequency;
          gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(kind === 'take' ? .016 : .025, at + .015); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
          voice.connect(gain).connect(audio.destination); voices.add(voice);
          voice.onended = () => { voices.delete(voice); voice.disconnect(); gain.disconnect(); };
          voice.start(at); voice.stop(at + duration + .02);
        });
      } catch { /* Unsupported or blocked audio never interrupts the visual walkthrough. */ }
    },
  };
}

function NumberWalk({ card, copy, quick, muted, onMutedChange, onRestart, onComplete }: { card: LifeCodeCard; copy: LifeCodeResult['exploration']['walk']; quick: boolean; muted: boolean; onMutedChange: (value: boolean) => void; onRestart: () => void; onComplete: (automatic: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [combined, setCombined] = useState(false);
  const [done, setDone] = useState(quick);
  const [playing, setPlaying] = useState(!quick && card.status === 'PASSED' && Boolean(card.walkthrough?.length));
  const [hasPlayed, setHasPlayed] = useState(!quick && card.status === 'PASSED' && Boolean(card.walkthrough?.length));
  const sound = useRef<ReturnType<typeof createNumberSound> | null>(null);
  if (!sound.current) sound.current = createNumberSound();
  const complete = useRef(onComplete); complete.current = onComplete;
  useEffect(() => { if (quick) { setDone(true); setPlaying(false); sound.current?.stop(); } }, [quick]);
  useEffect(() => () => sound.current?.dispose(), []);
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) { setPlaying(false); sound.current?.stop(); } };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);
  const frames = card.walkthrough ?? [];
  const frame = frames[step];
  const stage = useRef<HTMLDivElement>(null);
  const answerPanel = useRef<HTMLDivElement>(null);
  const flights = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    const area = stage.current;
    if (!area || !frame?.origin || done || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const origins = area.querySelectorAll<HTMLElement>('[data-origin-digit]');
    const tokens = area.querySelectorAll<HTMLElement>('[data-flight-token]');
    flights.current = Array.from(tokens).flatMap((token, index) => {
      const sources = frame.origin!.slots[index]?.map(slot => origins[slot]?.getBoundingClientRect()).filter(Boolean) ?? [];
      if (!sources.length || !token.animate) return [];
      const target = token.getBoundingClientRect();
      const left = Math.min(...sources.map(rect => rect.left)), right = Math.max(...sources.map(rect => rect.right));
      return [token.animate([
        { transform: `translate(${(left + right - target.left - target.right) / 2}px, ${sources[0].top - target.top}px) scale(.65)`, opacity: 0 },
        { transform: `translate(${(left + right - target.left - target.right) / 2}px, ${sources[0].top - target.top}px) scale(.85)`, opacity: 1, offset: .25 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ], { duration: 900, delay: 450 + index * 220, easing: 'ease-in-out', fill: 'backwards' })];
    });
    return () => { flights.current.forEach(animation => animation.cancel()); flights.current = []; };
  }, [frame, done, hasPlayed]);
  useEffect(() => {
    const target = done ? answerPanel.current : stage.current;
    target?.scrollIntoView?.({ block: done ? 'start' : 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [step, combined, done, playing]);
  useEffect(() => {
    if (!playing || done || !frame) return;
    const timer = window.setTimeout(() => {
      if (!combined) { setCombined(true); if (!muted) sound.current?.play(frame.kind === 'finish' ? 'answer' : frame.kind === 'difference' ? 'subtract' : 'combine'); }
      else if (step === frames.length - 1) { setDone(true); setPlaying(false); complete.current(true); }
      else { setStep(step + 1); setCombined(false); if (!muted) sound.current?.play('take'); }
    }, combined ? (frame.pace?.result ?? 2200) : (frame.pace?.take ?? 2600));
    return () => window.clearTimeout(timer);
  }, [playing, done, frame, combined, step, frames.length, muted]);
  function finish() { setDone(true); setPlaying(false); sound.current?.stop(); onComplete(false); }
  function pause() { setPlaying(false); sound.current?.stop(); flights.current.forEach(animation => animation.finish()); }
  if (card.status !== 'PASSED' || !frame) return <ResultCard card={card} expanded/>;
  if (done) return <div ref={answerPanel} className={styles.answerCard}><h5>{copy.answerTitle}</h5><p>{copy.answerLead}</p><strong className={styles.answerNumber} data-testid="revealed-answer">{card.display}</strong><p>{card.title}</p><p className={styles.answerMethod}>{card.calculation_method}</p>{card.note && <p>{card.note}</p>}<ResultCard card={card} compact/><button className={styles.backToBoard} type="button" onClick={() => { pause(); onRestart(); setStep(0); setCombined(false); setDone(false); setHasPlayed(true); setPlaying(true); if (!muted) sound.current?.play('take'); }}>{copy.again}</button></div>;
  return <section className={styles.numberWalk} aria-label="一步一步帶著算">
    <div className={styles.walkTop}><span>{frame.label}</span><button type="button" onClick={finish}>{copy.fast}</button></div>
    <div className={styles.autoControls}><button type="button" aria-pressed={playing} onClick={() => { if (playing) pause(); else { setPlaying(true); setHasPlayed(true); if (!muted) sound.current?.play('take'); } }}>{playing ? copy.pause : hasPlayed ? copy.resume : copy.play}</button><button type="button" aria-pressed={!muted} onClick={() => { sound.current?.stop(); onMutedChange(!muted); }}>{muted ? copy.soundOff : copy.soundOn}</button></div>
    <h5>{frame.title}</h5><p className={styles.walkExplanation}>{frame.explanation}</p>
    <div className={styles.numberStage} ref={stage} key={step} data-combined={combined} data-kind={frame.kind} data-origin={Boolean(frame.origin)}>
      {frame.origin && <div className={styles.originRail}>
        <div className={styles.birthRail} aria-label="本次出生日期">{frame.origin.birthday.map((digit, index) => <span key={index} data-origin-digit={frame.origin!.fromBirthday ? '' : undefined} data-lit={frame.origin!.fromBirthday && frame.origin!.slots.some(slots => slots.includes(index))}>{digit}</span>)}</div>
        {!frame.origin.fromBirthday && <div className={styles.derivedRail} aria-label="前面步驟的數字">{frame.origin.values.map((value, index) => <span key={index}>{frame.origin!.fromResults && <small>{frame.progress?.before[index]?.label}</small>}<b data-origin-digit>{value}</b></span>)}</div>}
      </div>}
      <div className={styles.tokenRow}>{frame.tokens.map((token, index) => <span className={styles.tokenGroup} key={index}>{index > 0 && (frame.kind === 'sum' || frame.kind === 'difference') && <span className={styles.operator} aria-hidden="true">{frame.kind === 'difference' ? '−' : '＋'}</span>}<span className={styles.numberToken} data-flight-token>{token}</span></span>)}</div>
      {combined && <div className={styles.mergedResult} role="status"><span aria-hidden="true">↓</span><strong>{frame.result}</strong><p className={styles.equation}>{frame.equation}</p></div>}
      {frame.progress && !frame.origin?.fromResults && (combined ? frame.progress.after : frame.progress.before).length > 0 && <div className={styles.savedNumbers} aria-label="已完成的年月日結果">{(combined ? frame.progress.after : frame.progress.before).map(item => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>}
    </div>
    <details className={styles.manualControls}><summary>想自己操作或退回？</summary><div className={styles.walkActions}>
      {!combined ? <button type="button" className={styles.primary} onClick={() => { pause(); setCombined(true); if (!muted) sound.current?.play(frame.kind === 'finish' ? 'answer' : frame.kind === 'difference' ? 'subtract' : 'combine'); }}>{frame.kind === 'sum' ? copy.combine : frame.kind === 'difference' ? copy.subtract : copy.confirm}</button>
        : <button type="button" className={styles.primary} onClick={() => { pause(); if (step === frames.length - 1) finish(); else { setStep(step + 1); setCombined(false); if (!muted) sound.current?.play('take'); } }}>{step === frames.length - 1 ? copy.result : copy.next}</button>}
      <button type="button" className={styles.backToBoard} disabled={step === 0 && !combined} onClick={() => { pause(); if (combined) setCombined(false); else setStep(step - 1); }}>{copy.previous}</button>
    </div></details>
  </section>;
}

function FinalAnswer({ data }: { data: LifeCodeResult['exploration'] }) {
  const summary = data.answer.customerSummary;
  const primary = data.answer.primaryReading;
  const answer = useRef<HTMLElement>(null);
  const reading = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<'primary' | 'birthday' | 'source' | null>(null);
  const [practiceIndex, setPracticeIndex] = useState<number | null>(null);
  function guide(target: HTMLElement | null) {
    target?.scrollIntoView?.({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  useEffect(() => { guide(answer.current); }, []);
  useEffect(() => { if (selected) { guide(reading.current); reading.current?.focus({ preventScroll: true }); } }, [selected, practiceIndex]);
  function openCard(card: 'primary' | 'birthday' | 'source') { setPracticeIndex(null); if (selected === card) guide(reading.current); else setSelected(card); }
  return <section ref={answer} className={styles.finalAnswer} aria-label="生命密碼總結答案">
    <h4>{data.answerTitle}</h4>
    <div className={styles.answerChoices} aria-label="選一張看解說">
      <button type="button" className={styles.mainAnswerChoice} aria-expanded={selected === 'primary'} onClick={() => openCard('primary')}><span>{data.answer.primary.title}</span><strong>{data.answer.primary.display}</strong><span>{primary?.prompt ?? '查看本次資料狀態 →'}</span></button>
      <button type="button" aria-expanded={selected === 'birthday'} onClick={() => openCard('birthday')}><strong>生日數字</strong><span>看看多與缺 →</span></button>
      <button type="button" aria-expanded={selected === 'source'} onClick={() => openCard('source')}><strong>計算依據</strong><span>看算式與來源 →</span></button>
    </div>
    {selected && <div ref={reading} className={styles.answerReading} role="region" aria-label="答案解說" tabIndex={-1}>
      <button type="button" className={styles.backToBoard} onClick={() => { setSelected(null); guide(answer.current); }}>← 回到答案卡片</button>
      {selected === 'primary' && <>
        <h5>{primary?.content?.title ?? `${data.answer.primary.title} · ${data.answer.primary.display}`}</h5>
        {primary?.content ? <>
          {practiceIndex === null ? <>
            <p className={styles.meaningDeclaration}>{primary.content.declaration}</p>
            <p>{primary.content.meaning}</p>
            <p className={styles.shortEquation}>{summary.shortReason}</p>
            <button type="button" className={styles.primary} onClick={() => setPracticeIndex(0)}>{primary.labels.next} →</button>
          </> : <>
            {primary.content.sections.map((section, index) => index === practiceIndex && <section className={styles.meaningSection} key={section.id} aria-label={section.title}><h6>{section.title}</h6><p>{section.text}</p>{section.next && <button type="button" className={styles.primary} onClick={() => setPracticeIndex(index + 1)}>{section.next}</button>}</section>)}
            <button type="button" className={styles.backToBoard} onClick={() => setPracticeIndex(null)}>← {primary.labels.back}</button>
          </>}
          <details className={styles.answerGroup}><summary>{primary.labels.evidence}</summary><p>{primary.content.evidence}</p><p>{summary.conclusion}</p></details>
          <details className={styles.answerGroup}><summary>{primary.labels.sources}</summary><p>{primary.labels.note}</p><a href={primary.content.source.url ?? undefined} target="_blank" rel="noopener noreferrer">{primary.content.source.author} · {primary.content.source.title} ↗</a><p>{primary.content.sourceLocation}</p></details>
          <p className={styles.meaningBoundary}>{primary.boundary}</p>
        </> : <><p role="status">{primary?.statusMessage ?? '主數解說暫時無法取得。'}</p><p className={styles.shortEquation}>{summary.shortReason}</p><p>{summary.conclusion}</p></>}
      </>}
      {selected === 'birthday' && <><h5>生日數字</h5><p>{summary.abundanceLine}</p><p>{summary.absenceLine}</p><p>{summary.briefBoundary}</p><details className={styles.answerGroup}><summary>看每個數字的次數</summary><p>{summary.inputDigits}</p><p>{summary.birthCountRule}</p><div className={styles.countEvidence}>{summary.counts.map(item => <span key={item.digit}>{item.digit}：{item.count}次</span>)}</div><p>日期中的0：{summary.zeroCount}次</p><p>{summary.boundary}</p></details></>}
      {selected === 'source' && <><h5>數字和說法的依據</h5><p>{summary.reason}</p>{summary.source?.url && <a href={summary.source.url} target="_blank" rel="noopener noreferrer">{summary.source.author} · 查看公式來源 ↗</a>}<p>{summary.sourceLocation}</p><p>{summary.birthCountRule}</p><details className={styles.answerGroup}><summary>姓名計數依據</summary><p>{summary.nameLine}</p><p>{summary.nameBoundary}</p>{summary.nameSteps.map(step => <p key={step}>{step}</p>)}{summary.nameSource?.url && <a href={summary.nameSource.url} target="_blank" rel="noopener noreferrer">查看姓名計數來源 ↗</a>}</details></>}
    </div>}
    <details className={styles.extraResults}><summary>其他數字與資料狀態</summary><p>{data.answer.birthDate} · {data.answer.targetDate}</p><p>{data.answer.summary}</p>
    {data.answer.groups.map(group => <details className={styles.answerGroup} key={group.title} open={group.title === data.answer.primary.category || undefined}><summary>{group.title}</summary>{group.cards.map(card => <div className={styles.answerRow} key={card.id}><span>{card.title}</span><strong>{card.display}</strong><small>{card.statusText}</small>{card.status !== 'PASSED' && card.note && <p>{card.note}</p>}</div>)}</details>)}
    <p className={styles.boundary}>{data.answer.interpretation}</p></details>
  </section>;
}
// These states control exploration only. Values, order, guides and explanations come from the server.
function Exploration({ data }: { data: LifeCodeResult['exploration'] }) {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [stationIndex, setStationIndex] = useState(0);
  const [opened, setOpened] = useState<Set<string>>(() => new Set([data.chapters[0].cards[0].id]));
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [quick, setQuick] = useState(false);
  const [muted, setMuted] = useState(false);
  const [recap, setRecap] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const chooser = useRef<HTMLDetailsElement>(null);
  const chapter = data.chapters[chapterIndex];
  const active = chapter.cards[stationIndex];
  const revealed = opened.has(active.id);
  function reveal(id: string) { setOpened(previous => new Set(previous).add(id)); setRecap(false); }
  function select(index: number) { setStationIndex(index); reveal(chapter.cards[index].id); panel.current?.scrollIntoView?.({ block: 'start' }); }
  function next() {
    if (stationIndex < chapter.cards.length - 1) { setStationIndex(stationIndex + 1); reveal(chapter.cards[stationIndex + 1].id); }
    else setRecap(true);
    panel.current?.focus({ preventScroll: true });
  }
  return <section className={styles.exploration} aria-label="生命密碼互動探索">
    <div className={styles.exploreHeading}><p className={styles.eyebrow}>EXPLORE · 點亮／看清／前進</p><h3>{data.title}</h3><p>{data.intro}</p></div>
    <details className={styles.advancedExplorer} ref={chooser}><summary>想看其他數字？</summary><div className={styles.chapters} aria-label="探索主題">{data.chapters.map((item, index) => <button key={item.id} type="button" aria-pressed={chapterIndex === index} onClick={() => { setChapterIndex(index); setStationIndex(0); setRecap(false); }}>{item.title}</button>)}</div>
    <p className={styles.chapterIntro}>{chapter.intro}</p>
    <div className={styles.board} ref={board} tabIndex={-1} aria-label={chapter.title}>{chapter.cards.map((card, index) => <button key={card.id} type="button" className={styles.node} data-active={stationIndex === index} data-revealed={completed.has(card.id)} data-status={card.status} aria-pressed={stationIndex === index} aria-label={`${card.title}，${completed.has(card.id) ? card.display : '點選探索'}`} onClick={() => select(index)}>
      <span className={styles.nodeTitle}>{card.title}</span><strong aria-hidden="true">{completed.has(card.id) ? card.display : '✧'}</strong><span className={styles.nodeHint}>{completed.has(card.id) ? (card.status === 'PASSED' ? '已點亮 · 可重看' : card.statusText) : '點選探索'}</span>
    </button>)}</div>
    <div className={styles.exploreTools}><button type="button" onClick={() => { setOpened(previous => new Set([...previous, ...chapter.cards.map(card => card.id)])); setCompleted(previous => new Set([...previous, ...chapter.cards.map(card => card.id)])); setQuick(true); setRecap(false); }}>{data.revealAll}</button><button type="button" onClick={() => { setOpened(new Set([chapter.cards[0].id])); setCompleted(new Set()); setQuick(false); setStationIndex(0); setRecap(false); }}>{data.restart}</button></div></details>
    <div className={styles.guidePanel} ref={panel} tabIndex={-1}>
      {!recap && <p className={styles.station}>{chapter.title}</p>}
      {recap ? <div><FinalAnswer data={data}/><button className={styles.primary} type="button" onClick={() => { setCompleted(previous => { const next = new Set(previous); next.delete(chapter.cards[0].id); return next; }); setStationIndex(0); setRecap(false); }}>回到第一站</button></div> : <>
        {(!revealed || active.status !== 'PASSED') && <h4>{revealed ? data.pending : active.guide}</h4>}
        {revealed ? <div className={styles.revealed} key={active.id}><NumberWalk card={active} copy={data.walk} quick={quick} muted={muted} onMutedChange={setMuted} onRestart={() => setCompleted(previous => { const next = new Set(previous); next.delete(active.id); return next; })} onComplete={automatic => { setCompleted(previous => new Set(previous).add(active.id)); if (automatic && active.id === 'lifePath') { setRecap(true); panel.current?.scrollIntoView?.({ block: 'start' }); } }}/>{(completed.has(active.id) || active.status !== 'PASSED') && <button className={styles.primary} type="button" onClick={next}>{stationIndex === chapter.cards.length - 1 ? data.finish : data.next} <span aria-hidden="true">→</span></button>}</div>
          : <button className={styles.revealButton} type="button" onClick={() => reveal(active.id)}><span aria-hidden="true">✧</span>{active.status === 'PASSED' ? data.reveal : data.pending}</button>}
      </>}
      <details className={styles.moreActions}><summary>其他查看方式</summary>
      <button className={styles.backToBoard} type="button" onClick={() => { if (chooser.current) chooser.current.open = true; board.current?.focus({ preventScroll: true }); board.current?.scrollIntoView?.({ block: 'start' }); }}>探索其他數字</button>
      {!recap && <button className={styles.backToBoard} type="button" onClick={() => { setRecap(true); panel.current?.scrollIntoView?.({ block: 'start' }); }}>揭曉完整答案</button>}
      </details>
    </div>
    <details className={styles.aboutExplorer}><summary>關於這個探索盤</summary><p className={styles.layoutNote}>{data.layoutNote}</p></details>
  </section>;
}

export default function WesternLifeCode({ birthDate }: { birthDate: string }) {
  const [guidance, setGuidance] = useState<{ title: string; intro: string; boundary: string; defaultTargetDate: string } | null>(null);
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [result, setResult] = useState<LifeCodeResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [guideRun, setGuideRun] = useState(0);
  const serial = useRef(0);
  const request = useRef<AbortController | null>(null);
  const resultsPanel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (result) resultsPanel.current?.scrollIntoView?.({ block: 'start' }); }, [result]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/western-life-code', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted && data.ok && data.guidance) { setGuidance(data.guidance); setTargetDate(data.guidance.defaultTargetDate); setError(''); } })
      .catch(() => { if (!controller.signal.aborted) setError('暫時無法取得，請重新載入資料'); });
    return () => controller.abort();
  }, [guideRun]);
  useEffect(() => {
    serial.current += 1; request.current?.abort(); setResult(null); setBusy(false); setError('');
    return () => { serial.current += 1; request.current?.abort(); };
  }, [birthDate]);

  function edited() {
    serial.current += 1; request.current?.abort(); setResult(null); setBusy(false); setError('');
  }
  async function submit() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const run = ++serial.current;
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/western-life-code', { method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ birthDate, targetDate, name, calendarType: 'solar', school: 'DECOZ' }) });
      const data = await response.json();
      if (run !== serial.current || controller.signal.aborted) return;
      if (!response.ok || !data.ok || !data.result) { setError(data.message || '暫時無法取得，請稍後再試'); return; }
      setResult(data.result);
    } catch { if (run === serial.current && !controller.signal.aborted) setError('暫時無法取得，請確認連線後再試'); }
    finally { if (run === serial.current) setBusy(false); }
  }
  return <section className={styles.shell} aria-label="西方生命密碼">
    <header className={styles.header}><p className={styles.eyebrow}>NUMEROLOGY · 生命數字卡</p><span className={styles.emblem} aria-hidden="true">✧</span><h2>西方生命密碼</h2>{guidance && <p>{guidance.intro}</p>}</header>
    <form className={styles.form} onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className={styles.birthday}><span>本次公曆生日</span><strong>{birthDate || '請先在上方填寫生日'}</strong><small>沿用上方出生日期</small></div>
      <details className={styles.optionalFields}><summary>選填姓名／調整查詢日期</summary><label>出生英文全名 <small>選填</small><input autoComplete="off" maxLength={160} value={name} onChange={e => { edited(); setName(e.target.value); }} placeholder="例如 JOHN MICHAEL SMITH"/><small>依出生登記的完整英文姓名填寫；不自動翻譯中文。</small></label>
      <label>流年查詢日期<input type="date" value={targetDate} onChange={e => { edited(); setTargetDate(e.target.value); }} required /></label></details>
      <button className={styles.primary} disabled={!guidance || !birthDate || !targetDate || busy} type="submit">{busy ? '正在計算…' : '展開我的生命密碼'}</button>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!guidance && error && <button type="button" onClick={() => setGuideRun(n => n + 1)}>重新載入資料</button>}
    </form>
    {result && <div className={styles.results} ref={resultsPanel} aria-live="polite">
      {result.exploration && <Exploration data={result.exploration}/>}
      <details className={styles.allResults}><summary>完整結果卡冊</summary>{result.groups.map(group => <section key={group.title} className={styles.group}><h3>{group.title}</h3><div className={styles.cards}>{group.cards.map(card => <ResultCard key={card.id} card={card}/>)}</div></section>)}</details>
      <details className={styles.sourceList}><summary>完整來源與核對範圍</summary><h3>{result.subtitle}</h3><p>{result.input.birthDate} · {result.input.targetDate}</p><p>{result.summary}</p><p>{result.school}</p><p>{result.interpretation}</p>{result.sources.map(source => <div className={styles.citation} key={source.id}><p>{source.author} · {source.title}</p><p>{source.edition}</p><p>{source.copyright_status}</p>{source.url && <a href={source.url} target="_blank" rel="noopener noreferrer">開啟來源 ↗</a>}</div>)}</details>
    </div>}
    {guidance && <p className={styles.boundary}>{guidance.boundary}</p>}
  </section>;
}
