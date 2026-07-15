export function injectPerformanceCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tian-su-performance-css')) return;

  const style = document.createElement('style');
  style.id = 'tian-su-performance-css';
  style.textContent = `
    canvas {
      max-width: 100%;
      transform: translateZ(0);
      backface-visibility: hidden;
      will-change: contents;
    }

    .app-bg,
    .mystic-title,
    .fortune-card,
    .vip-gold-card,
    .taiji-standalone-card,
    button {
      transform: translateZ(0);
      backface-visibility: hidden;
    }

    a,
    button,
    input,
    select,
    textarea {
      touch-action: manipulation;
    }

    input,
    select,
    textarea {
      font-size: 16px;
    }

    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    h1, h2, h3, h4, h5, h6, p, span, a, button {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
  `;

  document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
  injectPerformanceCSS();
}
