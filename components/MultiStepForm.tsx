'use client';

import { useState } from 'react';
import type { BloodType } from '@/lib/types';
import LunarBirthdayInput from './LunarBirthdayInput';
import { isValidBirthday } from '@/lib/validation';

interface FormPersonInput {
  name: string;
  bloodType: BloodType;
  birthday: string;
  gender: 'male' | 'female';
}

interface MultiStepFormProps {
  person: FormPersonInput;
  onChange: (next: FormPersonInput) => void;
  onSubmitPreview: () => void;
  disabled?: boolean;
}

export default function MultiStepForm({
  person,
  onChange,
  onSubmitPreview,
  disabled = false,
}: MultiStepFormProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const isBirthdayValid = isValidBirthday(person.birthday);
  const canSubmit = isBirthdayValid && person.bloodType !== '' && !disabled;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">免費初步分析</p>
        <h2 className="font-serif text-3xl text-[color:var(--text-main)]">填兩項資料，先看人格輪廓</h2>
        <p className="text-sm leading-7 text-[color:var(--text-sub)]">
          先填民國年國曆生日與血型。AI 會在背景完成整理，前台只顯示白話重點。
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex-1 rounded-full border px-4 py-3 text-sm font-semibold transition ${
            step === 1
              ? 'border-violet-400 bg-violet-500/15 text-violet-200'
              : 'border-white/10 bg-white/5 text-[color:var(--text-muted)]'
          }`}
        >
          生日
        </button>
        <button
          type="button"
          disabled={!isBirthdayValid}
          onClick={() => setStep(2)}
          className={`flex-1 rounded-full border px-4 py-3 text-sm font-semibold transition ${
            step === 2
              ? 'border-amber-400 bg-amber-400/15 text-amber-200'
              : 'border-white/10 bg-white/5 text-[color:var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50'
          }`}
        >
          血型
        </button>
      </div>

      {step === 1 && (
        <div className="fortune-card sky-card space-y-4 p-5 animate-rise">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">出生資料</p>
            <h3 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">輸入國曆生日（民國年）</h3>
          </div>

          <LunarBirthdayInput
            value={person.birthday}
            disabled={disabled}
            accent="violet"
            onChange={(solarDate) => onChange({ ...person, birthday: solarDate })}
          />

          {isBirthdayValid ? (
            <div className="rounded-2xl border border-violet-400/15 bg-violet-950/20 p-4">
              <p className="text-sm font-semibold text-violet-200">出生日期已確認</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">
                日期已收好，下一步選血型，就能先看初步人格輪廓。
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--text-muted)]">
              輸入民國年、月、日，系統會自動換算西元。
            </div>
          )}

          <button
            type="button"
            disabled={!isBirthdayValid || disabled}
            onClick={() => setStep(2)}
            className="primary-button w-full py-3.5 text-sm tracking-[0.12em]"
          >
            下一步：選血型
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="fortune-card earth-card space-y-5 p-5 animate-rise">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">第二項資料</p>
            <h3 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">選擇血型</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['A', 'B', 'AB', 'O'] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...person, bloodType: type })}
                className={`rounded-2xl border px-4 py-4 text-lg font-bold transition ${
                  person.bloodType === type
                    ? 'border-amber-400 bg-amber-400/15 text-amber-200 shadow-[0_0_18px_rgba(201,162,74,0.18)]'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {person.bloodType ? (
            <div className="rounded-2xl border border-amber-400/15 bg-amber-950/20 p-4">
              <p className="text-sm leading-7 text-[color:var(--text-sub)]">
                已選好。點下方按鈕，先查看你的初步人格輪廓。
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--text-muted)]">
              選擇血型後，就能開始初步分析。
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmitPreview}
            className="primary-button w-full py-4 text-base tracking-[0.15em]"
          >
            查看初步人格輪廓
          </button>
        </div>
      )}
    </div>
  );
}
