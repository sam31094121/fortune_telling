/**
 * 鬼魅阿修羅 — 獨立解盤頁客戶端（080-16）
 *
 * 流程：UnifiedBirthForm → POST /api/ghost-asura/reading
 * （後端：既有排盤 → 既有阿修羅管線 → 顯示文字契約）→ GhostAsuraCard 照印
 *
 * 八字與神煞只在後端算；本頁不呼叫命理引擎或阿修羅管線，只顯示後端回傳的文字。
 */

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import {
  getAnalysisIdentityTarget,
  IDENTITY_TARGET_UPDATED_EVENT,
  type AnalysisIdentityTarget,
} from '@/lib/identity-split-client';
import { GhostAsuraCard } from '@/features/ghost-asura/components/GhostAsuraCard';
import { AsuraVoiceCard } from '@/features/ghost-asura/components/AsuraVoiceCard';
import type { AsuraDisplay } from '@/lib/ghost-asura-display-contract';
import { dualChartHourStatus } from '@/lib/dual-chart-form';
import { downloadAsPDF, downloadAsImage, generateFilename } from '@/lib/ghost-asura-download';
import { getCardRevealAnimation, getImpressionGlowAnimation, getScrollFormationAnimation, getTotalAnimationDuration } from '@/lib/ghost-asura-animation';
import { initializeAudio, playCardRevealSound, playImpressionGlowSound, playShareSuccessSound, playDownloadSuccessSound } from '@/lib/ghost-asura-audio';
import { initializeParticleSystem, getParticleSystem, cleanupParticleSystem } from '@/lib/ghost-asura-particles';
import { withShareVersion } from '@/lib/share-preview';
import { ElementTreasureOrb } from '@/components/bazi/customer/ElementTreasureOrb';
import { ORB_MATERIAL, type ProductElement } from '@/components/bazi/customer/elementOrbPalette';
import styles from './ghost-asura.module.css';

// 進度的五個步驟對應五顆寶珠（顏色只讀全站唯一的寶珠色盤，不另建色表）。
const STEP_ORBS: readonly ProductElement[] = ['空', '風', '水', '火', '地'];
import brandStyles from '@/components/AsuraBrandTitle.module.css';

const READING_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 25_000;
const DOWNLOAD_FAILED_MESSAGE = '這次下載沒有完成。可以先用手機截圖保存秘卷，或稍後再按一次。';
const hasChinese = (text: unknown): text is string => typeof text === 'string' && /[\u4e00-\u9fff]/.test(text);

/** 下載程式庫從外部載入；載不到或卡住時不能讓按鈕一直停在「正在…」。 */
function withDownloadTimeout(task: Promise<boolean>) {
  return Promise.race([
    task.catch(() => false),
    new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), DOWNLOAD_TIMEOUT_MS)),
  ]);
}

function asuraHourStatus(profile: BirthProfile) {
  if (profile.birthHourBranch === 'unknown') {
    return { done: false, text: '需補出生時辰', message: '時辰不明時，暫不產生阿修羅秘卷；請確認出生時辰後再排盤。' };
  }
  // 阿修羅頁的伺服器端會把「時辰不確定」以子時排並標註（見 lib/server/ghost-asura-display.ts），所以這一頁允許。
  if (profile.timeUnknown) return { done: true, text: '不確定', message: '' };
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
  const [identityTarget, setIdentityTarget] = useState<AnalysisIdentityTarget | null>(() => getAnalysisIdentityTarget() ?? 'self');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<AsuraDisplay | null>(null);
  // 修羅斷語（八字、紫微、易經一個口吻）：只存「送去後端的同一份生辰」，話術由後端組好
  const [voiceBody, setVoiceBody] = useState<Record<string, unknown> | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'image' | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const resultRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const calculationRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleTargetUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: AnalysisIdentityTarget }>).detail;
      if (detail?.target) setIdentityTarget(detail.target);
    };
    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, handleTargetUpdate);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, handleTargetUpdate);
  }, []);

  function invalidateCalculation() {
    calculationRef.current?.abort();
    calculationRef.current = null;
    setBusy(false);
    setResult(null);
    setVoiceBody(null);
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
    const url = withShareVersion(typeof window !== 'undefined' ? window.location.href : '');
    // writeText 成功時回傳 undefined，不能拿回傳值判斷成功與否（否則永遠不會顯示「已複製」）
    const success = await (navigator.clipboard?.writeText(url) ?? Promise.reject(new Error('no clipboard')))
      .then(() => true, () => false);

    if (success) {
      setActionMessage('');
      playShareSuccessSound();
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      setActionMessage(`這台裝置不允許自動複製，請長按複製這個網址：${url}`);
    }
  }

  async function handleLineShare() {
    const url = withShareVersion(typeof window !== 'undefined' ? window.location.href : '');
    // 分享的是頁面網址，不含個人結果；文案不能讓朋友以為點開就看得到你的秘卷
    const message = `我剛展開了自己的阿修羅秘卷！\n${url}\n\n你也來排一張四柱隱影解盤 ✨`;
    const lineURL = `https://line.me/R/msg/text/${encodeURIComponent(message)}`;
    window.open(lineURL, '_blank');
  }

  async function handleSystemShare() {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    try {
      const url = withShareVersion(typeof window !== 'undefined' ? window.location.href : '');
      await navigator.share({
        title: '鬼魅阿修羅秘卷',
        text: '我剛展開了自己的阿修羅秘卷！你也來排一張四柱隱影解盤',
        url,
      });
      playShareSuccessSound();
    } catch (err) {
      console.log('Share cancelled or failed:', err);
    }
  }

  async function handleDownloadPDF() {
    if (!cardRef.current || downloading) return;
    setActionMessage('');
    setDownloading('pdf');
    const success = await withDownloadTimeout(downloadAsPDF(cardRef.current, generateFilename('pdf')));
    if (success) {
      playDownloadSuccessSound();
    } else {
      setActionMessage(DOWNLOAD_FAILED_MESSAGE);
    }
    setDownloading(null);
  }

  async function handleDownloadImage() {
    if (!cardRef.current || downloading) return;
    setActionMessage('');
    setDownloading('image');
    const success = await withDownloadTimeout(downloadAsImage(cardRef.current, generateFilename('image')));
    if (success) {
      playDownloadSuccessSound();
    } else {
      setActionMessage(DOWNLOAD_FAILED_MESSAGE);
    }
    setDownloading(null);
  }

  // 初始化音效系統 + 粒子系統
  useEffect(() => {
    initializeAudio().catch(() => {
      console.warn('Audio system initialization skipped');
    });

    // 初始化粒子系統
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const mainElement = document.querySelector('main[data-page="ghost-asura"]');
      if (typeof HTMLElement !== 'undefined' && mainElement instanceof HTMLElement) {
        initializeParticleSystem(mainElement);
      }
    }

    return () => {
      cleanupParticleSystem();
    };
  }, []);

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

  // 後端顯示契約；格式不符時不顯示、不自行補資料。
  const reading = result?.contract === 'ghost-asura-display/v1' ? result : null;

  useEffect(() => {
    if (!result || !cardRef.current) return;

    // 播放卡片展開音效 + 粒子效果
    playCardRevealSound();
    const particleSystem = getParticleSystem();
    if (particleSystem) {
      particleSystem.createCardEnergyFlow(cardRef.current);
    }

    // 逐個播放印記點亮音效 + 粒子（延遲 200ms 起，每個間隔 100ms）
    const glowIds = reading?.glowIds ?? [];
    glowIds.forEach((id, index) => {
      playImpressionGlowSound(index);

      // 找到對應的 DOM 元素並創建光粒子
      setTimeout(() => {
        const itemElement = document.querySelector(
          `[data-asura-id="${id}"]`
        );
        if (itemElement && particleSystem) {
          particleSystem.createImpressionGlow(itemElement as HTMLElement, index);
        }
      }, 200 + index * 100);
    });

    // 衝擊波效果（1s 後觸發）
    setTimeout(() => {
      const ps = getParticleSystem();
      if (ps && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        ps.createShockwave(centerX, centerY, 1.2);
      }
    }, 1000);

    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [result, reading]);


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
    setVoiceBody(null);
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
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      request.abort();
    }, READING_TIMEOUT_MS);
    try {
      const target = identityTarget ?? getAnalysisIdentityTarget() ?? 'self';
      const response = await fetch('/api/ghost-asura/reading', {
        method: 'POST',
        cache: 'no-store',
        signal: request.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          identityTarget: target,
          calendarType: 'solar',
          timezone: 'Asia/Taipei',
        }),
      });
      // 伺服器錯誤或閘道逾時可能回 HTML：不能直接 .json()，否則客人會看到英文 SyntaxError
      const data = (await response.json().catch(() => null)) as { data?: AsuraDisplay; error?: unknown } | null;
      // Ignore even a transport that resolved after abort. Only the current request
      // may publish data, errors or completion; old finally blocks cannot unlock it.
      if (calculationRef.current !== request) return;
      if (response.status === 401) router.refresh();
      if (!response.ok || !data) {
        throw new Error(hasChinese(data?.error) ? data.error : `排盤暫時沒有完成（代碼 ${response.status}），請稍後再按一次；你填的資料都還在。`);
      }
      setVoiceBody({ ...profile, identityTarget: target, calendarType: 'solar', timezone: 'Asia/Taipei' });
      setResult(data.data ?? null);
    } catch (e) {
      if (calculationRef.current !== request) return;
      console.error('[GhostAsuraPageClient] calculate failed', e);
      const message = (e as { message?: unknown } | null)?.message;
      setError(
        timedOut
          ? '排盤等太久了，已先停止等待；你填的資料都還在，請稍後再按一次。'
          : hasChinese(message)
            ? message
            : '連線失敗：網路不穩，這次沒有排盤成功；請確認連線後再按一次，你填的資料都還在。',
      );
    } finally {
      window.clearTimeout(timeout);
      if (calculationRef.current === request) {
        calculationRef.current = null;
        setBusy(false);
      }
    }
  }

  const progressSteps = [
    { id: 'target', done: Boolean(identityTarget), label: identityTarget === 'guest' ? '親朋好友' : '我自己' },
    { id: 'name', done: (form.name ?? '').trim().length >= 2, label: '確認姓名' },
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
          <div key={step.id} className={styles.progressStep} style={{ '--step-glow': ORB_MATERIAL[STEP_ORBS[index]].light } as CSSProperties}>
            {/* 五顆寶珠（全站共用的五元素寶珠）：完成＝寶珠亮起發光，未完成＝封印；不再打勾 */}
            <div
              className={`${styles.stepOrb} ${index === currentStepIndex && !step.done ? styles.stepOrbActive : ''}`}
              role="img"
              aria-label={`${step.label}，寶珠${step.done ? '已亮起' : '尚未亮起'}`}
              data-step-orb={STEP_ORBS[index]}
              data-lit={step.done}
            >
              <ElementTreasureOrb element={STEP_ORBS[index]} released={step.done} preview animated={step.done} />
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
              填寫生辰資料，展開你的阿修羅秘卷。輸入姓名（為自己或親朋好友排盤），鬼魅阿修羅將指名道姓、一語穿透本魂。
            </p>
            <div className="mb-4">
              <IdentitySplitSelector compact />
            </div>
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
              autoFillIdentity={true}
              persistIdentity={true}
              requireExplicitHourPick
              requireKnownHour
              hourCompletion={asuraHourStatus(form)}
              copy={{
                progressTitle: identityTarget === 'guest' ? '完成親友生辰，開啟阿修羅秘卷' : '完成生辰，開啟阿修羅秘卷',
                unknownHourHint: '阿修羅秘卷需要出生時辰；確認後回來補填，不會替你猜測。',
                hourPickerHint: '請點選出生時辰，讓四柱各歸其位。',
              }}
              missing={missing}
              disabled={busy}
              isSubmitting={busy}
              submitLabel={identityTarget === 'guest' ? '開啟親友命魂戰局' : '開啟命魂戰局'}
              loadingLabel={busy ? '正在排盤⌛' : undefined}
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
              {/* 🎬 卡片揭示動畫 + 3D 透視 + 氣魄衝擊波 */}
              <div className={styles.asuraCard3DContainer}>
                <div
                  ref={cardRef}
                  className={styles.asuraCardReveal}
                  style={{
                    animation: `asuraCardReveal 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                  }}
                >
                  <GhostAsuraCard display={reading} />
                </div>
              </div>

              {/* 修羅斷語：八字、紫微、易經翻成同一個修羅口吻（後端組句，這裡只照印） */}
              <AsuraVoiceCard body={voiceBody} />

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

              {actionMessage && (
                <p className={styles.error} role="status" aria-live="polite">
                  {actionMessage}
                </p>
              )}

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
