'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface GuidedDateInputProps {
  value: string;
  onChange: (date: string) => void;
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

function normalizeGregorian(year: string, month: string, day: string) {
  if (!year || !month || !day) return null;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export default function GuidedDateInput({
  value,
  onChange,
  disabled = false,
  accent = 'violet',
  label = '請輸入出生年月日',
}: GuidedDateInputProps) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const lastEmittedRef = useRef('');

  const todayHint = useMemo(() => {
    const today = new Date();
    return { year: String(today.getFullYear()), month: pad2(today.getMonth() + 1), day: pad2(today.getDate()) };
  }, []);

  const accentClass = useMemo(() => {
    if (accent === 'amber') return 'text-amber-200 border-amber-300/25 bg-amber-300/10';
    if (accent === 'pink') return 'text-pink-200 border-pink-300/25 bg-pink-300/10';
    if (accent === 'cyan') return 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10';
    if (accent === 'fuchsia') return 'text-fuchsia-200 border-fuchsia-300/25 bg-fuchsia-300/10';
    return 'text-violet-200 border-violet-300/25 bg-violet-300/10';
  }, [accent]);

  const normalized = useMemo(() => normalizeGregorian(year, month, day), [year, month, day]);
  const hasAllFields = year !== '' && month !== '' && day !== '';

  const statusMessage = !hasAllFields
    ? '請依序填寫年、月、日，例如 1992 / 08 / 18。'
    : normalized
      ? `已確認出生日期：西元 ${normalized.replace(/-/g, ' / ')}`
      : '日期不存在，請確認年、月、日是否正確。';

  const handleNumberInput = (setter: (next: string) => void, maxLength: number) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(onlyDigits(event.target.value, maxLength));
  };

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    if (!value) {
      setYear('');
      setMonth('');
      setDay('');
      lastEmittedRef.current = '';
      return;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return;
    setYear(match[1]);
    setMonth(String(Number(match[2])));
    setDay(String(Number(match[3])));
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

      <div className="grid grid-cols-3 gap-3">
        <label className="relative block">
          <input inputMode="numeric" type="text" aria-label="西元年" placeholder={todayHint.year} value={year} disabled={disabled} onChange={handleNumberInput(setYear, 4)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">年</span>
        </label>
        <label className="relative block">
          <input inputMode="numeric" type="text" aria-label="月份" placeholder={todayHint.month} value={month} disabled={disabled} onChange={handleNumberInput(setMonth, 2)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">月</span>
        </label>
        <label className="relative block">
          <input inputMode="numeric" type="text" aria-label="日期" placeholder={todayHint.day} value={day} disabled={disabled} onChange={handleNumberInput(setDay, 2)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">日</span>
        </label>
      </div>

      <p className={`rounded-xl border px-3 py-2 text-xs leading-5 ${normalized ? accentClass : 'border-white/10 bg-white/[0.04] text-[color:var(--text-muted)]'}`}>
        {statusMessage}
      </p>
    </div>
  );
}
