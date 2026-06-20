'use client';

import { useState } from 'react';
import VisualGravityCore from '@/components/VisualGravityCore';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonInput {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
}

interface CompatDimension {
  label: string;
  score: number;
  description: string;
  emoji: string;
}

interface MatchResult {
  totalScore: number;
  grade: string;
  gradeColor: string;
  gradeDescription: string;
  dimensions: CompatDimension[];
  frictionPoints: string[];
  strengthPoints: string[];
  wisdomNote: string;
}

interface MatchResponse {
  result: MatchResult;
  profileA: { name: string; zodiacZh: string; chineseZodiac: string; wuxing: string; bloodType: string };
  profileB: { name: string; zodiacZh: string; chineseZodiac: string; wuxing: string; bloodType: string };
}

type RelType = 'love' | 'friend' | 'family' | 'partner';

// ─── 關係類型 ──────────────────────────────────────────────────────────────────

const REL_TYPES: { value: RelType; label: string; emoji: string; desc: string }[] = [
  { value: 'love',    label: '愛情',  emoji: '💕', desc: '戀人・夫妻・伴侶' },
  { value: 'friend',  label: '友情',  emoji: '🤝', desc: '朋友・知己・閨蜜' },
  { value: 'family',  label: '家人',  emoji: '🏡', desc: '父母・子女・親人' },
  { value: 'partner', label: '合夥',  emoji: '🤜', desc: '事業・合作・工作夥伴' },
];

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;

// ─── 空白表單 ──────────────────────────────────────────────────────────────────

const EMPTY: PersonInput = { name: '', birthDate: '', bloodType: 'A', gender: 'female' };

// ─── 主頁面 ────────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const [relType, setRelType] = useState<RelType>('love');
  const [personA, setPersonA] = useState<PersonInput>({ ...EMPTY });
  const [personB, setPersonB] = useState<PersonInput>({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchData, setMatchData] = useState<MatchResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setMatchData(null);

    try {
      const res = await fetch('/api/match-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personA, personB, relationshipType: relType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '配對計算失敗');
      setMatchData(data as MatchResponse);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請再試一次');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>

      {/* ── 頁頭 ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[color:var(--bg-deep)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-4">
          <Link href="/" className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white">
            ← 返回首頁
          </Link>
          <span className="text-xs tracking-widest text-[color:var(--text-muted)]">·</span>
          <span className="text-xs tracking-widest text-[color:var(--text-sub)]">天地人 · 人際配對系統</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="relative mb-10 overflow-hidden rounded-[32px] border border-white/8 bg-[color:var(--bg-card)] p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <VisualGravityCore />
          </div>
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.4em] text-violet-300/70">天地人 AI · 人際配對</p>
            <h1
              className="mt-3 font-serif text-[color:var(--text-main)]"
              style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)' }}
            >
              我們合不合？
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-[color:var(--text-sub)]">
              輸入兩人的天地人資料，AI 透過八字・生肖・星座・血型・人格矩陣，
              計算你們之間的緣分、共鳴與相處之道。
            </p>
          </div>
        </div>

        {/* ── 結果 ──────────────────────────────────────────── */}
        {matchData && (
          <MatchReport
            data={matchData}
            relType={relType}
            onReset={() => setMatchData(null)}
          />
        )}

        {/* ── 輸入表單 ──────────────────────────────────────── */}
        {!matchData && (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 關係類型 */}
            <div className="fortune-card p-6">
              <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">你們的關係</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {REL_TYPES.map(rt => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setRelType(rt.value)}
                    className="rounded-2xl border p-3 text-center transition-all"
                    style={{
                      borderColor: relType === rt.value ? 'rgba(109,74,255,0.6)' : 'rgba(255,255,255,0.08)',
                      background: relType === rt.value ? 'rgba(109,74,255,0.15)' : 'transparent',
                    }}
                  >
                    <div className="text-2xl">{rt.emoji}</div>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--text-main)]">{rt.label}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">{rt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 甲方乙方 */}
            {(['A', 'B'] as const).map(side => {
              const person = side === 'A' ? personA : personB;
              const setPerson = side === 'A' ? setPersonA : setPersonB;
              const label = side === 'A' ? '甲方 · 我' : '乙方 · 他 / 她';
              const accent = side === 'A' ? 'var(--sky-violet)' : 'var(--earth-gold)';

              return (
                <div key={side} className="fortune-card overflow-hidden">
                  <div
                    className="h-1 w-full"
                    style={{ background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)` }}
                  />
                  <div className="p-6">
                    <p className="mb-5 text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>
                      {label}
                    </p>
                    <div className="space-y-4">
                      {/* 姓名 */}
                      <div>
                        <label className="mb-1.5 block text-xs tracking-widest text-[color:var(--text-muted)]">姓名</label>
                        <input
                          type="text"
                          value={person.name}
                          onChange={e => setPerson(p => ({ ...p, name: e.target.value }))}
                          placeholder={side === 'A' ? '輸入你的名字' : '輸入對方名字'}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[color:var(--text-main)] placeholder-[color:var(--text-muted)] outline-none focus:border-violet-400/40"
                          required
                          minLength={2}
                          maxLength={20}
                        />
                      </div>

                      {/* 生日 */}
                      <div>
                        <label className="mb-1.5 block text-xs tracking-widest text-[color:var(--text-muted)]">出生日期</label>
                        <input
                          type="date"
                          value={person.birthDate}
                          onChange={e => setPerson(p => ({ ...p, birthDate: e.target.value }))}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[color:var(--text-main)] outline-none focus:border-violet-400/40"
                          required
                        />
                      </div>

                      {/* 血型 + 性別 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs tracking-widest text-[color:var(--text-muted)]">血型</label>
                          <div className="flex gap-2">
                            {BLOOD_TYPES.map(bt => (
                              <button
                                key={bt}
                                type="button"
                                onClick={() => setPerson(p => ({ ...p, bloodType: bt }))}
                                className="flex-1 rounded-xl border py-2 text-xs font-bold transition-all"
                                style={{
                                  borderColor: person.bloodType === bt ? `${accent}80` : 'rgba(255,255,255,0.1)',
                                  background: person.bloodType === bt ? `${accent}18` : 'transparent',
                                  color: person.bloodType === bt ? 'var(--text-main)' : 'var(--text-muted)',
                                }}
                              >
                                {bt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs tracking-widest text-[color:var(--text-muted)]">性別</label>
                          <div className="flex gap-2">
                            {[{v:'female',l:'女'},{v:'male',l:'男'}].map(g => (
                              <button
                                key={g.v}
                                type="button"
                                onClick={() => setPerson(p => ({ ...p, gender: g.v as 'male'|'female' }))}
                                className="flex-1 rounded-xl border py-2 text-xs font-bold transition-all"
                                style={{
                                  borderColor: person.gender === g.v ? `${accent}80` : 'rgba(255,255,255,0.1)',
                                  background: person.gender === g.v ? `${accent}18` : 'transparent',
                                  color: person.gender === g.v ? 'var(--text-main)' : 'var(--text-muted)',
                                }}
                              >
                                {g.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {error && (
              <p className="rounded-2xl border border-red-400/20 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="vip-gold-btn w-full py-5 text-base disabled:opacity-50"
            >
              {loading ? '天地人大數據配對計算中⋯' : '✦ 開始配對分析'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

// ─── 結果報告組件 ─────────────────────────────────────────────────────────────

function MatchReport({ data, relType, onReset }: { data: MatchResponse; relType: RelType; onReset: () => void }) {
  const { result, profileA, profileB } = data;
  const relEmoji = REL_TYPES.find(r => r.value === relType)?.emoji ?? '💕';
  const relLabel = REL_TYPES.find(r => r.value === relType)?.label ?? '關係';

  // 評分圓弧參數
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const arcLen = (result.totalScore / 100) * circ;

  return (
    <div className="mb-8 space-y-5">

      {/* ── 主配對卡 ──────────────────────────────────────── */}
      <div className="fortune-card overflow-hidden">
        {/* 雙色頂線 */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, var(--sky-violet), ${result.gradeColor}, var(--earth-gold))` }}
        />
        <div className="p-6 sm:p-8">

          {/* 兩人名字 */}
          <div className="mb-6 flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="mb-1 inline-block rounded-full border border-violet-400/30 bg-violet-950/20 px-3 py-1 text-xs text-violet-300">
                甲方
              </div>
              <p className="font-serif text-lg text-[color:var(--text-main)]">{profileA.name}</p>
              <p className="text-xs text-[color:var(--text-muted)]">{profileA.zodiacZh} · {profileA.chineseZodiac} · {profileA.wuxing}</p>
            </div>
            <div className="text-2xl">{relEmoji}</div>
            <div className="text-center">
              <div className="mb-1 inline-block rounded-full border border-amber-400/30 bg-amber-950/20 px-3 py-1 text-xs text-amber-300">
                乙方
              </div>
              <p className="font-serif text-lg text-[color:var(--text-main)]">{profileB.name}</p>
              <p className="text-xs text-[color:var(--text-muted)]">{profileB.zodiacZh} · {profileB.chineseZodiac} · {profileB.wuxing}</p>
            </div>
          </div>

          {/* 評分圓環 */}
          <div className="flex flex-col items-center">
            <svg width="140" height="140" className="mb-3 -rotate-90">
              <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.06)" />
              <circle
                cx="70" cy="70" r={radius}
                fill="none" strokeWidth="10"
                stroke={result.gradeColor}
                strokeLinecap="round"
                strokeDasharray={`${arcLen} ${circ}`}
                style={{ filter: `drop-shadow(0 0 8px ${result.gradeColor}80)`, transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="-mt-[108px] mb-12 text-center">
              <p className="text-4xl font-bold" style={{ color: result.gradeColor }}>
                {result.totalScore}
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">配對指數</p>
            </div>

            {/* 等級 */}
            <div
              className="rounded-full px-6 py-2 text-sm font-bold tracking-widest"
              style={{
                background: `${result.gradeColor}18`,
                border: `1px solid ${result.gradeColor}40`,
                color: result.gradeColor,
              }}
            >
              {result.grade}
            </div>
            <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-7 text-[color:var(--text-sub)]">
              {result.gradeDescription}
            </p>
          </div>
        </div>
      </div>

      {/* ── 六維度分析 ────────────────────────────────────── */}
      <div className="fortune-card p-6 sm:p-8">
        <p className="mb-5 text-xs uppercase tracking-[0.4em] text-[color:var(--text-muted)]">六維度配對分析</p>
        <div className="space-y-4">
          {result.dimensions.map(dim => (
            <div key={dim.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[color:var(--text-sub)]">
                  <span>{dim.emoji}</span>
                  <span className="tracking-wider">{dim.label}</span>
                </span>
                <span
                  className="font-semibold"
                  style={{
                    color: dim.score >= 75 ? 'var(--fortune-good)' :
                           dim.score >= 50 ? 'var(--human-cyan)' : 'var(--fortune-warning)',
                  }}
                >
                  {dim.score >= 85 ? '極佳' : dim.score >= 70 ? '良好' : dim.score >= 50 ? '普通' : '需加強'}
                </span>
              </div>
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${dim.score}%`,
                    background: dim.score >= 75
                      ? 'linear-gradient(90deg, var(--fortune-good), #7bffb2)'
                      : dim.score >= 50
                      ? 'linear-gradient(90deg, var(--human-cyan), #8bf5ff)'
                      : 'linear-gradient(90deg, var(--fortune-warning), #ff8fa3)',
                  }}
                />
              </div>
              <p className="text-xs text-[color:var(--text-muted)]">{dim.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 強項 & 摩擦 ───────────────────────────────────── */}
      {(result.strengthPoints.length > 0 || result.frictionPoints.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {result.strengthPoints.length > 0 && (
            <div className="fortune-card p-5">
              <p className="mb-4 text-xs uppercase tracking-[0.35em] text-emerald-400/70">✦ 你們的天賦強項</p>
              <ul className="space-y-2">
                {result.strengthPoints.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-7 text-[color:var(--text-sub)]">
                    <span className="mt-1 shrink-0 text-emerald-400">◆</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.frictionPoints.length > 0 && (
            <div className="fortune-card p-5">
              <p className="mb-4 text-xs uppercase tracking-[0.35em] text-rose-400/70">⚡ 可能的摩擦警示</p>
              <ul className="space-y-2">
                {result.frictionPoints.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-7 text-[color:var(--text-sub)]">
                    <span className="mt-1 shrink-0 text-rose-400">◆</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── AI 相處智慧 ────────────────────────────────────── */}
      <div className="sky-card fortune-card p-6 sm:p-8">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-violet-300/70">
          {relEmoji} {relLabel}相處智慧 · AI 命理洞見
        </p>
        <p className="font-serif text-sm leading-9 text-[color:var(--text-main)]">
          {result.wisdomNote}
        </p>
      </div>

      {/* ── 善念結語 ──────────────────────────────────────── */}
      <div className="vip-gold-card rounded-[24px] p-6 sm:p-8">
        <p className="mb-2 text-xs uppercase tracking-[0.4em] text-amber-300/70">天地善念</p>
        <p className="font-serif text-sm leading-8 text-[color:var(--text-main)]">
          人與人之間最美的距離，不是零距離，而是剛好可以看見彼此的美好。
          懂得禮讓，懂得欣賞，這才是關係最高的智慧。
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => window.print()} className="vip-gold-btn flex-1 py-4 text-sm">
            匯出配對報告
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
          >
            重新配對
          </button>
        </div>
      </div>
    </div>
  );
}
