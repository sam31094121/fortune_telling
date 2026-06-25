/**
 * CSS 性能優化注入
 * 為動畫元素添加 GPU 加速
 */

export function injectPerformanceCSS() {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    /* 為 Three.js Canvas 啟用 GPU 加速 */
    canvas {
      will-change: contents;
      transform: translateZ(0);
    }

    /* 為所有過渡動畫啟用 GPU 加速 */
    .mystic-title,
    .fortune-card,
    button {
      will-change: auto;
      transform: translateZ(0);
      backface-visibility: hidden;
    }

    /* 優化 hover 效果性能 */
    a, button {
      transform: translateZ(0);
    }

    /* 禁用不必要的抗鋸齒以提升性能 */
    @media (max-width: 768px) {
      canvas {
        image-rendering: pixelated;
        image-rendering: -webkit-optimize-contrast;
      }
    }

    /* 優化文本渲染 — 高清晰度 */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    /* 強化字體邊界清晰度 */
    h1, h2, h3, h4, h5, h6, p, span, a, button {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    /* Canvas 高清渲染 */
    canvas {
      image-rendering: crisp-edges;
      image-rendering: -webkit-optimize-contrast;
    }
  `;

  document.head.appendChild(style);
}

// 應用性能 CSS
if (typeof window !== 'undefined') {
  injectPerformanceCSS();
}
