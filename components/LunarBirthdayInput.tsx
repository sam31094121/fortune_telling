'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { lunarToSolar, solarToLunarParts } from '@/lib/lunar-calendar';

interface LunarBirthdayInputProps {
  value: string;
  onChange: (solarDate: string) => void;
  disabled?: boolean;
  accent?: 'violet' | 'amber' | 'pink' | 'cyan';
  label?: string;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const DAY_OPTIONS = Array.from({ length: 30 }, (_, index) => index + 1);

export default function LunarBirthdayInput({
  value,
  onChange,
  disabled = false,
  accent = 'violet',
  label = '請輸入農曆生日（民國年）',
}: LunarBirthdayInputProps) {
  const [rocYear, setRocYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [message, setMessage] = useState('');
  const lastEmittedRef = useRef('');

  const accentClass = useMemo(() => {
    if (accent === 'amber') return 'text-amber-300 border-amber-400/20 bg-amber-950/20';
    if (accent === 'pink') return 'text-pink-300 border-pink-400/20 bg-pink-950/20';
    if (accent === 'cyan') return 'text-cyan-300 border-cyan-400/20 bg-cyan-950/20';
    return 'text-violet-300 border-violet-400/20 bg-violet-950/20';
  }, [accent]);

  useEffect(() => {
    if (!value) {
      setMessage('');
      return;
    }

    const lunar = solarToLunarParts(value);
    if (!lunar) return;

    setRocYear(String(lunar.rocYear));
    setMonth(String(lunar.month));
    setDay(String(lunar.day));
    setIsLeapMonth(Boolean(lunar.isLeapMonth));
    setMessage(`系統已換算國曆：${value}`);
  }, [value]);

  useEffect(() => {
    if (!rocYear || !month || !day) {
      if (lastEmittedRef.current !== '') {
        onChange('');
        lastEmittedRef.current = '';
      }
      setMessage('請先完整選好農曆年月日。');
      return;
    }

    const resolved = lunarToSolar({
      rocYear: Number(rocYear),
      month: Number(month),
      day: Number(day),
      isLeapMonth,
    });

    if (!resolved) {
      if (lastEmittedRef.current !== '') {
        onChange('');
        lastEmittedRef.current = '';
      }
      setMessage('這個農曆日期目前換算不到，請檢查是否輸入正確。');
      return;
    }

    if (lastEmittedRef.current !== resolved.solarDate) {
      onChange(resolved.solarDate);
      lastEmittedRef.current = resolved.solarDate;
    }
    setMessage(`系統已換算國曆：${resolved.solarDate}`);
  }, [rocYear, month, day, isLeapMonth]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-[color:var(--text-sub)]">{label}</p>

      <div className="grid grid-cols-3 gap-3">
        <input
          inputMode="numeric"
          type="number"
          min={1}
          placeholder="民國年，例如 63"
          value={rocYear}
          disabled={disabled}
          onChange={(event) => setRocYear(event.target.value)}
          className="form-input"
        />
        <select
          value={month}
          disabled={disabled}
          onChange={(event) => setMonth(event.target.value)}
          className="form-select"
        >
          <option value="">月份</option>
          {MONTH_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item} 月
            </option>
          ))}
        </select>
        <select
          value={day}
          disabled={disabled}
          onChange={(event) => setDay(event.target.value)}
          className="form-select"
        >
          <option value="">日期</option>
          {DAY_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item} 日
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-[color:var(--text-sub)]">
        <input
          type="checkbox"
          checked={isLeapMonth}
          disabled={disabled}
          onChange={(event) => setIsLeapMonth(event.target.checked)}
        />
        這一天是農曆閏月
      </label>

      <div className={`rounded-2xl border p-3 text-sm ${accentClass}`}>
        {message || '請輸入農曆生日，系統會自動換算成國曆。'}
      </div>
    </div>
  );
}

