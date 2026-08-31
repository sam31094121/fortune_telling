'use client';

import { useState } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import { SHICHEN_LIST } from '@/lib/shichen-engine';

type FormData = {
  name: string;
  birthDate: string;
  birthHourBranch: string;
  gender: 'male' | 'female' | '';
};

type Evidence = { label: string; targetBranch: string; evidence: string };
type BaziSignal = { annualYear: number; annualBranch: string; inputCompleteness: string; natalEvidence: Evidence[]; annualTriggers: Evidence[]; limitations: string[] };
type ZiweiSignal = { status: 'READY' | 'UNAVAILABLE_BIRTH_TIME_REQUIRED'; inputCompleteness: string; palaces?: Array<{ palace: string; earthlyBranch: string; majorStars: string[]; minorStars: string[] }>; limitations: string[] };
type Reading = {
  person: { name: string; birthDate: string; hourKnown: boolean };
  result: {
    bazi: BaziSignal;
    ziwei: ZiweiSignal;
    crossCheck: { status: 'READY' | 'PARTIAL'; summary: string; limitation: string };
    iching: { limitation: string };
  };
};

const EMPTY_FORM: FormData = { name: '', birthDate: '', birthHourBranch: 'unknown', gender: '' };

function EvidenceList({ title, items, empty }: { title: string; items: Evidence[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-rose-200/20 bg-rose-300/[0.06] p-4">
      <h3 className="text-sm font-black text-rose-100">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-white/80">
          {items.map((item, index) => <li key={`${item.label}-${item.evidence}-${index}`}><span className="font-black text-rose-200">{item.label}・{item.targetBranch}</span>　{item.evidence}</li>)}
        </ul>
      ) : <p className="mt-3 text-sm leading-6 text-white/65">{empty}</p>}
    </section>
  );
}

export default function RedLuanHeartbeatPage() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [showHours, setShowHours] = useState(false);

  const update = (patch: Partial<FormData>) => setForm((value) => ({ ...value, ...patch }));
  const canSubmit = form.name.trim().length >= 2 && Boolean(form.birthDate) && Boolean(form.gender);

  async function submit() {
    setSubmitted(true);
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/red-luan-heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json() as Reading & { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || '目前無法完成核對，請稍後再試。');
      setReading(payload);
      requestAnimationFrame(() => document.getElementById('red-luan-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '目前無法完成核對，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 pb-16 sm:px-6">
      <header className="rounded-3xl border border-rose-200/25 bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.18),transparent_44%),linear-gradient(135deg,rgba(31,17,34,0.98),rgba(9,17,35,0.98))] p-6 shadow-[0_18px_60px_rgba(244,63,94,0.13)]">
        <p className="text-xs font-black tracking-[0.22em] text-rose-200">個人關係主題參考</p>
        <h1 className="mt-2 font-serif text-3xl font-black text-rose-50">桃花・紅鸞心動</h1>
        <p className="mt-3 text-sm leading-7 text-white/75">填寫自己的出生資料，核對傳統文化中的年度關係主題訊號。這不是配對，也不預測事件。</p>
      </header>

      <section className="mt-5 rounded-3xl border border-white/12 bg-slate-950/70 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-black tracking-[0.16em] text-cyan-200">第一步</p><h2 className="mt-1 text-xl font-black text-white">你的出生資料</h2></div>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70">只填一位</span>
        </div>

        <div className="mt-6 space-y-6">
          <label className="block text-sm font-black text-white">姓名
            <input value={form.name} onChange={(event) => update({ name: event.target.value })} placeholder="至少 2 個字" className="form-input glass-input glass-input-cyan mt-2 w-full text-base" />
            {submitted && form.name.trim().length < 2 && <span className="mt-2 block text-sm text-rose-200">請輸入至少 2 個字的姓名。</span>}
          </label>

          <div><p className="text-sm font-black text-white">出生日期</p><div className="mt-2"><LunarBirthdayInput value={form.birthDate} onChange={(birthDate) => update({ birthDate })} accent="violet" label="請選擇國曆或農曆" /></div>{submitted && !form.birthDate && <p className="mt-2 text-sm text-rose-200">請完成生日資料。</p>}</div>

          <div>
            <p className="text-sm font-black text-white">出生時辰 <span className="font-normal text-white/55">（可略過）</span></p>
            <p className="mt-1 text-sm leading-6 text-white/65">知道時辰可核對紫微本命夫妻宮；不知道也可繼續，系統不會補填時柱。</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowHours(true)} className={`rounded-2xl border p-3 text-left text-sm font-bold ${showHours ? 'border-cyan-200 bg-cyan-400/15 text-cyan-50' : 'border-white/15 bg-white/5 text-white/80'}`}>我知道時辰</button>
              <button type="button" onClick={() => { setShowHours(false); update({ birthHourBranch: 'unknown' }); }} className={`rounded-2xl border p-3 text-left text-sm font-bold ${!showHours ? 'border-cyan-200 bg-cyan-400/15 text-cyan-50' : 'border-white/15 bg-white/5 text-white/80'}`}>不知道時辰</button>
            </div>
            {showHours && <div className="mt-3 grid grid-cols-3 gap-2">{SHICHEN_LIST.map((hour) => <button key={hour.branch} type="button" onClick={() => update({ birthHourBranch: hour.branch })} className={`rounded-xl border px-2 py-2 text-sm font-bold ${form.birthHourBranch === hour.branch ? 'border-rose-200 bg-rose-400/15 text-rose-100' : 'border-white/15 text-white/70'}`}>{hour.label}</button>)}</div>}
          </div>

          <div><p className="text-sm font-black text-white">性別</p><p className="mt-1 text-sm text-white/65">只供紫微排盤使用，不做性格判定。</p><div className="mt-3 grid grid-cols-2 gap-3">{([{ value: 'female', label: '女性' }, { value: 'male', label: '男性' }] as const).map((option) => <button key={option.value} type="button" onClick={() => update({ gender: option.value })} className={`rounded-2xl border p-3 text-left text-sm font-bold ${form.gender === option.value ? 'border-cyan-200 bg-cyan-400/15 text-cyan-50' : 'border-white/15 bg-white/5 text-white/80'}`}>{option.label}</button>)}</div>{submitted && !form.gender && <p className="mt-2 text-sm text-rose-200">請選擇性別。</p>}</div>
        </div>
        {error && <p className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-100">{error}</p>}
        <button type="button" onClick={submit} disabled={loading} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-rose-300 via-amber-200 to-cyan-200 px-5 py-4 text-base font-black text-slate-950 shadow-[0_12px_30px_rgba(251,113,133,0.18)] disabled:opacity-60">{loading ? '正在核對資料…' : '開始核對我的關係主題'}</button>
      </section>

      {reading && <section id="red-luan-result" className="mt-6 scroll-mt-5 space-y-4" aria-live="polite">
        <header className="rounded-3xl border border-cyan-200/25 bg-cyan-300/[0.08] p-5"><p className="text-xs font-black tracking-[0.18em] text-cyan-200">核對完成</p><h2 className="mt-2 text-2xl font-black text-white">{reading.person.name}的關係主題參考</h2><p className="mt-2 text-sm leading-7 text-white/70">資料完整度：{reading.result.bazi.inputCompleteness}。請把它當作回看與整理感受的文化參考。</p></header>
        <section className="rounded-3xl border border-white/12 bg-slate-950/70 p-5"><p className="text-xs font-black tracking-[0.18em] text-rose-200">八字年度訊號</p><h3 className="mt-2 text-xl font-black text-white">{reading.result.bazi.annualYear} 年・{reading.result.bazi.annualBranch}年</h3><div className="mt-4 grid gap-3"><EvidenceList title="命盤現位" items={reading.result.bazi.natalEvidence} empty="本次未見可核對的現位訊號；這不代表關係好或不好。" /><EvidenceList title="流年命中" items={reading.result.bazi.annualTriggers} empty="本年度未命中這些傳統訊號；這不代表關係沒有機會。" /></div></section>
        <section className="rounded-3xl border border-violet-200/20 bg-violet-400/[0.07] p-5"><p className="text-xs font-black tracking-[0.18em] text-violet-200">紫微本命夫妻宮</p>{reading.result.ziwei.status === 'READY' ? <div className="mt-4 space-y-3">{reading.result.ziwei.palaces?.map((palace) => <article key={`${palace.palace}-${palace.earthlyBranch}`} className="rounded-2xl border border-white/10 bg-black/15 p-4"><h3 className="font-black text-white">{palace.palace}・{palace.earthlyBranch}</h3><p className="mt-2 text-sm leading-6 text-white/75">主星：{palace.majorStars.join('、') || '—'}</p><p className="mt-1 text-sm leading-6 text-white/60">輔星：{palace.minorStars.join('、') || '—'}</p></article>)}</div> : <p className="mt-3 rounded-2xl border border-violet-200/15 bg-violet-300/[0.08] p-4 text-sm leading-7 text-violet-50">尚未填出生時辰，因此不顯示紫微夫妻宮資料，也不以預設時辰代替。</p>}</section>
        <section className="rounded-3xl border border-amber-200/20 bg-amber-300/[0.06] p-5"><p className="text-xs font-black tracking-[0.18em] text-amber-200">資料核對狀態</p><h3 className="mt-2 text-lg font-black text-white">{reading.result.crossCheck.status === 'READY' ? '可並列閱讀' : '八字已完成・紫微待補時辰'}</h3><p className="mt-2 text-sm leading-7 text-white/75">{reading.result.crossCheck.summary}</p><p className="mt-2 text-xs leading-6 text-white/55">{reading.result.crossCheck.limitation}</p></section>
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-black tracking-[0.18em] text-white/55">易經補卦</p><p className="mt-2 text-sm leading-7 text-white/70">{reading.result.iching.limitation}</p></section>
      </section>}

      <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-100 underline underline-offset-4">⌂ 返回首頁</Link>
    </main>
  );
}
