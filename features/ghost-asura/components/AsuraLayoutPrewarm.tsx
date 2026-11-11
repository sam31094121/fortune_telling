'use client';
// 2026-11-09 用戶鈺勝指定（任務 3：在畫面外先分段排好版，開卡時只做顯示）。
// 依據：perf6 LAYOUT-COST-DIAGNOSIS（開卡大 Layout 有 53% 是首次字形排版 ShapeText）與 diag 實驗
// 「預先離屏排版同樣式、不同文字」可讓開卡 Layout 大幅下降。這裡不複製卡片、不含任何命盤內容：
// 只在填表閒置時，把卡片會用到的字體×字重×字級組合，逐組放進看不見、不佔版面的容器排一次，
// 每組先建字型、再把樣本字分 4 段，每次 requestIdleCallback 只在預估做得完時才做下一段（逾時才補做一段），避免在表單頁產生長任務。
// 容器內容放在 shadow root：頁面上的 body/html :has() 規則看不到裡面，插入時不會觸發整頁樣式重算
// （實測 CPU 4× 每段固定成本由約 20ms 降到約 1–2ms）。
// 開卡（有結果）或離開頁面時移除容器；字型與字形快取留在瀏覽器內供開卡使用。
import { useEffect } from 'react';
import { ASURA_PREWARM_FONTS, ASURA_PREWARM_TEXT } from './asura-layout-prewarm-data';

type IdleDeadline = { timeRemaining: () => number; didTimeout: boolean };

export function AsuraLayoutPrewarm({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active || typeof window === 'undefined' || typeof document === 'undefined') return;
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('data-asura-layout-prewarm', '');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:360px;height:0;overflow:hidden;visibility:hidden;pointer-events:none;contain:strict;';
    document.body.appendChild(host);
    const root: ShadowRoot | HTMLElement = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    // 先放 1 個字（只建字型），再把樣本字切成 4 段，讓每一段在低階手機（CPU 6×）也只要十幾毫秒。
    const quarter = Math.ceil(ASURA_PREWARM_TEXT.length / 4);
    const pieces = [ASURA_PREWARM_TEXT.slice(0, 1), ...[0, 1, 2, 3].map(i => ASURA_PREWARM_TEXT.slice(i * quarter, (i + 1) * quarter))];
    const total = ASURA_PREWARM_FONTS.length * pieces.length;
    const w = window as Window & {
      requestIdleCallback?: (cb: (d: IdleDeadline) => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const ric = w.requestIdleCallback
      ? (cb: (d: IdleDeadline) => void) => w.requestIdleCallback!(cb, { timeout: 4000 })
      : (cb: (d: IdleDeadline) => void) => window.setTimeout(() => cb({ timeRemaining: () => 8, didTimeout: false }), 60);
    const cancel = (h: number) => (w.cancelIdleCallback ? w.cancelIdleCallback(h) : window.clearTimeout(h));
    let index = 0;
    let handle = 0;
    let cancelled = false;
    let lastCost = 0;
    const step = (deadline: IdleDeadline) => {
      if (cancelled) return;
      const start = performance.now();
      do {
        const [family, weight, size] = ASURA_PREWARM_FONTS[Math.floor(index / pieces.length)];
        const text = pieces[index % pieces.length];
        index++;
        const unitStart = performance.now();
        const line = document.createElement('div');
        line.style.fontFamily = family;
        line.style.fontWeight = String(weight);
        line.style.fontSize = size;
        line.style.lineHeight = '1.6';
        line.textContent = text;
        root.appendChild(line);
        void line.offsetHeight; // 在這個閒置時段內就把這一段排完
        lastCost = performance.now() - unitStart;
        // 下一段預估做不完就留給下一個閒置時段，避免把一個閒置時段撐成長任務
      } while (index < total && deadline.timeRemaining() > lastCost * 1.5 + 4);
      try { performance.measure('asura-layout-prewarm-chunk', { start, end: performance.now() }); } catch { /* 舊瀏覽器沒有此 API */ }
      if (index < total) handle = ric(step);
      else { try { performance.mark('asura-layout-prewarm-done'); } catch { /* ignore */ } }
    };
    handle = ric(step);
    return () => {
      cancelled = true;
      cancel(handle);
      host.remove();
    };
  }, [active]);
  return null;
}
