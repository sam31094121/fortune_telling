// 把量測數字變成 PASS／WARN／FAIL／SKIP。純函式，可單元測試。
import { clsFromEntries, round } from './lib.mjs';

export function mkCheck(status, summary, extra = {}) { return { status, summary, ...extra }; }

export function judge(m, errs, nav, t, card, opts = {}) {
  const ch = {};
  const shifts = m.hc?.shifts || [];
  const { cls, total } = clsFromEntries(shifts);
  const lateSum = round(shifts.filter((s) => !s.hadRecentInput && s.t >= t.lateShiftAfterMs).reduce((x, s) => x + s.value, 0), 4);
  ch.cls = mkCheck(cls < t.clsMax ? 'PASS' : 'FAIL', `CLS ${cls}（總和 ${total}；${t.lateShiftAfterMs / 1000}s 後晚到位移 ${lateSum}）`,
    { value: cls, late: lateSum, samples: shifts.filter((s) => s.value >= 0.005).slice(0, 5).map((s) => `${s.t}ms ${round(s.value, 4)} ${(s.nodes || []).join(',')}`) });
  ch.tap = mkCheck(m.tap.under24 ? 'FAIL' : m.tap.small ? 'WARN' : 'PASS', `${m.tap.small}/${m.tap.total} 個點擊目標 <${t.tapMinPx}px（其中 <24px：${m.tap.under24}）`, { samples: m.tap.samples });
  const fontFail = m.font.tinyRuns.length > 0 || m.font.share > t.fontSmallShareMax;
  ch.font = mkCheck(fontFail ? 'FAIL' : m.font.smallChars > 0 ? 'WARN' : 'PASS',
    `最小 ${m.font.minPx}px；<${t.fontMinBodyPx}px 字數占 ${round(m.font.share * 100, 1)}%；<${t.fontHardMinPx}px 文字段 ${m.font.tinyRuns.length}`, { samples: m.font.tinyRuns, share: round(m.font.share, 4) });
  ch.contrast = m.contrast.checked === 0 ? mkCheck('SKIP', `背景皆為圖片／漸層，無法自動判定（${m.contrast.unknown} 段）`)
    : mkCheck(m.contrast.low ? 'FAIL' : 'PASS', `${m.contrast.low}/${m.contrast.checked} 段文字未達 AA（另 ${m.contrast.unknown} 段背景為圖片，未判定）`, { samples: m.contrast.samples });
  ch.overflow = mkCheck(m.overflow.scrollWidth > m.overflow.vw + 1 ? 'FAIL' : 'PASS', `scrollWidth ${m.overflow.scrollWidth} / 視窗 ${m.overflow.vw}`, { samples: m.overflow.samples });
  let httpBad = errs.http.filter((h) => !(card.gated && h.status === 401));
  const envGap = opts.envGapApis ? httpBad.filter((h) => h.status === 503 && opts.envGapApis.some((re) => re.test(h.url))) : [];
  httpBad = httpBad.filter((h) => !envGap.includes(h));
  // 每個失敗資源 Chrome 會多記一筆「Failed to load resource … 503」console.error；只抵銷同數量的這種訊息
  let budget = envGap.length;
  const consoleErrs = errs.console.filter((c) => !(budget > 0 && /status of 503/.test(c) && budget--));
  const n = consoleErrs.length + errs.page.length + httpBad.length;
  ch.errors = mkCheck(n ? 'FAIL' : envGap.length ? 'WARN' : 'PASS', (envGap.length ? `本機缺後端設定 503×${envGap.length}（不算故障）；` : '') + `console.error ${consoleErrs.length}、未捕捉例外 ${errs.page.length}、HTTP≥400 ${httpBad.length}`,
    { samples: [...errs.page, ...httpBad.map((h) => `${h.status} ${h.url}`), ...consoleErrs, ...envGap.map((h) => `env-gap ${h.status} ${h.url}`)].slice(0, 6) });
  ch.load = mkCheck(nav.ok ? 'PASS' : 'FAIL', nav.ok ? `文件 ${nav.status}，DOMContentLoaded ${nav.dcl}ms，load ${nav.load}ms` : `載入失敗：${nav.error}`);
  const lcp = m.hc?.lcp || 0;
  ch.lcp = !lcp ? mkCheck('SKIP', '瀏覽器沒有回報 LCP') : mkCheck(lcp <= t.lcpGoodMs ? 'PASS' : lcp <= t.lcpPoorMs ? 'WARN' : 'FAIL', `LCP ${lcp}ms`, { value: lcp });
  ch.visibleError = mkCheck(m.visibleError ? 'FAIL' : 'PASS', m.visibleError ? `頁面顯示「${m.visibleError}」` : '沒有錯誤字樣');
  return ch;
}

// 早滑判定：ys = [[t, scrollY]...]（手勢結束後）。被拉回 = 從目前高點往回掉超過 pullbackPx。
export function judgeEarlySwipe(ys, startY, t) {
  let peak = ys.length ? ys[0][1] : 0, pullbacks = 0, worst = 0;
  for (const [, y] of ys) { if (y > peak) peak = y; const drop = peak - y; if (drop > t.earlySwipePullbackPx) { pullbacks++; worst = Math.max(worst, drop); peak = y; } }
  const reached = ys.length ? Math.max(...ys.map(([, y]) => y)) : 0;
  const finalY = ys.length ? ys[ys.length - 1][1] : 0;
  const status = reached - startY < 300 ? 'WARN' : pullbacks ? 'FAIL' : 'PASS';
  return { status, pullbacks, worst, reached, finalY };
}
