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
  let consoleErrs = kept.filter((c) => !(budget > 0 && /status of 503/.test(c) && budget--)).filter((c) => !(docBudget > 0 && /Failed to load resource/.test(c) && docBudget--));
  // 同一個失敗資源 Chrome 會在 console 再記一筆「Failed to load resource: … status of N」——和 HTTP≥400 那列是同一件事，只算一次
  const httpBudget = new Map(); for (const h of httpBad) httpBudget.set(h.status, (httpBudget.get(h.status) || 0) + 1);
  consoleErrs = consoleErrs.filter((c) => { const mm = /Failed to load resource: the server responded with a status of (\d+)/.exec(c); if (!mm) return true; const k = Number(mm[1]); const n = httpBudget.get(k) || 0; if (n > 0) { httpBudget.set(k, n - 1); return false; } return true; });
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
  ch.tap = judgeTap(m, t);
  ch.font = judgeFont(m, t);
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
  if (m.a11y) ch.a11y = judgeA11y(m.a11y);
  if (opts.tbtMs !== undefined && opts.tbtMs !== null) ch.tbt = judgeTbt(opts.tbtMs, t, opts.tbtWindowMs);
  return ch;
}

// 點擊目標：<24px 一律 FAIL（WCAG 2.5.8 AA）；<tapMinPx 是 WARN。tapMinPx ≤ 24（桌機提案）時只剩 <24 那一級。
export function judgeTap(m, t) {
  const small = t.tapMinPx <= 24 ? m.tap.under24 : m.tap.small;
  return mkCheck(m.tap.under24 ? 'FAIL' : small ? 'WARN' : 'PASS', `${small}/${m.tap.total} 個點擊目標 <${t.tapMinPx}px（其中 <24px：${m.tap.under24}）`, { samples: m.tap.samples });
}

// 字級：用量測時的字級分布重算，所以同一份量測可以套不同門檻（桌機試算）。
export function judgeFont(m, t) {
  const sizes = m.font.sizes || {};
  const chars = m.font.chars || 0;
  const small = m.font.tinyBy && t.fontMinBodyPx !== 14 ? Object.entries(sizes).filter(([px]) => Number(px) < t.fontMinBodyPx).reduce((a, [, n]) => a + n, 0) : m.font.smallChars;
  const share = chars ? small / chars : 0;
  const tinyN = m.font.tinyBy && t.fontHardMinPx !== 12 ? Object.entries(m.font.tinyBy).filter(([px]) => Number(px) < t.fontHardMinPx).reduce((a, [, n]) => a + n, 0) : (m.font.tinyCount ?? m.font.tinyRuns.length);
  const fail = tinyN > 0 || share > t.fontSmallShareMax;
  return mkCheck(fail ? 'FAIL' : small > 0 ? 'WARN' : 'PASS', `最小 ${m.font.minPx}px；<${t.fontMinBodyPx}px 字數占 ${round(share * 100, 1)}%；<${t.fontHardMinPx}px 文字段 ${tinyN}`, { samples: m.font.tinyRuns, share: round(share, 4) });
}

export function judgeA11y(x) {
  const fail = x.noName + x.noLabel + (x.lang ? 0 : 1);
  const warn = x.noAlt + x.dupIds;
  return mkCheck(fail ? 'FAIL' : warn ? 'WARN' : 'PASS', `沒有名稱的按鈕／連結 ${x.noName}、沒有標籤的欄位 ${x.noLabel}、<html lang> ${x.lang || '缺'}、缺 alt 的圖 ${x.noAlt}、重複 id ${x.dupIds}`, { samples: x.samples || [] });
}

// TBT 代理值：觀察期間長任務超過 50ms 的部分總和（Lighthouse：≤200ms 好、>600ms 差）。無頭瀏覽器＋並行會偏高，只當代理。
export function tbtFrom(longtasks, from = 0, to = Infinity) { return (longtasks || []).filter((x) => x.t >= from && x.t <= to).reduce((a, x) => a + Math.max(0, x.d - 50), 0); }
export function judgeTbt(ms, t, windowMs) {
  if (ms == null || !Number.isFinite(ms)) return mkCheck('SKIP', '瀏覽器沒有提供長任務資料，未判定');
  return mkCheck(ms <= t.tbtGoodMs ? 'PASS' : ms <= t.tbtPoorMs ? 'WARN' : 'FAIL', `長任務阻塞 ${Math.round(ms)}ms（TBT 代理值${windowMs ? `，觀察 ${Math.round(windowMs / 1000)}s` : ''}；≤${t.tbtGoodMs} 好、>${t.tbtPoorMs} 差）`, { value: Math.round(ms) });
}

// 五語：切到該語言後，畫面不能壞（空白、錯誤字樣、程式值外露）；<html lang> 要跟著換。沒翻到的句子保留繁中是設計（另列比例，不扣分）。
export function judgeI18n(results) {
  const bad = results.filter((r) => r.status === 'FAIL'), warn = results.filter((r) => r.status === 'WARN');
  const st = !results.length ? 'SKIP' : bad.length ? 'FAIL' : warn.length ? 'WARN' : 'PASS';
  return mkCheck(st, results.map((r) => `${r.lang} ${r.status}${r.note ? '（' + r.note + '）' : ''}`).join('；'), { samples: results.flatMap((r) => r.samples || []).slice(0, 6), perLang: results });
}
// <html lang> 只要主語言（＋繁簡）對得上就算對：en 接受 en、en-US；zh-Hans 接受 zh-Hans、zh-CN、zh-SG
const ZH = { 'zh-Hant': /^zh-(hant|tw|hk|mo)\b/i, 'zh-Hans': /^zh-(hans|cn|sg)\b/i };
export function langMatches(want, got) {
  if (!got) return false;
  if (ZH[want]) return ZH[want].test(got);
  return got.toLowerCase().split('-')[0] === want.toLowerCase().split('-')[0];
}
export function judgeOneLang(lang, m, nav, errsN) {
  if (!nav.ok) return { lang, status: 'SKIP', note: '沒有載入' };
  const notes = [], samples = [];
  let st = 'PASS';
  if ((m.font?.chars || 0) === 0) { st = 'FAIL'; notes.push('空白'); }
  if (m.visibleError) { st = 'FAIL'; notes.push(`顯示「${m.visibleError}」`); }
  if (m.i18n?.rawTokens?.length) { st = 'FAIL'; notes.push(`程式值外露 ${m.i18n.rawTokens.length}`); samples.push(...m.i18n.rawTokens.map((x) => `${lang}: ${x}`)); }
  if (errsN) { st = 'FAIL'; notes.push(`頁面錯誤 ${errsN}`); }
  if (st === 'PASS' && m.i18n && !langMatches(lang, m.i18n.lang)) { st = 'WARN'; notes.push(`<html lang>=${m.i18n.lang || '缺'}`); }
  if (['en', 'ja', 'ko'].includes(lang) && m.i18n) notes.push(`仍為中文字 ${Math.round(m.i18n.hanShare * 100)}%`);
  return { lang, status: st, note: notes.join('、'), samples, hanShare: m.i18n?.hanShare ?? null };
}

// 早滑判定：ys = [[t, scrollY]...]（手勢結束後）。被拉回 = 從目前高點往回掉超過 pullbackPx。
export function judgeEarlySwipe(ys, startY, t, { programmatic = false } = {}) {
  let peak = ys.length ? ys[0][1] : 0, pullbacks = 0, worst = 0;
  for (const [, y] of ys) { if (y > peak) peak = y; const drop = peak - y; if (drop > t.earlySwipePullbackPx) { pullbacks++; worst = Math.max(worst, drop); peak = y; } }
  const reached = ys.length ? Math.max(...ys.map(([, y]) => y)) : 0;
  const finalY = ys.length ? ys[ys.length - 1][1] : 0;
  // 只有程式捲動（真的手勢、滾輪都沒捲動）時，沒被拉回也只能 WARN：沒有模擬到使用者滑動
  const status = reached - startY < 300 ? 'WARN' : pullbacks ? 'FAIL' : programmatic ? 'WARN' : 'PASS';
  return { status, pullbacks, worst, reached, finalY, programmatic };
}
