'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import BaziIChingShenShaCard from './BaziIChingShenShaCard';
import type { DualChartResult } from '@/lib/dual-chart';
import styles from './dual-chart.module.css';
import ZiweiChart from './ZiweiChart';
import ComparisonCard from './ComparisonCard';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import { dualChartHourStatus } from '@/lib/dual-chart-form';

const CALCULATE_TIMEOUT_MS = 30000;
const CJK_TEXT = /[\u3400-\u9fff]/;
/** 只讓中文的伺服器／程式訊息直達客人；英文技術訊息（Failed to fetch、Unexpected token…）一律換成白話。 */
function customerError(e: unknown, fallback: string) {
  const name = typeof (e as { name?: unknown })?.name === 'string' ? (e as { name: string }).name : '';
  const message = typeof (e as { message?: unknown })?.message === 'string' ? (e as { message: string }).message : '';
  if (name === 'TypeError') return '網路連線不穩，這次沒有送出成功；請確認連線後再按一次，你填的資料都還在。';
  return message && CJK_TEXT.test(message) ? message : fallback;
}
async function readJson(response: Response): Promise<{ error?: unknown; data?: unknown } | null> {
  const data = await response.json().catch(() => null);
  return data && typeof data === 'object' ? data as { error?: unknown; data?: unknown } : null;
}
function serverError(data: { error?: unknown } | null, status: number, fallback: string) {
  const text = typeof data?.error === 'string' ? data.error : '';
  return new Error(text && CJK_TEXT.test(text) ? text : `${fallback}（代碼 ${status}）。`);
}

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
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [monochrome, setMonochrome] = useState(false);
  const [chartTab, setChartTab] = useState<'bazi' | 'ziwei' | 'comparison'>('bazi');
  const [isMobile, setIsMobile] = useState(false);
  const [printSelection, setPrintSelection] = useState<'bazi' | 'ziwei'>('bazi');
  const resultRef = useRef<HTMLElement>(null);
  const calculateRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      calculateRequestRef.current?.abort();
      calculateRequestRef.current = null;
    };
  }, []);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  useEffect(() => { setPdfUrl(''); setPdfPageCount(0); }, [result, language, monochrome, printSelection]);
  // 列印：命盤內容比一張 A4 高時，整張等比例縮到剛好一頁，避免最下面一行字被擠到第二張空白紙。字級彼此維持同比例。
  useEffect(() => {
    if (!printMode) return;
    const A4_HEIGHT_PX = (297 / 25.4) * 96;
    const fit = () => {
      document.querySelectorAll<HTMLElement>('[data-print-fit]').forEach((sheet) => {
        // 先拿掉最小高度與縮放，量「真實內容高度」（最小高度會讓內容看起來永遠有一整頁高）
        sheet.style.setProperty('zoom', '1');
        sheet.style.setProperty('min-height', '0');
        const natural = sheet.scrollHeight;
        sheet.style.removeProperty('min-height');
        // 0.97：留 3% 的邊，列印與螢幕的換行、進位有些微差異，不留邊會又擠出最後一行
        if (natural > A4_HEIGHT_PX * 0.97) sheet.style.setProperty('zoom', String(Math.floor((A4_HEIGHT_PX / natural) * 0.97 * 1000) / 1000));
      });
    };
    fit();
    window.addEventListener('beforeprint', fit);
    return () => {
      window.removeEventListener('beforeprint', fit);
      document.querySelectorAll<HTMLElement>('[data-print-fit]').forEach((sheet) => sheet.style.removeProperty('zoom'));
    };
  }, [printMode, result, printSelection, monochrome, language]);
  useEffect(() => { if (result) resultRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [result]);
  useEffect(() => {
    const invalidateChart = () => {
      calculateRequestRef.current?.abort();
      calculateRequestRef.current = null;
      setBusy(false);
      setResult(null);
      setPrintMode(false);
      setPdfUrl('');
      setPdfPageCount(0);
    };
    if (!unlocked) { invalidateChart(); return; }
    // Revalidate the server gate on focus/back navigation; never persist charts.
    const recheck = () => { invalidateChart(); router.refresh(); };
    window.addEventListener('pageshow', recheck);
    const expire = window.setTimeout(recheck, 30 * 60_000);
    return () => { window.removeEventListener('pageshow', recheck); window.clearTimeout(expire); };
  }, [unlocked, router]);
  async function unlock(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/dual-chart/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      setPassword(''); setShowPassword(false);
      const data = await readJson(response);
      if (!response.ok) throw serverError(data, response.status, '目前無法驗證密碼，請稍後再試');
      router.refresh();
    } catch (e) { setError(customerError(e, '連線失敗，請稍後再試。')); }
    finally { setBusy(false); }
  }
  async function lock() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/dual-chart/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('暫時無法鎖定，請再試一次。');
      setResult(null); setForm({}); router.refresh();
    } catch (e) { setError(customerError(e, '連線失敗，請稍後再試。')); }
    finally { setBusy(false); }
  }
  function updateForm(profile: BirthProfile) {
    if (calculateRequestRef.current) {
      calculateRequestRef.current.abort();
      calculateRequestRef.current = null;
      setBusy(false);
    }
    // A completed chart belongs to the submitted profile, not the next edit.
    setResult(null);
    setPrintMode(false);
    setPdfUrl('');
    setPdfPageCount(0);
    setForm(profile);
    setError('');
    setMissing(previous => previous.filter(field => field === 'birthDate' ? !profile.birthDate : field === 'gender' ? !profile.gender : field === 'birthHourBranch' ? !dualChartHourStatus(profile).done : false));
  }
  async function calculate(profile: BirthProfile) {
    // 1. 同步防連擊鎖：若已有請求進行中，立即中止舊請求防競態覆蓋
    calculateRequestRef.current?.abort();
    const requestController = new AbortController();
    calculateRequestRef.current = requestController;

    setError(''); setResult(null);
    const hour = dualChartHourStatus(profile);
    const fields = [!profile.birthDate && 'birthDate', !profile.gender && 'gender', !hour.done && 'birthHourBranch'].filter(Boolean) as string[];
    setMissing(fields);
    if (fields.length) {
      calculateRequestRef.current = null;
      setBusy(false);
      setError([!profile.birthDate && '請完成出生日期。', !profile.gender && '請選擇性別。', !hour.done && hour.message].filter(Boolean).join(''));
      return;
    }
    setBusy(true);
    let timedOut = false;
    const timeoutId = window.setTimeout(() => { timedOut = true; requestController.abort(); }, CALCULATE_TIMEOUT_MS);
    try {
      const response = await fetch('/api/dual-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: requestController.signal,
        body: JSON.stringify({ ...profile, calendarType: 'solar', timezone: 'Asia/Taipei' }),
      });

      // 2. 舊請求防覆蓋檢查
      if (calculateRequestRef.current !== requestController) return;

      const data = await readJson(response);
      if (calculateRequestRef.current !== requestController) return;

      if (response.status === 401) router.refresh();
      if (!response.ok) throw serverError(data, response.status, '命盤暫時沒有排出來，請稍後再按一次；你填的資料都還在');
      if (!data || data.data === undefined) throw new Error(`命盤暫時沒有排出來（代碼 ${response.status}），請稍後再按一次；你填的資料都還在。`);
      setResult(data.data as DualChartResult);
    } catch (e) {
      if (calculateRequestRef.current !== requestController) return;
      if (timedOut) { setError('排盤等了太久沒有回應，請再按一次；你填的資料都還在。'); return; }
      if ((e as { name?: unknown })?.name === 'AbortError') return;
      setError(customerError(e, '命盤暫時沒有排出來，請稍後再按一次；你填的資料都還在。'));
    } finally {
      window.clearTimeout(timeoutId);
      if (calculateRequestRef.current === requestController) {
        calculateRequestRef.current = null;
        setBusy(false);
      }
    }
  }
  function generatePdfFilename() {
    if (!result) return 'dual-chart.pdf';
    const birthDate = result.bazi.input.birthDate;
    const birthHour = form.birthHourBranch || '';
    const name = form.name ? form.name.replace(/[\/\\:*?"<>|]/g, '') : '';
    const dateStr = birthDate ? birthDate.replace(/-/g, '') : '';
    const timeStr = birthHour ? `${birthHour}點` : '';
    const parts = [printSelection === 'bazi' ? '八字命盤' : '紫微命盤', dateStr, timeStr, name, monochrome ? '黑白' : '彩色'].filter(Boolean);
    return `${parts.join('-')}.pdf`;
  }
  async function exportPdf() {
    if (!resultRef.current || pdfBusy || !result) return;
    const exportLanguage = language;
    setPdfBusy(true); setPdfProgress(10); setError('');
    try {
      const { createDualChartPdf } = await import('./export-pdf');
      setPdfProgress(30);
      const { blob, pageCount } = await createDualChartPdf(resultRef.current, monochrome);
      setPdfProgress(80);
      if (languageRef.current !== exportLanguage) { setError('語言已變更，請重新製作 PDF。'); return; }
      const url = URL.createObjectURL(blob);
      setPdfPageCount(pageCount);
      setPdfUrl(url);
      setPdfProgress(100);
    } catch (e) { setError(customerError(e, 'PDF 製作失敗，請再試一次。')); }
    finally { setPdfBusy(false); setPdfProgress(0); }
  }
  return <main className={`${styles.page} ${printMode ? styles.printPreview : ''} ${printMode && monochrome ? styles.monochrome : ''}`}>
    {printMode && <nav className={styles.printTools} aria-label="列印專用版操作"><button disabled={pdfBusy} onClick={() => setPrintMode(false)}>← 返回命盤</button><strong>列印專用版</strong><div className={styles.selectionPanel} role="radiogroup" aria-label="每次選擇一張命盤">{(['bazi', 'ziwei'] as const).map(value => <label key={value}><input type="radio" name="print-chart" checked={printSelection === value} onChange={() => setPrintSelection(value)} disabled={pdfBusy} /> {value === 'bazi' ? '八字（一張）' : '紫微（一張）'}</label>)}</div><div className={styles.outputChoice} role="group" aria-label="輸出色彩">{[false, true].map(value => <button key={String(value)} disabled={pdfBusy} aria-pressed={monochrome === value} onClick={() => { setMonochrome(value); setPdfUrl(''); setPdfProgress(0); }}>{value ? '黑白日常版' : '彩色客戶版'}</button>)}</div><button disabled={pdfBusy} onClick={() => void exportPdf()}>{pdfBusy ? pdfProgress > 0 && pdfProgress < 100 ? `正在排版…${pdfProgress}%` : '正在製作 PDF…' : `製作${monochrome ? '黑白' : '彩色'} A4 PDF`}</button>{pdfBusy && pdfProgress > 0 && <div className={styles.progressBar} role="progressbar" aria-valuenow={pdfProgress} aria-valuemin={0} aria-valuemax={100}><div className={styles.progressFill} style={{ width: `${pdfProgress}%` }}></div></div>}<button disabled={pdfBusy} onClick={() => window.print()}>列印{printSelection === 'bazi' ? '八字' : '紫微'}一張</button>{pdfUrl && <a className={styles.pdfDownload} href={pdfUrl} download={generatePdfFilename()}>下載{monochrome ? '黑白' : '彩色'} PDF（{pdfPageCount} 頁）</a>}<p className={styles.printHint}>只印目前這張，份數請選 1。若無法列印，可下載 PDF 後再印。</p></nav>}
    <nav className={styles.nav}><Link href="/">← 返回首頁</Link>{unlocked && <button disabled={busy} onClick={() => void lock()}>鎖定離開</button>}</nav>
    <header className={styles.header}><p>生辰排盤 · 密碼保護</p><h1>神煞易經</h1><p>填寫一份出生資料，查看三張命盤：八字、紫微斗數、易經神煞。</p></header>
    {!unlocked ? <section className={styles.panel}>
      <h2>{configured ? '輸入密碼，開啟神煞易經' : '神煞易經暫未開放登入'}</h2>
      {!configured ? <div className={styles.login} role="status"><p className={styles.note}>網站的登入設定尚未完成，目前無法驗證密碼。這不是您輸入錯誤，請聯絡網站管理員啟用後再試。</p><button type="button" onClick={() => router.refresh()}>重新檢查入口</button><Link href="/">先返回首頁</Link></div> : <form onSubmit={unlock} className={styles.login} aria-busy={busy}>
        <p id="dual-password-help" className={styles.note}>請輸入您已取得的進入密碼。解鎖後即可填寫一份出生資料，查看八字與紫微命盤。</p>
        <label htmlFor="dual-password">進入密碼</label>
        <div className={styles.passwordField}><input id="dual-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" autoCapitalize="none" spellCheck={false} aria-describedby="dual-password-help" value={password} maxLength={256} required disabled={busy} onChange={e => setPassword(e.target.value)} /><button type="button" className={styles.passwordToggle} disabled={busy} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? '隱藏密碼' : '顯示密碼'}</button></div>
        <button disabled={busy || !password}>{busy ? '正在驗證，請稍候…' : '解鎖神煞易經'}</button>
        <p className={styles.note}>若密碼不符，請重新輸入後再試；不必重新整理頁面。</p>
      </form>}
    </section> : <>
      <section className={`${styles.panel} ${styles.inputPanel}`}>
        <p className={styles.note}>沿用系統萬年曆：國曆或農曆生日會統一換算後排盤。採台灣標準時間（UTC+8），未做真太陽時校正；時辰卡採代表時間，若只知子時，請補選午夜前後。</p>
        <UnifiedBirthForm value={form} fields={{ name: true, gender: true, birthDate: true, birthHourBranch: true, calendarType: true }} optionalFields={['name']} autoFillIdentity={false} persistIdentity={false} requireExplicitHourPick requireKnownHour hourCompletion={dualChartHourStatus(form)} missing={missing} disabled={busy} isSubmitting={busy} submitLabel="排出神煞易經" loadingLabel="正在排盤…"
          onChange={profile => updateForm(profile.birthHourBranch === 'zi' ? { ...profile, birthTime: form.birthHourBranch === 'zi' ? form.birthTime : '' } : profile)} onSubmit={profile => void calculate(profile)}
          afterHourPicker={form.birthHourBranch === 'zi' && <label className={styles.zi}>子時跨日確認<select disabled={busy} value={form.birthTime ?? ''} onChange={e => updateForm({ ...form, birthTime: e.target.value })}><option value="">請確認午夜前或午夜後</option><option value="23:30">晚子時：23:00–23:59（出生當日）</option><option value="00:30">早子時：00:00–00:59（出生當日）</option></select></label>} />
      </section>
      {result && <section ref={resultRef} className={styles.results} aria-label="神煞易經結果">
        {!printMode && (
          <>
            {isMobile && <nav className={styles.chartTabNav} role="tablist">
              <button role="tab" aria-selected={chartTab === 'bazi'} onClick={() => setChartTab('bazi')} className={chartTab === 'bazi' ? styles.active : ''}>八字</button>
              <button role="tab" aria-selected={chartTab === 'ziwei'} onClick={() => setChartTab('ziwei')} className={chartTab === 'ziwei' ? styles.active : ''}>紫微</button>
              <button role="tab" aria-selected={chartTab === 'comparison'} onClick={() => setChartTab('comparison')} className={chartTab === 'comparison' ? styles.active : ''}>對比</button>
            </nav>}
            <div className={styles.printEntry}><p>選擇要印的命盤，每次一張 A4。</p>{(['bazi', 'ziwei'] as const).map(value => <button key={value} type="button" className={styles.printButton} onClick={() => { setPrintSelection(value); setPrintMode(true); resultRef.current?.scrollIntoView({ block: 'start' }); }}>{value === 'bazi' ? '列印八字' : '列印紫微'}</button>)}</div>
          </>
        )}
        {(printMode || !isMobile || chartTab === 'bazi') && (printMode ? printSelection === 'bazi' : true) && <BaziIChingShenShaCard result={result} language={language} monochrome={printMode && monochrome} />}
        {!printMode && !isMobile && <div className={styles.chartDivider} />}
        {(printMode || !isMobile || chartTab === 'ziwei') && (printMode ? printSelection === 'ziwei' : true) && <article className={`${styles.panel} ${styles.ziweiPrintSheet}`} data-print-fit><h2>紫微斗數命盤</h2>
          <ZiweiChart key={JSON.stringify(result.ziwei.birthInput)} result={result} />
        </article>}
        {(!isMobile || chartTab === 'comparison') && (printMode ? false : true) && <article className={styles.panel}><ComparisonCard result={result} /></article>}
      </section>}
    </>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </main>;
}
