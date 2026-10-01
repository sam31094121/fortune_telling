/**
 * 鬼魅阿修羅 — 獨立解盤頁客戶端（080-16）
 *
 * 流程：密碼解鎖 → UnifiedBirthForm → /api/dual-chart（只讀已驗證神煞）
 * → buildGhostAsuraReading → GhostAsuraCard
 *
 * 不改八字／神煞算法；不渲染 dual-chart 其他分頁。
 */

'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import { GhostAsuraCard } from '@/features/ghost-asura/components/GhostAsuraCard';
import { buildGhostAsuraReading } from '@/features/ghost-asura';
import type { DualChartResult } from '@/lib/dual-chart';
import { dualChartHourStatus } from '@/lib/dual-chart-form';
import styles from '@/app/dual-chart/dual-chart.module.css';

export default function GhostAsuraPageClient({
  unlocked,
  configured,
}: {
  unlocked: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<BirthProfile>({
    name: '',
    gender: '',
    birthDate: '',
    calendarType: 'solar',
    country: '台灣',
    city: '台北',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<DualChartResult | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!unlocked) {
      setResult(null);
      return;
    }
    const recheck = () => {
      setResult(null);
      router.refresh();
    };
    window.addEventListener('pageshow', recheck);
    const expire = window.setTimeout(recheck, 30 * 60_000);
    return () => {
      window.removeEventListener('pageshow', recheck);
      window.clearTimeout(expire);
    };
  }, [unlocked, router]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [result]);

  const reading = useMemo(() => {
    if (!result) return null;
    try {
      return buildGhostAsuraReading({ result });
    } catch (err) {
      console.error('[GhostAsuraPageClient] buildGhostAsuraReading failed', err);
      return null;
    }
  }, [result]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/dual-chart/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
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
    setMissing((previous) =>
      previous.filter((field) =>
        field === 'birthDate'
          ? !profile.birthDate
          : field === 'gender'
            ? !profile.gender
            : field === 'birthHourBranch'
              ? !dualChartHourStatus(profile).done
              : false
      )
    );
  }

  async function calculate(profile: BirthProfile) {
    setError('');
    setResult(null);
    const hour = dualChartHourStatus(profile);
    const fields = [
      !profile.birthDate && 'birthDate',
      !profile.gender && 'gender',
      !hour.done && 'birthHourBranch',
    ].filter(Boolean) as string[];
    setMissing(fields);
    if (fields.length) {
      setError(
        [
          !profile.birthDate && '請完成出生日期。',
          !profile.gender && '請選擇性別。',
          !hour.done && hour.message,
        ]
          .filter(Boolean)
          .join('')
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/dual-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          calendarType: 'solar',
          timezone: 'Asia/Taipei',
        }),
      });
      const data = await response.json();
      if (response.status === 401) router.refresh();
      if (!response.ok) throw new Error(data.error);
      setResult(data.data);
    } catch (e) {
      console.error('[GhostAsuraPageClient] calculate failed', e);
      setError(e instanceof Error ? e.message : '連線失敗，請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className={styles.page}
      data-page="ghost-asura"
      style={{
        // 深墨 + 金屬 + 暗紅覆寫，與紫色 dual-chart 明顯區隔
        ['--dual-accent' as string]: '#7f1d1d',
      }}
    >
      <nav className={styles.nav}>
        <Link href="/">← 返回首頁</Link>
        {unlocked && (
          <button disabled={busy} onClick={() => void lock()}>
            鎖定離開
          </button>
        )}
      </nav>

      <header
        className={styles.header}
        style={{
          color: '#f4f4f5',
          textShadow: '0 2px 10px rgba(127, 29, 29, 0.35)',
        }}
      >
        <p style={{ color: '#a1a1aa', letterSpacing: '0.12em' }}>本命阿修羅 · 獨立秘卷</p>
        <h1 style={{ color: '#fafafa' }}>鬼魅阿修羅</h1>
        <p style={{ color: '#d4d4d8' }}>
          填寫生辰，只讀已驗證神煞，轉譯為命魂戰局。不是紫色「易經 · 三層融會」的附屬分頁。
        </p>
      </header>

      {!unlocked ? (
        <section
          className={styles.panel}
          style={{
            background:
              'linear-gradient(135deg, rgba(8,8,10,0.98), rgba(20,12,14,0.96))',
            borderColor: 'rgba(161,161,170,0.35)',
          }}
        >
          <h2 style={{ color: '#f4f4f5' }}>
            {configured ? '輸入密碼，開啟阿修羅秘卷' : '鬼魅阿修羅暫未開放登入'}
          </h2>
          {!configured ? (
            <div className={styles.login} role="status">
              <p className={styles.note}>
                網站的登入設定尚未完成，目前無法驗證密碼。這不是您輸入錯誤，請聯絡網站管理員啟用後再試。
              </p>
              <button type="button" onClick={() => router.refresh()}>
                重新檢查入口
              </button>
              <Link href="/">先返回首頁</Link>
            </div>
          ) : (
            <form onSubmit={unlock} className={styles.login} aria-busy={busy}>
              <p id="ghost-asura-password-help" className={styles.note}>
                請輸入您已取得的進入密碼。解鎖後即可填寫生辰，開啟鬼魅阿修羅解盤。
              </p>
              <label htmlFor="ghost-asura-password">進入密碼</label>
              <div className={styles.passwordField}>
                <input
                  id="ghost-asura-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-describedby="ghost-asura-password-help"
                  value={password}
                  maxLength={256}
                  required
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  disabled={busy}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? '隱藏密碼' : '顯示密碼'}
                </button>
              </div>
              <button disabled={busy || !password}>
                {busy ? '正在驗證，請稍候…' : '解鎖阿修羅秘卷'}
              </button>
              <p className={styles.note}>若密碼不符，請重新輸入後再試；不必重新整理頁面。</p>
            </form>
          )}
        </section>
      ) : (
        <>
          <section
            className={`${styles.panel} ${styles.inputPanel}`}
            style={{
              background:
                'linear-gradient(135deg, rgba(8,8,10,0.98), rgba(18,14,16,0.96))',
              borderColor: 'rgba(127,29,29,0.35)',
            }}
          >
            <p className={styles.note}>
              沿用系統萬年曆與正統神煞後端。本頁只顯示鬼魅阿修羅轉譯／四層解盤，不改算法。
            </p>
            <UnifiedBirthForm
              value={form}
              fields={{
                name: true,
                gender: true,
                birthDate: true,
                birthHourBranch: true,
                calendarType: true,
              }}
              optionalFields={['name']}
              autoFillIdentity={false}
              persistIdentity={false}
              requireExplicitHourPick
              requireKnownHour
              hourCompletion={dualChartHourStatus(form)}
              missing={missing}
              disabled={busy}
              isSubmitting={busy}
              submitLabel="開啟命魂戰局"
              loadingLabel="正在排盤…"
              onChange={(profile) =>
                updateForm(
                  profile.birthHourBranch === 'zi'
                    ? {
                        ...profile,
                        birthTime:
                          form.birthHourBranch === 'zi' ? form.birthTime : '',
                      }
                    : profile
                )
              }
              onSubmit={(profile) => void calculate(profile)}
              afterHourPicker={
                form.birthHourBranch === 'zi' && (
                  <label className={styles.zi}>
                    子時跨日確認
                    <select
                      disabled={busy}
                      value={form.birthTime ?? ''}
                      onChange={(e) =>
                        updateForm({ ...form, birthTime: e.target.value })
                      }
                    >
                      <option value="">請確認午夜前或午夜後</option>
                      <option value="23:30">晚子時：23:00–23:59（出生當日）</option>
                      <option value="00:30">早子時：00:00–00:59（出生當日）</option>
                    </select>
                  </label>
                )
              }
            />
          </section>

          {result && (
            <section
              ref={resultRef}
              className={styles.results}
              aria-label="鬼魅阿修羅解盤結果"
              data-ghost-asura-result="ready"
            >
              {reading ? (
                <GhostAsuraCard reading={reading} />
              ) : (
                <div className={styles.panel} role="alert">
                  解盤轉譯失敗。後端結果已取得，但阿修羅轉接層無法組出顯示資料。請稍後再試或回報管理員。
                </div>
              )}
            </section>
          )}
        </>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
