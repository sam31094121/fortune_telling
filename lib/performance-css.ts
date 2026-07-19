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
      contain: layout paint;
    }

    html {
      -webkit-tap-highlight-color: transparent;
    }

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

    body.app-mobile-device,
    body.app-social-browser {
      overscroll-behavior-y: contain;
      scroll-behavior: auto;
    }

    body.app-lite-effects .starfield::after,
    body.app-lite-effects .constellation-ring-bottom {
      display: none !important;
    }

    body.app-page-hidden *,
    body.app-reduced-motion * {
      animation-play-state: paused !important;
    }

    body.app-page-hidden * {
      transition: none !important;
    }

    body.app-lite-effects .starfield,
    body.app-lite-effects .starfield::before {
      animation-duration: 32s !important;
      opacity: 0.38 !important;
    }

    body.app-lite-effects .constellation-ring-top {
      animation-duration: 96s !important;
      opacity: 0.3 !important;
    }

    body.app-lite-effects .animate-pulse,
    body.app-lite-effects .animate-bounce,
    body.app-lite-effects .animate-ping,
    body.app-lite-effects .shimmer-btn {
      animation-duration: 4.8s !important;
    }

    body.app-lite-effects .taiji-celestial-mist,
    body.app-lite-effects .taiji-celestial-wisp,
    body.app-lite-effects .modal-taiji-natural-bloom {
      opacity: 0.34 !important;
      filter: none !important;
    }

    body.app-lite-effects .modal-evolution-rays .modal-energy-ray:nth-child(n+9),
    body.app-lite-effects .taiji-gold-waves .taiji-gold-wave:nth-child(n+3) {
      display: none !important;
    }

    body.app-lite-effects .modal-evolution-flare,
    body.app-lite-effects .modal-evolution-scan,
    body.app-lite-effects .modal-evolution-breath,
    body.app-lite-effects .unified-evolution-pulse,
    body.app-lite-effects .unified-evolution-screen {
      filter: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    body.app-lite-effects .modal-taiji-orbit-emblem,
    body.app-lite-effects .modal-taiji-3d-core,
    body.app-lite-effects .unified-bagua-mandala,
    body.app-lite-effects .modal-bagua-node,
    body.app-lite-effects .modal-sixiang-node,
    body.app-lite-effects .modal-liangyi-node {
      will-change: transform, opacity;
    }

    body.app-lite-effects .fortune-card,
    body.app-lite-effects .vip-gold-card,
    body.app-lite-effects .taiji-standalone-card,
    body.app-lite-effects [data-visitor-counter] {
      filter: none !important;
      text-shadow: none !important;
    }

    body.app-small-screen .fortune-card,
    body.app-small-screen .vip-gold-card,
    body.app-small-screen [data-visitor-counter] {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
    }

    body.app-social-browser .fortune-card,
    body.app-social-browser .vip-gold-card,
    body.app-social-browser [data-visitor-counter],
    body.app-mobile-device [data-visitor-counter] {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    @media (max-width: 768px), (pointer: coarse) {
      .fortune-card,
      .vip-gold-card {
        contain: layout paint;
      }

      .fortune-card,
      .vip-gold-card {
        content-visibility: auto;
        contain-intrinsic-size: 1px 680px;
      }

      .constellation-ring-bottom {
        display: none !important;
      }

      .fortune-card,
      .vip-gold-card,
      [data-visitor-counter] {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
  injectPerformanceCSS();
}
