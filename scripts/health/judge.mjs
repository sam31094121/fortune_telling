// 把量測數字變成 PASS／WARN／FAIL／SKIP。純函式，可單元測試。
import { clsFromEntries, round } from './lib.mjs';

export function mkCheck(status, summary, extra = {}) { return { status, summary, ...extra }; }

// 唯讀模式攔下的寫入：Chrome 會記一筆「net::ERR_BLOCKED_BY_CLIENT」，App 可能再記一筆「Failed to fetch」。
// 每攔一筆只抵銷該頁各一則；其餘（包括之後真的連線失敗）照算。
export function filterBlockedConsole(consoleMsgs, blockedOnPage) {
  let netBudget = blockedOnPage || 0, fetchBudget = blockedOnPage || 0;
  const kept = [], absorbed = [];
  for (const c of consoleMsgs) {
    if (netBudget > 0 && /ERR_BLOCKED_BY_CLIENT/.test(c)) { netBudget--; absorbed.push(c); continue; }
    if (fetchBudget > 0 && /Failed to fetch|NetworkError|Load failed/.test(c) && !/ERR_BLOCKED_BY_CLIENT/.test(c)) { fetchBudget--; absorbed.push(c); continue; }
    kept.push(c);
  }
  return { kept, absorbed };
}

// 會被 load 失敗或空白頁拖累的項目：頁面沒載入時這些都不判定（SKIP），避免錯誤頁被當成「品質滿分」。
export const DOM_KEYS = ['cls', 'tap', 'font', 'contrast', 'overflow', 'images', 'lcp', 'visibleError'];

export function judge(m, errs, nav, t, card, opts = {}) {
  const ch = {};
  // 0. 頁面有沒有東西
  const empty = nav.ok && (m.font?.chars || 0) === 0 && (m.tap?.total || 0) === 0 && !(m.media > 0);
  ch.content = !nav.ok ? mkCheck('SKIP', '頁面沒有載入，無法判定內容')
    : empty ? mkCheck('FAIL', '頁面沒有任何可見文字、按鈕或圖片（空白頁）')
    : mkCheck('PASS', `可見文字 ${m.font.chars} 字、點擊目標 ${m.tap.total} 個、圖像元素 ${m.media ?? 0} 個`);
  // 網路／console（頁面沒載入也照判）
  // 主文件本身失敗已由 load 判 FAIL；errors 不再重複算同一件事（含 Chrome 對它記的那一則 console）
  const docHttp = nav.ok ? [] : errs.http.filter((h) => h.type === 'document');
  const docFailed = nav.ok ? [] : (errs.failed || []).filter((f) => f.type === 'document');
  let docBudget = docHttp.length + docFailed.length;
  let httpBad = errs.http.filter((h) => !docHttp.includes(h) && !(card.gated && h.status === 401));
  const envGap = opts.envGapApis ? httpBad.filter((h) => h.status === 503 && opts.envGapApis.some((re) => re.test(h.url))) : [];
  httpBad = httpBad.filter((h) => !envGap.includes(h));
  const { kept } = filterBlockedConsole(errs.console, errs.blockedOnPage || 0);
  // 每個失敗資源 Chrome 會多記一筆「Failed to load resource … 503」console.error；只抵銷同數量的這種訊息
  let budget = envGap.length;
  const consoleErrs = kept.filter((c) => !(budget > 0 && /status of 503/.test(c) && budget--)).filter((c) => !(docBudget > 0 && /Failed to load resource/.test(c) && docBudget--));
  // 網路層失敗（DNS、連線拒絕、CORS、逾時）；ERR_ABORTED 多半是路由切換取消預取，另列不算錯
  const netFailed = (errs.failed || []).filter((f) => !docFailed.includes(f));
  const failed = netFailed.filter((f) => !/ERR_ABORTED/.test(f.error));
  const aborted = netFailed.length - failed.length;
  const n = consoleErrs.length + errs.page.length + httpBad.length + failed.length;
  ch.errors = mkCheck(n ? 'FAIL' : envGap.length ? 'WARN' : 'PASS', (envGap.length ? `本機缺後端設定 503×${envGap.length}（不算故障）；` : '') + `console.error ${consoleErrs.length}、未捕捉例外 ${errs.page.length}、HTTP≥400 ${httpBad.length}、連線失敗 ${failed.length}` + (aborted ? `（另 ${aborted} 個請求被取消，不計）` : '') + (errs.blockedOnPage ? `；唯讀攔下寫入 ${errs.blockedOnPage}` : ''),
    { samples: [...errs.page, ...failed.map((f) => `${f.error} ${f.url}`), ...httpBad.map((h) => `${h.status} ${h.url}`), ...consoleErrs, ...envGap.map((h) => `env-gap ${h.status} ${h.url}`)].slice(0, 6) });
  ch.load = mkCheck(nav.ok ? 'PASS' : 'FAIL', nav.ok ? `文件 ${nav.status}，DOMContentLoaded ${nav.dcl}ms，load ${nav.load}ms` : `載入失敗：${nav.error}`);
  if (!nav.ok || empty) {
    const why = !nav.ok ? `頁面沒有載入（${String(nav.error || '').slice(0, 60)}），未判定` : '空白頁，未判定';
    for (const k of DOM_KEYS) ch[k] = mkCheck('SKIP', why);
    return ch;
  }
  const shifts = m.hc?.shifts || [];
  const { cls, total } = clsFromEntries(shifts);
  const lateSum = round(shifts.filter((s) => !s.hadRecentInput && s.t >= t.lateShiftAfterMs).reduce((x, s) => x + s.value, 0), 4);
  ch.cls = mkCheck(cls < t.clsMax ? 'PASS' : 'FAIL', `CLS ${cls}（總和 ${total}；${t.lateShiftAfterMs / 1000}s 後晚到位移 ${lateSum}）`,
    { value: cls, late: lateSum, samples: shifts.filter((s) => s.value >= 0.005).slice(0, 5).map((s) => `${s.t}ms ${round(s.value, 4)} ${(s.nodes || []).join(',')}`) });
  ch.tap = mkCheck(m.tap.under24 ? 'FAIL' : m.tap.small ? 'WARN' : 'PASS', `${m.tap.small}/${m.tap.total} 個點擊目標 <${t.tapMinPx}px（其中 <24px：${m.tap.under24}）`, { samples: m.tap.samples });
  const tinyN = m.font.tinyCount ?? m.font.tinyRuns.length;
  const fontFail = tinyN > 0 || m.font.share > t.fontSmallShareMax;
  ch.font = mkCheck(fontFail ? 'FAIL' : m.font.smallChars > 0 ? 'WARN' : 'PASS',
    `最小 ${m.font.minPx}px；<${t.fontMinBodyPx}px 字數占 ${round(m.font.share * 100, 1)}%；<${t.fontHardMinPx}px 文字段 ${tinyN}`, { samples: m.font.tinyRuns, share: round(m.font.share, 4) });
  const c = m.contrast;
  const unk = c.unknownBy ? Object.entries(c.unknownBy).filter(([, v]) => v).map(([k, v]) => `${k}×${v}`).join('、') : String(c.unknown);
  ch.contrast = c.checked === 0 ? mkCheck('SKIP', c.unknown ? `所有文字的背景都是圖片或無法解析的顏色，未判定（${unk}）` : '沒有可判定的文字')
    : mkCheck(c.low ? 'FAIL' : c.partial ? 'WARN' : 'PASS', `${c.low || 0}/${c.checked} 段文字未達 AA${c.partial ? `、${c.partial} 段只在漸層部分區域未達` : ''}（其中漸層底 ${c.gradient || 0} 段；另 ${c.unknown} 段未判定${c.unknown ? '：' + unk : ''}）`,
      { samples: [...(c.samples || []), ...(c.low ? [] : c.partialSamples || [])] });
  const ov = m.overflow;
  const pageWide = ov.scrollWidth > ov.vw + 1;
  ch.overflow = mkCheck(pageWide || ov.clipped ? 'FAIL' : 'PASS', `整頁 scrollWidth ${ov.scrollWidth} / 視窗 ${ov.vw}；被視窗邊緣切掉的文字／按鈕 ${ov.clipped || 0} 個`, { samples: [...(ov.samples || []), ...(ov.clippedSamples || [])].slice(0, 6) });
  const im = m.images || { total: 0, broken: 0, samples: [] };
  ch.images = mkCheck(im.broken ? 'FAIL' : 'PASS', im.total ? `${im.broken}/${im.total} 張圖片載入失敗或沒有像素` : '沒有需要檢查的圖片', { samples: im.samples });
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
