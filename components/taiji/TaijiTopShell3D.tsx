'use client';

/**
 * 首頁最上方空殼卡片 · 三層立體太極系統
 *
 * 第一層：太極 → 兩儀 → 四象 → 八卦（完整呈現）
 * 第二層：五顆行星（空風水火地）獨立軌道
 * 第三層：空間能量場包覆並釋放光芒
 *
 * 只在支援 WebGL 且非 reduced-motion 時掛載；否則卡片維持原空殼樣式。
 */

import dynamic from 'next/dynamic';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { canMountTaiji3D } from './taijiDeviceGate';
import styles from './TaijiFormlessField.module.css';

/* 圖案全面換新（2026-08-13 依業主檔案）：改掛 TaijiSystem V2（R3F 版）。
   舊 TaijiWebGL3D 保留原檔未刪，要回退時把下面這行換回 './TaijiWebGL3D' 即可。 */
/*
  動態載入必須有失敗退路。

  iOS Safari 在記憶體吃緊、切換 App 回來、或網路不穩時，chunk 載入失敗的機率
  遠高於桌機。原本沒有 loading 也沒有錯誤處理——chunk 一失敗，Next.js 的
  dynamic 就靜靜地什麼都不渲染，客戶看到的又是一片空白。

  loading 期間先給靜態太極；載入失敗時 onError 會讓外層切到靜態退路。
*/
const TaijiSystem = dynamic(() => import('@/components/TaijiSystem'), {
  ssr: false,
  loading: () => <StaticTaiji state="loading" />,
});

/**
 * 3D 不在時的太極 —— 無極場。
 *
 * 業主定調：「太極是要一種神秘感的遊戲，所以無形勝有形。」
 * 所以這裡不放圖、不畫邊、不包框：兩團陰陽輝光以不同週期反向相推，
 * 交界不畫成線，讓它在光暗相接處自己浮出來。看得到，卻抓不到邊。
 *
 * 全 CSS，不碰 WebGL、不載圖檔——chunk 掉、GL context 被回收、記憶體吃緊時，
 * iPhone 一樣顯示得出來。太極是唯一核心，任何情況下都不該是一片空白。
 */
function StaticTaiji({ state }: { state: 'loading' | 'static' }) {
  return (
    <div className="relative grid w-full place-items-center py-6" data-taiji-fallback={state}>
      <div
        className={`${styles.field} ${state === 'loading' ? styles.loading : ''}`}
        role="img"
        aria-label="太極"
      >
        <span className={styles.haze} />
        <span className={styles.veil} />
        <span className={styles.figure} />
      </div>
    </div>
  );
}

export default function TaijiTopShell3D({
  textureUrl,
  videoUrl,
}: {
  textureUrl?: string;
  videoUrl?: string;
}) {
  const [ready, setReady] = useState(false);
  /** 3D 掛不上時的退路：太極永遠不會是一片空白。 */
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      /*
        只擋兩件事：瀏覽器沒有 WebGL、或客戶自己要求減少動態。

        原本這裡還有一道「低功耗裝置」判定：
          deviceMemory <= 4 || hardwareConcurrency <= 4
        它讓「所有 iPhone」都看不到太極——Safari 完全不支援 deviceMemory，
        而 hardwareConcurrency 出於指紋防護對 iPhone 全系列一律只回報 4，
        連 iPhone 15 Pro Max 也是 4。於是 compact && limitedDevice 恆成立，
        整個 iOS 被擋在門外，首屏變成空白。（2026-09-04 客訴）

        真正的效能保護本來就在 TaijiSystem 內部：依裝置設 DPR 上限與粒子預算、
        離開視野停 frameloop。那一層才是該做降級的地方——
        依太極憲章，省效能要從材質與剔除下手，不是把整個核心關掉。
      */
      // 判定抽在 taijiDeviceGate.ts，健檢與 CI 可直接餵 iPhone 參數驗證。
      const mountable = canMountTaiji3D({
        webgl,
        reducedMotion: Boolean(reduced),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
      });
      if (!mountable) {
        setFallback(true);
        return;
      }

      const start = () => setReady(true);
      // Safari 至今不支援 requestIdleCallback，退路縮短到 320ms，
      // 讓 iPhone 的顯示時機與 Android 一致，不要慢半拍。
      const canUseIdleCallback = typeof window.requestIdleCallback === 'function';
      const handle = canUseIdleCallback
        ? window.requestIdleCallback(start, { timeout: 1800 })
        : window.setTimeout(start, 320);
      return () => {
        if (canUseIdleCallback) window.cancelIdleCallback(handle as number);
        else window.clearTimeout(handle as number);
      };
    } catch {
      // 偵測本身出錯也不能讓首屏開天窗。
      setFallback(true);
    }
  }, []);

  /*
    3D 還沒掛上、或掛不上時的靜態太極。
    原本這裡是 return null——註解寫著「保留靜態外框」，實際上什麼都沒有，
    客戶看到的是一個空的區塊。太極是唯一核心，任何情況下都不該消失。
  */
  if (!ready) {
    return <StaticTaiji state={fallback ? 'static' : 'loading'} />;
  }

  /*
    掛上之後還是可能倒：
      · chunk 載入失敗（iOS Safari 記憶體吃緊、切 App 回來、網路不穩時特別常見）
      · WebGL context lost（iOS 在背景或記憶體壓力下會主動回收 GL context）
      · 元件執行期例外
    這三種發生時，React 會卸掉整棵子樹——客戶看到的又是一片空白。
    用錯誤邊界接住，退回靜態太極；太極不會消失。
  */
  return (
    <TaijiMountBoundary fallback={<StaticTaiji state="static" />}>
      <div className="relative w-full overflow-visible rounded-[28px]">
        <TaijiSystem textureUrl={textureUrl ?? '/taiji.png'} videoUrl={videoUrl} />
      </div>
    </TaijiMountBoundary>
  );
}

/** 太極掛載錯誤邊界：3D 倒了就換靜態圖，不讓首屏開天窗。 */
class TaijiMountBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidMount() {
    // iOS 在記憶體壓力下會主動回收 GL context；收到就換靜態圖。
    this.onContextLost = (event: Event) => {
      event.preventDefault();
      this.setState({ crashed: true });
    };
    window.addEventListener('webglcontextlost', this.onContextLost, true);
  }

  componentWillUnmount() {
    if (this.onContextLost) window.removeEventListener('webglcontextlost', this.onContextLost, true);
  }

  private onContextLost?: (event: Event) => void;

  componentDidCatch(error: Error) {
    console.warn('[taiji] 3D 掛載失敗，改用靜態太極：', error.message);
  }

  render() {
    return this.state.crashed ? this.props.fallback : this.props.children;
  }
}
