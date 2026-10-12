'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INSTALL_SHIELD_DISMISS_KEY,
  INSTALL_SHIELD_LEGACY_KEYS,
  isDismissFlick,
  wantsShieldReset,
  detectInAppBrowser,
  detectPlatform,
  withOpenExternalBrowser,
  type InAppBrowser,
  type InstallPlatform,
} from '@/lib/install-shield';

// 尺寸與網站 080 金盾牌 logo 一致（量測值，見報告）。
const SHIELD_SIZE_PX = 44; // = 頁尾 080 金盾牌 logo 在 390px 的實際尺寸 44×44

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
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState<null | 'left' | 'down'>(null);
  const dragStart = useRef<{ x: number; y: number; id: number; t: number } | null>(null);
  const swiped = useRef(false);
  const sheetStartY = useRef<number | null>(null);
  const [sheetDy, setSheetDy] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [avoid, setAvoid] = useState({ lift: 0, hide: false });
  const avoidRef = useRef({ lift: 0, hide: false });

  useEffect(() => {
    let dismissed = false;
    try {
      INSTALL_SHIELD_LEGACY_KEYS.forEach((k) => window.localStorage.removeItem(k));
      if (wantsShieldReset(window.location.search)) window.localStorage.removeItem(INSTALL_SHIELD_DISMISS_KEY);
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

  // 「滑掉」：往左或往下滑超過 40px 就收起並記住。
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId, t: e.timeStamp };
    swiped.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = Math.min(0, e.clientX - s.x);
    const dy = Math.max(0, e.clientY - s.y);
    if (Math.abs(e.clientX - s.x) > 8 || Math.abs(e.clientY - s.y) > 8) swiped.current = true;
    setDrag({ x: dx, y: dy });
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current;
    dragStart.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (isDismissFlick(dx, dy, e.timeStamp - s.t)) {
      swiped.current = true;
      setLeaving(dx < 0 && -dx >= dy ? 'left' : 'down');
      window.setTimeout(dismiss, 220);
    } else {
      setDrag({ x: 0, y: 0 });
    }
  };

  const onTap = useCallback(async () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
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

  // 避讓：盾牌是固定位置、阿修羅卡片的按鈕會隨頁面捲動；按鈕快要跑到盾牌底下時，
  // 先把盾牌往上推開，推不開（會跑太高）就淡出且不攔截點擊，等按鈕離開再回來。
  useEffect(() => {
    if (!ready) return;
    const GAP = 8;
    const MIN_TOP = 96;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const root = rootRef.current;
      if (!root) return;
      const targets = Array.from(
        document.querySelectorAll<HTMLElement>('[class*="GhostAsuraHomeEntry_cta"], a[href="/ghost-asura"] .home-feature-cta'),
      );
      const r = root.getBoundingClientRect();
      // 量到的是目前位置，扣回目前的上推量得到基準位置
      const baseTop = r.top + avoidRef.current.lift;
      const baseBottom = r.bottom + avoidRef.current.lift;
      let lift = 0;
      let hide = false;
      for (const el of targets) {
        const c = el.getBoundingClientRect();
        if (c.width === 0 || c.height === 0) continue;
        const hOverlap = c.left < r.right + GAP && c.right > r.left - GAP;
        const vOverlap = c.top < baseBottom + GAP && c.bottom > baseTop - GAP;
        if (!hOverlap || !vOverlap) continue;
        const need = baseBottom - (c.top - GAP);
        if (baseTop - need < MIN_TOP) hide = true;
        else lift = Math.max(lift, need);
      }
      if (hide) lift = 0;
      if (lift !== avoidRef.current.lift || hide !== avoidRef.current.hide) {
        avoidRef.current = { lift, hide };
        setAvoid({ lift, hide });
      }
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    schedule();
    const timer = window.setInterval(schedule, 600);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <style>{`
        .taiji-install-shield{transition:transform .22s ease,opacity .22s ease;position:fixed;left:max(14px,env(safe-area-inset-left));bottom:calc(96px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:2px;}
        .taiji-install-shield button.main{display:flex;flex-direction:column;align-items:center;gap:2px;width:auto;min-width:0;min-height:0;height:auto;margin:0;padding:4px 5px 4px;border-radius:14px;border:1px solid rgba(248,199,88,.55);background:rgba(7,11,31,.9);box-shadow:0 4px 14px rgba(0,0,0,.55);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none!important;user-select:none;-webkit-user-select:none;}
        .taiji-install-shield button.main img{width:${SHIELD_SIZE_PX}px;height:${SHIELD_SIZE_PX}px;object-fit:contain;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));}
        .taiji-install-shield .label{font-size:11px;line-height:1.1;color:#fcea86;text-shadow:0 1px 2px #000;letter-spacing:.05em;}
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
      <div
        ref={rootRef}
        className="taiji-install-shield"
        data-install-shield="080"
        style={{
          transform: leaving === 'left' ? 'translateX(-140px)' : leaving === 'down' ? 'translateY(140px)' : `translate(${drag.x}px, ${drag.y}px)`,
          opacity: leaving || avoid.hide ? 0 : 1,
          pointerEvents: avoid.hide ? 'none' : undefined,
          bottom: avoid.lift ? `calc(96px + env(safe-area-inset-bottom) + ${Math.round(avoid.lift)}px)` : undefined,
          transition: dragStart.current ? 'none' : undefined,
        }}
      >
        <button
          type="button"
          className="main"
          onClick={onTap}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          aria-label={inApp ? '用瀏覽器開啟以儲存本站' : '儲存本站到主畫面'}
        >
          <img src="/pwa/save-shield-080.png" alt="080 金盾牌" width={SHIELD_SIZE_PX} height={SHIELD_SIZE_PX} />
        
          <span className="label">{inApp ? '開瀏覽器' : '存到桌面'}</span>
        </button>
      </div>
      {sheet ? (
        <div className="taiji-install-sheet-bg" role="dialog" aria-modal="true" onClick={() => setSheet(null)}>
          <div
            className="taiji-install-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `translateY(${sheetDy}px)` }}
            onTouchStart={(e) => { sheetStartY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => { if (sheetStartY.current !== null) setSheetDy(Math.max(0, e.touches[0].clientY - sheetStartY.current)); }}
            onTouchEnd={() => { if (sheetDy > 60) setSheet(null); setSheetDy(0); sheetStartY.current = null; }}
          >
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
                <p style={{ margin: '0 0 14px', color: '#f5d27a' }}>加入後，主畫面會出現一顆金盾牌圖示，按一下就直接進站，不用再開瀏覽器。</p>
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
