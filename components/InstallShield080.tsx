'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import {
  INSTALL_SHIELD_DISMISS_KEY,
  INSTALL_SHIELD_LEGACY_KEYS,
  isDismissFlick,
  wantsShieldReset,
  detectInAppBrowser,
  detectPlatform,
  detectDesktopBrowser,
  isIPad,
  wantsInstallSheet,
  externalOpenFailed,
  stripInstallParams,
  isPhoneLayout,
  mobileGuideFor,
  type MobileGuide,
  type DesktopBrowser,
  withOpenExternalBrowser,
  type InAppBrowser,
  type InstallPlatform,
} from '@/lib/install-shield';

// 尺寸與網站 080 金盾牌 logo 一致（量測值，見報告）。
const SHIELD_SIZE_PX = 44;
const BIG_SHIELD_PX = 112; // 展開後的大盾牌：長輩好按、一眼看到「按這裡」
const INLINE_SHIELD_PX = 44; // 手機頁面內小盾牌按鈕：與頁尾 080 金盾牌 logo 在 390px 的實際尺寸 44×44 相同

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
  const [sheet, setSheet] = useState<'ios' | 'android-manual' | 'desktop' | 'inapp-manual' | null>(null);
  const pressing = useRef(false);
  const guardUntil = useRef(0);
  const [desktop, setDesktop] = useState<DesktopBrowser>('other');
  const [ipad, setIpad] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState<null | 'left' | 'down'>(null);
  const dragStart = useRef<{ x: number; y: number; id: number; t: number } | null>(null);
  const swiped = useRef(false);
  const sheetStartY = useRef<number | null>(null);
  const [sheetDy, setSheetDy] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [avoid, setAvoid] = useState({ lift: 0, hide: false });
  const avoidRef = useRef({ lift: 0, hide: false });
  // 手機：頁面內（in-flow）區塊，不浮動、不拖曳、不避讓。
  const [phoneHost, setPhoneHost] = useState<HTMLElement | null>(null);
  const [guide, setGuide] = useState<MobileGuide>('chrome-android');
  const [inlineOpen, setInlineOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [nudge, setNudge] = useState(false);
  const pathname = usePathname();
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      INSTALL_SHIELD_LEGACY_KEYS.forEach((k) => window.localStorage.removeItem(k));
      if (wantsShieldReset(window.location.search)) window.localStorage.removeItem(INSTALL_SHIELD_DISMISS_KEY);
      dismissed = window.localStorage.getItem(INSTALL_SHIELD_DISMISS_KEY) === '1';
    } catch {
      /* 私密模式等情況忽略 */
    }
    const ua = window.navigator.userAgent;
    const search = window.location.search;
    const platNow = detectPlatform(ua, window.navigator.maxTouchPoints);
    const phone = isPhoneLayout(platNow, isIPad(ua, window.navigator.maxTouchPoints), window.innerWidth);
    let host: HTMLElement | null = null;
    if (phone) {
      // 掛在 body 最後面（頁面內容之後），是一般排版元素，不是 fixed。
      host = document.createElement('div');
      host.setAttribute('data-install-shield-inline-host', '080');
      document.body.appendChild(host);
      hostRef.current = host;
      setPhoneHost(host);
      setGuide(mobileGuideFor(ua, platNow, detectInAppBrowser(ua)));
      // 從 LINE 轉開（或轉開失敗）帶著 installShield=open 回來：直接展開步驟，不受「收起過」影響。
      if (wantsInstallSheet(search) || externalOpenFailed(search, detectInAppBrowser(ua))) setInlineOpen(true);
      if (isStandalone()) {
        setInstalled(true);
        setReady(true);
        return () => host?.remove();
      }
      const nav = window.navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
      nav.getInstalledRelatedApps?.().then((apps) => { if (apps.length) setInstalled(true); }).catch(() => {});
    } else if ((dismissed && !wantsInstallSheet(search)) || isStandalone()) return;
    setPlatform(detectPlatform(ua, window.navigator.maxTouchPoints));
    setDesktop(detectDesktopBrowser(ua));
    setIpad(isIPad(ua, window.navigator.maxTouchPoints));
    const inAppNow = detectInAppBrowser(ua);
    const plat = detectPlatform(ua, window.navigator.maxTouchPoints);
    setInApp(inAppNow);
    setReady(true);
    // 從 LINE 轉跳回來：自動打開說明；若仍在 LINE 裡（沒轉開成功）就教使用者手動用瀏覽器開。
    if (externalOpenFailed(search, inAppNow)) {
      setSheet('inapp-manual');
    } else if (!inAppNow && wantsInstallSheet(search)) {
      setSheet(plat === 'ios' ? 'ios' : plat === 'android' ? 'android-manual' : 'desktop');
    }
    if (wantsInstallSheet(search) || new URLSearchParams(search).get('openExternalBrowser')) {
      try {
        window.history.replaceState(window.history.state, '', stripInstallParams(window.location.href));
      } catch {
        /* ignore */
      }
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => (phone ? setInstalled(true) : setReady(false));
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      host?.remove();
    };
  }, []);

  // 手機首頁：客戶一進站就看到「存到桌面」，放在整頁最上方；其他頁維持在頁面最後面。
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !phoneHost) return;
    if (pathname === '/') document.body.insertBefore(host, document.body.firstChild);
    else document.body.appendChild(host);
  }, [pathname, phoneHost]);

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
    e.stopPropagation();
    pressing.current = true;
    guardUntil.current = Date.now() + 2000;
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
    pressing.current = false;
    guardUntil.current = Date.now() + 600;
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

  const openSheetFor = useCallback(() => {
    setSheet(platform === 'ios' ? 'ios' : platform === 'android' ? 'android-manual' : 'desktop');
  }, [platform]);

  const runPrompt = useCallback(async () => {
    const ev = deferred;
    if (!ev) return false;
    try {
      await ev.prompt();
      const choice = await ev.userChoice.catch(() => null);
      setDeferred(null);
      if (choice?.outcome === 'accepted') setReady(false);
      return true;
    } catch {
      // 事件過期或已用過：一律退回說明
      setDeferred(null);
      return false;
    }
  }, [deferred]);

  const onTap = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (inApp) {
      // 點盾牌一律只打開說明，不自動換網址；要轉開瀏覽器由客戶自己按「用瀏覽器開啟」。
      setSheet('inapp-manual');
      return;
    }
    if (deferred && (await runPrompt())) return;
    openSheetFor();
  }, [inApp, deferred, runPrompt, openSheetFor]);

  // 保險：按在盾牌上之後短時間內，任何落到盾牌以外的點擊（例如底下的卡片連結）一律攔下，不會被帶去別頁。
  useEffect(() => {
    if (!ready) return;
    const block = (ev: MouseEvent) => {
      if (Date.now() > guardUntil.current) return;
      const root = rootRef.current;
      const target = ev.target as Node | null;
      if (root && target && root.contains(target)) return;
      if (target && (target as Element).closest?.('.taiji-install-sheet-bg')) return;
      ev.preventDefault();
      ev.stopPropagation();
    };
    document.addEventListener('click', block, true);
    return () => document.removeEventListener('click', block, true);
  }, [ready]);

  // 避讓：盾牌是固定位置、阿修羅卡片的按鈕會隨頁面捲動；按鈕快要跑到盾牌底下時，
  // 先把盾牌往上推開，推不開（會跑太高）就淡出且不攔截點擊，等按鈕離開再回來。
  useEffect(() => {
    if (!ready || phoneHost) return;
    const GAP = 8;
    const MIN_TOP = 96;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const root = rootRef.current;
      if (!root) return;
      if (pressing.current || Date.now() < guardUntil.current) return; // 按住時不移動，避免點到底下的卡片
      const targets = Array.from(
        document.querySelectorAll<HTMLElement>('[class*="GhostAsuraHomeEntry_cta"], a[href="/ghost-asura"]'),
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
  }, [ready, phoneHost]);

  // 只有客戶明確按「用瀏覽器開啟」才換網址（LINE 官方參數轉開預設瀏覽器）。
  const canAutoOpenBrowser = inApp === 'line';
  const openInBrowser = useCallback(() => {
    window.location.href = withOpenExternalBrowser(window.location.href);
  }, []);

  // 第一次按小盾牌：Android Chrome 有安裝事件就直接跳系統安裝視窗（客戶按一下就完成）；
  // 按掉或沒有安裝事件（iPhone、三星、LINE 內建瀏覽器）才展開引導面板，裡面有大盾牌與步驟。
  const onInlineTap = useCallback(async () => {
    if (installed) return;
    setNudge(false);
    if (!inlineOpen && guide !== 'inapp' && deferred && (await runPrompt())) return;
    setInlineOpen((v) => !v);
  }, [installed, inlineOpen, guide, deferred, runPrompt]);

  // 第二次按大盾牌：能一鍵安裝就直接跳系統安裝視窗；不能就把下面的步驟閃一下提醒客戶照著做。
  const onBigShieldTap = useCallback(async () => {
    if (guide === 'inapp' && canAutoOpenBrowser) {
      openInBrowser();
      return;
    }
    if (guide !== 'inapp' && deferred && (await runPrompt())) return;
    setNudge(true);
    window.setTimeout(() => setNudge(false), 1800);
  }, [guide, canAutoOpenBrowser, openInBrowser, deferred, runPrompt]);

  if (!ready) return null;

  if (phoneHost) {
    const steps: string[] =
      guide === 'samsung'
        ? ['點右下角「≡」選單', '選「加入頁面至」→「主畫面」', '或點網址列的「＋」／下載圖示']
        : guide === 'ios'
          ? ['點下方的「分享」按鈕（方框加向上箭頭；iOS 版 Chrome 在右上角）', '往下滑', '點「加入主畫面」，再按右上角「新增」']
          : guide === 'inapp'
            ? [
                ...(canAutoOpenBrowser ? ['按上面的「用瀏覽器開啟」；沒反應的話：'] : []),
                '點右上角「⋮」或「⋯」',
                '選「用瀏覽器開啟」（Chrome／三星網際網路／Safari）',
                '到瀏覽器後再點一次這面 080 金盾牌',
              ]
            : ['點右上角「⋮」選單', '選「加到主畫面」或「安裝應用程式」'];
    return createPortal(
      <section className="taiji-install-inline" data-install-shield-inline="080" aria-label="存到桌面">
        <style>{`
          .taiji-install-inline{display:block;margin:10px 16px 6px;color:#f3ead2;font-size:15px;line-height:1.6;}
          .taiji-install-inline .tap{display:flex;flex-direction:column;align-items:center;gap:2px;width:auto;min-width:0;min-height:0;height:auto;margin:0;padding:4px 5px;border-radius:14px;border:1px solid rgba(248,199,88,.55);background:rgba(7,11,31,.9);box-shadow:0 4px 14px rgba(0,0,0,.55);cursor:pointer;-webkit-tap-highlight-color:transparent;font:inherit;}
          .taiji-install-inline img{width:${INLINE_SHIELD_PX}px;height:${INLINE_SHIELD_PX}px;object-fit:contain;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));}
          .taiji-install-inline .t{display:block;font-size:15px;line-height:1.15;color:#fcea86;letter-spacing:.05em;}
          .taiji-install-inline .panel{margin-top:10px;padding:18px 16px 16px;border:1px solid rgba(248,199,88,.55);border-radius:16px;background:#0b0d1f;text-align:center;}
          .taiji-install-inline .panel h3{margin:0 0 4px;font-size:18px;font-weight:800;color:#fcea86;}
          .taiji-install-inline .panel .lead{margin:0 0 12px;font-size:14px;color:#d9cfb4;}
          .taiji-install-inline .big{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;min-height:48px;margin:0 auto 14px;padding:14px 12px;border-radius:18px;border:1px solid #fcea86;background:linear-gradient(135deg,rgba(252,234,134,.18),rgba(196,138,41,.12));box-shadow:0 0 22px rgba(248,199,88,.35);color:#fcea86;cursor:pointer;-webkit-tap-highlight-color:transparent;font:inherit;}
          .taiji-install-inline .big img{width:${BIG_SHIELD_PX}px;height:${BIG_SHIELD_PX}px;}
          .taiji-install-inline .big .go{font-size:18px;font-weight:800;}
          .taiji-install-inline .big .sub{font-size:13px;color:#d9cfb4;}
          .taiji-install-inline ol.steps{margin:0;padding:0;list-style:none;text-align:left;counter-reset:s;}
          .taiji-install-inline ol.steps li{counter-increment:s;display:flex;gap:10px;align-items:flex-start;margin:0 0 8px;padding:10px 12px;border-radius:12px;background:rgba(248,199,88,.07);font-size:16px;line-height:1.5;}
          .taiji-install-inline ol.steps li::before{content:counter(s);flex:none;width:26px;height:26px;border-radius:50%;background:#f8c758;color:#1a1205;font-weight:800;font-size:15px;line-height:26px;text-align:center;}
          .taiji-install-inline ol.steps.nudge li{animation:taijiInstallFlash .6s ease 3;}
          @keyframes taijiInstallFlash{50%{background:rgba(248,199,88,.4);}}
          .taiji-install-inline .hint{margin:8px 0 0;font-size:13px;color:#bfb497;text-align:left;}
          @media (prefers-reduced-motion:reduce){.taiji-install-inline ol.steps.nudge li{animation:none;background:rgba(248,199,88,.3);}}
        `}</style>
        <button type="button" className="tap" onClick={onInlineTap} aria-expanded={inlineOpen} aria-label={installed ? '已存到桌面' : '儲存本站到主畫面'}>
          <img src="/pwa/save-shield-080.png" alt="080 金盾牌" width={INLINE_SHIELD_PX} height={INLINE_SHIELD_PX} />
          <span className="t">{installed ? '已存到桌面' : '存到桌面'}</span>
        </button>
        {inlineOpen && !installed ? (
          <div className="panel" role="region" aria-label="安裝說明">
            <h3>天地人和，一切隨緣</h3>
            <p className="lead">
              {guide === 'inapp'
                ? '這裡是 LINE／臉書等 App 內建的瀏覽器，不能直接安裝，要先換到手機瀏覽器。'
                : deferred
                  ? '只要按一下，下次點主畫面的金盾牌就能直接進站，不用再找連結。'
                  : '照下面幾步做，主畫面就會出現金盾牌，下次一點就進站。'}
            </p>
            <button type="button" className="big" onClick={onBigShieldTap} aria-label={guide === 'inapp' && canAutoOpenBrowser ? '用瀏覽器開啟' : deferred ? '立即安裝到主畫面' : '查看安裝步驟'}>
              <img src="/pwa/save-shield-080.png" alt="080 金盾牌" width={BIG_SHIELD_PX} height={BIG_SHIELD_PX} />
              <span className="go">
                {guide === 'inapp' && canAutoOpenBrowser ? '按這裡，用瀏覽器開啟' : deferred ? '按這裡，立即安裝' : '按這裡，看安裝步驟'}
              </span>
              <span className="sub">{deferred ? '會跳出安裝視窗，按「安裝」就完成' : '約 10 秒就完成'}</span>
            </button>
            <ol className={`steps${nudge ? ' nudge' : ''}`}>{steps.map((t) => <li key={t}>{t}</li>)}</ol>
            {guide === 'samsung' || guide === 'chrome-android' ? (
              <p className="hint">三星手機加不上去時：到「設定 → 主畫面」關掉「鎖定主畫面版面配置」。</p>
            ) : null}
          </div>
        ) : null}
      </section>,
      phoneHost,
    );
  }

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
        .taiji-install-now{width:100%;min-height:48px;border-radius:12px;border:1px solid #fcea86;background:linear-gradient(135deg,#fcea86,#f8c758 50%,#c48a29);color:#1a1205;font-weight:800;font-size:15px;}
        .taiji-install-sheet .row button{flex:1;padding:10px;border-radius:10px;border:1px solid #c9a227;background:transparent;color:#f5d27a;font-size:14px;}
        .taiji-install-sheet .row button.primary{background:#c9a227;color:#0b0d1f;font-weight:700;}
        .taiji-share-ico{display:inline-block;vertical-align:-3px;width:16px;height:18px;}
        @media (min-width:1024px){.taiji-install-sheet-bg{align-items:center;justify-content:center;}.taiji-install-sheet{width:min(420px,calc(100vw - 48px));border:1px solid #c9a227;border-radius:18px;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.6);}}
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
                    {ipad ? '點 Safari 網址列旁的「分享」' : '點 Safari 下方的「分享」'}
                    <svg className="taiji-share-ico" viewBox="0 0 16 18" fill="none" stroke="#f5d27a" strokeWidth="1.6" aria-hidden="true">
                      <path d="M8 1v11M4.5 4.5 8 1l3.5 3.5M3 8H2v9h12V8h-1" />
                    </svg>
                  </li>
                  <li>往下滑，選「加入主畫面」</li>
                  <li>按右上角「新增」，桌面就會出現 080 金盾牌</li>
                </ol>
                <p style={{ margin: '0 0 14px', color: '#f5d27a' }}>加入後，主畫面會出現一顆金盾牌圖示，按一下就直接進站，不用再開瀏覽器。</p>
              </>
            ) : sheet === 'inapp-manual' ? (
              <>
                <h2>請改用瀏覽器開啟</h2>
                <ol>
                  {platform === 'android' ? (
                    <>
                      <li>點右上角「⋮」</li>
                      <li>選「用預設瀏覽器開啟」或「以其他應用程式開啟 → Chrome」</li>
                    </>
                  ) : (
                    <>
                      <li>點右下角或右上角的「⋯」／分享圖示</li>
                      <li>選「在 Safari 中開啟」</li>
                    </>
                  )}
                  <li>到瀏覽器後再點一次左下角的 080 金盾牌</li>
                </ol>
                {canAutoOpenBrowser ? (
                  <p style={{ margin: '0 0 12px' }}>
                    <button type="button" className="taiji-install-now" onClick={openInBrowser}>用瀏覽器開啟</button>
                  </p>
                ) : null}
              </>
            ) : sheet === 'desktop' ? (
              desktop === 'chromium' ? (
                <>
                  <h2>把太極命理安裝到電腦</h2>
                  <ol>
                    <li>點網址列右側的「安裝」圖示，或右上角「⋮」選單</li>
                    <li>選「安裝『太極命理』」（Edge：應用程式 → 將此網站安裝為應用程式）</li>
                  </ol>
                </>
              ) : desktop === 'safari-mac' ? (
                <>
                  <h2>把太極命理加入 Dock</h2>
                  <ol>
                    <li>點選單列「檔案」</li>
                    <li>選「加入 Dock」，Dock 就會出現 080 金盾牌</li>
                  </ol>
                </>
              ) : (
                <>
                  <h2>把太極命理存起來</h2>
                  <ol>
                    <li>按 Ctrl + D（Mac：⌘ + D）加入書籤</li>
                    <li>下次從書籤列直接開啟</li>
                  </ol>
                </>
              )
            ) : (
              <>
                <h2>把太極命理加入主畫面</h2>
                {deferred ? (
                  <p style={{ margin: '0 0 12px' }}>
                    <button type="button" className="taiji-install-now" onClick={async () => { const ok = await runPrompt(); if (ok) setSheet(null); }}>
                      立即安裝到主畫面
                    </button>
                  </p>
                ) : null}
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
