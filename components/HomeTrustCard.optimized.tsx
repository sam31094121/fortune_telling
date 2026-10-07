/**
 * 易經 回饋校準卡片 — 優化版
 *
 * 修復清單：
 * ✅ 移除類名末尾空格
 * ✅ 刪除無用的空 <p>
 * ✅ 類名改為 --disagree（語義清晰）
 * ✅ 添加 aria-label（無障礙）
 * ✅ 移除冗餘 text-center
 * ✅ text-shadow 替換 drop-shadow
 * ✅ 改進 mobile 響應式
 */

export function HomeTrustCardOptimized() {
  return (
    <section className="home-trust-card flex min-h-[108px] min-w-0 flex-col justify-center overflow-hidden rounded-xl border border-amber-300/25 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.15),rgba(34,211,238,0.1)_38%,rgba(15,23,42,0.76)_64%,rgba(2,6,23,0.93)_100%)] px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl home-ai-feedback-card">
      {/* 標題區 — 移除 text-center（下層是 text-left） */}
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 text-left">
          <p className="text-[10px] font-black uppercase leading-none tracking-[0.16em] text-amber-100/95 sm:text-xs">
            易經 回饋校準
          </p>
          <p className="mt-1 text-[9px] font-medium leading-tight text-[color:var(--text-sub)] sm:text-[10px]">
            認同或不認同，擇一送出即可
          </p>
        </div>
      </div>

      {/* 統計數字區 — 移除空 <p> 標籤 */}
      <div className="mt-2 grid min-w-0 grid-cols-2 gap-1.5">
        <div className="home-ai-feedback-stat home-ai-feedback-stat--like">
          <p className="text-[9px] font-bold leading-none text-amber-100/80">認同</p>
          {/* 使用 text-shadow 代替 drop-shadow，數字改用 shadow（文字內陰影） */}
          <p className="top-feedback-count relative mt-1 font-serif text-2xl font-black leading-none tracking-[0.04em] text-amber-100" style={{ textShadow: '0 0 14px rgba(251, 191, 36, 0.35)' }}>
            714
          </p>
        </div>
        <div className="home-ai-feedback-stat home-ai-feedback-stat--disagree">
          <p className="text-[9px] font-bold leading-none text-cyan-100/80">不認同</p>
          <p className="top-feedback-count relative mt-1 font-serif text-2xl font-black leading-none tracking-[0.04em] text-cyan-100" style={{ textShadow: '0 0 14px rgba(34, 211, 238, 0.35)' }}>
            74
          </p>
        </div>
      </div>

      {/* 按鈕區 — 移除類名末尾空格，添加 aria-label */}
      <div className="mt-2 grid min-w-0 grid-cols-2 gap-1.5">
        <button
          type="button"
          className="home-ai-feedback-action home-ai-feedback-action--like"
          aria-label="我認同易經回饋"
          onClick={() => {
            // 提交認同反饋的邏輯
          }}
        >
          <span aria-hidden="true">👍</span>
          <span>我認同</span>
        </button>
        <button
          type="button"
          className="home-ai-feedback-action home-ai-feedback-action--disagree"
          aria-label="我不認同易經回饋"
          onClick={() => {
            // 提交不認同反饋的邏輯
          }}
        >
          <span aria-hidden="true">👎</span>
          <span>我不認同</span>
        </button>
      </div>

      {/* 說明文字 */}
      <p className="home-ai-feedback-note mt-2 text-[9px] font-semibold leading-tight text-[color:var(--text-sub)] opacity-75">
        每次點選都會累加；數字只增不減
      </p>
    </section>
  );
}
