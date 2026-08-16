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
      touch-action: pan-y pinch-zoom;
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
      overscroll-behavior-y: auto;
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

    body.app-mobile-device .group-hover\\:animate-\\[shimmer_2s_infinite\\],
    body.app-social-browser .group-hover\\:animate-\\[shimmer_2s_infinite\\],
    body.app-lite-effects .group-hover\\:animate-\\[shimmer_2s_infinite\\] {
      animation: none !important;
      opacity: 0 !important;
    }

    body.app-mobile-device .animate-spin-slow,
    body.app-social-browser .animate-spin-slow,
    body.app-lite-effects .animate-spin-slow {
      animation-duration: 52s !important;
    }

    body.app-lite-effects .number-taiji-blessing-overlay::before,
    body.app-lite-effects .home-core-panel::before,
    body.app-lite-effects .home-line-share-card::before,
    body.app-lite-effects .home-line-share-card::after {
      filter: none !important;
    }

    body.app-mobile-device .choice-signal,
    body.app-social-browser .choice-signal {
      box-shadow: none;
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


    body.app-mobile-device .home-feature-launch,
    body.app-social-browser .home-feature-launch,
    body.app-lite-effects .home-feature-launch,
    body.app-mobile-device .ziwei-palace-card,
    body.app-social-browser .ziwei-palace-card,
    body.app-lite-effects .ziwei-palace-card {
      contain: layout paint;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow: 0 10px 26px rgba(2, 6, 23, 0.22) !important;
    }

    body.app-mobile-device .home-feature-launch:hover,
    body.app-social-browser .home-feature-launch:hover,
    body.app-mobile-device .ziwei-palace-card:hover,
    body.app-social-browser .ziwei-palace-card:hover {
      transform: none !important;
    }
    .home-feature-direct-form {
      display: contents;
    }

    @supports not (display: contents) {
      .home-feature-direct-form {
        display: block;
        width: 100%;
      }
    }
    .home-feature-direct-link {
      cursor: pointer;
      touch-action: pan-y pinch-zoom;
      content-visibility: visible !important;
      contain: layout paint !important;
      pointer-events: auto !important;
    }

    .home-feature-direct-link * {
      pointer-events: none !important;
    }

    body.app-mobile-device .ziwei-palace-card[aria-expanded="true"],
    body.app-social-browser .ziwei-palace-card[aria-expanded="true"],
    body.app-lite-effects .ziwei-palace-card[aria-expanded="true"] {
      transform: translateY(-2px) !important;
      box-shadow: 0 14px 34px rgba(2, 6, 23, 0.3), 0 0 22px rgba(251, 191, 36, 0.12) !important;
    }

    body.app-lite-effects .modal-taiji-button .modal-taiji-orbit-emblem::before,
    body.app-lite-effects .modal-taiji-button .modal-taiji-orbit-emblem::after,
    body.app-lite-effects .modal-taiji-natural-bloom,
    body.app-lite-effects .modal-taiji-ground-glow,
    body.app-lite-effects .unified-evolution-screen,
    body.app-lite-effects .unified-evolution-pulse {
      filter: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    body.app-lite-effects .taiji-celestial-wisp--three,
    body.app-lite-effects .modal-evolution-rays .modal-energy-ray:nth-child(n+7),
    body.app-lite-effects .taiji-light-orbit--violet .taiji-light-orbit__head {
      display: none !important;
    }
    body.app-mobile-device .fortune-card,
    body.app-mobile-device .vip-gold-card,
    body.app-mobile-device .home-feature-launch,
    body.app-mobile-device .number-fortune-card,
    body.app-mobile-device .music-song-maker-card,
    body.app-mobile-device .music-primary-generate-panel,
    body.app-mobile-device .result-container,
    body.app-social-browser .fortune-card,
    body.app-social-browser .vip-gold-card,
    body.app-social-browser .home-feature-launch,
    body.app-social-browser .number-fortune-card,
    body.app-social-browser .music-song-maker-card,
    body.app-social-browser .music-primary-generate-panel,
    body.app-social-browser .result-container,
    body.app-lite-effects .fortune-card,
    body.app-lite-effects .vip-gold-card,
    body.app-lite-effects .number-fortune-card,
    body.app-lite-effects .music-song-maker-card,
    body.app-lite-effects .music-primary-generate-panel,
    body.app-lite-effects .result-container {
      contain: layout paint style;
      content-visibility: auto;
      contain-intrinsic-size: 560px;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow: 0 10px 26px rgba(2, 6, 23, 0.2), inset 0 0 14px rgba(255, 255, 255, 0.025) !important;
    }

    body.app-mobile-device .home-feature-direct-form,
    body.app-social-browser .home-feature-direct-form,
    body.app-lite-effects .home-feature-direct-form {
      display: block !important;
      width: 100%;
      min-width: 0;
    }

    body.app-mobile-device .home-feature-launch,
    body.app-mobile-device .home-feature-direct-link,
    body.app-mobile-device .top-feedback-action,
    body.app-mobile-device .home-ai-feedback-action,
    body.app-social-browser .home-feature-launch,
    body.app-social-browser .home-feature-direct-link,
    body.app-social-browser .top-feedback-action,
    body.app-social-browser .home-ai-feedback-action,
    body.app-lite-effects .home-feature-launch,
    body.app-lite-effects .home-feature-direct-link,
    body.app-lite-effects .top-feedback-action,
    body.app-lite-effects .home-ai-feedback-action {
      content-visibility: visible !important;
      contain: layout paint !important;
      pointer-events: auto !important;
      touch-action: pan-y pinch-zoom;
      -webkit-tap-highlight-color: transparent;
    }

    body.app-mobile-device .home-feature-launch > *,
    body.app-mobile-device .home-trust-card > *,
    body.app-mobile-device .home-ai-feedback-card > *,
    body.app-social-browser .home-feature-launch > *,
    body.app-social-browser .home-trust-card > *,
    body.app-social-browser .home-ai-feedback-card > *,
    body.app-lite-effects .home-feature-launch > *,
    body.app-lite-effects .home-trust-card > *,
    body.app-lite-effects .home-ai-feedback-card > * {
      min-width: 0;
    }

    body.app-mobile-device .top-feedback-count--bump,
    body.app-social-browser .top-feedback-count--bump,
    body.app-lite-effects .top-feedback-count--bump {
      overflow: visible !important;
      animation-duration: 420ms !important;
    }

    body.app-mobile-device .top-feedback-delta,
    body.app-social-browser .top-feedback-delta,
    body.app-lite-effects .top-feedback-delta {
      filter: none !important;
      animation-duration: 760ms !important;
    }

    body.app-mobile-device .fortune-card::before,
    body.app-mobile-device .vip-gold-card::before,
    body.app-mobile-device .home-feature-launch::before,
    body.app-mobile-device .music-song-maker-card::after,
    body.app-mobile-device .home-line-share-card::before,
    body.app-mobile-device .home-line-share-card::after,
    body.app-mobile-device .holo-shine,
    body.app-mobile-device .shooting-stars-container,
    body.app-social-browser .fortune-card::before,
    body.app-social-browser .vip-gold-card::before,
    body.app-social-browser .home-feature-launch::before,
    body.app-social-browser .music-song-maker-card::after,
    body.app-social-browser .home-line-share-card::before,
    body.app-social-browser .home-line-share-card::after,
    body.app-social-browser .holo-shine,
    body.app-social-browser .shooting-stars-container {
      animation: none !important;
      filter: none !important;
      opacity: 0.18 !important;
    }

    body.app-mobile-device .home-feature-launch:hover,
    body.app-mobile-device .fortune-card:hover,
    body.app-mobile-device .vip-gold-card:hover,
    body.app-mobile-device .neon-card-hover:hover,
    body.app-mobile-device .holo-card-container:hover,
    body.app-social-browser .home-feature-launch:hover,
    body.app-social-browser .fortune-card:hover,
    body.app-social-browser .vip-gold-card:hover,
    body.app-social-browser .neon-card-hover:hover,
    body.app-social-browser .holo-card-container:hover {
      transform: none !important;
      box-shadow: 0 10px 26px rgba(2, 6, 23, 0.2), inset 0 0 14px rgba(255, 255, 255, 0.025) !important;
    }

    body.app-mobile-device .modal-taiji-button,
    body.app-social-browser .modal-taiji-button,
    body.app-lite-effects .modal-taiji-button {
      content-visibility: visible !important;
      contain: layout paint !important;
      cursor: pointer;
      touch-action: pan-y pinch-zoom;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }

    body.app-mobile-device .taiji-touch-ripple,
    body.app-social-browser .taiji-touch-ripple,
    body.app-lite-effects .taiji-touch-ripple {
      filter: none !important;
      animation-duration: 480ms !important;
    }

    body.app-mobile-device .number-fortune-taiji-card::after,
    body.app-mobile-device .number-taiji-blessing-overlay::before,
    body.app-social-browser .number-fortune-taiji-card::after,
    body.app-social-browser .number-taiji-blessing-overlay::before {
      filter: none !important;
      opacity: 0.34 !important;
    }
    @media (max-width: 768px), (pointer: coarse) {
      .fortune-card,
      .vip-gold-card {
        contain: layout paint;
      }

      .fortune-card,
      .vip-gold-card,
      .result-container,
      .number-fortune-card,
      .music-song-maker-card,
      .music-primary-generate-panel {
        content-visibility: auto;
        contain-intrinsic-size: 1px 620px;
      }

      .constellation-ring-bottom {
        display: none !important;
      }

      .fortune-card,
      .vip-gold-card,
      .result-container,
      .number-fortune-card,
      [data-visitor-counter] {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      .choice-signal {
        min-width: 3rem;
        padding-inline: 0.5rem;
      }
    }

/* Mobile card smoothness sweep: keep all major cards lighter on phones and in in-app browsers. */
body.app-mobile-device .home-feature-launch,
body.app-mobile-device .home-trust-card,
body.app-mobile-device .home-ai-feedback-card,
body.app-mobile-device .home-line-share-card,
body.app-mobile-device .home-command-panel,
body.app-mobile-device .home-forecast-panel,
body.app-mobile-device .home-core-panel,
body.app-mobile-device .fortune-card,
body.app-mobile-device .vip-gold-card,
body.app-mobile-device .number-fortune-card,
body.app-mobile-device .number-fortune-analysis-card,
body.app-mobile-device .number-fortune-taiji-card,
body.app-mobile-device .result-container,
body.app-mobile-device .ziwei-palace-card,
body.app-mobile-device .music-song-maker-card,
body.app-mobile-device .music-primary-generate-panel,
body.app-mobile-device .music-flow-stage-card,
body.app-mobile-device .voice-song-consent-card,
body.app-mobile-device .voice-recorder-console,
body.app-mobile-device .taiji-standalone-card,
body.app-social-browser .home-feature-launch,
body.app-social-browser .home-trust-card,
body.app-social-browser .home-ai-feedback-card,
body.app-social-browser .home-line-share-card,
body.app-social-browser .home-command-panel,
body.app-social-browser .home-forecast-panel,
body.app-social-browser .home-core-panel,
body.app-social-browser .fortune-card,
body.app-social-browser .vip-gold-card,
body.app-social-browser .number-fortune-card,
body.app-social-browser .number-fortune-analysis-card,
body.app-social-browser .number-fortune-taiji-card,
body.app-social-browser .result-container,
body.app-social-browser .ziwei-palace-card,
body.app-social-browser .music-song-maker-card,
body.app-social-browser .music-primary-generate-panel,
body.app-social-browser .music-flow-stage-card,
body.app-social-browser .voice-song-consent-card,
body.app-social-browser .voice-recorder-console,
body.app-social-browser .taiji-standalone-card,
body.app-lite-effects .home-feature-launch,
body.app-lite-effects .home-trust-card,
body.app-lite-effects .home-ai-feedback-card,
body.app-lite-effects .home-line-share-card,
body.app-lite-effects .home-command-panel,
body.app-lite-effects .home-forecast-panel,
body.app-lite-effects .home-core-panel,
body.app-lite-effects .fortune-card,
body.app-lite-effects .vip-gold-card,
body.app-lite-effects .number-fortune-card,
body.app-lite-effects .number-fortune-analysis-card,
body.app-lite-effects .number-fortune-taiji-card,
body.app-lite-effects .result-container,
body.app-lite-effects .ziwei-palace-card,
body.app-lite-effects .music-song-maker-card,
body.app-lite-effects .music-primary-generate-panel,
body.app-lite-effects .music-flow-stage-card,
body.app-lite-effects .voice-song-consent-card,
body.app-lite-effects .voice-recorder-console,
body.app-lite-effects .taiji-standalone-card {
  backface-visibility: hidden;
  transform: translateZ(0);
  contain: layout paint style;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  filter: none !important;
  box-shadow: 0 8px 22px rgba(2, 6, 23, 0.18), inset 0 0 10px rgba(255, 255, 255, 0.018) !important;
}

body.app-mobile-device .fortune-card,
body.app-mobile-device .vip-gold-card,
body.app-mobile-device .number-fortune-card,
body.app-mobile-device .number-fortune-analysis-card,
body.app-mobile-device .number-fortune-taiji-card,
body.app-mobile-device .result-container,
body.app-mobile-device .ziwei-palace-card,
body.app-mobile-device .music-song-maker-card,
body.app-mobile-device .music-primary-generate-panel,
body.app-mobile-device .music-flow-stage-card,
body.app-mobile-device .voice-song-consent-card,
body.app-mobile-device .voice-recorder-console,
body.app-social-browser .fortune-card,
body.app-social-browser .vip-gold-card,
body.app-social-browser .number-fortune-card,
body.app-social-browser .number-fortune-analysis-card,
body.app-social-browser .number-fortune-taiji-card,
body.app-social-browser .result-container,
body.app-social-browser .ziwei-palace-card,
body.app-social-browser .music-song-maker-card,
body.app-social-browser .music-primary-generate-panel,
body.app-social-browser .music-flow-stage-card,
body.app-social-browser .voice-song-consent-card,
body.app-social-browser .voice-recorder-console {
  content-visibility: auto;
  contain-intrinsic-size: 1px 560px;
}

body.app-mobile-device .home-trust-card,
body.app-mobile-device .home-ai-feedback-card,
body.app-mobile-device .home-feature-launch,
body.app-mobile-device .home-feature-direct-link,
body.app-mobile-device [data-visitor-counter],
body.app-mobile-device .home-ai-feedback-action,
body.app-social-browser .home-trust-card,
body.app-social-browser .home-ai-feedback-card,
body.app-social-browser .home-feature-launch,
body.app-social-browser .home-feature-direct-link,
body.app-social-browser [data-visitor-counter],
body.app-social-browser .home-ai-feedback-action {
  content-visibility: visible !important;
  pointer-events: auto !important;
  touch-action: pan-y pinch-zoom;
}

body.app-mobile-device .home-feature-launch::before,
body.app-mobile-device .home-feature-launch::after,
body.app-mobile-device .fortune-card::before,
body.app-mobile-device .fortune-card::after,
body.app-mobile-device .vip-gold-card::before,
body.app-mobile-device .vip-gold-card::after,
body.app-mobile-device .home-line-share-card::before,
body.app-mobile-device .home-line-share-card::after,
body.app-mobile-device .music-song-maker-card::before,
body.app-mobile-device .music-song-maker-card::after,
body.app-mobile-device .music-flow-stage-card::before,
body.app-mobile-device .voice-recorder-wave,
body.app-social-browser .home-feature-launch::before,
body.app-social-browser .home-feature-launch::after,
body.app-social-browser .fortune-card::before,
body.app-social-browser .fortune-card::after,
body.app-social-browser .vip-gold-card::before,
body.app-social-browser .vip-gold-card::after,
body.app-social-browser .home-line-share-card::before,
body.app-social-browser .home-line-share-card::after,
body.app-social-browser .music-song-maker-card::before,
body.app-social-browser .music-song-maker-card::after,
body.app-social-browser .music-flow-stage-card::before,
body.app-social-browser .voice-recorder-wave {
  animation: none !important;
  filter: none !important;
  opacity: 0.16 !important;
}

body.app-scrolling .home-feature-launch,
body.app-scrolling .home-trust-card,
body.app-scrolling .home-ai-feedback-card,
body.app-scrolling .home-line-share-card,
body.app-scrolling .fortune-card,
body.app-scrolling .number-fortune-card,
body.app-scrolling .result-container,
body.app-scrolling .music-flow-stage-card,
body.app-scrolling .voice-song-consent-card,
body.app-touching .home-feature-launch,
body.app-touching .home-trust-card,
body.app-touching .home-ai-feedback-card,
body.app-touching .home-line-share-card,
body.app-touching .fortune-card,
body.app-touching .number-fortune-card,
body.app-touching .result-container,
body.app-touching .music-flow-stage-card,
body.app-touching .voice-song-consent-card,
body.app-stress-mode .home-feature-launch,
body.app-stress-mode .home-trust-card,
body.app-stress-mode .home-ai-feedback-card,
body.app-stress-mode .home-line-share-card,
body.app-stress-mode .fortune-card,
body.app-stress-mode .number-fortune-card,
body.app-stress-mode .result-container,
body.app-stress-mode .music-flow-stage-card,
body.app-stress-mode .voice-song-consent-card {
  transform: none !important;
  transition-duration: 80ms !important;
  box-shadow: 0 6px 16px rgba(2, 6, 23, 0.14) !important;
}

body.app-mobile-device .home-feature-launch,
body.app-social-browser .home-feature-launch,
body.app-lite-effects .home-feature-launch {
  min-height: 6.25rem;
  -webkit-tap-highlight-color: transparent;
  border-radius: 1.35rem;
  isolation: isolate;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color 110ms ease, background-color 110ms ease, box-shadow 110ms ease, transform 90ms ease !important;
}

body.app-mobile-device .home-feature-launch:active,
body.app-social-browser .home-feature-launch:active,
body.app-lite-effects .home-feature-launch:active {
  border-color: rgba(255, 255, 255, 0.34) !important;
  box-shadow: 0 7px 18px rgba(2, 6, 23, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

body.app-mobile-device .home-feature-launch:focus-visible,
body.app-social-browser .home-feature-launch:focus-visible,
body.app-lite-effects .home-feature-launch:focus-visible {
  outline: 2px solid rgba(254, 240, 138, 0.72);
  outline-offset: 3px;
}

body.app-mobile-device .home-feature-launch .home-feature-cta,
body.app-social-browser .home-feature-launch .home-feature-cta,
body.app-lite-effects .home-feature-launch .home-feature-cta {
  min-height: 2.5rem;
  transition: background-color 110ms ease, border-color 110ms ease, color 110ms ease !important;
}

@media (max-width: 640px), (pointer: coarse) {
  .home-feature-launch,
  .home-trust-card,
  .home-ai-feedback-card,
  .home-line-share-card,
  .fortune-card,
  .vip-gold-card,
  .number-fortune-card,
  .number-fortune-analysis-card,
  .result-container,
  .ziwei-palace-card,
  .music-song-maker-card,
  .music-primary-generate-panel,
  .music-flow-stage-card,
  .voice-song-consent-card,
  .voice-recorder-console {
    will-change: auto !important;
    scroll-margin-top: 0.75rem;
  }
}

  `;

  document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
  injectPerformanceCSS();
}


