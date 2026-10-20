'use client';

/**
 * 易經姓名學：五格按鈕卡＋五星連線圖
 * 後端運算、前端只顯示：所有話術、連線、神獸、來源說明都來自 analysis.gridStudy（lib/nameology-number-reading.ts），
 * 這裡只負責排版、配色與選取狀態，不組任何結論句子。
 * 卡片沿用八字四柱卡的樣式（FourPillarsCard.module.css）：選中＝金色寶石，其餘＝靛藍寶石。
 */
import { useId, useState } from 'react';
import type { NameologyGridStudy, GridElement } from '@/lib/nameology-number-reading';
import styles from '@/components/bazi/customer/FourPillarsCard.module.css';

const ELEMENT_COLOR: Record<GridElement, { fill: string; light: string; glow: string; text: string }> = {
  木: { fill: '#2f7a5c', light: '#8be3bd', glow: 'rgba(67,170,125,.6)', text: '#a7f3d0' },
  火: { fill: '#b04a3f', light: '#ffb1a4', glow: 'rgba(224,98,82,.6)', text: '#fecaca' },
  土: { fill: '#a07b38', light: '#f6dc9a', glow: 'rgba(214,170,80,.6)', text: '#fde68a' },
  金: { fill: '#8a7aa6', light: '#efe6ff', glow: 'rgba(190,172,222,.6)', text: '#e2e8f0' },
  水: { fill: '#3b74a0', light: '#9fd6f5', glow: 'rgba(84,160,208,.6)', text: '#bae6fd' },
};
const ELEMENT_ORDER: GridElement[] = ['木', '火', '土', '金', '水'];
const CENTER = { x: 180, y: 178 };
const RADIUS = 104;
/** 背景星點（純裝飾、固定位置，不使用亂數） */
const STARS: [number, number, number][] = [
  [28, 40, 1.4], [320, 36, 1.2], [58, 120, 1], [304, 140, 1.5], [24, 214, 1.2], [336, 226, 1], [64, 300, 1.4], [300, 310, 1.1],
  [180, 14, 1.2], [120, 340, 1], [244, 338, 1.3], [92, 62, 0.9], [270, 78, 0.9], [150, 330, 0.9],
];

function nodePoint(element: GridElement, radius = RADIUS) {
  const index = ELEMENT_ORDER.indexOf(element);
  const angle = ((-90 + index * 72) * Math.PI) / 180;
  return { x: CENTER.x + radius * Math.cos(angle), y: CENTER.y + radius * Math.sin(angle) };
}

/** 讓線停在寶珠外，不蓋住節點與箭頭 */
function trimmed(from: GridElement, to: GridElement, gap: number) {
  const a = nodePoint(from);
  const b = nodePoint(to);
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  return { x1: a.x + ux * gap, y1: a.y + uy * gap, x2: b.x - ux * (gap + 5), y2: b.y - uy * (gap + 5) };
}

/** embedded＝放進既有卡片（姓名總格神獸卡）裡面，不另外多一張卡。 */
export default function NameologyGridCards({ study, embedded = false }: { study: NameologyGridStudy; embedded?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const readings = study?.readings ?? [];
  const [selected, setSelected] = useState(readings.find((item) => item.key === 'person')?.key ?? readings[0]?.key);
  const current = readings.find((item) => item.key === selected) ?? readings[0];
  // 瀏覽器可能留著舊版格式的結果（沒有筆畫概念與依據欄位）：格式不符就先不顯示，重新分析後就會出現，不讓整頁當掉。
  const compatible = study?.ruleVersion === 'nameology-grid-study-v2' && Boolean(study.strokeConcept) && Boolean(study.linkage) && Boolean(study.credibility)
    && readings.every((item) => Boolean(item.role) && Array.isArray(item.evidence));
  if (!current || !compatible) return null;
  // 用固定的標籤名稱，不在渲染裡定義元件（否則每次點選都會整塊重建，展開狀態與動畫會被重置）
  const Tag: 'div' | 'section' = embedded ? 'div' : 'section';
  const { linkage, credibility } = study;
  const currentColor = ELEMENT_COLOR[current.element];

  return (
    <Tag
      className={embedded ? 'relative mt-6 border-t border-violet-200/25 pt-5' : 'fortune-card overflow-hidden border-violet-300/25 bg-gradient-to-b from-[#1a1530]/80 to-[#0d1020]/80 p-4 sm:p-6'}
      role={embedded ? 'group' : undefined}
      aria-label="五格數理與五行連線"
    >
      <style>{`
        @keyframes ${uid}-flow { to { stroke-dashoffset: -28; } }
        @keyframes ${uid}-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) {
          .${uid}-chain { animation: ${uid}-flow 1.6s linear infinite; }
          .${uid}-pulse { animation: ${uid}-pulse 2.8s ease-in-out infinite; }
        }
      `}</style>

      <header className="text-center">
        <p className="text-[11px] font-black tracking-[0.3em] text-amber-200/90">五格數理</p>
        <h3 className="mt-1 text-xl font-black tracking-[0.12em] text-violet-50">天人地外總</h3>
        <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      </header>

      <details className="mt-4 rounded-2xl border border-violet-200/20 bg-black/25 p-3" open>
        <summary className="min-h-[40px] cursor-pointer list-none text-xs font-black leading-6 text-violet-100">
          <span className="mr-2 inline-block rounded-full border border-violet-200/40 px-2 py-0.5 text-[10px]">概念</span>
          {study.strokeConcept.title}
        </summary>
        {study.strokeConcept.characters.length > 0 && (
          <ul className="mt-2 flex flex-wrap items-center justify-center gap-2" aria-label="筆畫明細">
            {study.strokeConcept.characters.map((item, index) => (
              <li key={`${item.char}-${index}`} className="min-w-[64px] rounded-xl border border-amber-200/30 bg-amber-200/[0.07] px-3 py-1.5 text-center">
                <span className="block text-[10px] font-black text-amber-200/80">{item.part}</span>
                <span className="block font-serif text-2xl font-black leading-none text-violet-50">{item.char}</span>
                <span className="mt-0.5 block text-[11px] font-bold text-violet-100/85">{item.strokes}畫</span>
              </li>
            ))}
            <li className="min-w-[64px] rounded-xl border border-violet-200/30 bg-violet-200/[0.07] px-3 py-1.5 text-center">
              <span className="block text-[10px] font-black text-violet-200/80">全名</span>
              <span className="block text-2xl font-black leading-none text-violet-50">{study.strokeConcept.total}</span>
              <span className="mt-0.5 block text-[11px] font-bold text-violet-100/85">畫</span>
            </li>
          </ul>
        )}
        <div className="mt-3 space-y-2">
          {study.strokeConcept.paragraphs.map((text) => (
            <p key={text} className="break-words text-xs font-semibold leading-6 text-violet-100/90">{text}</p>
          ))}
        </div>
        <p className="mt-3 rounded-xl border border-amber-200/25 bg-amber-200/[0.06] px-3 py-2 text-[11px] font-semibold leading-5 text-amber-50/95">{study.strokeConcept.strokeNote}</p>
      </details>

      <div className="mt-5 grid grid-cols-5 gap-1 sm:gap-3" role="group" aria-label="選擇一個格看含義">
        {study.readings.map((item) => {
          const active = item.key === current.key;
          const tone = active ? styles.isDay : styles.isHour;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              aria-label={`${item.label} ${item.value}畫 ${item.element} ${item.keyword}`}
              onClick={() => setSelected(item.key)}
              className={`${styles.pillarCard} ${tone} w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200`}
            >
              <p className={`${styles.pillarLabel} ${tone}`}>{item.label}</p>
              <p className={styles.stemText} style={{ color: ELEMENT_COLOR[item.element].text }}>{item.value}</p>
              <p className={styles.branchText}>{item.element}</p>
              <p className={`${styles.tenGodText} ${tone}`}>{item.keyword}</p>
              <div className={`${styles.beastSection} ${tone}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.beastImage} alt={`${item.label}${item.beast.name}`} src={item.beast.imageUrl} loading="lazy" />
                <p className={styles.beastName}>{item.beast.name}</p>
              </div>
            </button>
          );
        })}
      </div>

      <article
        className="mt-4 rounded-2xl border p-4"
        style={{ borderColor: currentColor.fill, background: `linear-gradient(135deg, ${currentColor.glow}, rgba(8,10,22,.74))` }}
        aria-live="polite"
      >
        <p className="text-[11px] font-black tracking-[0.2em]" style={{ color: currentColor.text }}>{current.keyword}　{current.beast.name}・{current.beast.direction}</p>
        <p className="mt-1 break-words text-sm font-black leading-7 text-violet-50">{current.headline}</p>

        {current.formula && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="text-[11px] font-black tracking-[0.15em] text-amber-200/90">怎麼算</p>
            <p className="mt-1 break-words text-xs font-bold leading-6 text-violet-50">{current.formula}</p>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="text-[11px] font-black tracking-[0.15em] text-amber-200/90">這個格代表　{current.role.title}</p>
          <p className="mt-1 break-words text-xs font-semibold leading-6 text-violet-100/90">{current.role.text}</p>
        </div>

        <p className="mt-3 break-words text-sm font-semibold leading-7 text-violet-50/95">{current.plainTalk}</p>

        <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="text-[11px] font-black text-amber-200/90">小提醒</p>
          <p className="mt-1 break-words text-xs font-semibold leading-6 text-violet-100/90">{current.caution}</p>
        </div>
        {current.wrapNote && <p className="mt-2 break-words text-[11px] font-semibold leading-5 text-violet-200/70">{current.wrapNote}</p>}

        <details className="mt-3 rounded-xl border border-amber-200/20 bg-amber-200/[0.05] p-3">
          <summary className="min-h-[40px] cursor-pointer list-none text-[11px] font-black leading-6 text-amber-100">
            <span className="mr-2 inline-block rounded-full border border-amber-200/40 px-2 py-0.5 text-[10px]">依據</span>
            這段話從哪裡來
          </summary>
          <ul className="mt-2 space-y-2">
            {current.evidence.map((item) => (
              <li key={item.topic} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <p className="text-[11px] font-black text-violet-50">{item.topic}</p>
                <p className="mt-0.5 break-words text-[11px] font-semibold leading-5 text-violet-100/85">{item.basis}</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {item.sourceLabels.map((label) => (
                    <span key={label} className="rounded border border-white/15 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold leading-4 text-violet-100/90">{label}</span>
                  ))}
                </p>
                <p className="mt-1 text-[10.5px] font-bold text-amber-100/80">{item.statusLine}</p>
              </li>
            ))}
          </ul>
        </details>
      </article>

      <div className="mt-6">
        <p className="text-center text-[11px] font-black tracking-[0.3em] text-violet-200/80">五星連線</p>
        <svg viewBox="0 0 360 356" className="mx-auto mt-2 block w-full max-w-[400px]" role="img" aria-label={linkage.summary}>
          <defs>
            <radialGradient id={`${uid}-bg`} cx="50%" cy="50%" r="62%">
              <stop offset="0%" stopColor="rgba(217,190,245,.22)" />
              <stop offset="60%" stopColor="rgba(120,90,190,.08)" />
              <stop offset="100%" stopColor="rgba(217,190,245,0)" />
            </radialGradient>
            <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {ELEMENT_ORDER.map((element) => (
              <radialGradient key={element} id={`${uid}-orb-${element}`} cx="34%" cy="28%" r="78%">
                <stop offset="0%" stopColor={ELEMENT_COLOR[element].light} />
                <stop offset="45%" stopColor={ELEMENT_COLOR[element].fill} />
                <stop offset="100%" stopColor="#0d1020" />
              </radialGradient>
            ))}
            <marker id={`${uid}-gen`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7be0b5" /></marker>
            <marker id={`${uid}-ctl`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ff9aa8" /></marker>
            <marker id={`${uid}-gold`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#f2cf7a" /></marker>
          </defs>

          <circle cx={CENTER.x} cy={CENTER.y} r={168} fill={`url(#${uid}-bg)`} />
          {STARS.map(([x, y, r], index) => (
            <circle key={index} cx={x} cy={y} r={r} fill="#fff" fillOpacity={0.5} className={index % 3 === 0 ? `${uid}-pulse` : undefined} />
          ))}
          <circle cx={CENTER.x} cy={CENTER.y} r={RADIUS} fill="none" stroke="rgba(217,190,245,.18)" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx={CENTER.x} cy={CENTER.y} r={RADIUS + 38} fill="none" stroke="rgba(242,207,122,.1)" strokeWidth="1" />

          {linkage.edges.filter((edge) => !edge.chainRole).map((edge) => {
            const seg = trimmed(edge.from, edge.to, 27);
            const generate = edge.kind === '生';
            return (
              <line
                key={`${edge.kind}-${edge.from}-${edge.to}`}
                x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke={generate ? '#7be0b5' : '#ff9aa8'}
                strokeWidth={edge.active ? 1.9 : 1}
                strokeOpacity={edge.active ? 0.85 : 0.22}
                strokeDasharray={generate ? undefined : '5 5'}
                strokeLinecap="round"
                filter={edge.active ? `url(#${uid}-glow)` : undefined}
                markerEnd={`url(#${uid}-${generate ? 'gen' : 'ctl'})`}
              />
            );
          })}

          {linkage.edges.filter((edge) => edge.chainRole).map((edge) => {
            const seg = trimmed(edge.from, edge.to, 27);
            return (
              <g key={`gold-${edge.kind}-${edge.from}-${edge.to}`}>
                <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="rgba(242,207,122,.3)" strokeWidth="11" strokeLinecap="round" />
                <line
                  className={`${uid}-chain`}
                  x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                  stroke="#f6d98a" strokeWidth="3.4" strokeLinecap="round"
                  strokeDasharray={edge.kind === '剋' ? '9 6' : '16 0'}
                  filter={`url(#${uid}-glow)`}
                  markerEnd={`url(#${uid}-gold)`}
                />
                <text
                  x={(seg.x1 + seg.x2) / 2} y={(seg.y1 + seg.y2) / 2 - 8}
                  textAnchor="middle" fontSize="11.5" fontWeight="900" fill="#f8e6ae"
                  style={{ paintOrder: 'stroke', stroke: 'rgba(10,12,24,.9)', strokeWidth: 3.5 }}
                >
                  {edge.chainRole}
                </text>
              </g>
            );
          })}

          {linkage.nodes.map((node) => {
            const point = nodePoint(node.element);
            const color = ELEMENT_COLOR[node.element];
            const focused = node.element === current.element;
            const label = nodePoint(node.element, RADIUS + 47);
            return (
              <g key={node.element}>
                {node.present && <circle cx={point.x} cy={point.y} r={focused ? 34 : 30} fill={color.glow} className={`${uid}-pulse`} />}
                {focused && <circle cx={point.x} cy={point.y} r={29} fill="none" stroke="#fff" strokeWidth="1.6" strokeOpacity=".85" />}
                <circle cx={point.x} cy={point.y} r={22.5} fill={`url(#${uid}-orb-${node.element})`} fillOpacity={node.present ? 1 : 0.4} stroke="rgba(255,255,255,.4)" strokeWidth="1" />
                <ellipse cx={point.x - 7} cy={point.y - 9} rx={8} ry={4.5} fill="#fff" fillOpacity={node.present ? 0.38 : 0.15} transform={`rotate(-28 ${point.x - 7} ${point.y - 9})`} />
                <text x={point.x} y={point.y + 7} textAnchor="middle" fontSize="20" fontWeight="900" fontFamily="serif" fill="#fff" fillOpacity={node.present ? 1 : 0.6} style={{ paintOrder: 'stroke', stroke: 'rgba(8,10,22,.6)', strokeWidth: 2 }}>{node.element}</text>
                {node.grids.map((grid, index) => (
                  <text
                    key={grid.key}
                    x={label.x} y={label.y + 4 + index * 14 - ((node.grids.length - 1) * 7)}
                    textAnchor="middle" fontSize="12" fontWeight="900" fill={color.text}
                    style={{ paintOrder: 'stroke', stroke: 'rgba(10,12,24,.9)', strokeWidth: 3.5 }}
                  >
                    {grid.label}{grid.value}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-violet-100/80">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-px w-5 bg-emerald-300" />{linkage.legend.generate}</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-5 border-t border-dashed border-rose-300" />{linkage.legend.control}</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-[3px] w-5 rounded bg-amber-300" />{linkage.legend.chain}</span>
        </div>

        <p className="mt-3 text-center text-xs font-black text-violet-100">{linkage.summary}</p>
        <ul className="mt-2 space-y-2">
          {linkage.chain.map((step) => (
            <li key={`${step.from.label}-${step.to.label}`} className="rounded-xl border border-amber-200/25 bg-gradient-to-r from-amber-200/[0.10] to-amber-200/[0.03] px-3 py-2 text-xs font-semibold leading-6 text-amber-50/95">{step.text}</li>
          ))}
        </ul>
      </div>

      <details className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3">
        <summary className="min-h-[44px] cursor-pointer list-none text-xs font-black leading-6 text-violet-100">
          <span className="mr-2 inline-block rounded-full border border-amber-200/40 bg-amber-200/10 px-2 py-0.5 text-[10px] font-black text-amber-100">來源</span>
          {credibility.headline}
        </summary>
        <ul className="mt-2 space-y-1.5">
          {credibility.lines.map((line) => (
            <li key={line} className="break-words text-[11px] font-semibold leading-5 text-violet-100/80">{line}</li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2">
          {credibility.sources.map((source) => (
            <li key={source.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="break-words text-[11px] font-black leading-5 text-violet-50">{source.label}<span className="ml-2 rounded border border-white/15 px-1 text-[10px] text-amber-100">{source.trust} 級</span></p>
              <p className="mt-0.5 break-words text-[10.5px] font-semibold leading-5 text-violet-200/70">{source.citation}</p>
            </li>
          ))}
        </ul>
      </details>
    </Tag>
  );
}
