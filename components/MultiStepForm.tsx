'use client';

import { useState } from 'react';
import type { BloodType } from '@/lib/types';
import { getZodiacSign } from '@/lib/zodiac';
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

const ZODIAC_TRAITS: Record<string, string> = {
  牡羊座: '行動快、反應直接，遇事傾向先衝出第一步。',
  金牛座: '重視穩定與安全感，做決定時偏向務實與耐心。',
  雙子座: '思路靈活、善於表達，喜歡在變化中找到新鮮感。',
  巨蟹座: '情感細膩，對熟悉的人與環境有強烈守護心。',
  獅子座: '自我驅動高，渴望被看見，也願意承擔舞台角色。',
  處女座: '觀察敏銳，對細節要求高，傾向先整理再行動。',
  天秤座: '重視互動與平衡，做選擇時會考量關係與氛圍。',
  天蠍座: '情緒深度強，判斷事情時直覺與洞察力都很明顯。',
  射手座: '喜歡自由與探索，面對未知時通常帶著冒險精神。',
  摩羯座: '目標感強，做事穩定，會用長線思維安排人生。',
  水瓶座: '獨立性高，常用不同角度理解世界與人際關係。',
  雙魚座: '感受力豐富，共感能力強，容易感知細微情緒流動。',
};

const BLOOD_TRAITS: Record<Exclude<BloodType, ''>, string> = {
  A: '偏向細膩與穩定，對秩序與關係品質較敏感。',
  B: '自主性高，想法鮮明，容易展現個人節奏。',
  AB: '理性與感性並存，常同時保有觀察與距離感。',
  O: '行動力與帶動感較強，做事通常更直接果斷。',
};

export default function MultiStepForm({
  person,
  onChange,
  onSubmitPreview,
  disabled = false,
}: MultiStepFormProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const zodiac = getZodiacSign(person.birthday);
  const isBirthdayValid = isValidBirthday(person.birthday);
  const canSubmit = isBirthdayValid && person.bloodType !== '' && !disabled;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">免費天地預分析</p>
        <h2 className="font-serif text-3xl text-[color:var(--text-main)]">先完成骨架，再進入姓名解碼</h2>
        <p className="text-sm leading-7 text-[color:var(--text-sub)]">
          第一步輸入農曆生日，系統會自動換成國曆；第二步輸入血型，補充行為模式。
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
          天｜生日
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
          地｜血型
        </button>
      </div>

      {step === 1 && (
        <div className="fortune-card sky-card space-y-4 p-5 animate-rise">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">天層輸入</p>
            <h3 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">輸入農曆出生年月日</h3>
          </div>

          <LunarBirthdayInput
            value={person.birthday}
            disabled={disabled}
            accent="violet"
            onChange={(solarDate) => onChange({ ...person, birthday: solarDate })}
          />

          {zodiac ? (
            <div className="rounded-2xl border border-violet-400/15 bg-violet-950/20 p-4">
              <p className="text-sm font-semibold text-violet-200">{zodiac}</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">
                {ZODIAC_TRAITS[zodiac]}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--text-muted)]">
              選好農曆生日後，系統會先自動換算國曆，再顯示星座人格基底。
            </div>
          )}

          <button
            type="button"
            disabled={!isBirthdayValid || disabled}
            onClick={() => setStep(2)}
            className="primary-button w-full py-3.5 text-sm tracking-[0.12em]"
          >
            確認生日，進入地層分析
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="fortune-card earth-card space-y-5 p-5 animate-rise">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">地層輸入</p>
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
                {BLOOD_TRAITS[person.bloodType as Exclude<BloodType, ''>]}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--text-muted)]">
              血型會補充你的行動風格、人際模式與安全感需求。
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmitPreview}
            className="primary-button w-full py-4 text-base tracking-[0.15em]"
          >
            啟動天地預分析
          </button>
        </div>
      )}
    </div>
  );
}
