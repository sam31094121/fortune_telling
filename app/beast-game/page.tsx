'use client';

/**
 * 神獸卡遊戲｜組陣台
 * ============================================================================
 *
 * 業主定調：「要設定一個可以把卡片放進去、很明顯地把卡片放進去的遊戲概念。
 * 畫面中要有格子讓客戶篩選，把神獸卡放進去之後，遊戲才有辦法正式啟動。」
 *
 * 所以這一頁的主角是**三個格子**：
 *   空的時候明顯是空的（虛線框、寫著「放一張神獸卡」）
 *   放進去之後看得到那張卡站在裡面
 *   三格沒滿，「開始決鬥」就不會亮，而且會講出還差幾張
 *
 * 站位有意義：前鋒替後面擋刀，後陣被保護著。
 * 所以「放在哪一格」是戰術決定，不是排版。
 *
 * 這一頁**只顯示與選擇**：戰鬥怎麼打、誰贏，全部由後端 Game Core 算完才回來
 * （規格第八、十二條）。畫面不自己扣血、不自己判勝負。
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Skill = { id: string; name: string; trigger: string; description: string };
type Card = {
  id: string;
  name: string;
  element: 'SPACE' | 'AIR' | 'WATER' | 'FIRE' | 'EARTH';
  rarity: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
  form: 'YOUNG' | 'ADULT' | 'GUARDIAN';
  cost: number;
  stats: { hp: number; attack: number; defense: number; speed: number };
  thumbnail: string;
  front: string;
  story: string;
  mansionId: number;
  skills: Skill[];
  power: number;
};

type DuelResult = {
  ok: boolean;
  winner?: string;
  turns?: number;
  life?: { player: number; opponent: number };
  timeline?: Array<{ turn: number; side: string; phase: string; note: string }>;
  error?: string;
};

const ELEMENT_LABEL: Record<Card['element'], string> = {
  SPACE: '空', AIR: '風', WATER: '水', FIRE: '火', EARTH: '地',
};

const ELEMENT_TONE: Record<Card['element'], string> = {
  SPACE: 'border-slate-300/35 text-slate-100',
  AIR: 'border-emerald-300/40 text-emerald-100',
  WATER: 'border-sky-300/40 text-sky-100',
  FIRE: 'border-rose-300/40 text-rose-100',
  EARTH: 'border-amber-300/40 text-amber-100',
};

const FORM_LABEL: Record<Card['form'], string> = {
  YOUNG: '幼子', ADULT: '成獸', GUARDIAN: '四象',
};

/** 三席的名稱與作用。站位有意義，所以要寫出來給客戶看。 */
const SLOT_META = [
  { name: '前鋒', hint: '第一個挨打，適合硬的' },
  { name: '中軍', hint: '前鋒倒了才輪到' },
  { name: '後陣', hint: '被保護著，適合能打的' },
];

export default function BeastGamePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * 三個格子與目前選中的格子放在同一個 state。
   * 分開放會讓 place() 讀到上一輪的 lineup（見下面 place 的說明）。
   */
  const [board, setBoard] = useState<{ lineup: Array<string | null>; activeSlot: number }>({
    lineup: [null, null, null],
    activeSlot: 0,
  });
  const { lineup, activeSlot } = board;

  const [elementFilter, setElementFilter] = useState<Card['element'] | 'ALL'>('ALL');
  const [formFilter, setFormFilter] = useState<Card['form'] | 'ALL'>('ALL');
  const [costFilter, setCostFilter] = useState<number | 'ALL'>('ALL');

  const [detail, setDetail] = useState<Card | null>(null);
  const [duel, setDuel] = useState<DuelResult | null>(null);
  const [dueling, setDueling] = useState(false);
  const [lineupBudget, setLineupBudget] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/beast-game')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) throw new Error(data?.error ?? '卡池載入失敗');
        setCards(data.cards as Card[]);
        setLineupBudget(data.rules.lineupBudget);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const filtered = useMemo(() => cards.filter((card) =>
    (elementFilter === 'ALL' || card.element === elementFilter)
    && (formFilter === 'ALL' || card.form === formFilter)
    && (costFilter === 'ALL' || card.cost === costFilter)), [cards, elementFilter, formFilter, costFilter]);

  const filledCount = lineup.filter(Boolean).length;
  const lineupCost = lineup.reduce((sum, id) => sum + (id ? byId.get(id)?.cost ?? 0 : 0), 0);
  const overBudget = lineupBudget !== null && lineupCost > lineupBudget;
  const ready = filledCount === 3 && lineupBudget !== null && !overBudget;

  /**
   * 把一張卡放進目前選中的格子。
   *
   * 這裡刻意把「三席」與「目前格子」放在同一個 state 裡一起更新。
   * 第一版分成兩個 state，place() 在 setActiveSlot 裡讀外層的 lineup——
   * 那是上一輪 render 的值。連點三張卡時三次都讀到同一份舊資料，
   * 結果三張全部塞進同一格，畫面上只有一格被填滿（實測 filled:1）。
   * 一次更新一個物件就不會有這個問題。
   */
  function place(card: Card) {
    setBoard((prev) => {
      // 同一張已經在別格就先拿掉，避免一張卡站兩個位置。
      const next = prev.lineup.map((id) => (id === card.id ? null : id));
      next[prev.activeSlot] = card.id;
      const nextEmpty = next.findIndex((id) => !id);
      return { lineup: next, activeSlot: nextEmpty === -1 ? prev.activeSlot : nextEmpty };
    });
  }

  function clearSlot(index: number) {
    setBoard((prev) => ({
      lineup: prev.lineup.map((id, i) => (i === index ? null : id)),
      activeSlot: index,
    }));
  }


  async function startDuel() {
    if (!ready || dueling) return;
    setDueling(true);
    setDuel(null);
    try {
      const res = await fetch('/api/beast-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineup }),
      });
      setDuel(await res.json());
    } catch (error) {
      setDuel({ ok: false, error: error instanceof Error ? error.message : String(error) });
    } finally {
      setDueling(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-24 pt-6 text-white sm:px-6">
      <header className="mb-5">
        <Link href="/star-beasts" className="text-xs font-bold tracking-widest text-cyan-200/70">
          ← 二十八宿神獸圖鑑
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-black sm:text-3xl">神獸決鬥・組陣台</h1>
        <p className="mt-1.5 text-xs leading-6 text-white/60">
          選三張、放入格子。前鋒守護後方，雙方布陣上限相同。
        </p>
      </header>

      {/* ── 出戰三席：這一頁的主角 ────────────────────────────────── */}
      <section aria-label="出戰三席" data-lineup-slots className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-black tracking-wide">出戰三席</h2>
          <span className={`text-xs font-bold ${ready ? 'text-emerald-300' : 'text-amber-200'}`}>
            {filledCount} / 3
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {lineup.map((cardId, index) => {
            const card = cardId ? byId.get(cardId) : null;
            const isActive = activeSlot === index;
            return (
              <div key={index} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setBoard((prev) => ({ ...prev, activeSlot: index }))}
                  data-slot={index}
                  data-slot-filled={card ? 'yes' : 'no'}
                  aria-label={`${SLOT_META[index].name}${card ? `：${card.name}` : '：空格'}`}
                  className={`relative flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition
                    ${card
                      ? `border-solid bg-black/40 ${ELEMENT_TONE[card.element]}`
                      : 'border-dashed border-white/25 bg-white/[0.03] text-white/45'}
                    ${isActive ? 'ring-2 ring-cyan-300/70' : ''}`}
                >
                  {card ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.thumbnail}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover object-top opacity-70"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1.5 pt-6 text-[11px] font-black leading-4">
                        {card.name}
                      </span>
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-black">
                        {card.cost} 氣
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl leading-none">＋</span>
                      <span className="mt-1.5 text-[11px] font-bold">放一張神獸卡</span>
                    </>
                  )}
                </button>

                <p className="mt-1.5 text-center text-[11px] font-black text-white/80">{SLOT_META[index].name}</p>
                <p className="text-center text-[10px] leading-4 text-white/40">{SLOT_META[index].hint}</p>
                {card && (
                  <button
                    type="button"
                    onClick={() => clearSlot(index)}
                    className="mt-1 w-full rounded-lg border border-white/15 py-1 text-[10px] font-bold text-white/60"
                  >
                    移出
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!ready || dueling}
          onClick={startDuel}
          data-start-duel
          data-ready={ready ? 'yes' : 'no'}
          className={`mt-4 min-h-[52px] w-full rounded-2xl text-base font-black transition
            ${ready
              ? 'bg-gradient-to-r from-amber-300 to-rose-300 text-slate-950'
              : 'cursor-not-allowed bg-white/10 text-white/40'}`}
        >
          {dueling ? '決鬥進行中…' : overBudget ? '超過布陣上限' : ready ? '開始決鬥' : `還要再放 ${3 - filledCount} 張才能開始`}
        </button>
        <p aria-live="polite" className={`mt-3 text-center text-sm ${overBudget ? 'text-rose-200' : 'text-cyan-100'}`}>
          布陣 {lineupCost} / {lineupBudget ?? '—'} 氣{overBudget ? '・換一張低氣卡' : ''}
        </p>
      </section>

      {/* ── 決鬥結果：後端算完才回來，畫面只顯示 ─────────────────── */}
      {duel && (
        <section aria-label="決鬥結果" data-duel-result className="mb-5 rounded-2xl border border-white/12 bg-black/30 p-4">
          {duel.ok ? (
            <>
              <p className="text-lg font-black">
                {duel.winner === 'PLAYER' ? '你贏了' : duel.winner === 'OPPONENT' ? '你輸了' : '平手'}
              </p>
              <p className="mt-1 text-xs text-white/60">
                共 {duel.turns} 回合・本命 {duel.life?.player} : {duel.life?.opponent}
              </p>
              <details className="mt-3">
                <summary className="min-h-[40px] cursor-pointer text-xs font-bold text-cyan-200">看戰報</summary>
                <ol className="mt-2 space-y-1 text-[11px] leading-5 text-white/55">
                  {(duel.timeline ?? []).slice(0, 60).map((entry, i) => (
                    <li key={i}>
                      <span className="text-white/35">T{entry.turn} {entry.phase}</span> {entry.note}
                    </li>
                  ))}
                </ol>
              </details>
            </>
          ) : (
            <p className="text-sm font-bold text-rose-200">{duel.error}</p>
          )}
        </section>
      )}

      {/* ── 篩選 ──────────────────────────────────────────────────── */}
      <section aria-label="卡池篩選" className="mb-3 space-y-2">
        <FilterRow label="元素" value={elementFilter} onChange={setElementFilter}
          options={[['ALL', '全部'], ...(Object.keys(ELEMENT_LABEL) as Card['element'][]).map((e) => [e, ELEMENT_LABEL[e]] as [string, string])]} />
        <FilterRow label="形態" value={formFilter} onChange={setFormFilter}
          options={[['ALL', '全部'], ['YOUNG', '幼子'], ['ADULT', '成獸'], ['GUARDIAN', '四象']]} />
        <FilterRow label="氣" value={costFilter} onChange={(v) => setCostFilter(v === 'ALL' ? 'ALL' : Number(v))}
          options={[['ALL', '全部'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['7', '7'], ['8', '8']]} />
      </section>

      {/* ── 卡池 ──────────────────────────────────────────────────── */}
      <section aria-label="神獸卡池" data-card-pool>
        <p className="mb-2 text-xs text-white/50">
          {loading ? '卡池載入中…' : `${filtered.length} / ${cards.length} 張・點卡片放進「${SLOT_META[activeSlot].name}」`}
        </p>
        {loadError && <p className="rounded-xl border border-rose-400/30 p-3 text-sm text-rose-200">{loadError}</p>}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filtered.map((card) => {
            const placed = lineup.includes(card.id);
            return (
              <article key={card.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => place(card)}
                  data-card-id={card.id}
                  data-placed={placed ? 'yes' : 'no'}
                  className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-black/40 text-left transition
                    ${placed ? 'border-cyan-300/80 opacity-55' : `${ELEMENT_TONE[card.element]}`}`}
                >
                  {/* 手牌與卡池一律只載縮圖（規格第十四條）。 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.thumbnail}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                  <span className="absolute left-1 top-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-black">
                    {card.cost}
                  </span>
                  <span className="absolute right-1 top-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[9px] font-black">
                    {ELEMENT_LABEL[card.element]}
                  </span>
                  {placed && (
                    <span className="absolute inset-0 grid place-items-center bg-cyan-300/20 text-[11px] font-black">
                      已上陣
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-1 pb-1 pt-5 text-[10px] font-black leading-3">
                    {card.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetail(card)}
                  className="mt-1 w-full text-center text-[10px] font-bold text-white/45"
                >
                  詳細
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── 第三層：詳細資料（點開才載中等圖）───────────────────── */}
      {detail && (
        <div
          role="dialog"
          aria-label={`${detail.name} 詳細資料`}
          className="fixed inset-0 z-50 grid place-items-end bg-black/70 sm:place-items-center"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-slate-950 p-4 sm:max-w-md sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={detail.front} alt={detail.name} loading="lazy" decoding="async"
              className="mx-auto h-56 w-auto rounded-2xl object-contain" />
            <h3 className="mt-3 font-serif text-xl font-black">{detail.name}</h3>
            <p className="mt-1 text-xs text-white/55">
              {FORM_LABEL[detail.form]}・{ELEMENT_LABEL[detail.element]}・{detail.rarity}・{detail.cost} 氣
            </p>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {([['生命', detail.stats.hp], ['攻擊', detail.stats.attack],
                ['防禦', detail.stats.defense], ['速度', detail.stats.speed]] as const).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/5 py-2">
                  <dt className="text-[10px] text-white/45">{label}</dt>
                  <dd className="text-base font-black">{value}</dd>
                </div>
              ))}
            </dl>
            <h4 className="mt-4 text-xs font-black text-cyan-200">技能</h4>
            <ul className="mt-1.5 space-y-1.5">
              {detail.skills.map((skill) => (
                <li key={skill.id} className="rounded-xl bg-white/5 px-3 py-2">
                  <p className="text-xs font-bold">{skill.name}<span className="ml-2 text-[10px] font-normal text-white/40">{skill.trigger}</span></p>
                  <p className="mt-0.5 text-[11px] leading-5 text-white/55">{skill.description}</p>
                </li>
              ))}
            </ul>
            <h4 className="mt-4 text-xs font-black text-cyan-200">神獸故事</h4>
            <p className="mt-1 text-[11px] leading-6 text-white/60">{detail.story}</p>
            <button type="button" onClick={() => setDetail(null)}
              className="mt-4 min-h-[48px] w-full rounded-2xl bg-white/10 text-sm font-black">
              關閉
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function FilterRow<T extends string | number>({ label, value, onChange, options }: {
  label: string;
  value: T | 'ALL';
  onChange: (value: never) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] font-bold text-white/45">{label}</span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key as never)}
            className={`min-h-[34px] shrink-0 rounded-full px-3 text-[11px] font-bold transition
              ${String(value) === key ? 'bg-cyan-300 text-slate-950' : 'bg-white/8 text-white/60'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
