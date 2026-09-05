/**
 * 三合一驗證閘（前端顯示層）
 *
 * 規格第九條：不能偷偷跳過、不能只寫 Console、
 * 不能讓客戶看到一個看起來「成功」的紫微命盤。
 *
 * 所以這個元件不是「一個提示條」，而是一道**閘**：
 * 完整結果放在 children 裡，只有三合一成立時才會被渲染出來。
 * 呼叫端就算忘了看 display，也沒有辦法把半套結果端出去——
 * 少寫一個判斷式就漏出去，這種錯遲早會發生一次，不如讓它結構上不可能。
 *
 * 這一層**只顯示**：每一行文字都來自後端的 ThreeInOneResult，
 * 不在這裡編結論、不自己算數字、不自己組異常說明。
 */

import type { ReactNode } from 'react';
import type { ThreeInOneChecklistItem, ThreeInOneResult } from '@/lib/three-in-one';

const STATE_MARK: Record<ThreeInOneChecklistItem['state'], string> = {
  PASSED: '✓',
  ABNORMAL: '✕',
  PENDING: '·',
};

const STATE_STYLE: Record<ThreeInOneChecklistItem['state'], string> = {
  PASSED: 'text-emerald-300',
  ABNORMAL: 'text-rose-300',
  PENDING: 'text-slate-500',
};

function Checklist({ items }: { items: ThreeInOneChecklistItem[] }) {
  return (
    <ul className="space-y-1.5" data-three-in-one-checklist>
      {items.map((item) => (
        <li key={item.id} className="flex gap-2 text-sm leading-6" data-checklist-state={item.state}>
          <span className={`w-4 shrink-0 font-bold ${STATE_STYLE[item.state]}`}>{STATE_MARK[item.state]}</span>
          <span className="min-w-0">
            <span className={item.state === 'ABNORMAL' ? 'text-rose-200' : 'text-[color:var(--text-sub)]'}>
              {item.label}
            </span>
            {/* 明細是後端給的實測值，照原樣顯示，不改寫、不美化。 */}
            <span className="ml-2 break-all text-xs text-[color:var(--text-muted)]">{item.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 只顯示狀態，不管 children。
 *
 * 給那種「本來就有一套無時辰算法、結果照樣要給客戶看」的卡片用——
 * 例如姓名學：沒有時辰時它仍然有姓名象徵卦可以給，
 * 但必須先把「這次是怎麼算的」攤在客戶面前，不是折疊起來。
 */
export function ThreeInOneStatusPanel({ result }: { result: ThreeInOneResult }) {
  return <ThreeInOneGate result={result}>{null}</ThreeInOneGate>;
}

export default function ThreeInOneGate({
  result,
  children,
}: {
  result: ThreeInOneResult;
  /** 完整結果。只有三合一成立時才會被渲染。 */
  children: ReactNode;
}) {
  if (result.status === 'PASSED') {
    return (
      <div data-three-in-one="PASSED">
        <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
          <Checklist items={result.checklist} />
          <p className="mt-2.5 border-t border-emerald-400/15 pt-2.5 text-sm font-bold tracking-wide text-emerald-200">
            三合一完成
          </p>
        </div>
        {children}
      </div>
    );
  }

  /*
    以下兩種情況，children 一律不渲染。
    這就是「不能讓客戶看到一個看起來成功的紫微命盤」那一條的實作位置。
  */

  if (result.status === 'ABNORMAL') {
    return (
      <div data-three-in-one="ABNORMAL">
        <div className="rounded-2xl border border-rose-400/25 bg-rose-400/5 px-4 py-3">
          <Checklist items={result.checklist} />

          <div className="mt-3 border-t border-rose-400/20 pt-3">
            <p className="text-sm font-bold text-rose-200">{result.report.title}</p>
            <p className="mt-1 text-xs leading-6 text-[color:var(--text-sub)]">{result.report.reason}</p>

            <dl className="mt-3 space-y-2">
              {result.report.differences.map((diff) => (
                <div
                  key={diff.pillar}
                  className="rounded-xl bg-black/25 px-3 py-2 text-xs leading-6"
                  data-mismatch-pillar={diff.pillar}
                >
                  {/* 兩邊的原值都照實列出。禁止自動把其中一套改成另一套。 */}
                  <dt className="font-bold text-rose-200">{PILLAR_TEXT[diff.pillar]}</dt>
                  <dd className="text-[color:var(--text-sub)]">
                    八字：{diff.bazi || '（空）'}
                    <span className="mx-2 text-[color:var(--text-muted)]">／</span>
                    紫微：{diff.ziwei || '（空）'}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-3 whitespace-pre-line text-xs leading-6 text-[color:var(--text-muted)]">
              {result.report.customerMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
    無時辰模式。

    業主定調：「沒有時辰，就要有『沒有時辰』的算法。不能硬算，也不能用騙的，
    要真實以告沒有時辰的算法。」

    所以這一段不是折疊起來的小字免責聲明——是攤開在畫面上的說明：
    每一層在沒有時辰時實際怎麼算、為什麼只能這樣算、哪一層直接不算。
    姓名學卡原本把這件事藏在兩層 <details> 裡面，客戶要點兩次才看得到，
    那不算「告知」。
  */
  if (result.status === 'TIME_UNKNOWN') {
    return (
      <div data-three-in-one="TIME_UNKNOWN">
        <div className="rounded-2xl border border-sky-400/25 bg-sky-400/5 px-4 py-3">
          <p className="text-sm font-bold text-sky-100">{result.noHourMethod.title}</p>
          <p className="mt-1.5 text-xs leading-6 text-[color:var(--text-sub)]">
            {result.noHourMethod.honesty}
          </p>

          <ul className="mt-3 space-y-2">
            {result.noHourMethod.layers.map((layer) => (
              <li
                key={layer.layer}
                className="rounded-xl bg-black/25 px-3 py-2.5"
                data-no-hour-layer={layer.layer}
                data-layer-available={layer.available ? 'yes' : 'no'}
              >
                <p className="text-xs font-bold">
                  <span className={layer.available ? 'text-emerald-300' : 'text-rose-300'}>
                    {layer.available ? '算得出來' : '不算'}
                  </span>
                  <span className="ml-2 text-[color:var(--text-sub)]">{layer.layer}</span>
                </p>
                <p className="mt-1 text-xs leading-6 text-[color:var(--text-sub)]">{layer.method}</p>
                <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">{layer.reason}</p>
              </li>
            ))}
          </ul>

          <p className="mt-3 border-t border-sky-400/15 pt-3 text-xs leading-6 text-[color:var(--text-muted)]">
            {result.noHourMethod.crossCheck}
          </p>
          <p className="mt-2 text-xs font-bold leading-6 text-sky-100">
            {result.noHourMethod.unlock}
          </p>

          <div className="mt-3 border-t border-sky-400/15 pt-3">
            <Checklist items={result.checklist} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-three-in-one="FAILED">
      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 px-4 py-3">
        <Checklist items={result.checklist} />
        <div className="mt-3 border-t border-amber-400/20 pt-3">
          <p className="text-sm font-bold text-amber-200">{result.report.title}</p>
          <p className="mt-1 text-xs leading-6 text-[color:var(--text-sub)]">{result.report.reason}</p>
          {result.report.nextStep && (
            <p className="mt-2 text-xs leading-6 text-amber-100/90">{result.report.nextStep}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** 柱名中文。與後端的 PILLAR_LABELS 對應，只用於顯示。 */
const PILLAR_TEXT: Record<'year' | 'month' | 'day' | 'hour', string> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '時柱',
};
