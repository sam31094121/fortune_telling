'use client';

type TarotCustomQuestionInputProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export default function TarotCustomQuestionInput({ value, error, onChange }: TarotCustomQuestionInputProps) {
  const remaining = 200 - value.length;
  return (
    <label className="mt-5 block" htmlFor="tarot-custom-question">
      <span className="text-sm font-black text-[color:var(--text-main)]">你現在最想釐清的是什麼？</span>
      <textarea
        id="tarot-custom-question"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 200))}
        placeholder="請描述一件目前真正困擾你，或需要決定方向的事情。"
        maxLength={200}
        rows={5}
        className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base leading-7 text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-sky-200/55 focus:bg-black/35"
      />
      <span className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-[color:var(--text-muted)]">
        <span>最少 5 個字，最多 200 個字。</span>
        <span>剩餘 {Math.max(0, remaining)} 字</span>
      </span>
      {error && <span className="mt-4 block rounded-2xl border border-rose-300/25 bg-rose-950/25 px-4 py-3 text-sm font-semibold text-rose-100">{error}</span>}
    </label>
  );
}
