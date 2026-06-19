'use client';

import type { BloodType, PersonInput } from '@/lib/types';
import { getZodiacSign } from '@/lib/zodiac';

interface InputFormProps {
  value: PersonInput;
  onChange: (next: PersonInput) => void;
  disabled?: boolean;
}

const BLOOD_TYPES: Exclude<BloodType, ''>[] = ['A', 'B', 'AB', 'O'];

export default function InputForm({ value, onChange, disabled = false }: InputFormProps) {
  const zodiac = getZodiacSign(value.birthday);
  const handleBirthdayChange = (nextBirthday: string) => {
    onChange({ ...value, birthday: nextBirthday });
  };
  const handleBloodTypeChange = (nextBloodType: BloodType) => {
    onChange({ ...value, bloodType: nextBloodType });
  };

  return (
    <div className="grid gap-5">
      <section className="fortune-card sky-card p-5">
        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">天之維度</p>
          <h3 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">解鎖天之人格</h3>
        </div>
        <label className="mb-2 block text-sm text-[color:var(--text-sub)]">出生日期</label>
        <input
          type="date"
          value={value.birthday}
          disabled={disabled}
          max={new Date().toISOString().split('T')[0]}
          onChange={(event) => handleBirthdayChange(event.target.value)}
          className="form-input"
        />
        <p className="mt-3 min-h-6 text-sm leading-6 text-[color:var(--text-muted)]">
          {zodiac ? `天之人格已解鎖，對應 ${zodiac} 人格維度。` : '生日決定你的天賦輪廓與思維模式。'}
        </p>
      </section>

      <section className={`fortune-card earth-card p-5 ${!value.birthday ? 'opacity-60' : ''}`}>
        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">地之維度</p>
          <h3 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">解鎖地之人格</h3>
        </div>
        <label className="mb-2 block text-sm text-[color:var(--text-sub)]">出生資訊</label>
        <select
          value={value.bloodType}
          disabled={disabled || !value.birthday}
          onChange={(event) => handleBloodTypeChange(event.target.value as BloodType)}
          className="form-select"
        >
          <option value="" className="bg-[#140f26] text-[color:var(--text-main)]">
            請選擇血型
          </option>
          {BLOOD_TYPES.map((type) => (
            <option key={type} value={type} className="bg-[#140f26] text-[color:var(--text-main)]">
              {type} 型
            </option>
          ))}
        </select>
        <p className="mt-3 min-h-6 text-sm leading-6 text-[color:var(--text-muted)]">
          {value.bloodType ? '地之人格已解鎖，行為模式已納入人格模型。' : '出生資訊決定你的行為風格與人際關係模式。'}
        </p>
      </section>
    </div>
  );
}
