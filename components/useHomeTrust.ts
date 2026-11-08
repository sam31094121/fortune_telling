'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HOME_TRUST_EPOCH, isHomeTrustSnapshot, type HomeTrustKind, type HomeTrustSnapshot } from '@/lib/home-trust-contract';
const UPDATE_EVENT = 'home-trust-v2-confirmed';
export function newHomeTrustEventId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function useHomeTrust() {
  const [counts, setCounts] = useState<HomeTrustSnapshot | null>(null);
  const [message, setMessage] = useState('');
  const accept = useCallback((value: unknown) => {
    if (!isHomeTrustSnapshot(value)) return;
    setCounts(previous => !previous || value.revision >= previous.revision ? value : previous);
  }, []);
  const read = useCallback(async () => {
    try {
      const response = await fetch('/api/home-trust', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      if (!response.ok || !data.ok || !isHomeTrustSnapshot(data)) throw new Error('unavailable');
      accept(data); setMessage('');
    } catch { setMessage('暫時無法取得，請稍後重試。'); }
  }, [accept]);
  useEffect(() => {
    void read();
    const updated = (event: Event) => accept((event as CustomEvent).detail);
    const visible = () => { if (!document.hidden) void read(); };
    const timer = window.setInterval(visible, 30000);
    window.addEventListener(UPDATE_EVENT, updated);
    window.addEventListener('online', visible);
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); window.removeEventListener(UPDATE_EVENT, updated); window.removeEventListener('online', visible); document.removeEventListener('visibilitychange', visible); };
  }, [accept, read]);
  const submit = useCallback(async (kind: HomeTrustKind, eventId: string) => {
    try {
      const response = await fetch(`/api/home-trust/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ epoch: HOME_TRUST_EPOCH, eventId }), signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      if (!response.ok || !data.ok || !isHomeTrustSnapshot(data)) throw new Error(data.message || '暫時無法取得，請稍後重試。');
      accept(data); setMessage(''); window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: data }));
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : '暫時無法取得，請稍後重試。'); return false; }
  }, [accept]);
  return { counts, message, submit };
}
export function useHomeVote() {
  const state = useHomeTrust();
  const pending = useRef<Partial<Record<'agree' | 'disagree', string>>>({});
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const vote = async (kind: 'agree' | 'disagree') => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const id = pending.current[kind] ??= newHomeTrustEventId();
      if (await state.submit(kind, id)) delete pending.current[kind];
    } finally { lock.current = false; setBusy(false); }
  };
  return { ...state, busy, vote };
}
