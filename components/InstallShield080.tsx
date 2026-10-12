'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  INSTALL_SHIELD_DISMISS_KEY,
  detectInAppBrowser,
  detectPlatform,
  withOpenExternalBrowser,
  type InAppBrowser,
  type InstallPlatform,
} from '@/lib/install-shield';

// 尺寸與網站 080 金盾牌 logo 一致（量測值，見報告）。
const SHIELD_SIZE_PX = 48;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export default function InstallShield080() {
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('other');
  const [inApp, setInApp] = useState<InAppBrowser>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [sheet, setSheet] = useState<'ios' | 'android-manual' | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(INSTALL_SHIELD_DISMISS_KEY) === '1';
    } catch {
      /* 私密模式等情況忽略 */
    }
    if (dismissed || isStandalone()) return;
    const ua = window.navigator.userAgent;
    setPlatform(detectPlatform(ua, window.navigator.maxTouchPoints));
    setInApp(detectInAppBrowser(ua));
    setReady(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setReady(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(INSTALL_SHIELD_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setSheet(null);
    setReady(false);
  }, []);

  const onTap = useCallback(async () => {
    if (inApp) {
      // LINE 內建瀏覽器不能加入主畫面：用官方參數改開 Safari / Chrome。
      window.location.href = withOpenExternalBrowser(window.location.href);
      return;
    }
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      setDeferred(null);
      if (choice?.outcome === 'accepted') setReady(false);
      return;
    }
    setSheet(platform === 'ios' ? 'ios' : 'android-manual');
  }, [inApp, deferred, platform]);

  if (!ready) return null;

  return (
    <>
      <style>{`
        .taiji-install-shield{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:calc(18px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:2px;}
        .taiji-install-shield button.main{width:${SHIELD_SIZE_PX}px;height:${SHIELD_SIZE_PX}px;padding:0;border:0;background:transparent;filter:drop-shadow(0 3px 8px rgba(0,0,0,.55));cursor:pointer;-webkit-tap-highlight-color:transparent;}
        .taiji-install-shield button.main img{width:100%;height:100%;object-fit:contain;display:block;}
        .taiji-install-shield .label{font-size:10px;line-height:1;color:#f5d27a;text-shadow:0 1px 2px #000;letter-spacing:.05em;}
        .taiji-install-shield .x{position:absolute;top:-6px;right:-8px;width:18px;height:18px;border-radius:50%;border:1px solid rgba(245,210,122,.6);background:#050612;color:#f5d27a;font-size:11px;line-height:16px;padding:0;}
        .taiji-install-sheet-bg{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;}
        .taiji-install-sheet{width:100%;background:#0b0d1f;color:#f3ead2;border-top:1px solid #c9a227;border-radius:18px 18px 0 0;padding:18px 20px calc(20px + env(safe-area-inset-bottom));font-size:15px;line-height:1.6;}
        .taiji-install-sheet h2{margin:0 0 10px;font-size:17px;color:#f5d27a;}
        .taiji-install-sheet ol{margin:0 0 14px;padding-left:1.3em;}
        .taiji-install-sheet .row{display:flex;gap:10px;}
        .taiji-install-sheet .row button{flex:1;padding:10px;border-radius:10px;border:1px solid #c9a227;background:transparent;color:#f5d27a;font-size:14px;}
        .taiji-install-sheet .row button.primary{background:#c9a227;color:#0b0d1f;font-weight:700;}
        .taiji-share-ico{display:inline-block;vertical-align:-3px;width:16px;height:18px;}
        @media (min-width:768px){.taiji-install-shield,.taiji-install-sheet-bg{display:none!important;}}
      `}</style>
      <div className="taiji-install-shield" data-install-shield="080">
        <button
          type="button"
          className="main"
          onClick={onTap}
          aria-label={inApp ? '用瀏覽器開啟以儲存本站' : '儲存本站到主畫面'}
        >
          <img src="/pwa/save-shield-080.png" alt="080 金盾牌" width={SHIELD_SIZE_PX} height={SHIELD_SIZE_PX} />
        </button>
        <span className="label">{inApp ? '開瀏覽器' : '存到桌面'}</span>
        <button type="button" className="x" onClick={dismiss} aria-label="不再顯示">×</button>
      </div>
      {sheet ? (
        <div className="taiji-install-sheet-bg" role="dialog" aria-modal="true" onClick={() => setSheet(null)}>
          <div className="taiji-install-sheet" onClick={(e) => e.stopPropagation()}>
            {sheet === 'ios' ? (
              <>
                <h2>把太極命理加入主畫面</h2>
                <ol>
                  <li>
                    點 Safari 下方的「分享」
                    <svg className="taiji-share-ico" viewBox="0 0 16 18" fill="none" stroke="#f5d27a" strokeWidth="1.6" aria-hidden="true">
                      <path d="M8 1v11M4.5 4.5 8 1l3.5 3.5M3 8H2v9h12V8h-1" />
                    </svg>
                  </li>
                  <li>往下滑，選「加入主畫面」</li>
                  <li>按右上角「新增」，桌面就會出現 080 金盾牌</li>
                </ol>
              </>
            ) : (
              <>
                <h2>把太極命理加入主畫面</h2>
                <ol>
                  <li>點瀏覽器右上角「⋮」選單</li>
                  <li>選「加到主畫面」或「安裝應用程式」</li>
                </ol>
              </>
            )}
            <div className="row">
              <button type="button" onClick={dismiss}>不再提醒</button>
              <button type="button" className="primary" onClick={() => setSheet(null)}>知道了</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
