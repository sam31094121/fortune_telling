'use client';

import React, { useState, useEffect } from 'react';
import type { BloodType, PersonInput } from '@/lib/types';
import { getZodiacSign } from '@/lib/zodiac';

interface MultiStepFormProps {
  person: PersonInput;
  onChange: (next: PersonInput) => void;
  onSubmitPreview: () => void; // 免費天地預分析
  onSubmitAnalyze: () => void; // 完整天地人分析
  disabled?: boolean;
}

const ZODIAC_TRAITS: Record<string, string> = {
  '牡羊座': '熱情率直、行動力強、富開創精神',
  '金牛座': '沉穩務實、追求穩定、具極佳審美力',
  '雙子座': '思維敏捷、善於溝通、充滿求知欲',
  '巨蟹座': '重情守護、直覺敏銳、具備深厚同理心',
  '獅子座': '自信慷慨、具領導力、渴望展現自我',
  '處女座': '心思細密、善於分析、追求完美細節',
  '天秤座': '優雅和諧、重視公正、善於協調人際',
  '天蠍座': '深沉專注、洞察力極強、情感豐沛烈性',
  '射手座': '熱愛自由、樂觀豁達、勇於探索未知',
  '摩羯座': '堅毅沉著、富責任感、具長遠規劃力',
  '水瓶座': '獨立創新、求新求變、具獨特人道思維',
  '雙魚座': '溫柔浪漫、富有藝術氣息、善感且利他',
};

const BLOOD_TRAITS: Record<BloodType, string> = {
  'A': '細緻體貼、恪盡職守、追求完美',
  'B': '自由隨性、創造力強、直覺敏銳',
  'AB': '冷靜理性、善於分析、雙重魅力',
  'O': '熱情開朗、意志堅定、具領導力',
  '': '尚未選擇',
};

export default function MultiStepForm({
  person,
  onChange,
  onSubmitPreview,
  onSubmitAnalyze,
  disabled = false,
}: MultiStepFormProps) {
  // 步驟：0 = 天（生日），1 = 地（血型）
  // 姓名（人）會作為結果頁的解鎖條件，或是第二層引導，讓填寫更簡單！
  const [step, setStep] = useState(0);

  const zodiac = getZodiacSign(person.birthday);

  // 當生日選定後，在短暫延遲後滑入「地維度」
  useEffect(() => {
    if (step === 0 && person.birthday) {
      const timer = setTimeout(() => {
        setStep(1);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [person.birthday, step]);

  const selectBloodType = (type: BloodType) => {
    onChange({ ...person, bloodType: type });
  };

  return (
    <div className="w-full space-y-6">
      {/* 天地雙維度指示器 */}
      <div className="relative flex items-center justify-between px-10 pb-6">
        <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-white/10 z-0"></div>
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-amber-400 z-0 transition-all duration-500"
          style={{ width: `${step * 100}%` }}
        />
        
        {/* 天 */}
        <button
          type="button"
          onClick={() => setStep(0)}
          className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-serif transition-all duration-300 ${
            step >= 0 
              ? 'border-violet-500 bg-slate-950 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.4)]' 
              : 'border-white/20 bg-slate-900 text-white/40'
          }`}
        >
          天
        </button>

        {/* 地 */}
        <button
          type="button"
          disabled={!person.birthday}
          onClick={() => setStep(1)}
          className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-serif transition-all duration-300 ${
            step >= 1 
              ? 'border-amber-400 bg-slate-950 text-amber-300 shadow-[0_0_15px_rgba(201,162,74,0.4)]' 
              : 'border-white/20 bg-slate-900 text-white/40 disabled:cursor-not-allowed'
          }`}
        >
          地
        </button>
      </div>

      {/* 步驟 1：天之印記（生日） */}
      {step === 0 && (
        <div className="space-y-5 animate-rise">
          <div className="text-center">
            <h2 className="text-xl font-serif text-violet-300">天命之約 · 注入星辰能量</h2>
            <p className="mt-1 text-sm text-slate-400">大數據將即時抓取你的天命星軌</p>
          </div>

          <div className="fortune-card sky-card p-6 space-y-4">
            <label className="block text-xs uppercase tracking-[0.2em] text-violet-400">出生日期</label>
            <input
              type="date"
              value={person.birthday}
              disabled={disabled}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => onChange({ ...person, birthday: e.target.value })}
              className="form-input"
            />
            {zodiac ? (
              <div className="mt-2 rounded-lg bg-violet-950/30 border border-violet-900/50 p-4 animate-rise">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <span className="font-semibold text-violet-300">{zodiac}</span>
                </div>
                <p className="mt-1 text-xs text-violet-400/90">{ZODIAC_TRAITS[zodiac]}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">生日決定你的天賦輪廓與思維模式。</p>
            )}
          </div>
        </div>
      )}

      {/* 步驟 2：地之脈理（血型與免費預分析啟動） */}
      {step === 1 && (
        <div className="space-y-5 animate-rise">
          <div className="text-center">
            <h2 className="text-xl font-serif text-amber-300">地緣之契 · 凝聚性格基底</h2>
            <p className="mt-1 text-sm text-slate-400">選擇血型即可解鎖第一層大數據預分析</p>
          </div>

          <div className="fortune-card earth-card p-6 space-y-6">
            <span className="block text-xs uppercase tracking-[0.2em] text-amber-400">選擇你的血型</span>
            <div className="grid grid-cols-4 gap-3">
              {(['A', 'B', 'AB', 'O'] as BloodType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectBloodType(type)}
                  className={`py-4 rounded-2xl font-bold border text-lg transition-all duration-200 ${
                    person.bloodType === type
                      ? 'border-amber-400 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_rgba(201,162,74,0.25)]'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {person.bloodType && (
              <div className="mt-2 rounded-lg bg-amber-950/20 border border-amber-900/40 p-4 animate-rise space-y-2">
                <p className="text-xs text-amber-300/90 font-semibold">
                  血型特質：{BLOOD_TRAITS[person.bloodType]}
                </p>
                <p className="text-[10px] text-slate-500 leading-normal">
                  生日星軌與血型行為模式的交涉場已具備，點擊下方即可開始免費預分析。
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={disabled || !person.birthday || !person.bloodType}
              onClick={onSubmitPreview}
              className="primary-button w-full py-4 text-base tracking-[0.15em]"
            >
              啟動免費天地預分析
            </button>
          </div>
        </div>
      )}

      {/* 返回按鈕 */}
      {step > 0 && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={disabled}
            className="px-4 py-2 text-xs text-slate-500 hover:text-white transition-colors"
          >
            ← 返回修改生日
          </button>
        </div>
      )}
    </div>
  );
}
