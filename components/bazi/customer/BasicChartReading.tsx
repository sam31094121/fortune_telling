import type { BaziCustomerView } from './adapter';

/** 僅呈現已核對的排盤欄位；不引用被扣住的 AI 段落或喜用結論。 */
export function BasicChartReading({ view }: { view: BaziCustomerView }) {
  if (!view.traditionalGate.coreReady) {
    return <p className="text-sm leading-7">本次命盤資料尚未完成核對，請重新排盤。</p>;
  }
  const pillars = view.pillars.filter(p => !(view.hourUnknown && p.key === 'hour'));
  return <section aria-label="基礎命盤說明" className="space-y-3 text-sm leading-7">
    <h3 className="font-bold">基礎命盤說明</h3>
    <p>日主為{view.dayMaster.stem}{view.dayMaster.element}。日主取自日柱天干，是這張命盤排列十神的參照。</p>
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {pillars.map(p => <div key={p.key} className="rounded-xl border border-white/10 p-3">
        <dt className="font-bold">{p.label}：{p.stem}{p.branch}</dt>
        <dd>天干十神：{p.stemTenGod || '未提供'}</dd>
        <dd>藏干：{p.hiddenStems.map(h => `${h.stem}（${h.tenGod}）`).join('、') || '未提供'}</dd>
      </div>)}
    </dl>
    {view.hourUnknown && <p>出生時辰未提供，目前列出年、月、日三柱。</p>}
    <p>以上是排盤資料說明。格局、旺衰、喜用及個人運勢判讀需另行核對，本段不作這些結論。</p>
  </section>;
}
