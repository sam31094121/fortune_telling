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

// 農曆中文數字映射
const LUNAR_MONTH_NAMES = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const LUNAR_DAY_NAMES = [
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatLunarDate(lunar: { rocYear: number; month: number; day: number; isLeapMonth?: boolean }) {
  const lunarMonthName = LUNAR_MONTH_NAMES[lunar.month] || `${lunar.month}`;
  const lunarDayName = LUNAR_DAY_NAMES[lunar.day] || `${lunar.day}日`;
  return `民國 ${lunar.rocYear} 年 ${lunar.isLeapMonth ? '閏' : ''}${lunarMonthName}月 ${lunarDayName}`;
}

export default function LunarBirthdayInput({
  value,
  onChange,
  disabled = false,
  accent = 'violet',
  label = '生日資訊（自動雙向推算）',
}: LunarBirthdayInputProps) {
  const [mode, setMode] = useState<'solar' | 'lunar'>('solar'); // 'solar' = 國曆模式, 'lunar' = 農曆模式
  const [rocYear, setRocYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [isLeapMonth, setIsLeapMonth] = useState(false);
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
    if (!hasCompleteDate) return '輸入年月日後，系統會自動完成國曆、農曆與萬年曆對照。';
    if (!normalizedCalendar) {
      return mode === 'solar'
        ? '此國曆日期不存在，請檢查民國年、月、日。'
        : '此農曆日期不存在，請檢查農曆民國年、月、日與閏月。';
    }
    return '萬年曆已推算完成。';
  }, [hasCompleteDate, mode, normalizedCalendar]);

  const handleNumberInput = (setter: (next: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(onlyDigits(event.target.value));
  };

  // 切換模式時，清空當前輸入
  const handleModeChange = (newMode: 'solar' | 'lunar') => {
    setMode(newMode);
    setRocYear('');
    setMonth('');
    setDay('');
    setIsLeapMonth(false);
    setMessage('');
    onChange('');
    lastEmittedRef.current = '';
  };

  // 當外部 value 發生改變時（例如點擊 Demo 數據），自動回寫到輸入框
  useEffect(() => {
    if (!value) return;
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
    } else {
      // 若是農曆模式，將傳進來的國曆西元生日轉為農曆回填
      const lunar = solarToLunarParts(value);
      if (lunar) {
        setRocYear(String(lunar.rocYear));
        setMonth(String(lunar.month));
        setDay(String(lunar.day));
        setIsLeapMonth(!!lunar.isLeapMonth);
      }
    }
  }, [value, mode]);

  // 主要的轉換與推算 Effect：所有頁面只送出標準西元生日。
  useEffect(() => {
    setMessage(statusMessage);

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
  }, [normalizedCalendar, onChange, statusMessage]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-cyan-200">推算萬年曆</p>
            <p className="text-sm font-semibold text-[color:var(--text-sub)]">{label}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
            自動對照
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/55 p-1 text-sm">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleModeChange('solar')}
            className={`rounded-lg px-3 py-2.5 font-semibold transition-all ${
              mode === 'solar'
                ? 'border border-cyan-300/30 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                : 'text-[color:var(--text-muted)] hover:text-white'
            }`}
          >
            國曆推算
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleModeChange('lunar')}
            className={`rounded-lg px-3 py-2.5 font-semibold transition-all ${
              mode === 'lunar'
                ? 'border border-violet-300/30 bg-violet-400/15 text-violet-100 shadow-[0_0_18px_rgba(167,139,250,0.12)]'
                : 'text-[color:var(--text-muted)] hover:text-white'
            }`}
          >
            農曆推算
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="relative">
          <input
            inputMode="numeric"
            type="text"
            aria-label="民國年"
            placeholder={todayHint.rocYear}
            value={rocYear}
            disabled={disabled}
            onChange={handleNumberInput(setRocYear)}
            className={`w-full form-input glass-input ${['cyan', 'violet'].includes(accent) ? 'glass-input-cyan' : ''}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)] pointer-events-none">年</span>
        </div>
        
        <div className="relative">
          <input
            inputMode="numeric"
            type="text"
            aria-label="月份"
            placeholder={todayHint.month}
            value={month}
            disabled={disabled}
            onChange={handleNumberInput(setMonth)}
            className={`w-full form-input glass-input ${['cyan', 'violet'].includes(accent) ? 'glass-input-cyan' : ''}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)] pointer-events-none">月</span>
        </div>

        <div className="relative">
          <input
            inputMode="numeric"
            type="text"
            aria-label="日期"
            placeholder={todayHint.day}
            value={day}
            disabled={disabled}
            onChange={handleNumberInput(setDay)}
            className={`w-full form-input glass-input ${['cyan', 'violet'].includes(accent) ? 'glass-input-cyan' : ''}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)] pointer-events-none">日</span>
        </div>
      </div>

      {/* 農曆閏月勾選 */}
      {mode === 'lunar' && (
        <div className="flex items-center gap-2 px-1 text-xs">
          <input
            type="checkbox"
            id="leapMonth"
            checked={isLeapMonth}
            disabled={disabled}
            onChange={(e) => setIsLeapMonth(e.target.checked)}
            className="rounded border-white/10 bg-slate-900/60 text-violet-500 focus:ring-violet-500/30 cursor-pointer"
          />
          <label htmlFor="leapMonth" className="text-violet-300 font-semibold cursor-pointer select-none">
            🌌 此月為該農曆年之「閏月」
          </label>
        </div>
      )}

      {normalizedCalendar ? (
        <div className="rounded-2xl border border-cyan-400/25 bg-slate-950/70 p-4 text-xs shadow-[0_0_18px_rgba(34,211,238,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
            <span className="font-semibold text-cyan-100">萬年曆推算完成</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
              已套用
            </span>
          </div>
          <div className="grid gap-2 leading-relaxed">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[color:var(--text-muted)]">國曆</span>
              <span className="text-right font-semibold text-white">
                民國 {normalizedCalendar.solar.rocYear} 年 {normalizedCalendar.solar.month} 月 {normalizedCalendar.solar.day} 日
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[color:var(--text-muted)]">農曆</span>
              <span className="text-right font-semibold text-amber-200">
                {formatLunarDate(normalizedCalendar.lunar)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
              <span className="text-[color:var(--text-muted)]">西元</span>
              <span className="text-right font-semibold text-cyan-100">{normalizedCalendar.solarDate}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border p-3.5 text-xs leading-6 transition-all duration-300 ${accentClass}`}>
          {message || statusMessage}
        </div>
      )}
    </div>
  );
}
