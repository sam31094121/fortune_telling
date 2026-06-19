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

  return (
    <div className="grid gap-5">
      <section className="fortune-card sky-card p-5">
        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">第一階段</p>
          <h3 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">輸入生日</h3>
        </div>
        <label className="mb-2 block text-sm text-[color:var(--text-sub)]">出生日期</label>
        <input
          type="date"
          value={value.birthday}
          disabled={disabled}
          max={new Date().toISOString().split('T')[0]}
          onChange={(event) => onChange({ ...value, birthday: event.target.value })}
          className="form-input"
        />
        <p className="mt-3 min-h-6 text-sm leading-6 text-[color:var(--text-muted)]">
          {zodiac ? `天格分析完成，已匹配至 ${zodiac}。` : '生日決定你的輪廓與先天命格。'}
        </p>
      </section>

      <section className={`fortune-card earth-card p-5 ${!value.birthday ? 'opacity-60' : ''}`}>
        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">第二階段</p>
          <h3 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">輸入血型</h3>
        </div>
        <label className="mb-2 block text-sm text-[color:var(--text-sub)]">血型</label>
        <select
          value={value.bloodType}
          disabled={disabled || !value.birthday}
          onChange={(event) => onChange({ ...value, bloodType: event.target.value as BloodType })}
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
          {value.bloodType ? '天地分析完成，後天氣場已納入人格模型。' : '血型決定你的行動風格與人際模式。'}
        </p>
      </section>

      <section className={`fortune-card human-card p-5 ${!value.bloodType ? 'opacity-60' : ''}`}>
        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">第三階段</p>
          <h3 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">輸入姓名</h3>
        </div>
        <label className="mb-2 block text-sm text-[color:var(--text-sub)]">姓名</label>
        <input
          type="text"
          value={value.name}
          disabled={disabled || !value.bloodType}
          maxLength={20}
          placeholder="例如：王小明"
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          className="form-input"
        />
        <p className="mt-3 min-h-6 text-sm leading-6 text-[color:var(--text-muted)]">
          {value.name.trim()
            ? '姓名能量已準備解鎖，接下來將進入完整人格報告。'
            : '名字決定你的獨特性，也是 70% 權重的核心模型。'}
        </p>
      </section>
    </div>
  );
}
