'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { solarToLunarParts, lunarToSolar } from '@/lib/lunar-calendar';

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

// 根據國曆民國年月日換算成西元 ISO 日期字串
function resolveRocDate(rocYear: number, month: number, day: number) {
  const year = rocYear + 1911;
  if (rocYear <= 0 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

// 農曆中文數字映射
const LUNAR_MONTH_NAMES = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const LUNAR_DAY_NAMES = [
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

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

  // 主要的轉換與推算 Effect
  useEffect(() => {
    if (!rocYear || !month || !day) {
      if (lastEmittedRef.current !== '') {
        onChange('');
        lastEmittedRef.current = '';
      }
      setMessage(`請輸入完整農國曆生日資料。`);
      return;
    }

    const yNum = Number(rocYear);
    const mNum = Number(month);
    const dNum = Number(day);

    if (mode === 'solar') {
      // 國曆模式下：
      const resolvedSolar = resolveRocDate(yNum, mNum, dNum);
      if (!resolvedSolar) {
        if (lastEmittedRef.current !== '') {
          onChange('');
          lastEmittedRef.current = '';
        }
        setMessage('⚠️ 此國曆日期不存在，請檢查民國年、月、日。');
        return;
      }

      // 國曆推農曆
      const lunar = solarToLunarParts(resolvedSolar);
      if (lunar) {
        const lunarMonthName = LUNAR_MONTH_NAMES[lunar.month] || `${lunar.month}月`;
        const lunarDayName = LUNAR_DAY_NAMES[lunar.day] || `${lunar.day}日`;
        setMessage(
          `📅 國農曆自動推算：\n` +
          `• 國曆：民國 ${rocYear} 年 ${month} 月 ${day} 日 (西元 ${resolvedSolar})\n` +
          `• 農曆：民國 ${lunar.rocYear} 年 ${lunar.isLeapMonth ? '閏' : ''}${lunarMonthName}月 ${lunarDayName}`
        );
      } else {
        setMessage(`• 國曆：民國 ${rocYear} 年 ${month} 月 ${day} 日 (西元 ${resolvedSolar})`);
      }

      if (lastEmittedRef.current !== resolvedSolar) {
        onChange(resolvedSolar);
        lastEmittedRef.current = resolvedSolar;
      }
    } else {
      // 農曆模式下：
      const resolvedSolarObj = lunarToSolar({
        rocYear: yNum,
        month: mNum,
        day: dNum,
        isLeapMonth
      });

      if (!resolvedSolarObj) {
        if (lastEmittedRef.current !== '') {
          onChange('');
          lastEmittedRef.current = '';
        }
        setMessage('⚠️ 此農曆日期不存在，請檢查農曆民國年、月、日是否正確。');
        return;
      }

      const resolvedSolar = resolvedSolarObj.solarDate;
      const solarRocYear = resolvedSolarObj.gregorianYear - 1911;
      const [, solarM, solarD] = resolvedSolar.split('-').map(Number);

      const lunarMonthName = LUNAR_MONTH_NAMES[mNum] || `${mNum}月`;
      const lunarDayName = LUNAR_DAY_NAMES[dNum] || `${dNum}日`;

      // 農曆推國曆
      setMessage(
        `📅 農國曆自動推算：\n` +
        `• 農曆：民國 ${rocYear} 年 ${isLeapMonth ? '閏' : ''}${lunarMonthName}月 ${lunarDayName}\n` +
        `• 國曆：民國 ${solarRocYear} 年 ${solarM} 月 ${solarD} 日 (西元 ${resolvedSolar})`
      );

      if (lastEmittedRef.current !== resolvedSolar) {
        onChange(resolvedSolar);
        lastEmittedRef.current = resolvedSolar;
      }
    }
  }, [rocYear, month, day, isLeapMonth, mode]);

  return (
    <div className="space-y-3">
      {/* 國農曆切換 Tab */}
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-[color:var(--text-sub)]">{label}</p>
        <div className="flex rounded-lg bg-slate-900/60 p-0.5 border border-white/5 text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleModeChange('solar')}
            className={`rounded-md px-3 py-1 transition-all ${
              mode === 'solar'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-200 border border-cyan-500/20 font-bold'
                : 'text-[color:var(--text-muted)] hover:text-white'
            }`}
          >
            ☀️ 國曆輸入
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleModeChange('lunar')}
            className={`rounded-md px-3 py-1 transition-all ${
              mode === 'lunar'
                ? 'bg-gradient-to-r from-violet-500/25 to-purple-500/25 text-violet-200 border border-violet-500/20 font-bold'
                : 'text-[color:var(--text-muted)] hover:text-white'
            }`}
          >
            🌙 農曆輸入
          </button>
        </div>
      </div>

      {/* 輸入區 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="relative">
          <input
            inputMode="numeric"
            type="number"
            min={1}
            aria-label="民國年"
            placeholder={todayHint.rocYear}
            value={rocYear}
            disabled={disabled}
            onChange={(event) => setRocYear(event.target.value)}
            className={`w-full form-input glass-input ${['cyan', 'violet'].includes(accent) ? 'glass-input-cyan' : ''}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)] pointer-events-none">年</span>
        </div>
        
        <div className="relative">
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
            className={`w-full form-input glass-input ${['cyan', 'violet'].includes(accent) ? 'glass-input-cyan' : ''}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--text-muted)] pointer-events-none">月</span>
        </div>

        <div className="relative">
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

      {/* 自動推算對照發光面板 */}
      {rocYear && month && day && !message.includes('⚠️') ? (
        <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-4 text-xs space-y-2.5 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.06)] relative overflow-hidden">
          <div className="absolute top-1.5 right-2.5 text-[7px] text-cyan-400/20 font-mono tracking-widest">[CONVERT_OK]</div>
          <p className="text-[10px] font-mono text-cyan-400/90 tracking-widest font-bold border-b border-white/5 pb-1.5 uppercase">
            🧬 天宿自動雙向推算對照
          </p>
          <div className="space-y-2 leading-relaxed">
            {mode === 'solar' ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[color:var(--text-muted)] flex items-center gap-1.5 font-medium">☀️ 輸入國曆:</span>
                  <span className="text-white font-semibold">民國 {rocYear} 年 {month} 月 {day} 日</span>
                </div>
                {(() => {
                  const resolvedSolar = resolveRocDate(Number(rocYear), Number(month), Number(day));
                  if (!resolvedSolar) return null;
                  const lunar = solarToLunarParts(resolvedSolar);
                  if (!lunar) return null;
                  const lunarMonthName = LUNAR_MONTH_NAMES[lunar.month] || `${lunar.month}月`;
                  const lunarDayName = LUNAR_DAY_NAMES[lunar.day] || `${lunar.day}日`;
                  return (
                    <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-white/5">
                      <span className="text-amber-300 flex items-center gap-1.5 font-bold">🌙 自動推算農曆:</span>
                      <span className="text-amber-200 font-bold text-shadow-glow">
                        民國 {lunar.rocYear} 年 {lunar.isLeapMonth ? '閏' : ''}{lunarMonthName}月 {lunarDayName}
                      </span>
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const resolvedSolarObj = lunarToSolar({
                    rocYear: Number(rocYear),
                    month: Number(month),
                    day: Number(day),
                    isLeapMonth
                  });
                  if (!resolvedSolarObj) return null;
                  const resolvedSolar = resolvedSolarObj.solarDate;
                  const solarRocYear = resolvedSolarObj.gregorianYear - 1911;
                  const [, solarM, solarD] = resolvedSolar.split('-').map(Number);
                  
                  const lunarMonthName = LUNAR_MONTH_NAMES[Number(month)] || `${month}月`;
                  const lunarDayName = LUNAR_DAY_NAMES[Number(day)] || `${day}日`;
                  return (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-violet-300 flex items-center gap-1.5 font-bold">🌙 輸入農曆:</span>
                        <span className="text-violet-200 font-semibold">
                          民國 {rocYear} 年 {isLeapMonth ? '閏' : ''}{lunarMonthName}月 {lunarDayName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-white/5">
                        <span className="text-white flex items-center gap-1.5 font-medium">☀️ 自動推算國曆:</span>
                        <span className="text-white font-bold text-shadow-glow">
                          民國 {solarRocYear} 年 {solarM} 月 {solarD} 日
                        </span>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border p-3.5 text-xs whitespace-pre-line leading-6 transition-all duration-300 ${accentClass}`}>
          {message || (mode === 'solar' ? '💡 輸入國曆民國年、月、日後，系統會自動推算出對應 spacing 的農曆與西元日期。' : '💡 輸入農曆民國年、月、日後，系統會自動推算出對應的國曆與西元日期。')}
        </div>
      )}
    </div>
  );
}
