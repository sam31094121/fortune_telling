'use client';

import { useRef, useState } from 'react';
import { Lunar } from 'lunar-typescript';
import { UnifiedBirthForm, type BirthProfile } from './UnifiedBirthForm';
import { readSelfBirthProfile, saveSelfBirthProfile } from '@/lib/self-profile-client';
import { readCanonicalBirthProfile, saveCanonicalBirthProfile } from '@/lib/canonical-birth-profile-client';
import { fromUnifiedBirthProfile, toUnifiedBirthProfile } from '@/lib/canonical-birth-profile';
import { setAnalysisIdentityTarget } from '@/lib/identity-split-client';

export default function SelfStarBeastEntry({ onFound, onGo }: { onFound: (guardian: string, reason: string) => void; onGo?: () => void }) {
  const [profile, setProfile] = useState<BirthProfile>({ timeUnknown: true, calendarType: 'solar' });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [found, setFound] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function findGuardian(next: BirthProfile) {
    if (inFlight.current) return;
    if (!next.birthDate || !['male', 'female'].includes(next.gender ?? '')) {
      setEditing(true);
      return;
    }
    setBusy(true);
    inFlight.current = true;
    setMessage('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/star-beasts/guardian', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next), signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? '暫時無法取得神獸。');
      saveSelfBirthProfile(next);
      saveCanonicalBirthProfile(fromUnifiedBirthProfile(next));
      setNote(`${result.reason}${result.timeUnknown ? '・未使用時辰' : ''}`);
      setEditing(false);
      setFound(result.guardian);
      onFound(result.guardian, result.reason);
    } catch (error) {
      setMessage(controller.signal.aborted ? '連線逾時，請再試一次。' : error instanceof Error ? error.message : '暫時無法取得神獸，請再試一次。');
      setEditing(true);
    } finally { clearTimeout(timeout); inFlight.current = false; setBusy(false); }
  }

  function chooseSelf() {
    setAnalysisIdentityTarget('self');
    const canonical = readCanonicalBirthProfile();
    const saved = readSelfBirthProfile()
      ?? (canonical?.subjectType === 'SELF' ? toUnifiedBirthProfile(canonical) : null);
    const next = saved ?? { timeUnknown: true, calendarType: 'solar' as const };
    // 表單的生日元件一律接收、輸出國曆；舊農曆資料先轉換再編輯。
    let editable = { ...next, calendarType: 'solar' as const };
    if (next.calendarType === 'lunar' && next.birthDate) {
      try {
        const [year, month, day] = next.birthDate.split('-').map(Number);
        editable = { ...editable, birthDate: Lunar.fromYmd(year, month, day).getSolar().toYmd() };
      } catch { editable = { ...editable, birthDate: '' }; }
    }
    setProfile(editable);
    void findGuardian(next);
  }

  return (
    <div className="mt-5 max-w-xl">
      <p className="text-sm font-bold text-amber-100">找出我的四大神獸</p>
      <button type="button" disabled={busy} onClick={chooseSelf}
        className="mt-3 min-h-12 rounded-full border border-amber-100/55 bg-amber-300/20 px-8 text-sm font-black text-amber-50 disabled:opacity-50">
        {busy ? '正在核對…' : '我自己'}
      </button>
      {found && (
        <div role="status" aria-live="polite" data-testid="self-guardian-found" className="mt-4 rounded-2xl border border-amber-200/50 bg-gradient-to-b from-amber-300/20 to-amber-500/5 p-4 text-center shadow-[0_0_24px_rgba(252,211,77,0.25)]">
          <p className="text-xs font-bold tracking-[0.3em] text-amber-200/80">已為你找到</p>
          <p className="mt-1 font-serif text-4xl font-black tracking-[0.35em] bg-gradient-to-b from-amber-50 via-amber-200 to-amber-500 bg-clip-text text-transparent">{found}</p>
          {note && <p className="mt-2 text-sm text-amber-100/85">{note}</p>}
          <button type="button" onClick={onGo} className="mt-3 min-h-12 w-full rounded-full bg-gradient-to-r from-amber-200 to-amber-400 px-6 text-base font-black text-slate-950 shadow-lg">前往我的神獸 ↓</button>
          <p className="mt-2 text-xs text-amber-100/60">稍後會自動帶你過去</p>
        </div>
      )}
      {!found && note && <p className="mt-2 text-xs text-amber-100/70">{note}</p>}
      {editing && (
        <div className="mt-4 rounded-2xl border border-white/15 bg-slate-950/70 p-3">
          <p className="mb-3 text-sm text-slate-200">補上出生資料，就能找到神獸。</p>
          <UnifiedBirthForm value={profile} autoFillIdentity={false} onChange={(value) => setProfile({ ...value, calendarType: 'solar' })} onSubmit={findGuardian}
            fields={{ birthDate: true, gender: true, calendarType: true, birthHourBranch: true }}
            requireExplicitHourPick isSubmitting={busy} submitLabel="找出我的神獸" />
        </div>
      )}
      {message && <p role="alert" className="mt-3 text-sm text-rose-200">{message}</p>}
    </div>
  );
}
