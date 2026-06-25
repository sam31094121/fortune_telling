'use client';

import { useMemo, useState } from 'react';
import { DIMENSION_META } from '@/lib/personality';
import type { AnalysisResult, PreviewAnalysisResult } from '@/lib/types';
import ProgressBar from './ProgressBar';

interface ResultDisplayProps {
  previewResult: PreviewAnalysisResult;
  vipResult: AnalysisResult | null;
  onUnlock: (name: string, gender: 'male' | 'female') => Promise<void>;
  onReset: () => void;
  isUnlocking: boolean;
  errorMsg?: string;
}

const CUSTOMER_FLOW_DISPLAY = [
  { label: '資料已收好', desc: '生日與血型已完成初步整理' },
  { label: 'AI 已歸納', desc: '背景運算只留下關鍵訊號' },
  { label: '白話呈現', desc: '結果用容易理解的方式顯示' },
];

export default function ResultDisplay({
  previewResult,
  vipResult,
  onUnlock,
  onReset,
  isUnlocking,
  errorMsg = '',
}: ResultDisplayProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [localError, setLocalError] = useState('');

  const isUnlocked = vipResult !== null;
  const score = Math.round(isUnlocked ? vipResult.resonance_score : previewResult.preview_score);
  const dimensions = isUnlocked ? vipResult.final_scores : previewResult.preview_scores;
  const summary = isUnlocked ? vipResult.final_summary : previewResult.preview_summary;
  const guidanceBlocks = isUnlocked
    ? [
        { title: '性格底色', body: vipResult.skeleton_summary, tone: 'sky' },
        { title: '日常行為傾向', body: vipResult.behavior_summary, tone: 'earth' },
        { title: '個人特質', body: vipResult.individuality_summary, tone: 'human' },
        { title: '善念提醒', body: vipResult.wisdom_perspective, tone: 'earth' },
      ]
    : [
        { title: '性格底色', body: previewResult.skeleton_summary, tone: 'sky' },
        { title: '日常行為傾向', body: previewResult.behavior_summary, tone: 'earth' },
        { title: 'AI 整理重點', body: previewResult.preview_summary, tone: 'human' },
      ];

  const unlockProgress = useMemo(() => (isUnlocked ? 100 : 70), [isUnlocked]);

  async function handleUnlock() {
    const trimmed = name.trim();
    setLocalError('');

    if (trimmed.length < 2) {
      setLocalError('姓名至少需要 2 個字，才能啟動完整分析。');
      return;
    }

    if (trimmed.length > 20) {
      setLocalError('姓名長度不可超過 20 個字。');
      return;
    }

    await onUnlock(trimmed, gender);
  }

  return (
    <div className="space-y-6">
      <div className="fortune-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
              {isUnlocked ? '完整分析完成' : '初步輪廓完成'}
            </p>
            <h2 className="font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
              {isUnlocked ? '專屬人格報告已整理好' : '你的核心特質先整理好了'}
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">{summary}</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="score-orb">
              <div className="text-center">
                <p className="text-5xl font-semibold text-[color:var(--text-main)] sm:text-6xl">{score}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[color:var(--text-sub)]">
                  {isUnlocked ? '完整人格分數' : '人格輪廓分數'}
                </p>
              </div>
            </div>
            <div className="w-full max-w-[220px]">
              <div className="energy-bar">
                <div className="energy-fill" style={{ width: `${unlockProgress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {CUSTOMER_FLOW_DISPLAY.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                {item.label}
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-main)]">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {DIMENSION_META.map((dimension) => (
            <div key={dimension.key} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <ProgressBar
                label={dimension.label}
                score={dimensions[dimension.key]}
                description={dimension.description}
                tone={dimension.tone}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {guidanceBlocks.map((block) => (
          <div
            key={block.title}
            className={`fortune-card p-5 ${
              block.tone === 'sky'
                ? 'sky-card'
                : block.tone === 'earth'
                  ? 'earth-card'
                  : 'human-card'
            }`}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">{block.title}</p>
            <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{block.body}</p>
          </div>
        ))}
      </div>

      {!isUnlocked ? (
        <div className="fortune-card human-card p-6 sm:p-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-pink-300">完整分析</p>
            <h3 className="font-serif text-3xl text-[color:var(--text-main)]">想看更完整？補上姓名即可</h3>
            <p className="max-w-2xl text-sm leading-8 text-[color:var(--text-sub)]">
              姓名會讓分析更貼近個人特質。補充後，AI 會整理財富動機、感情模式、優勢與盲點。
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-4">
              <input
                type="text"
                value={name}
                maxLength={20}
                placeholder="輸入姓名，解鎖完整報告"
                onChange={(event) => setName(event.target.value)}
                className="form-input"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    gender === 'male'
                      ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                      : 'border-white/10 bg-white/5 text-[color:var(--text-sub)]'
                  }`}
                >
                  男性
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    gender === 'female'
                      ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                      : 'border-white/10 bg-white/5 text-[color:var(--text-sub)]'
                  }`}
                >
                  女性
                </button>
              </div>

              {(localError || errorMsg) && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-300">
                  {localError || errorMsg}
                </div>
              )}
            </div>

            <div className="rounded-[22px] border border-amber-400/15 bg-amber-950/15 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300">解鎖內容</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--text-main)]">
                <li>姓名特質整合</li>
                <li>財富動機分析</li>
                <li>感情模式分析</li>
                <li>人生優勢與盲點</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="vip-gold-btn flex-1 py-4 text-sm"
            >
              {isUnlocking ? 'AI 正在整理完整報告…' : '查看完整人格報告'}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
            >
              重新輸入資料
            </button>
          </div>
        </div>
      ) : (
        <div className="vip-gold-card rounded-[24px] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300">最終提醒</p>
          <h3 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">以善為本，才能讓命運更順</h3>
          <p className="mt-4 text-sm leading-8 text-[color:var(--text-main)]">
            AI 分析可以幫你看見自己的底層傾向，但真正能讓人生變好的，還是你每天的選擇。
            多行善、守信用、善待關係，才能把好的共鳴真正落到現實裡。
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[22px] border border-amber-400/20 bg-black/15 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200">財富動機</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">
                {vipResult.wealth_motivation_summary}
              </p>
            </div>
            <div className="rounded-[22px] border border-amber-400/20 bg-black/15 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200">感情模式</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">
                {vipResult.love_pattern_summary}
              </p>
            </div>
            <div className="rounded-[22px] border border-amber-400/20 bg-black/15 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200">潛意識盲點</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">
                {vipResult.blind_spot_summary}
              </p>
            </div>
            <div className="rounded-[22px] border border-amber-400/20 bg-black/15 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200">人生優勢</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">
                {vipResult.life_advantage_summary}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.print()}
              className="vip-gold-btn flex-1 py-4 text-sm"
            >
              匯出本次人格報告
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
            >
              重新建立新報告
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
