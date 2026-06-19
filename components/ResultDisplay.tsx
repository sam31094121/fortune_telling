'use client';

import React, { useState, useEffect } from 'react';
import type { AnalysisResult, PreviewAnalysisResult, DimensionScores } from '@/lib/types';
import ProgressBar from './ProgressBar';

interface ResultDisplayProps {
  previewResult: PreviewAnalysisResult;
  vipResult: AnalysisResult | null;
  onUnlock: (name: string) => Promise<void>;
  isUnlocking: boolean;
}

const DIMENSION_LABELS: Record<string, string> = {
  emotion_sensitivity: '情緒敏感度',
  logic: '理性思考力',
  social_need: '社交活躍度',
  leadership: '領導者傾向',
  risk_tendency: '冒險探索心',
  execution: '執行落地力',
  creativity: '創造力潛能',
  empathy: '同理共情力',
  control: '秩序掌控慾',
  security_need: '安全感需求',
  wealth_motivation: '財富原動力',
  attachment: '情感依附度',
};

export default function ResultDisplay({
  previewResult,
  vipResult,
  onUnlock,
  isUnlocking,
}: ResultDisplayProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [unlockTextIdx, setUnlockTextIdx] = useState(0);

  const isUnlocked = vipResult !== null;

  // 大數據加載跑馬燈
  const unlockSteps = [
    '正在對接 Google Gemini 大語言模型...',
    '正在注入「人」維度姓名能量波動...',
    '正在解析三才流年化學反應...',
    '正在重新演算 12 維度人格矩陣...',
    '正在解鎖靈魂聲學與音樂適配模型...',
    'VIP 深度契合報告生成中...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUnlocking) {
      interval = setInterval(() => {
        setUnlockTextIdx((prev) => (prev + 1) % unlockSteps.length);
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isUnlocking]);

  const handleUnlockClick = async () => {
    setError('');
    if (!name.trim()) {
      setError('請輸入姓名以進行人和校正解鎖');
      return;
    }
    if (name.length > 20) {
      setError('姓名長度不可超過 20 個字元');
      return;
    }
    await onUnlock(name);
  };

  const getScoreStyle = (score: number) => {
    if (score >= 75) return 'text-violet-400 border-violet-500';
    if (score >= 50) return 'text-amber-400 border-amber-500';
    return 'text-rose-400 border-rose-500';
  };

  return (
    <div className="space-y-8 animate-rise">
      {/* 1. 載入動畫 (VIP 解鎖中) */}
      {isUnlocking && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="relative flex items-center justify-center">
            {/* 炫光旋轉星盤 */}
            <div className="mystic-spinner">
              <div className="mystic-spinner-inner" />
            </div>
            <div className="absolute h-8 w-8 rounded-full bg-amber-400 animate-ping shadow-[0_0_25px_#c9a24a]" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-serif text-amber-300 animate-pulse-subtle">
              {unlockSteps[unlockTextIdx]}
            </h3>
            <p className="text-xs text-slate-500">正在獲取大數據分析，這大約需要 2-3 秒</p>
          </div>
        </div>
      )}

      {/* 2. 結果面板 (未在解鎖中) */}
      {!isUnlocking && (
        <>
          {/* 整體分數面板 */}
          <div className="flex flex-col items-center">
            {isUnlocked ? (
              // VIP 太陽盤
              <div className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 border-amber-400/80 bg-gradient-to-b from-amber-950/20 to-slate-950 shadow-[0_0_40px_rgba(201,162,74,0.6)] animate-pulse-subtle">
                <span className="text-6xl font-extrabold font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 vip-glow-text">
                  {Math.round(vipResult.resonance_score)}
                </span>
                <span className="mt-1 text-[10px] text-amber-300/80 uppercase tracking-widest font-bold">
                  三才人格共鳴
                </span>
                <span className="absolute -top-3 text-xl text-amber-400">👑</span>
              </div>
            ) : (
              // 免費版預得分
              <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 border-violet-500 bg-slate-950/80 shadow-md">
                <span className="text-5xl font-bold font-serif text-violet-400">
                  {Math.round(previewResult.preview_score)}
                </span>
                <span className="mt-1 text-xs text-slate-400">天地預分析分</span>
              </div>
            )}
            
            <div className="mt-4 text-center">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${
                isUnlocked 
                  ? 'bg-amber-400/10 text-amber-300 border-amber-400/20' 
                  : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
              }`}>
                {isUnlocked ? '✦ 天地人三才圓滿 VIP 報告' : '✧ 免費天地雙層解碼報告'}
              </span>
            </div>
          </div>

          {/* 12 維度人格圖表 */}
          <div className="space-y-4">
            <h3 className={`text-base font-serif font-semibold border-b pb-2 ${
              isUnlocked ? 'text-amber-300 border-amber-400/20' : 'text-violet-300 border-violet-500/15'
            }`}>
              📊 12 維度大數據性格剖面
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.keys(DIMENSION_LABELS).map((key) => {
                const k = key as keyof DimensionScores;
                // 如果解鎖，使用 final_scores，否則使用 preview_scores
                const score = isUnlocked ? vipResult.final_scores[k] : previewResult.preview_scores[k];
                
                // 決定色調
                let tone: 'sky' | 'earth' | 'human' | 'love' = 'sky';
                if (isUnlocked) {
                  if (key === 'attachment' || key === 'empathy') tone = 'love';
                  else if (key === 'wealth_motivation' || key === 'leadership') tone = 'earth';
                  else if (key === 'creativity' || key === 'logic') tone = 'human';
                }

                return (
                  <div key={key} className={`p-3.5 rounded-xl border transition-all duration-300 ${
                    isUnlocked ? 'border-amber-400/10 bg-amber-400/5' : 'border-white/5 bg-white/5'
                  }`}>
                    <ProgressBar
                      label={DIMENSION_LABELS[key]}
                      score={score}
                      description={`${Math.round(score)}%`}
                      tone={tone}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 摘要描述區塊 */}
          <div className="space-y-4">
            <div className="fortune-card p-5 space-y-3">
              <span className="text-xs text-violet-400 uppercase tracking-wider">天之維度 · 人格骨架 (生日)</span>
              <p className="text-sm leading-relaxed text-slate-200">
                {isUnlocked ? vipResult.skeleton_summary : previewResult.skeleton_summary}
              </p>
            </div>

            <div className="fortune-card p-5 space-y-3">
              <span className="text-xs text-amber-400 uppercase tracking-wider">地之維度 · 行為傾向 (血型)</span>
              <p className="text-sm leading-relaxed text-slate-200">
                {isUnlocked ? vipResult.behavior_summary : previewResult.behavior_summary}
              </p>
            </div>

            {/* 天地預分析摘要 (僅免費版顯示) */}
            {!isUnlocked && (
              <div className="fortune-card p-5 border-violet-500/20 bg-violet-950/5 space-y-3">
                <span className="text-xs text-violet-300 uppercase tracking-wider font-semibold">天地解碼 · 階段性總結</span>
                <p className="text-sm leading-relaxed text-slate-200">
                  {previewResult.preview_summary}
                </p>
              </div>
            )}
          </div>

          {/* VIP 內容展示 (已解鎖) / 解鎖引導 (未解鎖) */}
          {isUnlocked ? (
            // ── VIP 獨享奢華內容 ──
            <div className="space-y-6 animate-rise">
              {/* 人之維度描述 */}
              <div className="fortune-card p-5 border-pink-500/20 space-y-3">
                <span className="text-xs text-pink-400 uppercase tracking-wider">人之維度 · 姓名校正 (人和)</span>
                <p className="text-sm leading-relaxed text-slate-200">
                  {vipResult.individuality_summary}
                </p>
              </div>

              {/* 深度性格透視 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 space-y-2">
                  <span className="text-xs text-emerald-400 font-semibold">🌟 核心人生優勢</span>
                  <p className="text-xs leading-relaxed text-slate-300">{vipResult.life_advantage_summary}</p>
                </div>
                <div className="p-5 rounded-2xl border border-rose-500/10 bg-rose-500/5 space-y-2">
                  <span className="text-xs text-rose-400 font-semibold">⚠️ 潛在人格盲點</span>
                  <p className="text-xs leading-relaxed text-slate-300">{vipResult.blind_spot_summary}</p>
                </div>
                <div className="p-5 rounded-2xl border border-pink-500/10 bg-pink-500/5 space-y-2">
                  <span className="text-xs text-pink-400 font-semibold">💖 情感互動模式</span>
                  <p className="text-xs leading-relaxed text-slate-300">{vipResult.love_pattern_summary}</p>
                </div>
                <div className="p-5 rounded-2xl border border-amber-500/10 bg-amber-500/5 space-y-2">
                  <span className="text-xs text-amber-300 font-semibold">💰 財富事業動機</span>
                  <p className="text-xs leading-relaxed text-slate-300">{vipResult.wealth_motivation_summary}</p>
                </div>
              </div>

              {/* 靈魂音樂調性分析 */}
              <div className="fortune-card p-6 border-cyan-500/20 bg-cyan-950/5 space-y-5">
                <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-3">
                  <span className="text-xl">🎵</span>
                  <h3 className="font-serif text-base font-bold text-cyan-300">靈魂音樂聲學配對報告</h3>
                </div>

                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-slate-200 italic">
                    "{vipResult.music_profile.listeningSummary}"
                  </p>
                  
                  {/* 聲學屬性 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                      <span className="block text-[10px] text-slate-500">速度特徵</span>
                      <span className="font-bold text-cyan-400">{vipResult.music_profile.soundProfile.tempo}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                      <span className="block text-[10px] text-slate-500">張力強度</span>
                      <span className="font-bold text-cyan-400">{vipResult.music_profile.soundProfile.intensity}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                      <span className="block text-[10px] text-slate-500">情緒深度</span>
                      <span className="font-bold text-cyan-400">{vipResult.music_profile.soundProfile.emotionDepth}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                      <span className="block text-[10px] text-slate-500">結構複雜度</span>
                      <span className="font-bold text-cyan-400">{vipResult.music_profile.soundProfile.structure}</span>
                    </div>
                  </div>

                  {/* 推薦音樂流派卡片 */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs text-slate-400">大數據最契合的 3 大音樂風格：</span>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {vipResult.music_profile.topGenres.map((genre, idx) => (
                        <div key={genre.key} className="bg-slate-950 border border-cyan-500/10 p-3.5 rounded-xl space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-base">{genre.emoji}</span>
                              <span className="text-[10px] font-bold text-cyan-400">#{idx+1}</span>
                            </div>
                            <h4 className="font-bold text-slate-200 text-sm mt-1">{genre.name}</h4>
                            <p className="text-[10px] text-slate-400 leading-normal mt-1">{genre.soundDesc}</p>
                          </div>
                          <div className="border-t border-white/5 pt-2 mt-2">
                            <span className="block text-[9px] text-slate-500">推薦藝人</span>
                            <span className="text-[10px] font-semibold text-slate-300">{genre.artists.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 天地人導師智慧指引 - 金色呼吸邊框 */}
              <div className="vip-gold-card p-6 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 border-b border-amber-400/20 pb-3">
                  <span className="text-xl">🧙‍♂️</span>
                  <h3 className="font-serif text-lg font-bold text-amber-300">天地人三才 · 導師智慧心性指引</h3>
                </div>
                <p className="leading-relaxed text-sm text-slate-200 font-sans tracking-wide">
                  {vipResult.wisdom_perspective}
                </p>
              </div>

              {/* 動作按鈕 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 vip-gold-btn py-3.5 text-sm"
                >
                  💾 儲存並列印 VIP 深度報告
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex-1 border border-white/10 hover:border-white/20 bg-white/5 py-3 rounded-full text-sm font-semibold text-slate-300 transition-colors"
                >
                  🔄 重新解碼他人
                </button>
              </div>
            </div>
          ) : (
            // ── 未解鎖，奢華 VIP 鎖定區 ──
            <div className="relative">
              {/* 預覽模糊卡片 */}
              <div className="space-y-6 opacity-25 select-none pointer-events-none filter blur-[2px]">
                <div className="fortune-card p-5">
                  <span className="text-xs uppercase text-slate-400">人之維度 · 姓名校正</span>
                  <p className="mt-2 text-sm text-slate-400">輸入姓名以融入人和力量...</p>
                </div>
                <div className="p-5 rounded-2xl border border-white/5">
                  <span className="text-xs text-slate-400">🔮 完整報告加值</span>
                  <p className="text-xs mt-1 text-slate-500">完整解鎖感情、財富、潛在盲點等人生課題剖析...</p>
                </div>
                <div className="p-5 bg-white/5 rounded-xl border border-white/5">
                  <h3 className="font-semibold text-slate-400">靈魂音樂聲學配對</h3>
                  <p className="mt-2 text-sm text-slate-500">解鎖你的人格聲學圖譜與喜好匹配...</p>
                </div>
              </div>

              {/* VIP 鎖定遮罩層，內建直接姓名輸入與解鎖 */}
              <div className="vip-locked-overlay absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/30 shadow-[0_0_15px_rgba(201,162,74,0.3)]">
                  <span className="text-xl text-amber-300 animate-pulse-subtle">🔒</span>
                </div>
                <h3 className="text-lg font-serif text-amber-300 mb-2">解鎖 VIP 天地人三才完整報告</h3>
                <p className="max-w-md text-xs leading-relaxed text-slate-300 mb-5 px-4">
                  已完成天地預解碼。立即輸入姓名（人之維度）進行三才正規化演算，
                  一次解鎖「智慧人生洞見」、「最終共鳴度」、「核心特質加值」及「靈魂聲學音樂報告」。
                </p>

                {/* 姓名輸入與解鎖按鈕一體化 */}
                <div className="w-full max-w-sm space-y-3 px-4">
                  <input
                    type="text"
                    placeholder="請輸入解鎖姓名 (例如：王大明)"
                    value={name}
                    maxLength={20}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input text-center text-sm border-amber-400/30 focus:border-amber-400/70 focus:box-shadow-[0_0_15px_rgba(201,162,74,0.25)] placeholder-slate-500 bg-slate-950/80"
                  />
                  {error && <p className="text-xs text-rose-400 animate-pulse">{error}</p>}
                  
                  <button
                    type="button"
                    onClick={handleUnlockClick}
                    className="vip-gold-btn w-full py-3.5 text-sm shadow-[0_0_20px_rgba(201,162,74,0.4)]"
                  >
                    👑 立即解鎖 VIP 深度報告
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
