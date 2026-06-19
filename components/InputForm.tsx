// 單一使用者的輸入卡片：姓名、血型、生日，並即時顯示星座
// 受控元件，狀態由父層 page.tsx 統一管理

'use client';

import type { BloodType, PersonInput } from '@/lib/types';
import { getZodiacSign } from '@/lib/zodiac';

interface InputFormProps {
  title: string;
  value: PersonInput;
  onChange: (next: PersonInput) => void;
  disabled?: boolean;
}

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];

export default function InputForm({ title, value, onChange, disabled = false }: InputFormProps) {
  // 即時星座（生日有效才顯示）
  const zodiac = getZodiacSign(value.birthday);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">{title}</h2>

      <div className="space-y-4">
        {/* 姓名（可選） */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            姓名 <span className="text-gray-400">（可不填）</span>
          </label>
          <input
            type="text"
            value={value.name}
            disabled={disabled}
            maxLength={20}
            placeholder="請輸入姓名"
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-gray-100"
          />
        </div>

        {/* 血型 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">血型</label>
          <select
            value={value.bloodType}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, bloodType: e.target.value as BloodType })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-gray-100"
          >
            {BLOOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type} 型
              </option>
            ))}
          </select>
        </div>

        {/* 生日 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">生日</label>
          <input
            type="date"
            value={value.birthday}
            disabled={disabled}
            max={new Date().toISOString().split('T')[0]} // 不允許選未來
            onChange={(e) => onChange({ ...value, birthday: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-gray-100"
          />
          {/* 即時星座提示 */}
          {zodiac && (
            <p className="mt-1.5 text-sm text-brand-dark">星座：{zodiac}</p>
          )}
        </div>
      </div>
    </div>
  );
}
