'use client';

import Link from 'next/link';
import { useState } from 'react';
import HomeTrustCounters from '@/app/components/home-trust/HomeTrustCounters';
import FeedbackPrompt from '@/app/components/home-trust/FeedbackPrompt';
import FeedbackForm from '@/app/components/home-trust/FeedbackForm';

export default function TrustHonestyPage() {
  const [feedbackVote, setFeedbackVote] = useState<'agree' | 'disagree' | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8 text-slate-100 sm:py-12">
      <p className="text-xs font-black tracking-[0.18em] text-amber-200/90">誠信說明</p>
      <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-white sm:text-4xl">
        我們算什麼、不算什麼
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        這頁給想先確認再繼續的人。天宿命理是文化探索工具，不是醫療、法律或投資建議，也不提供確定的人生預測。
      </p>

      <section className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <h2 className="text-lg font-black text-amber-100">我們會做的事</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-200">
          <li>提供今日一關：免費、約 90 秒、免填資料的小整理。</li>
          <li>把你在本機完成的關卡進度記下來，方便明天回來看下一關。</li>
          <li>顯示社群認同／瀏覽等可點開查看的累計數字（詳見首頁信任區）。</li>
          <li>在結果與說明處標示「文化探索・非心理診斷或確定預測」。</li>
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <h2 className="text-lg font-black text-amber-100">我們不算／不承諾的事</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-200">
          <li>不提供醫療診斷、心理諮商替代方案，或法律／財務保證。</li>
          <li>不承諾「一定準」「改命運」「保證結果」。</li>
          <li>不把未完成的關卡進度說成已入帳的永久雲端成就（目前以這台裝置為準）。</li>
          <li>結果頁不拿 VIP、加 LINE 當過關條件。</li>
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <h2 className="text-lg font-black text-amber-100">資料在哪裡</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-200">
          <li>今日關卡進度：主要存在你正在使用的這台裝置瀏覽器（本機）。換裝置可能接不上。</li>
          <li>你若自行輸入生辰、姓名等資料，僅用於當次或該功能所需的分析流程。</li>
          <li>社群認同／瀏覽數字：用於顯示累計互動；詳細算法與對帳若有更新，會寫在首頁信任區與本頁。</li>
        </ul>
      </section>

      {/* 首頁信任統計系統 */}
      <section className="mt-8" id="home-trust-strip">
        <h2 className="text-lg font-black text-amber-100">你覺得我們做得怎樣？</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          你的意見很重要。無論認同或不認同，都幫助我們持續改善。
        </p>
        <div className="mt-4">
          <HomeTrustCounters
            onFeedback={(vote) => {
              setFeedbackVote(vote);
            }}
          />
        </div>
      </section>

      {/* 回饋對話 */}
      {feedbackVote && (
        <FeedbackPrompt
          vote={feedbackVote as 'agree' | 'disagree'}
          onOpenForm={() => setShowForm(true)}
          onClose={() => setFeedbackVote(null)}
        />
      )}

      {/* 回饋表單 */}
      {showForm && feedbackVote && (
        <FeedbackForm
          vote={(feedbackVote === 'agree' ? 'AGREE' : 'DISAGREE') as 'AGREE' | 'DISAGREE'}
          onSubmit={() => {
            setShowForm(false);
            setFeedbackVote(null);
          }}
          onClose={() => {
            setShowForm(false);
            setFeedbackVote(null);
          }}
        />
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/#today-direction-quest"
          className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-sm font-black text-cyan-50"
        >
          回到今日一關
        </Link>
      </div>
    </main>
  );
}
