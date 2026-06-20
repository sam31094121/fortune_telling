'use client';

import { useState } from 'react';
import VisualGravityCore from '@/components/VisualGravityCore';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonInput {
  name:      string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender:    'male' | 'female';
}

interface CommunicationStyle {
  type:                 string;
  emoji:                string;
  tagline:              string;
  howTheySpeak:         string;
  whatTriggersShutdown: string;
  whatTheyNeedToHear:   string;
  pattern:              string;
}

interface ConflictScenario {
  title:       string;
  howItStarts: string;
  whatHappens: string;
  rootCause:   string;
  solution:    string;
}

interface CommunicationReport {
  personA:          CommunicationStyle;
  personB:          CommunicationStyle;
  clashType:        string;
  clashDescription: string;
  topConflicts:     ConflictScenario[];
  dailyHarmony:     string[];
}

interface MatchZones {
  resonance:   string[];
  complement:  string[];
  grinding:    string[];
  conflict:    string[];
}

interface MatchResult {
  match_score:         number;
  resonance:           number;
  communication:       number;
  stability:           number;
  conflict_risk:       number;
  summary:             string;
  zones:               MatchZones;
  communicationReport: CommunicationReport;
}

interface PersonDisplay {
  name:          string;
  zodiacZh:      string;
  chineseZodiac: string;
  wuxing:        string;
  bloodType:     string;
}

interface MatchResponse {
  result:   MatchResult;
  displayA: PersonDisplay;
  displayB: PersonDisplay;
}

// ─── 常數 ──────────────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const EMPTY: PersonInput = { name: '', birthDate: '', bloodType: 'A', gender: 'female' };

// ─── 人員表單 ──────────────────────────────────────────────────────────────────

function PersonForm({
  label,
  accent,
  value,
  onChange,
}: {
  label:    string;
  accent:   'violet' | 'amber';
  value:    PersonInput;
  onChange: (v: PersonInput) => void;
}) {
  const ring  = accent === 'violet' ? 'focus:ring-violet-500/40 border-violet-400/20' : 'focus:ring-amber-500/40 border-amber-400/20';
  const badge = accent === 'violet'
    ? 'border-violet-400/30 bg-violet-950/20 text-violet-300'
    : 'border-amber-400/30 bg-amber-950/20 text-amber-300';

  return (
    <div className="fortune-card p-5 sm:p-6">
      <p className={`mb-5 inline-block rounded-full border px-3 py-0.5 text-xs tracking-widest ${badge}`}>{label}</p>
      <div className="space-y-4">

        <div>
          <label className="mb-1.5 block text-xs tracking-widest text-[color:var(--text-muted)]">姓名</label>
          <input
            type="text"
            value={value.name}
            onChange={e => onChange({ ...value, name: e.target.value })}
            placeholder="至少 2 個字"
            className={`w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-[color:var(--text-main)] outline-none ring-0 transition focus:ring-2 ${ring}`}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs tracking-widest text-[color:var(--text-muted)]">生日</label>
          <input
            type="date"
            value={value.birthDate}
            onChange={e => onChange({ ...value, birthDate: e.target.value })}
            className={`w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-[color:var(--text-main)] outline-none ring-0 transition focus:ring-2 ${ring}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs tracking-widest text-[color:var(--text-muted)]">血型</label>
            <select
              value={value.bloodType}
              onChange={e => onChange({ ...value, bloodType: e.target.value as PersonInput['bloodType'] })}
              className={`w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-[color:var(--text-main)] outline-none ring-0 transition focus:ring-2 ${ring}`}
            >
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t} 型</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs tracking-widest text-[color:var(--text-muted)]">性別</label>
            <select
              value={value.gender}
              onChange={e => onChange({ ...value, gender: e.target.value as PersonInput['gender'] })}
              className={`w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-[color:var(--text-main)] outline-none ring-0 transition focus:ring-2 ${ring}`}
            >
              <option value="female">女</option>
              <option value="male">男</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── 主頁 ──────────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const [personA, setPersonA] = useState<PersonInput>({ ...EMPTY, gender: 'female' });
  const [personB, setPersonB] = useState<PersonInput>({ ...EMPTY, gender: 'male' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [data,    setData]    = useState<MatchResponse | null>(null);

  const canSubmit = personA.name.trim().length >= 2 && personA.birthDate &&
                    personB.name.trim().length >= 2 && personB.birthDate && !loading;

  async function handleSubmit() {
    setError('');
    setData(null);
    setLoading(true);
    try {
      const res = await fetch('/api/match-generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ personA: { ...personA, birthDate: personA.birthDate }, personB: { ...personB, birthDate: personB.birthDate } }),
      });
      const json = await res.json() as MatchResponse & { error?: string };
      if (!res.ok) { setError(json.error ?? '配對分析失敗，請稍後再試。'); return; }
      setData(json);
    } catch {
      setError('目前無法連線到分析服務，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">

        {/* ── 頂部導覽 ─────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="text-xs tracking-widest text-[color:var(--text-muted)] transition hover:text-white">
            ← 返回首頁
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/music" className="text-xs tracking-widest text-violet-300/70 transition hover:text-violet-300">
            🎵 人格
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <span className="text-xs tracking-widest text-rose-300">💕 配對</span>
        </div>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="mb-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-4 inline-block rounded-full border border-rose-400/20 bg-rose-400/8 px-4 py-1 text-xs tracking-[0.35em] text-rose-300">
              天・地・人 配對系統
            </div>
            <h1 className="mystic-title mb-4 font-serif text-4xl leading-tight sm:text-5xl">
              兩個人格矩陣<br />的相遇
            </h1>
            <p className="max-w-lg text-sm leading-8 text-[color:var(--text-sub)]">
              輸入雙方的天地人資料，系統分別生成兩份人格矩陣，再以矩陣對矩陣的方式分析共鳴、互補、磨合與衝突風險。
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <VisualGravityCore />
          </div>
        </section>

        {/* ── 輸入區 ───────────────────────────────────────── */}
        {!data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <PersonForm label="甲方" accent="violet" value={personA} onChange={setPersonA} />
              <PersonForm label="乙方" accent="amber"  value={personB} onChange={setPersonB} />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="vip-gold-btn w-full py-5 text-base disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? '天地人矩陣計算中…' : '開始配對分析'}
            </button>
          </div>
        )}

        {/* ── 結果區 ───────────────────────────────────────── */}
        {data && (
          <MatchReport
            data={data}
            onReset={() => { setData(null); setError(''); }}
          />
        )}

      </main>
    </div>
  );
}

// ─── 配對報告 ─────────────────────────────────────────────────────────────────

function MatchReport({ data, onReset }: { data: MatchResponse; onReset: () => void }) {
  const { result, displayA, displayB } = data;

  // 分數顏色
  function scoreColor(score: number, invert = false): string {
    const v = invert ? 100 - score : score;
    if (v >= 75) return '#4ade80';
    if (v >= 50) return '#60a5fa';
    return '#fb7185';
  }

  // 圓環參數
  const R    = 54;
  const circ = 2 * Math.PI * R;
  const arc  = (result.match_score / 100) * circ;
  const ringColor = scoreColor(result.match_score);

  const DIMS: { label: string; value: number; note: string; invert: boolean }[] = [
    { label: '共鳴指數', value: result.resonance,     note: '情感·社交·依附的契合程度',    invert: false },
    { label: '溝通指數', value: result.communication, note: '說話節奏與表達方式的相似度',    invert: false },
    { label: '穩定指數', value: result.stability,     note: '安全感基礎與生活節奏的穩定性', invert: false },
    { label: '衝突風險', value: result.conflict_risk, note: '越低代表衝突觸發點越少',       invert: true  },
  ];

  return (
    <div className="space-y-5">

      {/* ── 主分數卡 ──────────────────────────────────────── */}
      <div className="fortune-card overflow-hidden">
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, var(--sky-violet), ${ringColor}, var(--earth-gold))` }} />
        <div className="p-6 sm:p-8">

          {/* 兩人名字 */}
          <div className="mb-6 flex items-center justify-center gap-5">
            <div className="text-center">
              <div className="mb-1 inline-block rounded-full border border-violet-400/30 bg-violet-950/20 px-3 py-0.5 text-xs text-violet-300">甲方</div>
              <p className="font-serif text-lg text-[color:var(--text-main)]">{displayA.name}</p>
              <p className="text-xs text-[color:var(--text-muted)]">{displayA.zodiacZh} · {displayA.chineseZodiac} · {displayA.wuxing}</p>
            </div>
            <span className="text-2xl">💕</span>
            <div className="text-center">
              <div className="mb-1 inline-block rounded-full border border-amber-400/30 bg-amber-950/20 px-3 py-0.5 text-xs text-amber-300">乙方</div>
              <p className="font-serif text-lg text-[color:var(--text-main)]">{displayB.name}</p>
              <p className="text-xs text-[color:var(--text-muted)]">{displayB.zodiacZh} · {displayB.chineseZodiac} · {displayB.wuxing}</p>
            </div>
          </div>

          {/* 圓環分數 */}
          <div className="flex flex-col items-center">
            <svg width="140" height="140" className="-rotate-90">
              <circle cx="70" cy="70" r={R} fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.06)" />
              <circle
                cx="70" cy="70" r={R} fill="none" strokeWidth="10"
                stroke={ringColor} strokeLinecap="round"
                strokeDasharray={`${arc} ${circ}`}
                style={{ filter: `drop-shadow(0 0 8px ${ringColor}80)`, transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="-mt-[108px] mb-12 text-center">
              <p className="text-4xl font-bold" style={{ color: ringColor }}>{result.match_score}</p>
              <p className="text-xs tracking-widest text-[color:var(--text-muted)]">配對指數</p>
            </div>
          </div>

          {/* 摘要 */}
          <p className="mb-6 text-center font-serif text-sm leading-8 text-[color:var(--text-main)]">
            {result.summary}
          </p>

          {/* 四項指數 */}
          <div className="grid gap-3 sm:grid-cols-2">
            {DIMS.map(d => {
              const displayVal = d.invert ? 100 - d.value : d.value;
              const color = scoreColor(d.value, d.invert);
              return (
                <div key={d.label} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs tracking-widest text-[color:var(--text-muted)]">{d.label}</span>
                    <span className="text-sm font-bold" style={{ color }}>{d.invert ? d.value : d.value}</span>
                  </div>
                  <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${displayVal}%`, background: color }}
                    />
                  </div>
                  <p className="text-xs text-[color:var(--text-muted)]">{d.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 四象限分析 ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { key: 'resonance',  label: '共鳴區',   emoji: '💫', color: 'emerald', items: result.zones.resonance },
          { key: 'complement', label: '互補區',   emoji: '⚖️', color: 'violet',  items: result.zones.complement },
          { key: 'grinding',   label: '磨合區',   emoji: '🔄', color: 'amber',   items: result.zones.grinding },
          { key: 'conflict',   label: '衝突風險', emoji: '⚡', color: 'rose',    items: result.zones.conflict },
        ].map(zone => (
          <div key={zone.key} className="fortune-card p-5">
            <p className={`mb-4 text-xs uppercase tracking-[0.35em] text-${zone.color}-400/70`}>
              {zone.emoji} {zone.label}
            </p>
            <ul className="space-y-2">
              {zone.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-7 text-[color:var(--text-sub)]">
                  <span className={`mt-1 shrink-0 text-${zone.color}-400`}>◆</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── 話術溝通配對 ──────────────────────────────────── */}
      <CommunicationSection
        report={result.communicationReport}
        nameA={displayA.name}
        nameB={displayB.name}
      />

      {/* ── 底部善念卡 ────────────────────────────────────── */}
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

// ─── 話術溝通配對區塊 ─────────────────────────────────────────────────────────

function CommunicationSection({
  report, nameA, nameB,
}: {
  report: CommunicationReport;
  nameA:  string;
  nameB:  string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-4">

      {/* 衝突型態 + 雙人溝通卡 */}
      <div className="fortune-card overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-400/50 to-transparent" />
        <div className="px-6 py-7 sm:px-8">
          <p className="mb-5 text-xs uppercase tracking-[0.4em] text-rose-300/70">
            💬 話術溝通配對 · 天地人矩陣分析
          </p>
          <div className="mb-5 rounded-2xl border border-rose-400/15 bg-rose-950/10 px-5 py-4 text-center">
            <p className="text-xs tracking-widest text-rose-300/70">你們的溝通衝突型態</p>
            <p className="mt-2 font-serif text-xl text-[color:var(--text-main)]">{report.clashType}</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{report.clashDescription}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { style: report.personA, name: nameA, accent: 'var(--sky-violet)', border: 'rgba(139,92,246,0.25)', bg: 'rgba(139,92,246,0.08)' },
              { style: report.personB, name: nameB, accent: 'var(--earth-gold)', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)' },
            ] as const).map(({ style, name, accent, border, bg }) => (
              <div key={name} className="rounded-2xl p-5" style={{ border: `1px solid ${border}`, background: bg }}>
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-2xl">{style.emoji}</span>
                  <div>
                    <p className="text-xs tracking-widest" style={{ color: accent }}>{name}</p>
                    <p className="font-semibold text-[color:var(--text-main)]">{style.type}</p>
                  </div>
                </div>
                <p className="mb-3 text-xs italic text-[color:var(--text-muted)]">「{style.tagline}」</p>
                <div className="space-y-3">
                  {[
                    { label: '說話方式',   labelColor: 'text-[color:var(--text-muted)]', text: style.howTheySpeak },
                    { label: '關閉觸發點', labelColor: 'text-rose-400/70',              text: style.whatTriggersShutdown },
                    { label: '最需要聽到', labelColor: 'text-emerald-400/70',           text: style.whatTheyNeedToHear },
                  ].map(row => (
                    <div key={row.label}>
                      <p className={`mb-1 text-xs tracking-widest ${row.labelColor}`}>{row.label}</p>
                      <p className="text-xs leading-6 text-[color:var(--text-sub)]">{row.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 衝突場景 */}
      {report.topConflicts.length > 0 && (
        <div className="fortune-card px-6 py-7 sm:px-8">
          <p className="mb-5 text-xs uppercase tracking-[0.4em] text-rose-300/70">⚡ 最容易發生的衝突場景</p>
          <div className="space-y-3">
            {report.topConflicts.map((c, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/8">
                <button
                  type="button"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/4"
                >
                  <span className="shrink-0 text-lg text-rose-400">{i + 1}.</span>
                  <span className="flex-1 text-sm font-semibold text-[color:var(--text-main)]">{c.title}</span>
                  <span className="shrink-0 text-xs text-[color:var(--text-muted)]">{openIdx === i ? '▲' : '▼'}</span>
                </button>
                {openIdx === i && (
                  <div className="border-t border-white/8 bg-white/3 px-5 pb-5 pt-4 space-y-4">
                    {[
                      { label: '怎麼開始的', color: 'text-[color:var(--text-muted)]', text: c.howItStarts },
                      { label: '各自的反應', color: 'text-rose-400/70',              text: c.whatHappens },
                      { label: '根本原因',   color: 'text-amber-400/70',             text: c.rootCause },
                    ].map(row => (
                      <div key={row.label}>
                        <p className={`mb-1.5 text-xs tracking-widest ${row.color}`}>{row.label}</p>
                        <p className="text-sm leading-7 text-[color:var(--text-sub)]">{row.text}</p>
                      </div>
                    ))}
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/15 px-4 py-3">
                      <p className="mb-1 text-xs tracking-widest text-emerald-400/70">✦ 化解方式</p>
                      <p className="text-sm leading-7 text-[color:var(--text-main)]">{c.solution}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 日常和諧三招 */}
      <div className="fortune-card earth-card px-6 py-7 sm:px-8">
        <p className="mb-5 text-xs uppercase tracking-[0.4em] text-amber-300/70">✦ 日常和諧相處三招</p>
        <div className="space-y-3">
          {report.dailyHarmony.map((tip, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-amber-400/12 bg-amber-950/8 px-4 py-4">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--earth-gold)' }}
              >
                {i + 1}
              </span>
              <p className="text-sm leading-7 text-[color:var(--text-main)]">{tip}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
