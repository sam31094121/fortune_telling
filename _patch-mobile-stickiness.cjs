const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'C:/Users/DRAGON/Desktop/命理';

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s); console.log('wrote', p, s.length); }

// 1) TaijiTopShell3D — mobile play hint
{
  const p = path.join(root, 'components/taiji/TaijiTopShell3D.tsx');
  let s = read(p);
  if (!s.includes('MobilePlayHint')) {
    const hintFn = `
function MobilePlayHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const narrow = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    if (!narrow) {
      setVisible(false);
      return;
    }
    const hide = () => setVisible(false);
    window.addEventListener('pointerdown', hide, { once: true, capture: true });
    const timer = window.setTimeout(hide, 9000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', hide, true);
    };
  }, []);

  if (!visible) return null;
  return (
    <p className="taiji-mobile-play-hint" role="note">
      拖曳太極 · 感受氣場
    </p>
  );
}
`;
    if (!s.includes('useState')) {
      s = s.replace(
        /import \{([^}]+)\} from 'react';/,
        (m, inner) => {
          let next = inner;
          if (!next.includes('useState')) next += ', useState';
          if (!next.includes('useEffect')) next += ', useEffect';
          return `import {${next}} from 'react';`;
        }
      );
    } else if (!s.includes('useEffect')) {
      s = s.replace('useState', 'useState, useEffect');
    }
    s = s.replace(
      'export default function TaijiTopShell3D',
      `${hintFn}\nexport default function TaijiTopShell3D`
    );
    if (s.includes('<TaijiSystem') && !s.includes('<MobilePlayHint')) {
      s = s.replace(/(<TaijiSystem[^>]*\/>)/, '$1\n        <MobilePlayHint />');
    }
    write(p, s);
  } else {
    console.log('skip TaijiTopShell3D — hint exists');
  }
}

// 2) globals.css — mobile stickiness fine-tune
{
  const p = path.join(root, 'app/globals.css');
  let s = read(p);
  const marker = '/* ===== stickiness fine-tune 2026-09-23c michelin-mobile ===== */';
  if (!s.includes(marker)) {
    s += `

${marker}
@media (max-width: 900px), (pointer: coarse) {
  /* 讓首屏更快看到「開始」：太極殼再收一點、任務卡上提 */
  #home-top-empty-shell-card,
  .home-top-brand-stage {
    margin-bottom: 0.05rem !important;
  }
  .home-primary-quest-wrap {
    margin-top: -0.7rem !important;
    margin-bottom: 0.85rem !important;
  }
  .taiji-mobile-play-hint {
    pointer-events: none;
    position: absolute;
    left: 50%;
    bottom: 0.35rem;
    z-index: 6;
    transform: translateX(-50%);
    margin: 0;
    padding: 0.28rem 0.7rem;
    border: 1px solid rgba(253, 230, 138, 0.35);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.62);
    box-shadow: 0 0 18px rgba(34, 211, 238, 0.18);
    color: rgba(254, 243, 199, 0.92);
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.12em;
    white-space: nowrap;
    animation: taiji-play-hint-breathe 2.4s ease-in-out infinite;
  }
  @keyframes taiji-play-hint-breathe {
    0%, 100% { opacity: 0.72; transform: translateX(-50%) translateY(0); }
    50% { opacity: 1; transform: translateX(-50%) translateY(-2px); }
  }
  /* 手機卡文少截斷：2 行 → 3 行，降低「寫不完」的不信任感 */
  .home-feature-launch p {
    -webkit-line-clamp: 3 !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .taiji-mobile-play-hint {
    animation: none !important;
  }
}
`;
    write(p, s);
  } else {
    console.log('skip globals — marker exists');
  }
}

// 3) TodayDirectionQuest.module.css — strengthen Start on mobile first fold
{
  const p = path.join(root, 'components/TodayDirectionQuest.module.css');
  let s = read(p);
  const marker = '/* michelin-mobile start-peek 2026-09-23c */';
  if (!s.includes(marker)) {
    s += `

${marker}
@media (max-width: 900px), (pointer: coarse) {
  .intro {
    margin-top: 0.35rem !important;
    gap: 0.55rem !important;
  }
  .intro h2 {
    font-size: clamp(1.28rem, 6vw, 1.62rem) !important;
    line-height: 1.22 !important;
  }
  .lead {
    margin-top: 0.35rem !important;
    font-size: 0.84rem !important;
    line-height: 1.45 !important;
  }
  .returnPromise {
    display: none; /* 首屏先讓「開始」浮上來；回訪承諾改在開始後再說 */
  }
  .lockPreview {
    min-height: 3.1rem !important;
    padding: 0.45rem 0.65rem !important;
  }
  .primaryButton {
    min-height: 3.35rem !important;
    font-size: 1.02rem !important;
    box-shadow:
      0 0 0 1px rgba(253, 230, 138, 0.45),
      0 12px 32px rgba(34, 211, 238, 0.28) !important;
  }
}
`;
    write(p, s);
  } else {
    console.log('skip quest css — marker exists');
  }
}

console.log('done');
