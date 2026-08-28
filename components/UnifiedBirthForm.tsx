'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import { getAnalysisIdentityTarget, IDENTITY_TARGET_UPDATED_EVENT, type AnalysisIdentityTarget } from '@/lib/identity-split-client';
import { readSelfBirthProfile, saveSelfBirthProfile } from '@/lib/self-profile-client';
import { readCanonicalBirthProfile, saveCanonicalBirthProfile } from '@/lib/canonical-birth-profile-client';
import { fromUnifiedBirthProfile, toUnifiedBirthProfile } from '@/lib/canonical-birth-profile';
import { SHICHEN_LIST } from '@/lib/shichen-engine';

export type BirthGender = 'male' | 'female';
export type BirthCalendarType = 'solar' | 'lunar';
export type BirthHourBranch = 'zi' | 'chou' | 'yin' | 'mao' | 'chen' | 'si' | 'wu' | 'wei' | 'shen' | 'you' | 'xu' | 'hai' | 'unknown';

export type BirthProfile = {
  name?: string;
  gender?: BirthGender | string;
  birthDate?: string;
  birthTime?: string;
  birthHourBranch?: BirthHourBranch | string;
  birthPlace?: string;
  country?: string;
  city?: string;
  calendarType?: BirthCalendarType;
  timeUnknown?: boolean;
};

export type UnifiedBirthFormFields = {
  name?: boolean;
  gender?: boolean;
  birthDate?: boolean;
  birthTime?: boolean;
  birthHourBranch?: boolean;
  birthPlace?: boolean;
  calendarType?: boolean;
};

type UnifiedBirthFormProps = {
  value: BirthProfile;
  fields: UnifiedBirthFormFields;
  missing?: string[];
  disabled?: boolean;
  submitLabel?: string;
  loadingLabel?: string;
  isSubmitting?: boolean;
  dateAccent?: 'violet' | 'amber' | 'pink' | 'cyan';
  onChange: (value: BirthProfile) => void;
  onSubmit: (value: BirthProfile) => void;
};

const HOUR_BRANCH_ORDER: BirthHourBranch[] = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];
const HOUR_BRANCH_TIME: Record<Exclude<BirthHourBranch, 'unknown'>, string> = {
  zi: '23:30',
  chou: '01:30',
  yin: '03:30',
  mao: '05:30',
  chen: '07:30',
  si: '09:30',
  wu: '11:30',
  wei: '13:30',
  shen: '15:30',
  you: '17:30',
  xu: '19:30',
  hai: '21:30',
};

export function convertTimeToHourBranch(time?: string): BirthHourBranch | undefined {
  if (!time) return undefined;
  const hour = Number(time.split(':')[0]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return undefined;
  if (hour === 23 || hour === 0) return 'zi';
  if (hour <= 2) return 'chou';
  if (hour <= 4) return 'yin';
  if (hour <= 6) return 'mao';
  if (hour <= 8) return 'chen';
  if (hour <= 10) return 'si';
  if (hour <= 12) return 'wu';
  if (hour <= 14) return 'wei';
  if (hour <= 16) return 'shen';
  if (hour <= 18) return 'you';
  if (hour <= 20) return 'xu';
  return 'hai';
}

export function hourBranchToBirthTime(branch?: string): string | undefined {
  if (!branch || branch === 'unknown') return undefined;
  return HOUR_BRANCH_TIME[branch as Exclude<BirthHourBranch, 'unknown'>];
}

/** 欄位是否已完成（完成後紅色警告即刻消失，不等下次送出） */
function isFieldDone(value: BirthProfile, key: string): boolean {
  if (key === 'name') return (value.name ?? '').trim().length >= 2;
  if (key === 'birthDate') return Boolean(value.birthDate);
  if (key === 'gender') return Boolean(value.gender);
  if (key === 'birthPlace') return Boolean(value.country && value.city);
  if (key === 'birthHourBranch') return Boolean(value.timeUnknown || value.birthHourBranch);
  return false;
}

function hasMissing(missing: string[] | undefined, key: string) {
  return Boolean(missing?.includes(key));
}

function fieldFrameClass(missing: string[] | undefined, key: string, value?: BirthProfile) {
  const stillMissing = hasMissing(missing, key) && !(value && isFieldDone(value, key));
  return `rounded-2xl border p-5 ${stillMissing ? 'border-rose-300/45 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.2)]' : 'border-white/10 bg-white/[0.04]'}`;
}

function ChoiceButton({ active, alert, children, onClick, tone = 'amber' }: { active: boolean; alert?: boolean; children: ReactNode; onClick: () => void; tone?: 'amber' | 'cyan' }) {
  const activeClass = tone === 'cyan'
    ? 'border-cyan-200/70 bg-cyan-300/16 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.14)]'
    : 'border-amber-200/70 bg-amber-300/16 text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.16)]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-5 py-5 text-left transition ${active ? activeClass : alert ? 'border-rose-300/55 bg-rose-500/10 text-rose-100' : `border-white/10 bg-black/18 text-[color:var(--text-sub)] ${tone === 'cyan' ? 'hover:border-cyan-200/35' : 'hover:border-amber-200/35'}`}`}
    >
      {children}
    </button>
  );
}

export function HourBranchSelector({ value, unknown, missing, onChange }: { value?: string; unknown?: boolean; missing?: boolean; onChange: (branch: BirthHourBranch) => void }) {
  const knownSelected = Boolean(value && value !== 'unknown' && !unknown);
  /* 手機修復（2026-08-12）：展開時辰卡後自動捲到眼前，客戶才知道要在這裡點選（原本展開在畫面外，像壞掉） */
  const panelRef = useRef<HTMLDivElement | null>(null);
  const prevKnownRef = useRef(knownSelected);
  useEffect(() => {
    if (knownSelected && !prevKnownRef.current) {
      window.setTimeout(() => panelRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    }
    prevKnownRef.current = knownSelected;
  }, [knownSelected]);

  const selectedItem = knownSelected
    ? SHICHEN_LIST[HOUR_BRANCH_ORDER.findIndex((branch) => branch === value)]
    : undefined;

  return (
    <div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ChoiceButton active={Boolean(unknown || value === 'unknown')} alert={missing} onClick={() => onChange('unknown')}>
          <span className="block text-base font-black">不知道出生時辰</span>
          <span className="mt-1.5 block text-xs font-semibold leading-5">先建立三柱分析；補充出生時辰後，再建立完整四柱。</span>
        </ChoiceButton>
        <ChoiceButton active={knownSelected} alert={missing} tone="cyan" onClick={() => onChange((knownSelected ? value : 'wu') as BirthHourBranch)}>
          <span className="block text-base font-black">我知道出生時辰</span>
          <span className="mt-1.5 block text-xs font-semibold leading-5">點下去會展開 12 張時辰卡，直接點選，不需手打。</span>
        </ChoiceButton>
      </div>

      {knownSelected && (
        <div ref={panelRef} className="mt-5 scroll-mt-24 rounded-2xl border border-cyan-300/40 bg-cyan-950/20 p-4 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-black tracking-wide text-cyan-100">👇 請點選你的出生時辰</span>
            <span className="text-[11px] font-bold text-cyan-200/70">標準十二時辰</span>
          </div>
          {selectedItem && (
            <div className="mb-3 rounded-xl border border-cyan-200/45 bg-cyan-300/12 px-4 py-2.5 text-sm font-black text-cyan-50">
              ✓ 已選擇：{selectedItem.label}（{selectedItem.range}）——選錯可直接點別張更換
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {SHICHEN_LIST.map((item, index) => {
              const branch = HOUR_BRANCH_ORDER[index];
              if (branch === 'unknown') return null;
              const selected = value === branch;
              return (
                <button
                  key={branch}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(branch)}
                  className={`min-h-[88px] rounded-xl border px-3 py-4 text-left transition-all active:scale-[0.97] ${selected ? 'border-cyan-200 bg-cyan-400/20 text-cyan-100 shadow-[0_0_18px_rgba(255,255,255,0.18)]' : 'border-white/10 bg-white/5 hover:border-cyan-300/50 hover:bg-cyan-400/10'}`}
                >
                  <p className={`text-lg font-black ${selected ? 'text-cyan-100' : 'text-[color:var(--text-main)]'}`}>{selected ? '✓ ' : ''}{item.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-sub)]">{item.range}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[color:var(--text-muted)]">{item.imagery}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function UnifiedBirthForm({
  value,
  fields,
  missing = [],
  disabled = false,
  submitLabel = '開始分析',
  loadingLabel = '運算中...',
  isSubmitting = false,
  dateAccent = 'amber',
  onChange,
  onSubmit,
}: UnifiedBirthFormProps) {
  // ===== 本人資料檔案：選「自己」自動帶入之前填過的資料，不用重複填寫 =====
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const applyIdentity = (target: AnalysisIdentityTarget | null) => {
      if (target === 'self') {
        const saved = readSelfBirthProfile();
        if (saved) {
          // 只帶入有存過的欄位；使用者仍可修改
          onChangeRef.current({ ...valueRef.current, ...saved });
        } else {
          // 本頁（八字）還沒存過本人資料，退而求其次看看唯一出生資料裡有沒有
          // 別的頁面（例如紫微）已經填過的——只在完全沒有本地資料時才帶入
          const canonical = readCanonicalBirthProfile();
          if (canonical) onChangeRef.current({ ...valueRef.current, ...toUnifiedBirthProfile(canonical) });
        }
      } else if (target === 'guest') {
        // 切到親朋好友：若表單目前是本人檔案內容，清空讓使用者填別人的資料
        const saved = readSelfBirthProfile();
        const current = valueRef.current;
        if (saved && saved.name && current.name === saved.name) {
          onChangeRef.current({
            ...current,
            name: '', birthDate: '', birthTime: '', birthHourBranch: undefined,
            gender: undefined, timeUnknown: undefined,
          });
        }
      }
    };
    // 初始：若已選「自己」，直接帶入
    applyIdentity(getAnalysisIdentityTarget());
    const onIdentityChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: AnalysisIdentityTarget }>).detail;
      applyIdentity(detail?.target ?? getAnalysisIdentityTarget());
    };
    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, onIdentityChanged);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, onIdentityChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const completed = [
    fields.name ? { id: 'name', label: '姓名', done: (value.name ?? '').trim().length >= 2, text: (value.name ?? '').trim().length >= 2 ? '已確認' : '待填寫' } : null,
    fields.birthDate ? { id: 'birthDate', label: '萬年曆生日', done: Boolean(value.birthDate), text: value.birthDate ? `西元 ${value.birthDate}` : '待換算' } : null,
    fields.gender ? { id: 'gender', label: '性別', done: Boolean(value.gender), text: value.gender === 'male' ? '男性' : value.gender === 'female' ? '女性' : '待選擇' } : null,
    fields.birthPlace ? { id: 'birthPlace', label: '出生地', done: Boolean(value.country && value.city), text: value.country && value.city ? `${value.country} ${value.city}` : '待填寫' } : null,
    fields.birthHourBranch ? { id: 'birthHourBranch', label: '出生時辰', done: Boolean(value.timeUnknown || value.birthHourBranch), text: value.timeUnknown ? '不確定' : value.birthHourBranch ? '已確認' : '待選擇' } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; done: boolean; text: string }>;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (getAnalysisIdentityTarget() === 'self') {
          saveSelfBirthProfile(value); // 本人資料檔案：下次選「自己」自動帶入
          saveCanonicalBirthProfile(fromUnifiedBirthProfile(value)); // 唯一出生資料：讓紫微那頁也能帶出來
        }
        onSubmit(value);
      }}
      className="mega-friendly-form space-y-4"
    >

      {fields.name && (
        <section data-field="name" className={fieldFrameClass(missing, 'name', value)}>
          <label className="block text-sm font-black text-[color:var(--text-main)]">1. 姓名 {(value.name ?? '').trim().length >= 2 && <span className="ml-2 text-green-400">完成</span>}</label>
          <input
            value={value.name ?? ''}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            onBlur={(event) => onChange({ ...value, name: event.target.value.trim() })}
            maxLength={20}
            placeholder="請輸入姓名，至少 2 個字"
            className={`mt-3 w-full rounded-2xl border bg-black/25 px-4 py-4 text-base font-bold text-[color:var(--text-main)] outline-none focus:border-amber-200/60 ${hasMissing(missing, 'name') ? 'border-rose-300/70' : 'border-white/10'}`}
            autoComplete="off"
            disabled={disabled}
          />
          {hasMissing(missing, 'name') && !isFieldDone(value, 'name') && <p className="form-missing-alert">請先填寫姓名，至少 2 個字。</p>}
        </section>
      )}

      {fields.birthDate && (
        <section data-field="birthDate" className={fieldFrameClass(missing, 'birthDate', value)}>
          <label className="block text-sm font-black text-[color:var(--text-main)]">2. 出生日期（萬年曆）{value.birthDate && <span className="ml-2 text-green-400">完成</span>}</label>
          <div className="mt-4">
            <LunarBirthdayInput
              value={value.birthDate ?? ''}
              onChange={(birthDate) => onChange({ ...value, birthDate: birthDate.trim() })}
              accent={dateAccent}
              label="出生日期（萬年曆）"
              disabled={disabled}
            />
          </div>
          {hasMissing(missing, 'birthDate') && !isFieldDone(value, 'birthDate') && <p className="form-missing-alert">請先完成生日萬年曆推算。</p>}
        </section>
      )}

      {fields.gender && (
        <section data-field="gender" className={fieldFrameClass(missing, 'gender', value)}>
          <label className="block text-sm font-black text-[color:var(--text-main)]">3. 性別 {value.gender && <span className="ml-2 text-green-400">完成</span>}</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { label: '女性', value: 'female' as const, description: '以女性資料規則進行本卡片分析。' },
              { label: '男性', value: 'male' as const, description: '以男性資料規則進行本卡片分析。' },
            ].map((item) => (
              <ChoiceButton key={item.value} active={value.gender === item.value} alert={hasMissing(missing, 'gender')} onClick={() => onChange({ ...value, gender: item.value })}>
                <span className="block text-base font-black">{item.label}</span>
                <span className="mt-1.5 block text-xs font-semibold leading-5">{item.description}</span>
              </ChoiceButton>
            ))}
          </div>
          {hasMissing(missing, 'gender') && !isFieldDone(value, 'gender') && <p className="form-missing-alert">請點選性別，這欄還沒有確認。</p>}
        </section>
      )}

      {fields.birthPlace && (
        <section data-field="birthPlace" className={fieldFrameClass(missing, 'birthPlace', value)}>
          <label className="block text-sm font-black text-[color:var(--text-main)]">4. 出生地點 {value.country && value.city && <span className="ml-2 text-green-400">完成</span>}</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input value={value.country ?? ''} onChange={(event) => onChange({ ...value, country: event.target.value, birthPlace: [event.target.value, value.city ?? ''].filter(Boolean).join(' ') })} placeholder="國家，例如台灣" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold text-[color:var(--text-main)] outline-none focus:border-amber-200/60" disabled={disabled} />
            <input value={value.city ?? ''} onChange={(event) => onChange({ ...value, city: event.target.value, birthPlace: [value.country ?? '', event.target.value].filter(Boolean).join(' ') })} placeholder="城市，例如台北" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold text-[color:var(--text-main)] outline-none focus:border-amber-200/60" disabled={disabled} />
          </div>
          {hasMissing(missing, 'birthPlace') && !isFieldDone(value, 'birthPlace') && <p className="form-missing-alert">請確認出生國家與城市。</p>}
        </section>
      )}

      {fields.birthHourBranch && (
        <section data-field="birthHourBranch" className={fieldFrameClass(missing, 'birthHourBranch', value)}>
          <label className="block text-sm font-black text-[color:var(--text-main)]">{[fields.name, fields.birthDate, fields.gender, fields.birthPlace].filter(Boolean).length + 1}. 出生時辰 {(value.timeUnknown || value.birthHourBranch) && <span className="ml-2 text-green-400">完成</span>}</label>
          <HourBranchSelector
            value={value.birthHourBranch}
            unknown={value.timeUnknown}
            missing={hasMissing(missing, 'birthHourBranch')}
            onChange={(birthHourBranch) => {
              const isUnknown = birthHourBranch === 'unknown';
              onChange({
                ...value,
                birthHourBranch,
                timeUnknown: isUnknown,
                birthTime: isUnknown ? '12:00' : hourBranchToBirthTime(birthHourBranch),
              });
            }}
          />
          {hasMissing(missing, 'birthHourBranch') && <p className="form-missing-alert">請先選擇出生時辰方式。</p>}
        </section>
      )}

      {/* 完成引導：全部填好 → 金色光芒 + 明確指引（資料未完成則低調提示） */}
      {completed.every((item) => item.done) && !isSubmitting ? (
        <p className="mega-submit-guide" aria-live="polite">
          <span aria-hidden="true">✨</span> 資料全部完成！點下方金色按鈕開始 <span className="mega-submit-guide__arrow" aria-hidden="true">⬇</span>
        </p>
      ) : (
        <p className="text-center text-xs font-semibold text-white/40">完成上方欄位後，開始鍵會亮起金色光芒</p>
      )}
      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className={
          completed.every((item) => item.done)
            ? 'mega-submit-ready inline-flex w-full items-center justify-center gap-2 rounded-full disabled:opacity-60'
            : 'inline-flex w-full items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/14 px-6 py-4 text-sm font-black text-amber-50 transition hover:border-amber-200/60 hover:bg-amber-300/20 disabled:opacity-60'
        }
      >
        {completed.every((item) => item.done) && !isSubmitting && <span aria-hidden="true">✨</span>}
        {isSubmitting ? loadingLabel : submitLabel}
      </button>

      {/* 資料填寫進度總覽：移至送出鈕下方（2026-08-11）——按下開始時直接看到哪裡沒填 */}
      <section className="rounded-[28px] border border-amber-300/25 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),rgba(15,23,42,0.78)_58%,rgba(2,6,23,0.94)_100%)] p-5 shadow-[0_0_34px_rgba(251,191,36,0.12)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">資料填寫</p>
        <h2 className="mt-3 text-2xl font-black leading-8 text-amber-50">依序完成欄位，AI 才會開始運算</h2>
        <div className={`mt-4 grid gap-2 ${completed.length >= 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
          {completed.map((item) => (
            <div key={item.id} className={`rounded-xl border px-3 py-2 text-xs font-black ${item.done ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : hasMissing(missing, item.id) ? 'border-rose-300/50 bg-rose-500/15 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.22)]' : 'border-white/10 bg-black/15 text-[color:var(--text-sub)]'}`}>
              <span>{item.done ? '已完成' : '待填寫'} · {item.label}</span>
              <span className="mt-1 block text-[11px] font-bold opacity-75">{item.text}</span>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
