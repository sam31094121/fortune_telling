'use client';

import type { ChangeEvent } from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeCalendarInput, solarToLunarParts } from '@/lib/lunar-calendar';

interface LunarBirthdayInputProps {
  value: string;
  onChange: (solarDate: string) => void;
  disabled?: boolean;
  accent?: 'violet' | 'amber' | 'pink' | 'cyan';
  label?: string;
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function formatLunarDate(lunar: { rocYear: number; month: number; day: number; isLeapMonth?: boolean }) {
  return `農曆 ${lunar.rocYear} 年 ${lunar.isLeapMonth ? '閏' : ''}${lunar.month} 月 ${lunar.day} 日`;
}

/** 長輩常直接打西元年（例如 1974）。四位數且在 1900 年以後就當西元換算，不讓他們卡在「無法辨識」。 */
function resolveYear(raw: string) {
  const typed = Number(raw);
  const fromGregorian = typed >= 1900;
  return { rocYear: fromGregorian ? typed - 1911 : typed, fromGregorian };
}

function LunarBirthdayInput({
  value,
  onChange,
  disabled = false,
  accent = 'violet',
  label = '請輸入出生日期',
}: LunarBirthdayInputProps) {
  const [mode, setMode] = useState<'solar' | 'lunar'>('solar');
  const [rocYear, setRocYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const lastEmittedRef = useRef('');

  const accentClass = useMemo(() => {
    if (accent === 'amber') return 'text-amber-200 border-amber-300/25 bg-amber-300/10';
    if (accent === 'pink') return 'text-pink-200 border-pink-300/25 bg-pink-300/10';
    if (accent === 'cyan') return 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10';
    return 'text-violet-200 border-violet-300/25 bg-violet-300/10';
  }, [accent]);

  const { rocYear: effectiveRocYear, fromGregorian } = resolveYear(rocYear);
  const currentYear = new Date().getFullYear();
  const hasCompleteDate = rocYear !== '' && month !== '' && day !== '';
  const isFutureYear = effectiveRocYear + 1911 > currentYear;
  const normalizedCalendar = useMemo(() => {
    if (!hasCompleteDate || isFutureYear) return null;
    return normalizeCalendarInput(mode, {
      rocYear: effectiveRocYear,
      month: Number(month),
      day: Number(day),
      isLeapMonth,
    });
  }, [day, effectiveRocYear, hasCompleteDate, isFutureYear, isLeapMonth, mode, month]);

  // 一次只講下一步要做什麼；錯了就講是哪一格錯，不丟一句「無法辨識」讓人自己猜。
  const statusMessage = useMemo(() => {
    if (rocYear === '') return '第一格填「年」：民國年，例如 63；直接打西元 1974 也可以。';
    if (month === '') return '第二格填「月」：1 到 12，例如 7。';
    if (day === '') return '第三格填「日」：例如 25。';
    const maxDay = mode === 'lunar' ? 30 : 31;
    if (effectiveRocYear <= 0) return '年份看起來不對：請填民國年（例如 63）或西元年（例如 1974）。';
    if (isFutureYear) return `年份超過今年了：民國 ${effectiveRocYear} 年是西元 ${effectiveRocYear + 1911} 年，請再確認一次。`;
    if (Number(month) < 1 || Number(month) > 12) return '月份只能填 1 到 12，請再確認一次。';
    if (Number(day) < 1 || Number(day) > maxDay) return `日期只能填 1 到 ${maxDay}，請再確認一次。`;
    if (!normalizedCalendar) {
      return mode === 'lunar'
        ? '這個農曆日期查不到，請確認月份、日期，或是不是閏月。'
        : `${Number(month)} 月沒有 ${Number(day)} 日，請再確認一次。`;
    }
    const yearNote = fromGregorian ? `（已把西元 ${rocYear} 年換成民國 ${effectiveRocYear} 年）` : '';
    return `已確認西元 ${normalizedCalendar.solarDate}，${formatLunarDate(normalizedCalendar.lunar)}${yearNote}`;
  }, [day, effectiveRocYear, fromGregorian, isFutureYear, mode, month, normalizedCalendar, rocYear]);

  const handleNumberInput = (setter: (next: string) => void, maxLength: number) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(onlyDigits(event.target.value, maxLength));
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
    if (!value) {
      // 外部清空（例如「重新填寫」）時欄位跟著清掉，不能畫面留著舊生日、送出卻是空的。
      // 以前靠父層用 birthDate 當 key 整個重掛來達成，代價是日期一湊齊就重掛、
      // 手機鍵盤被收掉，後面打的字全部消失。lastEmittedRef 先不動，下一輪由下面補送空值歸零。
      if (lastEmittedRef.current !== '') {
        setRocYear('');
        setMonth('');
        setDay('');
        setIsLeapMonth(false);
      }
      return;
    }
    if (value === lastEmittedRef.current) return;
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

  const statusClass = normalizedCalendar
    ? accentClass
    : hasCompleteDate
      ? 'border-rose-300/40 bg-rose-500/10 text-rose-100'
      : 'border-white/10 bg-white/[0.04] text-[color:var(--text-sub)]';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-cyan-200">生日資料</p>
          <p className="text-sm font-semibold text-[color:var(--text-sub)]">{label}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${accentClass}`}>
          {mode === 'solar' ? '國曆輸入' : '農曆輸入'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/55 p-1 text-sm">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleModeChange('solar')}
          className={`rounded-lg px-3 py-2.5 font-semibold transition-all ${mode === 'solar' ? 'border border-cyan-300/30 bg-cyan-400/15 text-cyan-100' : 'text-[color:var(--text-sub)] hover:text-white'}`}
        >
          國曆生日
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleModeChange('lunar')}
          className={`rounded-lg px-3 py-2.5 font-semibold transition-all ${mode === 'lunar' ? 'border border-violet-300/30 bg-violet-400/15 text-violet-100' : 'text-[color:var(--text-sub)] hover:text-white'}`}
        >
          農曆生日
        </button>
      </div>

      {/* placeholder 放範例，不放今天日期——長輩會以為已經幫他填好了。 */}
      <div className="grid grid-cols-3 gap-3">
        <label className="relative block">
          <input inputMode="numeric" enterKeyHint="next" type="text" aria-label="民國年" placeholder="例 63" value={rocYear} disabled={disabled} onChange={handleNumberInput(setRocYear, 4)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">年</span>
        </label>
        <label className="relative block">
          <input inputMode="numeric" enterKeyHint="next" type="text" aria-label="月份" placeholder="例 7" value={month} disabled={disabled} onChange={handleNumberInput(setMonth, 2)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">月</span>
        </label>
        <label className="relative block">
          <input inputMode="numeric" enterKeyHint="done" type="text" aria-label="日期" placeholder="例 25" value={day} disabled={disabled} onChange={handleNumberInput(setDay, 2)} className="form-input glass-input glass-input-cyan w-full pr-9" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)]">日</span>
        </label>
      </div>

      {mode === 'lunar' && (
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[color:var(--text-sub)]">
          <input type="checkbox" checked={isLeapMonth} disabled={disabled} onChange={(event) => setIsLeapMonth(event.target.checked)} className="h-4 w-4 accent-violet-300" />
          這個農曆月份是閏月
        </label>
      )}

      <p aria-live="polite" className={`rounded-xl border px-3 py-2 text-sm leading-6 ${statusClass}`}>
        {statusMessage}
      </p>
    </div>
  );
}

export default memo(LunarBirthdayInput);
