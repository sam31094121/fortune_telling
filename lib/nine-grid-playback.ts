/** Backend presentation facts only. Existing birthday/five-grid calculations remain authoritative. */
export interface PlaybackCell {
  digit: number; count: number; added: number;
  state: 'original' | 'added' | 'missing'; label: string; note: string;
}
export interface PlaybackDetail {
  digit: number; title: string; calculation: string; status: string;
  sources: { title: string; steps: string[]; empty: string }[];
}
export interface PlaybackGuide {
  result: { rows: { label: string; value: string }[]; note: string };
  details: PlaybackDetail[];
  frames: { digit: number; source: string; digits: number[]; position: number; cue: string; landing: string }[];
  states: PlaybackCell[][];
  summary: { original: string; added: string; missing: string; completion: string };
}

export function buildPlaybackGuide(initial: { digit: number; count: number }[], sources: { label: string; value: string; digits: number[] }[], birthDate?: string): PlaybackGuide {
  const original = new Map(initial.map((c) => [c.digit, c.count]));
  const counts = new Map(original);
  const snapshot = (): PlaybackCell[] => Array.from({ length: 9 }, (_, i) => {
    const digit = i + 1, before = original.get(digit) ?? 0, count = counts.get(digit) ?? 0;
    const state = before > 0 ? 'original' : count > 0 ? 'added' : 'missing';
    const label = state === 'original' ? '生日已有' : state === 'added' ? '本次補入' : '尚缺';
    return { digit, count, added: count - before, state, label, note: `${digit} 宮 ${label}，目前 ${count} 個，本次已加 ${count - before} 個` };
  });
  const states = [snapshot()];
  const frames: PlaybackGuide['frames'] = [];
  for (const source of sources) source.digits.forEach((digit, position) => {
    const before = counts.get(digit) ?? 0;
    if (digit !== 0) counts.set(digit, before + 1);
    frames.push({ digit, source: `${source.label} ${source.value}`, digits: source.digits, position,
      cue: digit === 0 ? `${source.label}第 ${position + 1} 位是 0 → 不入宮` : `${source.label}第 ${position + 1} 位 ${digit} → 同號 ${digit} 宮`,
      landing: digit === 0 ? '0 沒有對應宮位，次數不變' : `原有 ${before} ＋ 本次 1 ＝ ${before + 1}${before === 0 ? '（首次補入）' : '（重複累計）'}`,
    });
    states.push(snapshot());
  });
  const last = states[states.length - 1];
  const list = (state: PlaybackCell['state']) => last.filter((c) => c.state === state).map((c) => c.digit).join('、') || '無';
  const birthSources = birthDate ? [{ label: '生日', value: birthDate, digits: birthDate.replace(/-/g, '').split('').map(Number) }] : sources;
  const describe = (items: typeof sources, digit: number) => items.flatMap((source) => source.digits.flatMap((d, position) => d === digit ? [`${source.label} ${source.value} → ${source.digits.join(' · ')}；第 ${position + 1} 位 ${digit}`] : []));
  const details = last.map((cell) => ({ digit: cell.digit, title: `${cell.digit} 宮・完整輸入來源`,
    calculation: birthDate ? `生日原有 ${original.get(cell.digit) ?? 0} ＋ 姓名本次 ${cell.added} ＝ 合計 ${cell.count}` : `生日出現 ${cell.count} 次 → 合計 ${cell.count}`,
    status: cell.count === 0 ? '本次資料未出現此數' : cell.state === 'added' && birthDate ? '姓名首次補到此宮' : '此宮已有來源數字',
    sources: [{ title: '生日位數', steps: describe(birthSources, cell.digit), empty: '生日資料未出現此數' }, ...(birthDate ? [{ title: '姓名五格拆數', steps: describe(sources, cell.digit), empty: '姓名五格未出現此數' }] : [])],
  }));
  const countList = (cells: PlaybackCell[], count: (c: PlaybackCell) => number) => cells.filter((c) => count(c) > 0).map((c) => `${c.digit}（${count(c)}次）`).join('、') || '無';
  const result = { rows: [
    { label: '生日原有', value: birthDate ? countList(last, (c) => original.get(c.digit) ?? 0) : countList(last, (c) => c.count) },
    { label: '姓名補入', value: birthDate ? countList(last, (c) => c.added) : '尚未加入姓名資料' },
    ...(birthDate ? [{ label: '首次補到新宮', value: list('added') }, { label: '重複累積', value: countList(last, (c) => Math.max(0, c.added - ((original.get(c.digit) ?? 0) === 0 ? 1 : 0))) }] : []),
    { label: '最後仍缺', value: list('missing') },
  ], note: '缺數僅表示本次輸入未出現該數字' };
  return { frames, states, result, details, summary: { original: list('original'), added: list('added'), missing: list('missing'), completion: last.every((c) => c.count > 0) ? '九宮皆有數字' : '尚未填滿九宮' } };
}
