'use client';

/**
 * 九宮格靈動數字：五行寶珠連線（與易經姓名學五星連線同一套畫法）
 * 後端運算、前端只顯示：節點、連線、說明文字都來自 study.fiveStar（lib/nine-grid-numbers.ts），
 * 這裡只負責配色、動畫與排版，不組任何結論句子。
 */
import { useId } from 'react';
import Link from 'next/link';
import type { FiveStarStudy } from '@/lib/nine-grid-numbers';
import type { GridElement } from '@/lib/nameology-number-reading';

export const ELEMENT_GEM: Record<GridElement, { fill: string; light: string; glow: string; text: string }> = {
  木: { fill: '#2f7a5c', light: '#8be3bd', glow: 'rgba(67,170,125,.6)', text: '#a7f3d0' },
  火: { fill: '#b04a3f', light: '#ffb1a4', glow: 'rgba(224,98,82,.6)', text: '#fecaca' },
  土: { fill: '#a07b38', light: '#f6dc9a', glow: 'rgba(214,170,80,.6)', text: '#fde68a' },
  金: { fill: '#8a7aa6', light: '#efe6ff', glow: 'rgba(190,172,222,.6)', text: '#e2e8f0' },
  水: { fill: '#3b74a0', light: '#9fd6f5', glow: 'rgba(84,160,208,.6)', text: '#bae6fd' },
};
const ORDER: GridElement[] = ['木', '火', '土', '金', '水'];
const CENTER = { x: 180, y: 170 };
const RADIUS = 106;

function point(element: GridElement, radius = RADIUS) {
  const angle = ((-90 + ORDER.indexOf(element) * 72) * Math.PI) / 180;
  return { x: CENTER.x + radius * Math.cos(angle), y: CENTER.y + radius * Math.sin(angle) };
}

/** 讓線停在寶珠外，不蓋住節點 */
function trimmed(from: GridElement, to: GridElement, gap: number) {
  const a = point(from);
  const b = point(to);
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  return { x1: a.x + ux * gap, y1: a.y + uy * gap, x2: b.x - ux * gap, y2: b.y - uy * gap };
}

export default function FiveStarLink({ fiveStar }: { fiveStar: FiveStarStudy }) {
  const uid = useId().replace(/:/g, '');
  if (!fiveStar || !Array.isArray(fiveStar.nodes) || fiveStar.nodes.length !== 5) return null;

  return (
    <section className="mt-5 rounded-2xl border border-amber-200/25 bg-gradient-to-b from-[#1b1a2e]/80 to-[#0b0e1c]/80 p-4" aria-label={fiveStar.title}>
      <style>{`
        @keyframes ${uid}-flow { to { stroke-dashoffset: -24; } }
        @keyframes ${uid}-rise { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes ${uid}-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) {
          .${uid}-flow { animation: ${uid}-flow 2.2s linear infinite; }
          .${uid}-node { transform-box: fill-box; transform-origin: center; animation: ${uid}-rise .6s cubic-bezier(.34,1.56,.64,1) both; }
          .${uid}-halo { animation: ${uid}-pulse 3s ease-in-out infinite; }
        }
      `}</style>

      <h3 className="text-center text-[11px] font-black tracking-[0.3em] text-amber-200/90">{fiveStar.title}</h3>

      <svg viewBox="0 0 360 340" className="mx-auto mt-2 block w-full max-w-[400px]" role="img" aria-label={fiveStar.summary}>
        <defs>
          {ORDER.map((el) => (
            <radialGradient key={el} id={`${uid}-g-${el}`} cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="28%" stopColor={ELEMENT_GEM[el].light} />
              <stop offset="100%" stopColor={ELEMENT_GEM[el].fill} />
            </radialGradient>
          ))}
          <marker id={`${uid}-gen`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7be0b5" /></marker>
          <marker id={`${uid}-ctl`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ff9aa8" /></marker>
        </defs>

        {fiveStar.edges.map((edge) => {
          const generate = edge.kind === '生';
          const seg = trimmed(edge.from, edge.to, 24);
          return (
            <line
              key={`${edge.from}-${edge.to}-${edge.kind}`}
              className={edge.active ? `${uid}-flow` : undefined}
              x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
              stroke={generate ? '#7be0b5' : '#ff9aa8'}
              strokeWidth={edge.active ? 2.4 : 1}
              strokeOpacity={edge.active ? 0.95 : 0.16}
              strokeDasharray={generate ? undefined : '6 5'}
              markerEnd={edge.active ? `url(#${uid}-${generate ? 'gen' : 'ctl'})` : undefined}
              strokeLinecap="round"
            />
          );
        })}

        {fiveStar.nodes.map((node, index) => {
          const pos = point(node.element);
          const gem = ELEMENT_GEM[node.element];
          return (
            <g key={node.element} className={node.present ? `${uid}-node` : undefined} style={{ animationDelay: `${index * 0.12}s` }}>
              {node.present && <circle className={`${uid}-halo`} cx={pos.x} cy={pos.y} r={30} fill={gem.glow} opacity="0.5" />}
              <circle cx={pos.x} cy={pos.y} r={22} fill={node.present ? `url(#${uid}-g-${node.element})` : 'rgba(226,232,240,.05)'} stroke={node.present ? gem.light : 'rgba(226,232,240,.3)'} strokeWidth={node.present ? 1.6 : 1.2} strokeDasharray={node.present ? undefined : '3 3'} />
              <text x={pos.x} y={pos.y + 6} textAnchor="middle" fontSize="19" fontWeight="900" fill={node.present ? '#ffffff' : 'rgba(226,232,240,.5)'}>{node.element}</text>
              <text x={pos.x} y={pos.y + 42} textAnchor="middle" fontSize="11" fontWeight="800" fill={node.present ? gem.text : 'rgba(226,232,240,.4)'}>{node.present ? node.digits.join(' ') : '—'}</text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-center text-[11px] font-bold text-violet-100/80">{fiveStar.legend.generate}　{fiveStar.legend.control}</p>
      <p className="mx-auto mt-2 max-w-[420px] break-words text-center text-xs font-bold leading-6 text-violet-100">{fiveStar.summary}</p>

      <div className="mt-3 space-y-1.5">
        {[fiveStar.mapping, fiveStar.linkRule, fiveStar.scope].map((item) => (
          <div key={item.text}>
            <p className="break-words text-[11px] font-semibold leading-5 text-violet-100/85">{item.text}</p>
            <p className="text-[10px] font-bold text-amber-100/70">{item.provenanceLabel}</p>
          </div>
        ))}
      </div>

      <Link href="/nameology" className="mt-4 flex min-h-[44px] items-center justify-center rounded-full border border-amber-300/60 bg-amber-300/15 px-4 text-[13px] font-black tracking-[0.08em] text-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
        前往易經姓名學五星連線
      </Link>
    </section>
  );
}
