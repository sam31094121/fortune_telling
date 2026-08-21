'use client';

/** Sticky Action Bar：最多 2 個主要動作 */
export function BaziBottomActions({ active, onTeacher, onFull }: {
  active: 'teacher' | 'full' | null;
  onTeacher: () => void;
  onFull: () => void;
}) {
  return (
    <div className="sticky bottom-3 z-20 mx-auto mt-5 flex max-w-md gap-2 rounded-full border border-white/12 bg-black/90 p-1.5">
      <button
        type="button"
        onClick={onTeacher}
        className={`flex-1 rounded-full py-3 text-sm font-black transition ${active === 'teacher' ? 'bg-amber-200/20 text-amber-50' : 'text-white/60 hover:text-white'}`}
      >
        老師專業
      </button>
      <button
        type="button"
        onClick={onFull}
        className={`flex-1 rounded-full py-3 text-sm font-black transition ${active === 'full' ? 'bg-amber-200/20 text-amber-50' : 'text-white/60 hover:text-white'}`}
      >
        完整命盤
      </button>
    </div>
  );
}
