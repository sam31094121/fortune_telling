'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeCalendarInput, solarToLunarParts } from '@/lib/lunar-calendar';

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

function onlyDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 4);
}

function formatLunarDate(lunar: { rocYear: number; month: number; day: number; isLeapMonth?: boolean }) {
  return `農曆 ${lunar.rocYear} 年${lunar.isLeapMonth ? '閏' : ''}${lunar.month} 月 ${lunar.day} 日`;
}

export default function LunarBirthdayInput({
  value,
  onChange,
  disabled = false,
  accent = 'violet',
  label = '請輸入生日資料',
}: LunarBirthdayInputProps) {
  const [mode, setMode] = useState<'solar' | 'lunar'>('solar');
  const [rocYear, setRocYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [isLeapMonth, setIsLeapMonth] = useState(false);
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
    if (accent === 'amber') return 'text-amber-200 border-amber-300/25 bg-amber-300/10';
    if (accent === 'pink') return 'text-pink-200 border-pink-300/25 bg-pink-300/10';
    if (accent === 'cyan') return 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10';
    return 'text-violet-200 border-violet-300/25 bg-violet-300/10';
  }, [accent]);

  const hasCompleteDate = rocYear !== '' && month !== '' && day !== '';
  const normalizedCalendar = useMemo(() => {
    if (!hasCompleteDate) return null;
    return normalizeCalendarInput(mode, {
      rocYear: Number(rocYear),
      month: Number(month),
      day: Number(day),
      isLeapMonth,
    });
  }, [day, hasCompleteDate, isLeapMonth, mode, month, rocYear]);

  const statusMessage = useMemo(() => {
    if (!hasCompleteDate) return '請輸入民國年、月、日，完成後系統會自動換算。';
    if (!normalizedCalendar) return '日期格式還沒通過，請確認年月日是否正確。';
    return `已確認：國曆 ${normalizedCalendar.solarDate}，${formatLunarDate(normalizedCalendar.lunar)}`;
  }, [hasCompleteDate, normalizedCalendar]);

  const handleNumberInput = (setter: (next: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(onlyDigits(event.target.value));
  };

  function handleModeChange(newMode: 'solar' | 'lunar') {
    setMode(newMode);
    setRocYear('');
    setMonth('');
    setDay('');
    setIsLeapMonth(false);
    onChange('');
    lastEmittedRef.current = '';
  }

  useEffect(() => {
    if (!value || value === lastEmittedRef.current) return;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return;

    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);

    if (mode === 'solar') {
      setRocYear(String(y - 1911));
      setMonth(String(m));
      setDay(String(d));
      return;
    }

    const lunar = solarToLunarParts(value);
    if (lunar) {
      setRocYear(String(lunar.rocYear));
      setMonth(String(lunar.month));
      setDay(String(lunar.day));
      setIsLeapMonth(Boolean(lunar.isLeapMonth));
    }
  }, [value, mode]);

  useEffect(() => {
    if (!normalizedCalendar) {
      if (lastEmittedRef.current !== '') {
        onChange('');
        lastEmittedRef.current = '';
      }
      return;
    }

    if (lastEmittedRef.current !== normalizedCalendar.solarDate) {
      onChange(normalizedCalendar.solarDate);
      lastEmittedRef.current = normalizedCalendar.solarDate;
    }
  }, [normalizedCalendar, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-cyan-200">生日校準</p>
          <p className="text-sm font-semibold text-[color:var(--text-sub)]">{label}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${accentClass}`}>
          {mode === 'solar' ? '國曆' : '農曆'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/55 p-1 text-sm">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleModeChange('solar')}
          className={`rounded-lg px-3 py-2.5 font-semibold transition-all ${mode === 'solar' ? 'border border-cyan-300/30 bg-cyan-400/15 text-cyan-100' : 'text-[color:var(--text-muted)] hover:text-white'}`}
        >
          國曆生日
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleModeChange('lunar')}
          className={`rounded-lg px-3 py-2.5 font-semibold transition-all ${mode === 'lunar' ? 'border border-violet-300/30 bg-violet-400/15 text-violet-100' : 'text-[color:var(--text-muted)] hover:text-white'}`}
        >
          農曆生日
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="relative block">
          <input inputMode="numeric" type="text" aria-label="民國年" placeholder={todayHint.rocYear} value={rocYear} disabled={disabled} onChange={handleNumberInput(setRocYear)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">年</span>
        </label>
        <label className="relative block">
          <input inputMode="numeric" type="text" aria-label="月份" placeholder={todayHint.month} value={month} disabled={disabled} onChange={handleNumberInput(setMonth)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">月</span>
        </label>
        <label className="relative block">
          <input inputMode="numeric" type="text" aria-label="日期" placeholder={todayHint.day} value={day} disabled={disabled} onChange={handleNumberInput(setDay)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">日</span>
        </label>
      </div>

      {mode === 'lunar' && (
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[color:var(--text-sub)]">
          <input type="checkbox" checked={isLeapMonth} disabled={disabled} onChange={(event) => setIsLeapMonth(event.target.checked)} className="h-4 w-4 accent-violet-300" />
          這一天是閏月
        </label>
      )}

      <p className={`rounded-xl border px-3 py-2 text-xs leading-5 ${normalizedCalendar ? accentClass : 'border-white/10 bg-white/[0.04] text-[color:var(--text-muted)]'}`}>
        {statusMessage}
      </p>
    </div>
  );
}