'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import BaziChart, { ShenShaCard } from '@/app/dual-chart/BaziChart';
import type { DualChartResult } from '@/lib/dual-chart';
import styles from '@/app/dual-chart/dual-chart.module.css';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import { dualChartHourStatus } from '@/lib/dual-chart-form';

export default function SingleShensha({ unlocked }: { unlocked: boolean }) {
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
  const [monochrome, setMonochrome] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!unlocked) { setResult(null); setPrintMode(false); return; }
    const recheck = () => { setResult(null); router.refresh(); };
    window.addEventListener('pageshow', recheck);
    const expire = window.setTimeout(recheck, 30 * 60_000);
    return () => { window.removeEventListener('pageshow', recheck); window.clearTimeout(expire); };
  }, [unlocked, router]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/dual-chart/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      setPassword('');
      setShowPassword(false);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '連線失敗，請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/dual-chart/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('暫時無法鎖定，請再試一次。');
      setResult(null);
      setForm({});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '連線失敗。');
    } finally {
      setBusy(false);
    }
  }

  function updateForm(profile: BirthProfile) {
    setForm(profile);
    setError('');
    setMissing(previous => previous.filter(field => field === 'birthDate' ? !profile.birthDate : field === 'gender' ? !profile.gender : field === 'birthHourBranch' ? !dualChartHourStatus(profile).done : false));
  }

  async function calculate(profile: BirthProfile) {
    setBusy(true);
    setError('');
    setMissing([]);
    try {
      const validation = dualChartHourStatus(profile);
      const missing: string[] = [];
      if (!profile.birthDate) missing.push('birthDate');
      if (!profile.gender) missing.push('gender');
      if (!validation.done) missing.push('birthHourBranch');

      if (missing.length > 0) {
        setMissing(missing);
        return;
      }

      const response = await fetch('/api/dual-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name?.trim() || '',
          gender: profile.gender,
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          birthHourBranch: profile.birthHourBranch,
          calendarType: profile.calendarType,
          country: profile.country,
          city: profile.city,
          timezone: 'Asia/Taipei',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '排盤失敗，請檢查輸入資料。');
    } finally {
      setBusy(false);
    }
  }

  if (!unlocked) {
    return (
      <div className={styles.page}>
        <div className={`${styles.panel} max-w-md mx-auto`}>
          <h1 className="text-2xl font-bold mb-6">個人易經神煞</h1>
          <form onSubmit={unlock} className={styles.login}>
            <div>
              <label className="block mb-2 font-bold">進入密碼</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="輸入密碼"
                  disabled={busy}
                  required
                  style={{ flex: 1 }}
                  className={styles.zi}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={busy}
                  style={{ padding: '8px 12px', borderRadius: '8px', background: '#293040', color: '#fff', border: '1px solid #a899ba', cursor: 'pointer' }}
                >
                  {showPassword ? '隱藏' : '顯示'}
                </button>
              </div>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" disabled={busy} className={styles.loginButton}>
              {busy ? '驗證中...' : '登入'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <Link href="/">← 回首頁</Link>
        <button onClick={lock} disabled={busy} style={{ color: '#d8c6ff', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
          {busy ? '処理中...' : '鎖定'}
        </button>
      </div>

      {!result ? (
        <div className={styles.header}>
          <h1>個人易經神煞</h1>
          <p className={styles.note}>八字 × 特星神煞 × 易經心理學</p>
        </div>
      ) : null}

      <UnifiedBirthForm
        value={form}
        fields={{ name: true, gender: true, birthDate: true, birthHourBranch: true }}
        onChange={updateForm}
        onSubmit={() => calculate(form)}
        isSubmitting={busy}
        missing={missing}
        submitLabel={busy ? '排盤中...' : '查看易經神煞'}
        optionalFields={['name']}
      />

      {result && (
        <section ref={resultRef} className={styles.results} aria-label="易經神煞結果">
          <div className={`${styles.printTools} ${printMode ? 'hidden' : ''}`}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={monochrome}
                  onChange={e => setMonochrome(e.target.checked)}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span>黑白預覽</span>
              </label>
            </div>
          </div>

          {/* 只顯示易經神煞結果 */}
          <div className={`${styles.panel} ${printMode ? styles.printPreview : ''} ${monochrome ? 'monochrome' : ''}`} style={{ marginTop: '24px' }}>
            {result.specialStars?.card && <ShenShaCard result={result} />}
          </div>

          <button
            onClick={() => {
              setResult(null);
              setForm({});
              setError('');
              setMissing([]);
            }}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              borderRadius: '12px',
              background: '#d9bef5',
              color: '#21152c',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            返回輸入
          </button>
        </section>
      )}
    </div>
  );
}
