'use client';

const HOME_LCP_SRC = '/home-entry/xinyuehu-environment-ai-v1.thumb.webp';

/**
 * 首頁進場卡場景圖：標了 data-art-eager 的立刻套上（首屏／LCP）。
 * 其餘等 LCP 圖下載完成（或 load／最長 8 秒）後，接近視窗再載入，避免跟 LCP 搶頻寬。
 */
export function armLazyHomeArt(): () => void {
  if (typeof window === 'undefined') return () => {};
  const apply = (el: Element) => {
    const node = el as HTMLElement;
    const src = node.getAttribute('data-lazy-art');
    if (src == null || node.dataset.artApplied === '1') return;
    node.dataset.artApplied = '1';
    if (src.startsWith('/')) node.style.backgroundImage = `url("${src}")`;
    node.classList.add('is-art-ready');
  };
  const eager = Array.from(document.querySelectorAll('[data-lazy-art][data-art-eager]'));
  eager.forEach(apply);

  let io: IntersectionObserver | null = null;
  let started = false;
  const startObserver = () => {
    if (started) return;
    started = true;
    const rest = Array.from(document.querySelectorAll('[data-lazy-art]')).filter(
      (n) => !n.hasAttribute('data-art-eager') && (n as HTMLElement).dataset.artApplied !== '1',
    );
    if (!rest.length) return;
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          apply(entry.target);
          io?.unobserve(entry.target);
        }
      },
      { rootMargin: '80px 0px', threshold: 0.01 },
    );
    rest.forEach((n) => io!.observe(n));
    rest.forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) apply(n);
    });
  };

  const afterLcp = () => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof idle === 'function') idle(startObserver, { timeout: 800 });
    else window.setTimeout(startObserver, 50);
  };

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    afterLcp();
  };

  // 與 preload 共用同一筆請求：LCP 圖一到就放行其他圖。
  try {
    const probe = new Image();
    probe.onload = release;
    probe.onerror = release;
    probe.src = HOME_LCP_SRC;
    if (probe.complete && probe.naturalWidth > 0) release();
  } catch {
    /* 探測失敗就走逾時／load */
  }
  window.addEventListener('load', release, { once: true });
  const safety = window.setTimeout(release, 8000);

  return () => {
    window.clearTimeout(safety);
    io?.disconnect();
  };
}
