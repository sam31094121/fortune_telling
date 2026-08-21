'use client';

/** 十神：主畫面只顯示最重要 3–4 個（核心），其餘完整版放 LEVEL 3 */
export function TenGodSection({ ranked, dominant, missing }: {
  ranked: Array<{ tenGod: string; score: number }>;
  dominant: string[];
  missing: string[];
}) {
  const core = ranked.slice(0, 4);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {core.map((item, i) => (
          <span
            key={item.tenGod}
            className={`rounded-full border px-4 py-1.5 text-sm font-black ${
              i === 0 ? 'border-amber-200/45 bg-amber-100/[0.09] text-amber-100' : 'border-white/12 bg-white/[0.04] text-white/75'
            }`}
          >
            {item.tenGod} {item.score}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/55">
        主訊號：{dominant.join('、') || '分布平均'}{missing.length > 0 ? `；缺位：${missing.join('、')}` : ''}
      </p>
    </div>
  );
}
