/**
 * 鬼魅阿修羅 — 獨立解盤頁客戶端（080-16）
 *
 * 流程：UnifiedBirthForm → /api/dual-chart（只讀已驗證神煞）
 * → buildGhostAsuraReading → GhostAsuraCard
 *
 * 不改八字／神煞算法；不渲染 dual-chart 其他分頁；無密碼認證限制。
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import { GhostAsuraCard } from '@/features/ghost-asura/components/GhostAsuraCard';
import { buildGhostAsuraReading } from '@/features/ghost-asura';
import type { DualChartResult } from '@/lib/dual-chart';
import { dualChartHourStatus } from '@/lib/dual-chart-form';
import { downloadAsPDF, downloadAsImage, generateFilename } from '@/lib/ghost-asura-download';
import styles from './ghost-asura.module.css';
import brandStyles from '@/components/AsuraBrandTitle.module.css';

function asuraHourStatus(profile: BirthProfile) {
  const status = dualChartHourStatus(profile);
  return { ...status, message: status.message.replaceAll('神煞易經', '阿修羅秘卷') };
}

export default function GhostAsuraPageClient({
  unlocked,
  configured,
}: {
  unlocked: boolean;
  configured: boolean;
}) {
  const router = useRouter();
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
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'image' | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const calculationRef = useRef<AbortController | null>(null);

  function invalidateCalculation() {
    calculationRef.current?.abort();
    calculationRef.current = null;
    setBusy(false);
    setResult(null);
  }

  function quickRetake() {
    invalidateCalculation();
    setError('');
    setMissing([]);
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  }

  async function handleCopyLink() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const success = await navigator.clipboard.writeText(url).catch(() => false);

    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }

  async function handleLineShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const message = `我的阿修羅秘卷已生成！\n${url}\n\n點擊查看你的四柱隱影解盤 ✨`;
    const lineURL = `https://line.me/R/msg/text/${encodeURIComponent(message)}`;
    window.open(lineURL, '_blank');
  }

  async function handleSystemShare() {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      await navigator.share({
        title: '鬼魅阿修羅秘卷',
        text: '我的阿修羅秘卷已生成！點擊查看你的四柱隱影解盤',
        url,
      });
    } catch (err) {
      console.log('Share cancelled or failed:', err);
    }
  }

  async function handleDownloadPDF() {
    if (!cardRef.current) return;
    setDownloading('pdf');
    const success = await downloadAsPDF(cardRef.current, generateFilename('pdf'));
    setDownloading(null);
  }

  async function handleDownloadImage() {
    if (!cardRef.current) return;
    setDownloading('image');
    const success = await downloadAsImage(cardRef.current, generateFilename('image'));
    setDownloading(null);
  }

  useEffect(() => {
    if (!unlocked) {
      invalidateCalculation();
      return;
    }
    const recheck = () => {
      invalidateCalculation();
      router.refresh();
    };
    window.addEventListener('pageshow', recheck);
    const expire = window.setTimeout(recheck, 30 * 60_000);
    return () => {
      window.removeEventListener('pageshow', recheck);
      window.clearTimeout(expire);
      calculationRef.current?.abort();
      calculationRef.current = null;
    };
  }, [unlocked, router]);

  useEffect(() => {
    if (!result) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
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


  function updateForm(profile: BirthProfile) {
    if (JSON.stringify(profile) !== JSON.stringify(form)) invalidateCalculation();
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
    // A ref locks synchronously, including two submits before React rerenders.
    if (!unlocked || calculationRef.current) return;
    setError('');
    setResult(null);
    const hour = asuraHourStatus(profile);
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
    const request = new AbortController();
    calculationRef.current = request;
    setBusy(true);
    try {
      const response = await fetch('/api/dual-chart', {
        method: 'POST',
        cache: 'no-store',
        signal: request.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          calendarType: 'solar',
          timezone: 'Asia/Taipei',
        }),
      });
      const data = await response.json();
      // Ignore even a transport that resolved after abort. Only the current request
      // may publish data, errors or completion; old finally blocks cannot unlock it.
      if (calculationRef.current !== request) return;
      if (response.status === 401) router.refresh();
      if (!response.ok) throw new Error(data.error);
      setResult(data.data);
    } catch (e) {
      if (calculationRef.current !== request) return;
      console.error('[GhostAsuraPageClient] calculate failed', e);
      setError(e instanceof Error ? e.message : '連線失敗，請稍後再試。');
    } finally {
      if (calculationRef.current === request) {
        calculationRef.current = null;
        setBusy(false);
      }
    }
  }

  const progressSteps = [
    { id: 'birthDate', done: !!form.birthDate, label: '填寫生辰' },
    { id: 'gender', done: !!form.gender, label: '選擇性別' },
    { id: 'birthHour', done: asuraHourStatus(form).done, label: '確認時辰' },
  ];
  const completedSteps = progressSteps.filter(s => s.done).length;
  const currentStepIndex = Math.min(completedSteps, progressSteps.length - 1);

  return (
    <main
      className={styles.page}
      data-page="ghost-asura"
    >
      <nav className={styles.nav}>
        <Link href="/">← 返回首頁</Link>
      </nav>

      <header className={styles.header}>
        <p className={styles.eyebrow}>本命阿修羅 · 四柱隱影解盤</p>
        <h1 className={brandStyles.brush} data-asura-brand-title>鬼魅阿修羅</h1>
        <p className={styles.intro}>
          剖析四柱陰影、隱性衝突與內在力量。
          點印記名稱查看其力量與駕馭之道。
        </p>
      </header>

      {/* ✨ 進度指引 */}
      <div className={styles.progressContainer}>
        {progressSteps.map((step, index) => (
          <div key={step.id} className={styles.progressStep}>
            <div className={`${styles.stepCircle} ${step.done ? styles.done : ''} ${index === currentStepIndex && !step.done ? styles.active : ''}`}>
              {step.done ? '✓' : index + 1}
            </div>
            <div className={styles.stepLabel}>{step.label}</div>
            {index < progressSteps.length - 1 && (
              <div className={`${styles.progressConnector} ${index < currentStepIndex || (index === currentStepIndex && step.done) ? styles.active : ''}`} />
            )}
          </div>
        ))}
      </div>

      <section className={`${styles.panel} ${styles.inputPanel}`}>
            <p className={styles.note}>
              填寫生辰資料，立即展開你的阿修羅秘卷。四柱陰影揭示、力量點醒、駕馭之道一次掌握。
            </p>
            <fieldset disabled={busy} className={styles.fields}>
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
              hourCompletion={asuraHourStatus(form)}
              copy={{
                progressTitle: '完成生辰，開啟阿修羅秘卷',
                unknownHourHint: '阿修羅秘卷需要出生時辰；確認後回來補填，不會替你猜測。',
                hourPickerHint: '請點選出生時辰，讓四柱各歸其位。',
              }}
              missing={missing}
              disabled={busy}
              isSubmitting={busy}
              submitLabel="開啟命魂戰局"
              loadingLabel={busy ? <span className={styles.buttonLoading}>正在排盤<span className={styles.loadingDot} /><span className={styles.loadingDot} /><span className={styles.loadingDot} /></span> : '開啟命魂戰局'}
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
            </fieldset>
      </section>

      {result && (
        <section
          ref={resultRef}
          tabIndex={-1}
          className={`${styles.results} ${styles.resultsEnter}`}
          aria-label="鬼魅阿修羅解盤結果"
          data-ghost-asura-result="ready"
        >
          {reading ? (
            <>
              <div ref={cardRef}>
                <GhostAsuraCard reading={reading} />
              </div>

              {/* 💾 下載秘卷 */}
              <div className={styles.downloadSection}>
                <p className={styles.downloadLabel}>下載你的秘卷</p>
                <div className={styles.downloadButtons}>
                  <button
                    className={styles.downloadButton}
                    onClick={handleDownloadPDF}
                    disabled={downloading !== null}
                    aria-label="下載為 PDF"
                    title="下載秘卷為 PDF 文檔"
                  >
                    <span className={styles.downloadIcon}>📄</span>
                    <span className={styles.downloadButtonLabel}>PDF</span>
                  </button>
                  <button
                    className={styles.downloadButton}
                    onClick={handleDownloadImage}
                    disabled={downloading !== null}
                    aria-label="下載為圖片"
                    title="下載秘卷為高清圖片"
                  >
                    <span className={styles.downloadIcon}>🖼️</span>
                    <span className={styles.downloadButtonLabel}>圖片</span>
                  </button>
                </div>
                {downloading && (
                  <div className={styles.downloadProgress}>
                    <span className={styles.downloadProgressDot}></span>
                    正在{downloading === 'pdf' ? '轉換為 PDF' : '生成圖片'}...
                  </div>
                )}
              </div>

              {/* 📤 分享秘卷 */}
              <div className={styles.shareSection}>
                <p className={styles.shareLabel}>分享你的秘卷</p>
                <div className={styles.shareButtons}>
                  <button
                    className={styles.shareButton}
                    onClick={handleLineShare}
                    aria-label="分享到 LINE"
                    title="分享到 LINE"
                  >
                    <span className={styles.shareIcon}>💬</span>
                    <span className={styles.shareButtonLabel}>LINE</span>
                  </button>
                  <button
                    className={styles.shareButton}
                    onClick={handleSystemShare}
                    aria-label="系統分享"
                    title="分享到其他應用"
                  >
                    <span className={styles.shareIcon}>🔗</span>
                    <span className={styles.shareButtonLabel}>分享</span>
                  </button>
                  <button
                    className={styles.shareButton}
                    onClick={handleCopyLink}
                    aria-label="複製連結"
                    title="複製秘卷連結"
                  >
                    <span className={styles.shareIcon}>📋</span>
                    <span className={styles.shareButtonLabel}>複製</span>
                  </button>
                </div>
                {copySuccess && (
                  <div className={`${styles.copySuccess} ${copySuccess ? styles.copySuccessFadeOut : ''}`}>
                    ✓ 已複製到剪貼板
                  </div>
                )}
              </div>

              {/* 🔄 快速重新解盤 */}
              <div className={styles.quickRetakeSection}>
                <p className={styles.quickRetakeLabel}>想調整生辰重新解盤？</p>
                <button
                  className={styles.quickRetakeButton}
                  onClick={quickRetake}
                  aria-label="快速重新解盤"
                >
                  <span className={styles.quickRetakeIcon}>🔄</span>
                  再占一次
                </button>
              </div>
            </>
          ) : (
            <div className={styles.panel} role="alert">
              這份秘卷暫時無法展開。請重新開啟戰局；若仍無法顯示，請聯絡網站管理員。
            </div>
          )}
        </section>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
