'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface GuidedTimeInputProps {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  accent?: 'violet' | 'amber' | 'pink' | 'cyan' | 'fuchsia';
  label?: string;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function normalizeTime(hour: string, minute: string) {
  if (!hour || !minute) return null;
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${pad2(h)}:${pad2(m)}`;
}

export default function GuidedTimeInput({
  value,
  onChange,
  disabled = false,
  accent = 'violet',
  label = '請輸入出生時間',
}: GuidedTimeInputProps) {
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const lastEmittedRef = useRef('');

  const accentClass = useMemo(() => {
    if (accent === 'amber') return 'text-amber-200 border-amber-300/25 bg-amber-300/10';
    if (accent === 'pink') return 'text-pink-200 border-pink-300/25 bg-pink-300/10';
    if (accent === 'cyan') return 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10';
    if (accent === 'fuchsia') return 'text-fuchsia-200 border-fuchsia-300/25 bg-fuchsia-300/10';
    return 'text-violet-200 border-violet-300/25 bg-violet-300/10';
  }, [accent]);

  const normalized = useMemo(() => normalizeTime(hour, minute), [hour, minute]);
  const hasAllFields = hour !== '' && minute !== '';

  const statusMessage = !hasAllFields
    ? '請依序填寫時、分，例如 08 / 30（24 小時制）。'
    : normalized
      ? `已確認出生時間：${normalized}`
      : '時間不存在，請確認時（0–23）與分（0–59）是否正確。';

  const handleNumberInput = (setter: (next: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(onlyDigits(event.target.value, 2));
  };

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    if (!value) {
      setHour('');
      setMinute('');
      lastEmittedRef.current = '';
      return;
    }
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return;
    setHour(String(Number(match[1])));
    setMinute(String(Number(match[2])));
  }, [value]);

  useEffect(() => {
    if (!normalized) {
      if (lastEmittedRef.current !== '') {
        onChange('');
        lastEmittedRef.current = '';
      }
      return;
    }
    if (lastEmittedRef.current !== normalized) {
      onChange(normalized);
      lastEmittedRef.current = normalized;
    }
  }, [normalized, onChange]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[color:var(--text-sub)]">{label}</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="relative block">
          <input inputMode="numeric" type="text" aria-label="小時" placeholder="08" value={hour} disabled={disabled} onChange={handleNumberInput(setHour)} className="form-input glass-input glass-input-cyan w-full pr-9 disabled:opacity-40" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">時</span>
        </label>
        <label className="relative block">
          <input inputMode="numeric" type="text" aria-label="分鐘" placeholder="30" value={minute} disabled={disabled} onChange={handleNumberInput(setMinute)} className="form-input glass-input glass-input-cyan w-full pr-9 disabled:opacity-40" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">分</span>
        </label>
      </div>

      <p className={`rounded-xl border px-3 py-2 text-xs leading-5 ${normalized ? accentClass : 'border-white/10 bg-white/[0.04] text-[color:var(--text-muted)]'}`}>
        {statusMessage}
      </p>
    </div>
  );
}
