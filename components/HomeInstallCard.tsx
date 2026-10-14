'use client';

import { useCallback, useEffect, useState } from 'react';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import {
  detectDesktopBrowser,
  detectInAppBrowser,
  detectPlatform,
  isIPad,
  isPhoneLayout,
  mobileGuideFor,
  type MobileGuide,
} from '@/lib/install-shield';
import styles from './HomeInstallCard.module.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type GuideKey = MobileGuide | 'desktop';

/** 沒有系統安裝視窗時，教使用者手動存到桌面的步驟（畫在卡片裡，不用 alert）。 */
const GUIDE_STEPS: Record<GuideKey, string[]> = {
  ios: ['用 Safari 開啟本頁', '點下方的「分享」按鈕', '往下找「加入主畫面」並點它', '按右上角「新增」就完成了'],
  'chrome-android': ['點右上角「⋮」選單', '選「加到主畫面」或「安裝應用程式」', '按「安裝」就完成了'],
  samsung: ['點下方的「≡」選單', '選「新增頁面至」', '選「主畫面」就完成了'],
  inapp: ['目前在 LINE／臉書等 App 內建瀏覽器，無法存到桌面', '點右上角「⋯」或「⋮」', '選「用瀏覽器開啟」，再回到這張卡片'],
  desktop: ['Chrome／Edge：網址列右側會有「安裝」圖示，點它即可', 'Safari：選單「檔案」→「加入 Dock」', '其他瀏覽器：按 Ctrl＋D 加入書籤'],
};

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/**
 * 首頁最下方的「安裝到手機」卡片。
 * 能跳出系統安裝視窗的瀏覽器（Android Chrome、電腦 Chrome／Edge）按一下就安裝；
 * 其餘（iPhone、App 內建瀏覽器、電腦 Safari）沒有一鍵安裝的管道，改在卡片內展開步驟。
 * 已經以 App 方式開啟時整張卡片不顯示。判斷邏輯共用 lib/install-shield.ts，不另寫一套。
 */
export default function HomeInstallCard() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [guide, setGuide] = useState<GuideKey>('desktop');
  const [showSteps, setShowSteps] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isStandalone()) {
      setHidden(true);
      return;
    }
    const ua = window.navigator.userAgent;
    const touch = window.navigator.maxTouchPoints;
    const platform = detectPlatform(ua, touch);
    const inApp = detectInAppBrowser(ua);
    const phone = isPhoneLayout(platform, isIPad(ua, touch), window.innerWidth);
    if (phone || inApp) setGuide(mobileGuideFor(ua, platform, inApp));
    else if (platform === 'ios') setGuide('ios');
    else setGuide(detectDesktopBrowser(ua) === 'chromium' && platform === 'android' ? 'chrome-android' : 'desktop');
    setReady(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onInstall = useCallback(async () => {
    setNote('');
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice.catch(() => null);
        setDeferred(null);
        if (choice?.outcome === 'accepted') setInstalled(true);
        else setNote('你按了取消，想安裝時再按一次就好。');
        return;
      } catch {
        // 事件過期或已用過：退回步驟說明
        setDeferred(null);
      }
    }
    setShowSteps(true);
  }, [deferred]);

  if (!ready || hidden) return null;

  const steps = GUIDE_STEPS[guide];

  return (
    <section className={styles.wrap} aria-label="安裝到手機" data-home-install-card>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.icon} aria-hidden="true">☯</span>
          <div className={styles.titleBox}>
            <h2 className={styles.title}><HomeTranslatedText text="把太極命理放到手機桌面" /></h2>
            <p className={styles.sub}><HomeTranslatedText text="一點就開，不用再打網址，也不用下載商店" /></p>
          </div>
        </div>

        {installed ? (
          <p className={styles.done} role="status"><HomeTranslatedText text="已安裝完成，回到桌面就能找到太極命理" /></p>
        ) : (
          <>
            <button type="button" className={styles.button} onClick={onInstall} data-home-install-button>
              <HomeTranslatedText text={deferred ? '一鍵安裝' : '怎麼安裝到桌面'} />
            </button>
            {note ? <p className={styles.note} role="status">{note}</p> : null}
            {showSteps ? (
              <ol className={styles.steps} data-home-install-steps>
                {steps.map((step) => (
                  <li key={step}><HomeTranslatedText text={step} /></li>
                ))}
              </ol>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
