'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import FriendlyChoiceCard from '@/components/FriendlyChoiceCard';
import type { BloodType, Gender } from '@/lib/types';
import type { NameologyAnalysis } from '@/lib/nameology-engine';

type NameologyResponse = {
  ok: boolean;
  mode: 'nameology';
  analysis: NameologyAnalysis;
};

type FormState = {
  name: string;
  birthDate: string;
  bloodType: Exclude<BloodType, ''>;
  gender: Gender;
};

type SelectionConfirm = { bloodType: boolean; gender: boolean };


const BLOOD_TYPES: Array<Exclude<BloodType, ''>> = ['A', 'B', 'AB', 'O'];

const initialForm: FormState = {
  name: '',
  birthDate: '',
  bloodType: 'O',
  gender: 'male',
};

const initialSelectionConfirm: SelectionConfirm = { bloodType: false, gender: false };

const BLOOD_DESC: Record<Exclude<BloodType, ''>, string> = {
  A: '細膩穩定，重視秩序、承諾與安全感。',
  B: '自主鮮明，重視自由、節奏與個人風格。',
  AB: '理性感性並存，觀察力與整合力較明顯。',
  O: '主動直接，行動力、號召力與外放感較強。',
};

function ResultPanel({ analysis }: { analysis: NameologyAnalysis }) {
  const topTendencies = analysis.temperamentProfile.topTendencies.slice(0, 4);
  const givenName = analysis.composition.givenName || analysis.name.slice(1);

  return (
    <section className="space-y-5">
      <div className="fortune-card overflow-hidden border-amber-400/25 bg-slate-950/55 p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-amber-300">AI 姓名學</p>
        <h1 className="mt-4 break-words font-serif text-5xl font-black text-amber-100 sm:text-7xl">
          {analysis.name}
        </h1>
        <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
          姓氏為根，名字「{givenName}」為主要意境來源；系統以字義、拆字、筆畫五格、五行相生相剋與 24 性情矩陣交叉解讀。
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4">
            <p className="text-xs text-amber-100/70">姓名學分數</p>
            <p className="mt-1 text-3xl font-black text-amber-100">{analysis.score}</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-950/20 p-4">
            <p className="text-xs text-cyan-100/70">結果定位</p>
            <p className="mt-1 text-lg font-black text-cyan-100">{analysis.level}</p>
          </div>
          <div className="rounded-2xl border border-rose-300/20 bg-rose-950/20 p-4">
            <p className="text-xs text-rose-100/70">交叉校正</p>
            <p className="mt-1 text-lg font-black text-rose-100">{analysis.crossCheck.alignmentLabel}</p>
          </div>
        </div>
      </div>

      <div className="fortune-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">NAME MEANING</p>
        <h2 className="mt-3 font-serif text-3xl text-cyan-100">每個字的意境拆解</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {analysis.characters.map((item) => (
            <article key={`${item.position}-${item.char}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-4xl font-black text-amber-100">{item.char}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.role} · {item.strokeCount}畫 · {item.element}{item.yinYang}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-[color:var(--text-sub)]">部首 {item.glyph.radical}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--text-main)]">{item.glyph.meaning}</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">取名意圖：{item.glyph.namingIntent}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tendencies.slice(0, 3).map((tendency) => (
                  <span key={tendency.key} className="rounded-full border border-amber-300/15 bg-amber-950/20 px-2.5 py-1 text-[11px] text-amber-100">
                    {tendency.label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-300">24 MATRIX</p>
          <h2 className="mt-3 font-serif text-3xl text-violet-100">性情偏向</h2>
          <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.temperamentProfile.clearDirection}</p>
          <div className="mt-5 space-y-3">
            {topTendencies.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-[color:var(--text-main)]">{item.label}</p>
                  <p className="text-sm font-black text-violet-100">{item.score}</p>
                </div>
                <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{item.meaning}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">FIVE GRIDS</p>
          <h2 className="mt-3 font-serif text-3xl text-emerald-100">筆畫五格</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {analysis.grids.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-[color:var(--text-muted)]">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-emerald-100">{item.value}畫</p>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">{item.element} · {item.meaning}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="fortune-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">DIRECT READING</p>
        <h2 className="mt-3 font-serif text-3xl text-amber-100">姓名綜合解讀</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-cyan-200">人格主軸</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.corePersonality}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-rose-200">形象偏好</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.imageAndPreference}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-emerald-200">交叉校正</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.crossCheck.summary}</p>
          </div>
        </div>
        <p className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-950/15 p-4 text-sm leading-8 text-[color:var(--text-main)]">
          {analysis.summary}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-cyan-200">主要優勢</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.strengths.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-rose-200">需要留意</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.cautions.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-amber-200">行動建議</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.recommendations.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
      </section>
    </section>
  );
}

function buildValidationMessage(form: FormState, selectionConfirm: SelectionConfirm) {
  if (form.name.trim().length < 2) return '請先輸入完整姓名，至少 2 個字。';
  if (!form.birthDate) return '請先完成生日萬年曆推算。';
  if (!selectionConfirm.bloodType) return '請點選血型，系統才會套用血型校正。';
  if (!selectionConfirm.gender) return '請點選性別，系統才會套用外在呈現校正。';
  return '';
}

export default function NameologyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectionConfirm, setSelectionConfirm] = useState<SelectionConfirm>(initialSelectionConfirm);
  const [result, setResult] = useState<NameologyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validationMessage = useMemo(() => buildValidationMessage(form, selectionConfirm), [form, selectionConfirm]);
  const canSubmit = validationMessage === '';
  const progressItems = [
    { label: '姓名', done: form.name.trim().length >= 2, value: form.name.trim().length > 0 ? `${form.name.trim().length}字` : '未填' },
    { label: '生日', done: Boolean(form.birthDate), value: form.birthDate ? '已推算' : '未填' },
    { label: '血型', done: selectionConfirm.bloodType, value: selectionConfirm.bloodType ? `${form.bloodType}型` : '未選' },
    { label: '性別', done: selectionConfirm.gender, value: selectionConfirm.gender ? (form.gender === 'male' ? '男性' : '女性') : '未選' },
  ];

  async function handleSubmit() {
    if (!canSubmit || isLoading) {
      setError(validationMessage);
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/nameology-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data?.analysis) throw new Error(data?.message || data?.error || '姓名學分析暫時無法完成。');
      setResult((data as NameologyResponse).analysis);
      window.setTimeout(() => document.getElementById('nameology-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : '姓名學分析暫時無法完成。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3 text-sm">
          <Link href="/" className="text-[color:var(--text-muted)] transition hover:text-amber-200">首頁</Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <span className="text-amber-200">AI 姓名學</span>
        </div>

        <section id="nameology-input-form" className="fortune-card p-5 sm:p-8 scroll-mt-20">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-300">NAMEOLOGY</p>
          <h1 className="mt-4 font-serif text-4xl font-black text-amber-100 sm:text-6xl">AI 姓名學</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
            這裡只解讀姓名學：姓氏固定為根，名字兩字為主要意境來源，再交叉生日、血型與性別，整理字義、拆字、筆畫五格與性情偏向。
          </p>

          <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-950/10 p-4">
            <p className="mb-3 text-xs text-[color:var(--text-muted)]">資料進度</p>
            <div className="flex flex-wrap gap-2">
              {progressItems.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.done ? 'border-green-400/30 bg-green-500/20 text-green-300' : 'border-white/10 bg-white/8 text-[color:var(--text-muted)]'}`}
                >
                  ✓ {item.label} {item.value}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-7">
            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                1. 姓名 {form.name.trim().length >= 2 && <span className="text-green-400">✓</span>}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={(event) => {
                  const trimmed = event.target.value.trim();
                  if (trimmed !== event.target.value) setForm((prev) => ({ ...prev, name: trimmed }));
                }}
                placeholder="請輸入完整姓名（至少 2 個字）"
                maxLength={20}
                className="form-input w-full rounded-lg border border-white/10 px-4 py-3 text-base"
                autoComplete="off"
              />
              {form.name.trim().length > 0 && form.name.trim().length < 2 && (
                <p className="mt-2 text-xs text-yellow-400">姓名至少需要 2 個字。</p>
              )}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                2. 出生日期（民國年）{form.birthDate && <span className="text-green-400">✓</span>}
              </label>
              <LunarBirthdayInput
                value={form.birthDate}
                onChange={(solarDate) => setForm((prev) => ({ ...prev, birthDate: solarDate.trim() }))}
                accent="amber"
                label="出生日期（萬年曆）"
              />
              {form.birthDate && <p className="mt-2 text-xs text-green-400">✓ 西元 {form.birthDate}</p>}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                3. 血型 {selectionConfirm.bloodType && <span className="text-green-400">✓</span>}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {BLOOD_TYPES.map((bloodType, index) => (
                  <FriendlyChoiceCard
                    key={bloodType}
                    active={selectionConfirm.bloodType && form.bloodType === bloodType}
                    title={`${bloodType} 型`}
                    description={BLOOD_DESC[bloodType]}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, bloodType }));
                      setSelectionConfirm((prev) => ({ ...prev, bloodType: true }));
                    }}
                    tone={index % 2 === 0 ? 'violet' : 'cyan'}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                4. 性別 {selectionConfirm.gender && <span className="text-green-400">✓</span>}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <FriendlyChoiceCard
                  active={selectionConfirm.gender && form.gender === 'female'}
                  title="女性"
                  description="用來校正姓名外在形象、柔性特質與互動呈現。"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender: 'female' }));
                    setSelectionConfirm((prev) => ({ ...prev, gender: true }));
                  }}
                  tone="pink"
                />
                <FriendlyChoiceCard
                  active={selectionConfirm.gender && form.gender === 'male'}
                  title="男性"
                  description="用來校正姓名外在形象、行動特質與表現方向。"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender: 'male' }));
                    setSelectionConfirm((prev) => ({ ...prev, gender: true }));
                  }}
                  tone="cyan"
                />
              </div>
            </div>

            {(error || validationMessage) && !result && (
              <p className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-400/25 bg-rose-950/20 text-rose-100' : 'border-amber-400/20 bg-amber-950/15 text-amber-100'}`}>
                {error || validationMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="vip-gold-btn w-full py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? '姓名學分析中...' : canSubmit ? '開始姓名學分析' : '請先完成上方資料'}
            </button>
          </div>
        </section>

        <div id="nameology-result" className="mt-6 scroll-mt-24">
          {result && <ResultPanel analysis={result} />}
        </div>
      </div>
    </main>
  );
}