'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './PasswordGate.module.css';

/**
 * 上鎖卡片的密碼畫面（共用）。點進上鎖的卡片、還沒輸入密碼時顯示；密碼對了就重新載入該頁，直接進去。
 * 密碼與「易經神煞」是同一組、同一個登入口（/api/dual-chart/session），輸入一次所有上鎖卡片都開（30 分鐘）。
 * 密碼只在伺服器核對，這裡不存、不寫、不比對。清單與做法見 lib/locked-cards.ts。
 */
export default function PasswordGate({ title, hint }: { title: string; hint?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/dual-chart/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      });
      if (response.ok) {
        setPassword('');
        router.refresh();
        return;
      }
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? '暫時無法驗證，請稍後再試。');
    } catch {
      setError('網路不穩，請確認連線後再試一次。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page} data-password-gate>
      <nav className={styles.nav}><Link href="/">← 返回首頁</Link></nav>
      <section className={styles.card} aria-labelledby="password-gate-title">
        <div className={styles.lock} aria-hidden="true">🔒</div>
        <h1 id="password-gate-title" className={styles.title}>{title}</h1>
        <p className={styles.note}>{hint ?? '請輸入您已取得的進入密碼。輸入一次，所有上鎖的卡片都能打開。'}</p>
        <form className={styles.form} onSubmit={unlock}>
          <label htmlFor="gate-password" className={styles.label}>進入密碼</label>
          <div className={styles.field}>
            <input
              id="gate-password"
              className={styles.input}
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              value={password}
              disabled={busy}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'gate-error' : undefined}
              onChange={(event) => { setPassword(event.target.value); if (error) setError(''); }}
            />
            <button type="button" className={styles.toggle} onClick={() => setShow((value) => !value)} aria-pressed={show}>
              {show ? '隱藏' : '顯示'}
            </button>
          </div>
          {error ? <p id="gate-error" className={styles.error} role="alert">{error}</p> : null}
          <button type="submit" className={styles.submit} disabled={busy || !password}>
            {busy ? '正在驗證，請稍候…' : '解鎖'}
          </button>
        </form>
      </section>
    </main>
  );
}
