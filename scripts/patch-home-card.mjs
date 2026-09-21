import fs from 'fs';

const path = process.argv[2] || 'C:/Users/DRAGON/Desktop/命理/app/page.tsx';
let s = fs.readFileSync(path, 'utf8');

const marker = 'className="home-feature-launch order-10';
const classPos = s.indexOf(marker);
if (classPos < 0) {
  console.error('order-10 card not found');
  process.exit(1);
}
const linkStart = s.lastIndexOf('<Link', classPos);
const linkEnd = s.indexOf('</Link>', classPos);
if (linkStart < 0 || linkEnd < 0) {
  console.error('Link bounds not found');
  process.exit(1);
}
const end = linkEnd + '</Link>'.length;
const old = s.slice(linkStart, end);
if (!old.includes('href="/3D"')) {
  console.error('Expected href="/3D" in order-10 card');
  process.exit(1);
}

const neu = `<Link
            href="/3D"
            className="home-feature-launch order-10 w-full relative group overflow-hidden rounded-3xl border border-violet-300/30 bg-[radial-gradient(circle_at_82%_22%,rgba(167,139,250,0.22),transparent_28%),linear-gradient(110deg,rgba(12,18,42,0.98),rgba(45,28,74,0.62),rgba(12,18,42,0.98))] p-6 text-left shadow-[0_0_30px_rgba(167,139,250,0.13)] transition-[border-color,box-shadow,transform] duration-500 hover:border-violet-200/70 hover:shadow-[0_0_50px_rgba(167,139,250,0.25)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-200/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
            <div className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 opacity-[0.18] transition-opacity duration-500 group-hover:opacity-[0.32]" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(196,181,253,0.9)" strokeWidth="1.2" />
                <rect x="18" y="18" width="64" height="64" fill="none" stroke="rgba(167,139,250,0.95)" strokeWidth="1.1" />
                <rect x="30" y="30" width="40" height="40" fill="none" stroke="rgba(245,208,254,0.7)" strokeWidth="0.9" />
                <path d="M18 18L30 30M82 18L70 30M18 82L30 70M82 82L70 70" stroke="rgba(196,181,253,0.55)" strokeWidth="0.8" />
              </svg>
            </div>
            <div className="relative flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-violet-100/35 bg-violet-200/10 shadow-[0_0_28px_rgba(167,139,250,0.18)]" aria-hidden="true">
                <svg viewBox="0 0 64 64" className="h-11 w-11">
                  <defs>
                    <linearGradient id="tj4d-shell" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ede9fe" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                    <linearGradient id="tj4d-cube" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#c4b5fd" />
                      <stop offset="100%" stopColor="#f5d0fe" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="29" fill="none" stroke="url(#tj4d-shell)" strokeWidth="1.6" opacity="0.95" />
                  <path d="M32 3a29 29 0 0 1 0 58a14.5 14.5 0 0 0 0-29a14.5 14.5 0 0 1 0-29" fill="rgba(237,233,254,0.14)" />
                  <circle cx="32" cy="17.5" r="3.1" fill="#0c122a" />
                  <circle cx="32" cy="46.5" r="3.1" fill="#ede9fe" />
                  <rect x="11.5" y="11.5" width="41" height="41" fill="none" stroke="rgba(196,181,253,0.88)" strokeWidth="1.15" />
                  <g stroke="url(#tj4d-cube)" strokeWidth="1.35" fill="none" strokeLinecap="round">
                    <rect x="18" y="18" width="20" height="20" opacity="0.95" />
                    <rect x="26" y="26" width="20" height="20" opacity="0.95" />
                    <path d="M18 18L26 26M38 18L46 26M18 38L26 46M38 38L46 46" opacity="0.92" />
                    <path d="M28 28L36 28L36 36L28 36Z" opacity="0.75" />
                  </g>
                  <circle cx="32" cy="32" r="2" fill="#f5d0fe" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full border border-violet-200/30 bg-violet-300/10 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-violet-100">四維 · 超立方</span>
                <h2 className="mt-1.5 font-serif text-xl font-black tracking-wide text-violet-50 sm:text-2xl">立體太極模型工作室</h2>
                <p className="mt-1 text-sm text-slate-200">空心太極包方形核心，方圓緊貼，進入四維。</p>
              </div>
            </div>
            <div className="home-feature-cta relative flex items-center gap-2 rounded-xl border border-violet-200/40 bg-violet-300/15 px-5 py-3 text-xs font-bold text-violet-50 transition group-hover:bg-violet-300/25">
              <span>打開模型工作室</span>
              <span className="transition-transform group-hover:translate-x-1.5">➜</span>
            </div>
          </Link>`;

fs.writeFileSync(path, s.slice(0, linkStart) + neu + s.slice(end), 'utf8');
console.log('OK replaced bytes', old.length, '->', neu.length);
