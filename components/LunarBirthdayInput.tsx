'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface LunarBirthdayInputProps {
  value: string;
  onChange: (solarDate: string) => void;
  disabled?: boolean;
  accent?: 'violet' | 'amber' | 'pink' | 'cyan';
  label?: string;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function resolveRocDate(rocYear: number, month: number, day: number) {
  const year = rocYear + 1911;
  if (rocYear <= 0 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export default function LunarBirthdayInput({
  value,
  onChange,
  disabled = false,
  accent = 'violet',
  label = '國曆生日（民國年）',
}: LunarBirthdayInputProps) {
  const [rocYear, setRocYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [message, setMessage] = useState('');
  const lastEmittedRef = useRef('');

  const todayHint = useMemo(() => {
    const today = new Date();
    return {
      rocYear: String(today.getFullYear() - 1911),
      month: pad2(today.getMonth() + 1),
      day: pad2(today.getDate()),
    };
  }, []);

  const accentClass = useMemo(() => {
    if (accent === 'amber') return 'text-amber-300 border-amber-400/20 bg-amber-950/20';
    if (accent === 'pink') return 'text-pink-300 border-pink-400/20 bg-pink-950/20';
    if (accent === 'cyan') return 'text-cyan-300 border-cyan-400/20 bg-cyan-950/20';
    return 'text-violet-300 border-violet-400/20 bg-violet-950/20';
  }, [accent]);

  useEffect(() => {
    if (!value) return;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return;

    setRocYear(String(Number(match[1]) - 1911));
    setMonth(String(Number(match[2])));
    setDay(String(Number(match[3])));
    setMessage(`已換算成西元：${value}`);
  }, [value]);

  useEffect(() => {
    if (!rocYear || !month || !day) {
      if (lastEmittedRef.current !== '') {
        onChange('');
        lastEmittedRef.current = '';
      }
      setMessage('請完整輸入民國年、月、日。');
      return;
    }

    const resolved = resolveRocDate(Number(rocYear), Number(month), Number(day));

    if (!resolved) {
      if (lastEmittedRef.current !== '') {
        onChange('');
        lastEmittedRef.current = '';
      }
      setMessage('這個國曆日期不存在，請檢查民國年、月、日。');
      return;
    }

    if (lastEmittedRef.current !== resolved) {
      onChange(resolved);
      lastEmittedRef.current = resolved;
    }
    setMessage(`已換算成西元：${resolved}`);
  }, [rocYear, month, day]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-[color:var(--text-sub)]">{label}</p>

      <div className="grid grid-cols-3 gap-3">
        <input
          inputMode="numeric"
          type="number"
          min={1}
          aria-label="民國年"
          placeholder={todayHint.rocYear}
          value={rocYear}
          disabled={disabled}
          onChange={(event) => setRocYear(event.target.value)}
          className="form-input"
        />
        <input
          inputMode="numeric"
          type="number"
          min={1}
          max={12}
          aria-label="月份"
          placeholder={todayHint.month}
          value={month}
          disabled={disabled}
          onChange={(event) => setMonth(event.target.value)}
          className="form-input"
        />
        <input
          inputMode="numeric"
          type="number"
          min={1}
          max={31}
          aria-label="日期"
          placeholder={todayHint.day}
          value={day}
          disabled={disabled}
          onChange={(event) => setDay(event.target.value)}
          className="form-input"
        />
      </div>

      <div className={`rounded-2xl border p-3 text-sm ${accentClass}`}>
        {message || '輸入民國年、月、日後會自動換算成西元。'}
      </div>
    </div>
  );
}

