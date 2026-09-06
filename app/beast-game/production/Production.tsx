'use client';

import { useEffect, useState } from 'react';
import styles from './production.module.css';

type Card = { id: string; position: number; name: string; state: string; reference: string; video: string | null; attempt?: number; latestAttempt?: number; seconds?: number; startedAt?: string; returnedAt?: string; completedAt?: string; crossCheck?: string | null; failedParts?: { part: string; evidence: string }[] };
type Progress = { startedAt: string | null; state: string; running: boolean; blockers?: {cardId:string;name:string;scope:string;retryAt:string|null}[]; current: { position: number; cardId: string; phase: string } | null; generated: number; total: number; cards: Card[] };
const parts: Record<string, string> = { head: '頭部', body: '身體', limbs: '手腳', mouth: '嘴巴', teethOrBeak: '牙齒／喙', eyes: '眼睛', clawsOrHooves: '爪／蹄', tail: '尾巴', identity: '本體一致', opponentIdentity: '對手一致', contact: '咬擊接觸', reciprocalBite:'互相對咬', playerVoice: '玩家聲音', continuity: '前後連貫', presentation: '額外畫面元素' };
const stateLabel = (state: string) => ({ 'needs-refinement': '需細修', 'awaiting-cross-check': '待交叉驗收', 'candidate-ready': '審查中', 'awaiting-generation': '待生成', 'submission-uncertain': '生成結果確認中', 'provider-rejected': '服務退回', 'provider-failed': '生成未成功', 'quota-blocked': '額度待恢復', 'retrieval-paused':'待續取結果', 'generating': '生成中', 'approved': '已驗收' }[state] ?? state);
const phaseLabel = (phase: string) => ({ generating: '生成中', reviewing: '審查中', decoding: '檢查影片', prepare: '準備中', resuming: '續取中' }[phase] ?? phase);
const time = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '—';

export default function Production() {
  const [data, setData] = useState<Progress | null>(null);
  const [selected, setSelected] = useState('beast_a01');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/beast-production', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('進度讀取失敗');
        setData(await response.json()); setError('');
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '連線中斷'); }
    };
    void refresh(); const poll = setInterval(() => void refresh(), 5000);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { controller.abort(); clearInterval(poll); clearInterval(timer); };
  }, []);
  const card = data?.cards.find(card => card.id === selected);
  const elapsed = data?.startedAt ? Math.max(0, Math.floor((now - Date.parse(data.startedAt)) / 1000)) : 0;
  const reviewed = data?.cards.filter(card => card.state === 'approved').length ?? 0;
  return <main className={styles.page}>
    <header className={styles.header}><a href="/beast-game">← 神獸決鬥</a><span>本機製作預覽</span></header>
    <h1>六十神獸・六秒戰技</h1>
    <p className={styles.intro}>底氣蓄力 → 玩家先咬 → 對手反咬 → 玩家再次命中與收勢。每隻本體與原聲獨立比對。</p>
    <div className={styles.metrics}>
      <div><strong>{data?.generated ?? 0}<small> / 60</small></strong><span>六秒候選影片</span></div>
      <div><strong>{reviewed}<small> / 60</small></strong><span>正式驗收通過</span></div>
      <div><strong>{Math.floor(elapsed / 60)}<small> 分 {elapsed % 60} 秒</small></strong><span>首輪開始後經過</span></div>
    </div>
    <div className={styles.status} role="status">{error ? `連線中斷，以下保留上次進度：${error}` : !data ? '讀取實際進度…' : data.running && data.current ? `正在執行：第 ${data.current.position} 隻・${data.cards.find(card => card.id === data.current?.cardId)?.name ?? ''}・${phaseLabel(data.current.phase)}` : data.state === 'first-pass-complete' ? '首輪候選產出完成；依下列清單繼續細修與驗收。' : '批次目前未執行，待處理項目仍保留。'}</div>
    <section className={styles.viewer} aria-label="神獸影片預覽">
      {!!data?.blockers?.length && <div className={styles.notice} role="note">
        {data.blockers.some(item=>item.scope==='monthly-spend')&&<p>影片生成已暫停：供應商回報專案每月支出上限。需先在 <a href="https://ai.studio/spend" target="_blank" rel="noreferrer">AI Studio 調整專案額度</a>，此服務目前已停止付費重試。</p>}
        {data.blockers.filter(item=>item.scope==='daily').map(item=><p key={item.cardId}>{item.name}：每日次數限制，{item.retryAt?`供應商建議 ${new Date(item.retryAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})}（台灣時間）後查回原任務。`:'恢復時間尚未確定。'}仍須確認專案支出額度可用。</p>)}
      </div>}
      <div className={styles.videoHeader}><h2>{card ? `${String(card.position).padStart(2, '0')} ${card.name}` : '神獸影片'}</h2><span>{card ? stateLabel(card.state) : '讀取中'}</span></div>
      {card?.video ? <video key={card.video} className={styles.video} src={card.video} controls playsInline preload="metadata" aria-label={`${card.name}六秒候選影片`} /> : <div className={styles.empty}>這隻的候選影片尚未就緒</div>}
      <p className={styles.notice}>候選預覽保留未通過項目；既有影片仍須按「雙方對咬」新規格交叉驗收。對手為指定陪練，實際對戰另須符合當局雙方。</p>
      {card && <div className={styles.review}>
        {/* Canonical art is explicitly a comparison reference, never a substitute video. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.reference} alt={`${card.name}原始本體比對圖`} />
        <div><h3>原始本體比對</h3><p>第 {card.attempt ?? 0} 版 {card.seconds ? `・${card.seconds.toFixed(3)} 秒` : ''}</p>
          {(card.latestAttempt ?? 0) > (card.attempt ?? 0) && <p>第 {card.latestAttempt} 版正在製作／審查，先保留此版預覽。</p>}
          <p>送出 {time(card.startedAt)}<br />回傳 {time(card.returnedAt)}<br />首輪審查完成 {time(card.completedAt)}</p>
          {card.failedParts?.length ? <p>需細修：{card.failedParts.map(check => parts[check.part] ?? check.part).join('、')}</p> : <p>{card.video ? '仍需畫面與聲音交叉確認。' : '等待生成後審查。'}</p>}
          {card.crossCheck && <p>畫面比對更正：{card.crossCheck}</p>}
        </div>
      </div>}
      {!!card?.failedParts?.length && <details className={styles.evidence}><summary>查看逐項審查證據</summary><ul>{card.failedParts.map(check => <li key={check.part}><strong>{parts[check.part] ?? check.part}：</strong>{check.evidence}</li>)}</ul></details>}
    </section>
    <section className={styles.queue} aria-label="六十隻逐一進度"><h2>1–60 隻製作清單</h2><p>點選已產出的神獸，播放它自己的六秒影片。</p>
      <ol>{data?.cards.map(item => <li key={item.id}><button type="button" onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}>
        <span className={styles.number}>{String(item.position).padStart(2, '0')}</span><span className={styles.name}>{item.name}</span><span className={styles.badge}>{data.current?.cardId === item.id && data.running ? phaseLabel(data.current.phase) : item.video ? `▶ ${stateLabel(item.state)}` : stateLabel(item.state)}</span>
      </button></li>)}</ol>
    </section>
  </main>;
}
