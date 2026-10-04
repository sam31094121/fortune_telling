/**
 * 鬼魅阿修羅｜技能檔案頁的實盤入口（client）
 *
 * 只收生辰 → POST /api/ghost-asura/reading（後端：既有八字核心＋紫微四柱核對 → 既有阿修羅管線）
 * → 把後端回傳的顯示文字交給 GhostAsuraCard（卡頭下：過去／現在／未來）。
 * 本元件不排盤、不算神煞、不分組，只送出生辰與照印結果。
 */

'use client';

import { useRef, useState, type FormEvent } from 'react';
import { GhostAsuraCard, GhostAsuraCardShell } from '@/features/ghost-asura/components/GhostAsuraCard';
import type { AsuraDisplay } from '@/lib/ghost-asura-display-contract';
import { asuraScrub } from '@/lib/asura-display-alias';
import { useAsuraReading } from './AsuraReadingContext';
import styles from './asura-skill-reading.module.css';

export default function AsuraSkillReading() {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hourUnknown, setHourUnknown] = useState(false);
  // 與三張時間軸摺疊卡共用同一份後端結果（有 Provider 就共用，沒有就自管）
  const shared = useAsuraReading();
  const [localDisplay, setLocalDisplay] = useState<AsuraDisplay | null>(null);
  const display = shared ? shared.display : localDisplay;
  const setDisplay = shared ? shared.setDisplay : setLocalDisplay;
  const requestRef = useRef<AbortController | null>(null);

  function reset() {
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
    setDisplay(null);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestRef.current) return;
    if (!birthDate || (!birthTime && !hourUnknown) || !gender) {
      setError('生辰未齊。日期、性別必填；出生時刻不知，勾「不知道出生時刻」。');
      return;
    }
    const request = new AbortController();
    requestRef.current = request;
    setBusy(true);
    setError('');
    setDisplay(null);
    try {
      const response = await fetch('/api/ghost-asura/reading', {
        method: 'POST',
        cache: 'no-store',
        signal: request.signal,
        headers: { 'Content-Type': 'application/json' },
        // 不知道時辰：只送旗標，後端以子時排並回 hourAssumed（前端不自行代填時間）
        body: JSON.stringify(
          hourUnknown
            ? { birthDate, timeUnknown: true, gender, calendarType: 'solar', timezone: 'Asia/Taipei' }
            : { birthDate, birthTime, gender, calendarType: 'solar', timezone: 'Asia/Taipei' },
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (requestRef.current !== request) return;
      if (!response.ok || data?.data?.contract !== 'ghost-asura-display/v1') {
        throw new Error(typeof data?.error === 'string' ? data.error : '戰局暫時開不了，稍後再來。');
      }
      setDisplay(data.data as AsuraDisplay);
    } catch (e) {
      if (requestRef.current !== request) return;
      setError(asuraScrub(e instanceof Error ? e.message : '連線失敗，請稍後再試。'));
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <div className={styles.wrap} data-asura-skill-reading>
      <form className={styles.form} onSubmit={submit} noValidate>
        <fieldset className={styles.fields} disabled={busy}>
          <label className={styles.field}>
            <span>國曆生日（台灣時間）</span>
            <input
              type="date"
              name="birthDate"
              min="1901-01-01"
              value={birthDate}
              onChange={(e) => { reset(); setBirthDate(e.target.value); }}
              required
            />
          </label>
          <label className={styles.field}>
            <span>出生時間</span>
            <input
              type="time"
              name="birthTime"
              value={birthTime}
              onChange={(e) => { reset(); setBirthTime(e.target.value); }}
              disabled={hourUnknown}
              required={!hourUnknown}
            />
          </label>
          <label className={styles.unknownHour}>
            <input
              type="checkbox"
              name="timeUnknown"
              checked={hourUnknown}
              onChange={(e) => { reset(); setHourUnknown(e.target.checked); }}
            />
            不知道出生時刻
          </label>
          <div className={styles.field} role="radiogroup" aria-label="性別">
            <span>性別</span>
            <div className={styles.genders}>
              {([['male', '男'], ['female', '女']] as const).map(([value, label]) => (
                <label key={value} className={gender === value ? `${styles.gender} ${styles.genderOn}` : styles.gender}>
                  <input
                    type="radio"
                    name="gender"
                    value={value}
                    checked={gender === value}
                    onChange={() => { reset(); setGender(value); }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className={styles.submit}>
            {busy ? '照鏡中…' : '開啟戰局'}
          </button>
        </fieldset>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>

      <div className={styles.result} aria-live="polite" data-ghost-asura-result={display ? 'ready' : 'idle'}>
        {display ? <GhostAsuraCard display={display} /> : <GhostAsuraCardShell />}
      </div>
    </div>
  );
}
