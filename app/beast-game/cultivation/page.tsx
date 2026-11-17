'use client';
import Link from 'next/link';
import SharedCultivationPanel from '@/components/battlefield/SharedCultivationPanel';

export default function BeastCultivationPage() {
  return <main className="mx-auto min-h-screen w-full max-w-5xl bg-slate-950 px-3 py-5 text-slate-100" data-testid="beast-cultivation-page">
    <div className="flex justify-end"><Link href="/star-beasts" className="mb-4 inline-flex min-h-[44px] items-center rounded-xl border border-amber-200/40 px-4 text-amber-100" data-testid="cultivation-return" aria-label="返回神獸卡片"><span aria-hidden="true">↩</span></Link></div>
    <h1 className="sr-only">神獸合體強化</h1>
    <SharedCultivationPanel visualGuide />
  </main>;
}
