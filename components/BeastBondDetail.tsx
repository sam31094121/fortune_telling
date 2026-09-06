'use client';

/**
 * 羈絆詳情彈窗・把「一幅畫」變成「一份資產」
 * ============================================================================
 *
 * 業主定調：客戶看 28 格圖鑑牆，「好像只是一張畫圖的圖案，沒有任何功能，
 * 也沒有任何意義」。這個彈窗的存在目的就一句話——
 * **點開任何一格，客戶要能回答「這張卡對我有什麼用」。**
 *
 * 三件事，缺一不可：
 *   放大   —— 縮圖 48px 寬什麼都看不清，點開要看得到本體與幼子的全貌。
 *   賞罰   —— 解鎖＝真的發卡進成長收藏，可押注出戰：贏再得一張、輸會被沒收。
 *             這套機制早就存在（lib/beast-collection-ledger），只是牆上沒講。
 *   指路   —— 沒解鎖的格子要講清楚「怎麼解」，並給一條走得過去的路，
 *             不是一個「？」就把人打發掉。
 *
 * 【這一層不發卡、不算進度】
 *
 * 解鎖與發卡的唯一來源是 lib/beast-growth-rewards 的 deriveUnlockedMansions，
 * 這裡只把父層算好的結果「說給客戶聽」。彈窗自己算一套進度，
 * 遲早跟牆上的數字對不上。
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export interface BondBeast {
  id: number;
  name: string;
  image: string;
  youngDivineImage: string;
  symbolicPart: string;
  coreMeaning: string;
  traits: string;
}

export type BondUnlockHint =
  | { kind: 'module'; title: string; href: string }
  | { kind: 'daily'; required: number; remaining: number };

export default function BeastBondDetail({
  beast, unlocked, hint, onClose,
}: {
  beast: BondBeast;
  unlocked: boolean;
  /** 沒解鎖時才需要：這一格要怎麼解。解鎖的格子傳 null。 */
  hint: BondUnlockHint | null;
  onClose: () => void;
}) {
  /*
    Esc 關閉＋開啟時鎖住背景捲動。
    手機上彈窗開著、底下頁面還在滾，是最容易讓人迷路的小地方。
  */
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${beast.name}羈絆詳情`}
      data-bond-detail
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-amber-200/35 bg-slate-950 p-4 shadow-[0_0_40px_rgba(251,191,36,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-amber-200">{beast.symbolicPart}</p>
            <h3 className="mt-0.5 font-serif text-2xl font-black text-amber-50">{beast.name}</h3>
            <p className="mt-0.5 text-xs font-bold text-cyan-200">{beast.coreMeaning}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="關閉詳情"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 text-lg font-black text-white/80"
          >
            ✕
          </button>
        </div>

        {/* 放大：本體為主、幼子在旁——跟牆上同一組素材，只是終於看得清楚。 */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="col-span-2 overflow-hidden rounded-xl border border-amber-200/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={beast.image} alt={`${beast.name}本體神獸`} className="aspect-[275/480] h-auto w-full object-cover" loading="lazy" decoding="async" />
          </div>
          <div className="grid content-start gap-1">
            <div className="overflow-hidden rounded-xl border border-cyan-100/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beast.youngDivineImage} alt={`${beast.name}神獸幼子`} className="aspect-[275/480] h-auto w-full object-cover" loading="lazy" decoding="async" />
            </div>
            <p className="text-center text-[10px] font-bold text-cyan-100/70">幼子</p>
          </div>
        </div>

        <p className="mt-3 text-xs font-semibold leading-5 text-slate-300">{beast.traits}</p>

        {unlocked ? (
          <div className="mt-3 rounded-xl border border-emerald-200/25 bg-emerald-300/[0.07] p-3" data-bond-reward>
            <p className="text-xs font-black text-emerald-200">✓ 已解鎖・本體與幼子各一張已發進你的成長收藏</p>
            {/*
              賞與罰要一次講完。只說「可以出戰」不說「輸了會沒收」，
              客戶第一次輸卡就會覺得被騙——誠實比誘因重要。
            */}
            <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-300">
              這不只是圖：牠是你能押上神獸戰場的戰力。
              <span className="text-emerald-100">贏，再得一張</span>；
              <span className="text-rose-200">輸，押上的那張會真的被沒收</span>。
            </p>
            <div className="mt-2.5 grid gap-2">
              <Link
                href="/beast-game/battlefield"
                className="flex min-h-11 items-center justify-center rounded-xl bg-amber-200 text-sm font-black text-slate-950"
              >
                帶牠去神獸戰場出戰
              </Link>
              <Link
                href="/star-beasts"
                className="flex min-h-11 items-center justify-center rounded-xl border border-white/20 text-sm font-bold text-white/80"
              >
                看完整圖鑑故事
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-cyan-200/25 bg-cyan-300/[0.06] p-3" data-bond-unlock-hint>
            <p className="text-xs font-black text-cyan-200">尚未解鎖・這樣把牠帶回家</p>
            {hint?.kind === 'module' ? (
              <>
                <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-300">
                  完成首頁的〈{hint.title}〉分析，這組羈絆（本體＋幼子）就會發進你的成長收藏，之後可押注出戰。
                </p>
                <Link
                  href={hint.href}
                  className="mt-2.5 flex min-h-11 items-center justify-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950"
                >
                  現在去完成〈{hint.title}〉
                </Link>
              </>
            ) : hint?.kind === 'daily' ? (
              <>
                <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-300">
                  每日一步累計 {hint.required} 次時解鎖，你還差 <strong className="text-cyan-100">{hint.remaining} 次</strong>。進度不歸零，走一步近一步。
                </p>
                <a
                  href="#daily-step"
                  onClick={onClose}
                  className="mt-2.5 flex min-h-11 items-center justify-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950"
                >
                  去完成今天的一小步
                </a>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
