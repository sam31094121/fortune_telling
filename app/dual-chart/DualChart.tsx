'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import BaziChart from './BaziChart';
import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';
import ZiweiChart from './ZiweiChart';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';

export default function DualChart({ unlocked, configured }: { unlocked: boolean; configured: boolean }) {
  const router = useRouter();
  const { language } = useInterfaceLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<BirthProfile>({ name: '', gender: '', birthDate: '', calendarType: 'solar', country: '台灣', city: '台北' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<DualChartResult | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [monochrome, setMonochrome] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  useEffect(() => { setPdfUrl(''); }, [result, language]);
  useEffect(() => { if (result) resultRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [result]);
  useEffect(() => {
    if (!unlocked) { setResult(null); setPrintMode(false); return; }
    // Revalidate the server gate on focus/back navigation; never persist charts.
    const recheck = () => { setResult(null); router.refresh(); };
    window.addEventListener('pageshow', recheck);
    const expire = window.setTimeout(recheck, 30 * 60_000);
    return () => { window.removeEventListener('pageshow', recheck); window.clearTimeout(expire); };
  }, [unlocked, router]);
  async function unlock(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/dual-chart/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      setPassword(''); setShowPassword(false);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '連線失敗，請稍後再試。'); }
    finally { setBusy(false); }
  }
  async function lock() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/dual-chart/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('暫時無法鎖定，請再試一次。');
      setResult(null); setForm({}); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '連線失敗。'); }
    finally { setBusy(false); }
  }
  async function calculate(profile: BirthProfile) {
    setError(''); setResult(null);
    const fields = [!profile.birthDate && 'birthDate', !profile.gender && 'gender', (!profile.birthTime || !profile.birthHourBranch || profile.birthHourBranch === 'pending' || profile.timeUnknown || profile.birthHourBranch === 'unknown') && 'birthHourBranch'].filter(Boolean) as string[];
    setMissing(fields);
    if (fields.length) { setError('請完成生日、性別及出生時辰。時辰不明時，暫不產生雙命盤。'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/dual-chart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, calendarType: 'solar', timezone: 'Asia/Taipei' }) });
      const data = await response.json();
      if (response.status === 401) router.refresh();
      if (!response.ok) throw new Error(data.error);
      setResult(data.data);
    } catch (e) { setError(e instanceof Error ? e.message : '連線失敗，請稍後再試。'); }
    finally { setBusy(false); }
  }
  async function exportPdf() {
    if (!resultRef.current || pdfBusy) return;
    const exportLanguage = language;
    setPdfBusy(true); setError('');
    try {
      const { createDualChartPdf } = await import('./export-pdf');
      const blob = await createDualChartPdf(resultRef.current, monochrome);
      if (languageRef.current !== exportLanguage) { setError('語言已變更，請重新製作 PDF。'); return; }
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) { setError(e instanceof Error ? e.message : 'PDF 製作失敗，請再試一次。'); }
    finally { setPdfBusy(false); }
  }
  return <main className={`${styles.page} ${printMode ? styles.printPreview : ''} ${printMode && monochrome ? styles.monochrome : ''}`}>
    {printMode && <nav className={styles.printTools} aria-label="列印專用版操作"><button disabled={pdfBusy} onClick={() => setPrintMode(false)}>← 返回命盤</button><strong>列印專用版</strong><div className={styles.outputChoice} role="group" aria-label="輸出色彩">{[false, true].map(value => <button key={String(value)} disabled={pdfBusy} aria-pressed={monochrome === value} onClick={() => { setMonochrome(value); setPdfUrl(''); }}>{value ? '黑白日常版' : '彩色客戶版'}</button>)}</div><button disabled={pdfBusy} onClick={() => void exportPdf()}>{pdfBusy ? '正在製作 PDF…' : `製作${monochrome ? '黑白' : '彩色'} A4 PDF`}</button><button disabled={pdfBusy} onClick={() => window.print()}>瀏覽器列印</button>{pdfUrl && <a className={styles.pdfDownload} href={pdfUrl} download={`雙命盤-A4-${monochrome ? '黑白' : '彩色'}.pdf`}>下載{monochrome ? '黑白' : '彩色'} PDF（2 頁）</a>}<p className={styles.printHint}>若瀏覽器未開啟列印視窗，請先製作並下載 PDF，再用 PDF 閱讀器列印。A4 {monochrome ? '黑白' : '彩色'} · 手機可左右滑動紙張查看；瀏覽器列印請選 A4、100% 比例並關閉頁首頁尾。</p></nav>}
    <nav className={styles.nav}><Link href="/">← 返回首頁</Link>{unlocked && <button disabled={busy} onClick={() => void lock()}>鎖定離開</button>}</nav>
    <header className={styles.header}><p>生辰排盤 · 密碼保護</p><h1>雙命盤</h1><p>填寫一份出生資料，查看八字與紫微斗數命盤。</p></header>
    {!unlocked ? <section className={styles.panel}>
      <h2>{configured ? '輸入密碼，開啟雙命盤' : '雙命盤暫未開放登入'}</h2>
      {!configured ? <div className={styles.login} role="status"><p className={styles.note}>網站的登入設定尚未完成，目前無法驗證密碼。這不是您輸入錯誤，請聯絡網站管理員啟用後再試。</p><button type="button" onClick={() => router.refresh()}>重新檢查入口</button><Link href="/">先返回首頁</Link></div> : <form onSubmit={unlock} className={styles.login} aria-busy={busy}>
        <p id="dual-password-help" className={styles.note}>請輸入您已取得的進入密碼。解鎖後即可填寫一份出生資料，查看八字與紫微命盤。</p>
        <label htmlFor="dual-password">進入密碼</label>
        <div className={styles.passwordField}><input id="dual-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" autoCapitalize="none" spellCheck={false} aria-describedby="dual-password-help" value={password} maxLength={256} required disabled={busy} onChange={e => setPassword(e.target.value)} /><button type="button" className={styles.passwordToggle} disabled={busy} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? '隱藏密碼' : '顯示密碼'}</button></div>
        <button disabled={busy || !password}>{busy ? '正在驗證，請稍候…' : '解鎖雙命盤'}</button>
        <p className={styles.note}>若密碼不符，請重新輸入後再試；不必重新整理頁面。</p>
      </form>}
    </section> : <>
      <section className={`${styles.panel} ${styles.inputPanel}`}>
        <p className={styles.note}>沿用系統萬年曆：國曆或農曆生日會統一換算後排盤。採台灣標準時間（UTC+8），未做真太陽時校正；時辰卡採代表時間，若只知子時，請補選午夜前後。</p>
        <UnifiedBirthForm value={form} fields={{ name: true, gender: true, birthDate: true, birthHourBranch: true, calendarType: true }} optionalFields={['name']} autoFillIdentity={false} persistIdentity={false} requireExplicitHourPick missing={missing} disabled={busy} isSubmitting={busy} submitLabel="排出雙命盤" loadingLabel="正在排盤…" onChange={profile => setForm(profile.birthHourBranch === 'zi' && form.birthHourBranch !== 'zi' ? { ...profile, birthTime: '' } : profile)} onSubmit={profile => void calculate(profile)} />
        {form.birthHourBranch === 'zi' && <label className={styles.zi}>子時跨日確認<select value={form.birthTime ?? ''} onChange={e => setForm({ ...form, birthTime: e.target.value })}><option value="">請確認午夜前或午夜後</option><option value="23:30">晚子時：23:00–23:59（出生當日）</option><option value="00:30">早子時：00:00–00:59（出生當日）</option></select></label>}
      </section>
      {result && <section ref={resultRef} className={styles.results} aria-label="雙命盤結果">
        {!printMode && <button type="button" className={styles.printButton} onClick={() => { setPrintMode(true); resultRef.current?.scrollIntoView({ block: 'start' }); }}>列印專用版</button>}
        <article className={styles.panel}><h2>八字命盤</h2><BaziChart result={result} monochrome={printMode && monochrome} language={language} /></article>
        <article className={styles.panel}><h2>紫微斗數命盤</h2>
          <ZiweiChart key={JSON.stringify(result.ziwei.birthInput)} result={result} />
        </article>
      </section>}
    </>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </main>;
}
