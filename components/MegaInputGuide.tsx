'use client';

import { useState } from 'react';

type MegaInputGuideProps = {
  title: string;
  steps: string[];
  example?: string;
  tone?: 'cyan' | 'amber' | 'rose' | 'violet' | 'emerald' | 'fuchsia';
  className?: string;
};

export default function MegaInputGuide({
  title,
  steps,
  example,
  tone = 'cyan',
  className = '',
}: MegaInputGuideProps) {
  /**
   * 全站隱藏（2026-08-11 依指示）：
   * 所有頁面的「手機大字填寫引導」卡（含聽引導按鈕）一律不顯示。
   * 在元件源頭關閉＝8 張卡片頁面全部一次生效，不必逐頁尋找。
   * 要恢復時把下面這行 return null 移除即可。
   */
  return null;
  // eslint-disable-next-line no-unreachable
  const [speaking, setSpeaking] = useState(false);
  const spokenText = [title, ...steps, example ? `範例：${example}` : ''].filter(Boolean).join('。');

  function speakGuide() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.86;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className={`mega-input-guide mega-input-guide--${tone} ${className}`} aria-label={title}>
      <div className="mega-input-guide__pulse" aria-hidden="true" />
      <div className="mega-input-guide__content">
        <p className="mega-input-guide__eyebrow">手機大字填寫引導</p>
        <h2>{title}</h2>
        <div className="mega-input-guide__steps">
          {steps.map((step, index) => (
            <span key={step}>
              <b>{index + 1}</b>
              {step}
            </span>
          ))}
        </div>
        {example && <p className="mega-input-guide__example">範例：{example}</p>}
      </div>
      <button
        type="button"
        onClick={speakGuide}
        className="mega-input-guide__voice"
        aria-label={speaking ? '正在朗讀填寫引導' : '朗讀填寫引導'}
      >
        <span aria-hidden="true">{speaking ? 'ON' : '聲'}</span>
        <strong>{speaking ? '朗讀中' : '聽引導'}</strong>
      </button>
    </section>
  );
}
