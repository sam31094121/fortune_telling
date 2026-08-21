'use client';

import { useState, type ReactNode } from 'react';

/** 共用 Accordion：低調、留白層次、無重型動畫 */
export function CustomerAccordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-[20px] border border-white/8 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-base font-black text-[color:var(--text-main)]">{title}</span>
        <span className={`text-sm text-white/45 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

/** 「看依據」抽屜：點擊才顯示專業依據，建立可信度 */
export function CustomerEvidenceDrawer({ items }: { items: Array<{ label: string; value: string }> }) {
  const [open, setOpen] = useState(false);
  const rows = items.filter((i) => i.value);
  if (rows.length === 0) return null;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/65 transition hover:text-white">
        {open ? '收起依據' : '看依據'}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-2xl bg-black/25 px-4 py-3">
          {rows.map((row) => (
            <p key={row.label} className="text-sm font-semibold leading-6 text-white/60"><span className="text-white/85">{row.label}：</span>{row.value}</p>
          ))}
        </div>
      )}
    </div>
  );
}
