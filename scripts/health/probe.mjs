// 在瀏覽器裡執行的量測程式（以字串注入，不修改任何頁面程式）。
import { parseColor, blendOver, relLuminance, contrastRatio, isLargeText, colorTokens, gradientStops, contrastRange } from './lib.mjs';

// 頁面載入前注入：記錄 layout-shift、LCP、scrollY 軌跡，以及誰呼叫了捲動。
export const INIT_SCRIPT = `(() => {
  const H = window.__hc = { shifts: [], lcp: 0, ys: [], calls: [], t0: performance.now() };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) H.shifts.push({ t: Math.round(e.startTime), value: e.value, hadRecentInput: e.hadRecentInput,
    nodes: (e.sources || []).slice(0, 3).map((s) => s.node && s.node.nodeType === 1 ? (s.node.tagName + '.' + String(s.node.className || '').slice(0, 50)) : (s.node ? '#text' : '?')) }); })
    .observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) H.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  const rec = (kind) => H.calls.length < 50 && H.calls.push({ t: Math.round(performance.now()), kind, y: Math.round(scrollY), stack: (new Error().stack || '').split('\\n').slice(2, 5).join(' | ').slice(0, 300) });
  for (const [o, n] of [[window, 'scrollTo'], [window, 'scroll'], [window, 'scrollBy'], [Element.prototype, 'scrollIntoView']]) {
    const f = o[n]; o[n] = function (...a) { if (!window.__hcSelfScroll) rec(n); return f.apply(this, a); };
  }
  // 穩定即止：最後一次 DOM 變動時間；長任務（TBT 代理值）
  H.lastMut = 0; H.muts = 0; H.longtasks = [];
  try { new MutationObserver(() => { H.lastMut = performance.now(); H.muts++; }).observe(document, { childList: true, subtree: true, characterData: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (H.longtasks.length < 500) H.longtasks.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  const tick = () => { if (H.ys.length < 3000) { H.ys.push([Math.round(performance.now()), Math.round(scrollY)]); requestAnimationFrame(tick); } };
  requestAnimationFrame(tick);
})();`;

const COLOR_FNS = [parseColor, blendOver, relLuminance, contrastRatio, isLargeText, colorTokens, gradientStops, contrastRange].map((f) => f.toString()).join('\n');

// 收集一頁的靜態量測：內容量、點擊目標、字級、對比、溢出／裁切、破圖、可見錯誤字。
export function metricsScript(opts) {
  return `(() => { ${COLOR_FNS}
  const o = ${JSON.stringify(opts)};
  const vw = innerWidth, cw = document.documentElement.clientWidth || innerWidth;
  // canvas 轉色：oklch()／color-mix()／lab() 等 computed style 不是 rgb 的顏色，交給瀏覽器自己換成 sRGB
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true }); const cc = new Map();
  const canvasColor = (s) => { if (!s || !cx) return null; if (cc.has(s)) return cc.get(s); let v = null;
    try { cx.fillStyle = '#010203'; cx.fillStyle = s; const ok = cx.fillStyle !== '#010203' || /^#010203$/i.test(s); if (ok) { cx.clearRect(0, 0, 1, 1); cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; v = { r: d[0], g: d[1], b: d[2], a: Math.round(d[3] / 255 * 1000) / 1000 }; } } catch (e) {}
    cc.set(s, v); return v; };
  const PC = (s) => parseColor(s) || (/^(transparent|rgba\\(0, 0, 0, 0\\))$/.test(String(s)) ? null : canvasColor(s));
  // 祖先 opacity:0／visibility:hidden 也算看不見（checkVisibility 會往上看）
  const visible = (el) => { if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    if (el.closest('[aria-hidden="true"],[inert]')) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = (el) => { const t = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('alt') || el.value || '').replace(/\\s+/g, ' ').trim().slice(0, 16);
    return el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' "' + t + '"'; };
  // 元素位置：CSS 路徑（最多 4 層、含 nth-child）＋文件座標與大小，報告裡找得到是哪一個
  const cssPath = (el) => { const parts = []; for (let e = el, i = 0; e && e.nodeType === 1 && e !== document.body && i < 4; e = e.parentElement, i++) {
      if (e.id) { parts.unshift(e.tagName.toLowerCase() + '#' + e.id); break; }
      const p = e.parentElement; const k = p ? [...p.children].indexOf(e) + 1 : 1; const c = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/)[0] : '';
      parts.unshift(e.tagName.toLowerCase() + c + ':nth-child(' + k + ')'); }
    return parts.join('>'); };
  const where = (el) => { const r = el.getBoundingClientRect(); return cssPath(el) + ' @' + Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); };
  // 問題元素的位置（失敗截圖時畫框用）
  const marks = []; const mark = (el, kind) => { if (marks.length >= 12) return; const r = el.getBoundingClientRect(); marks.push({ kind, x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }); };
  // 同一元素文字重複出現時合併計數；附第一個出現的位置
  const bag = () => { const m = new Map(); return { add: (k, el) => { const v = m.get(k); if (v) v.n++; else m.set(k, { n: 1, at: el ? where(el) : '' }); }, size: () => m.size,
    list: (n) => [...m].slice(0, n).map(([k, v]) => k + (v.n > 1 ? ' ×' + v.n : '') + (v.at ? ' ｜ ' + v.at : '')) }; };
  // 1. 點擊目標
  const TAP = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=radio],[onclick]';
  const small = bag(); let tapTotal = 0, under24 = 0, smallN = 0; const tapEls = [];
  for (const el of document.querySelectorAll(TAP)) {
    if (!visible(el) || el.disabled) continue;
    const cs = getComputedStyle(el);
    if (cs.pointerEvents === 'none') continue;
    tapEls.push(el);
    // 句中文字連結屬 WCAG 2.5.8 例外
    if (el.tagName === 'A' && cs.display === 'inline' && el.parentElement && (el.parentElement.innerText || '').length > (el.innerText || '').length + 20) continue;
    const r = el.getBoundingClientRect(); tapTotal++;
    if (r.width < o.tapMinPx || r.height < o.tapMinPx) { smallN++; if (r.width < 24 || r.height < 24) { under24++; mark(el, 'tap'); } small.add(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height), el); }
  }
  // 2/3. 字級與對比（逐個文字節點）
  const sizes = {}; let chars = 0, smallChars = 0, minPx = 99; const tiny = bag(); let tinyN = 0; const tinyBy = {};
  const lowC = bag(), partC = bag(); let cChecked = 0, cLow = 0, cPartial = 0, cGrad = 0; const cUnknown = { image: 0, 'color-fn': 0, unparsed: 0, 'gradient-text': 0, fg: 0 }; const seen = new Set(); const textEls = new Set();
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue.replace(/\\s+/g, ''); if (!text) continue;
    const el = n.parentElement; if (!el) continue;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'TEMPLATE'].includes(el.tagName) || !visible(el)) continue;
    const cs = getComputedStyle(el); const px = parseFloat(cs.fontSize);
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || (cs.position === 'absolute' && el.getBoundingClientRect().width <= 1)) continue; // 螢幕閱讀器專用
    textEls.add(el);
    chars += text.length; sizes[Math.round(px)] = (sizes[Math.round(px)] || 0) + text.length; if (px < minPx) minPx = px;
    if (px < o.fontMinBodyPx) smallChars += text.length;
    if (px < o.fontMinBodyPx && text.length >= 4) tinyBy[Math.round(px * 2) / 2] = (tinyBy[Math.round(px * 2) / 2] || 0) + 1; // 給桌機門檻試算
    if (px < o.fontHardMinPx && text.length >= 4) { tinyN++; mark(el, 'font'); tiny.add(label(el) + ' ' + px + 'px', el); }
    if (seen.has(el) || seen.size > 3000) continue; seen.add(el);
    let fg = PC(cs.color); if (!fg) { cUnknown.fg++; continue; }
    if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') { cUnknown['gradient-text']++; continue; }
    fg = { ...fg, a: fg.a * Number(cs.opacity || 1) };
    const fill = PC(cs.webkitTextFillColor); if (fill && fill.a === 0 && fg.a > 0) fg = { ...fg, a: 0 };
    // 由文字往上收背景層（每個元素：背景圖在上、背景色在下），遇到不透明純色就停。
    const layers = []; let unknown = null, opaque = null, grad = false;
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      // 祖先用 background-clip:text 做漸層字：那層背景是「字的顏色」不是底色，無法用底色判定
      if (s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text') { unknown = 'gradient-text'; break; }
      if (s.backgroundImage && s.backgroundImage !== 'none') { const g = gradientStops(s.backgroundImage, canvasColor); if (!g.ok) { unknown = g.reason; break; } if (g.colors.length) { layers.push(g.colors); grad = true; } }
      const c = PC(s.backgroundColor);
      if (!c && s.backgroundColor && !/^(transparent|rgba\\(0, 0, 0, 0\\))$/.test(s.backgroundColor)) { unknown = 'color-fn'; break; }
      if (c && c.a > 0) { if (c.a >= 1) { opaque = c; break; } layers.push([c]); }
    }
    if (!unknown && fg.a === 0) unknown = 'fg'; // 透明字（多半是漸層字或刻意隱藏），不判
    if (unknown) { cUnknown[unknown] = (cUnknown[unknown] || 0) + 1; continue; }
    const rg = contrastRange(fg, layers, opaque); cChecked++; if (grad) cGrad++;
    const need = isLargeText(px, cs.fontWeight) ? o.contrastLarge : o.contrastNormal;
    const lab = label(el);
    if (rg.max < need) { cLow++; mark(el, 'contrast'); lowC.add(lab + ' ' + rg.max.toFixed(2) + '<' + need + (grad ? '（漸層底）' : ''), el); }
    else if (rg.min < need) { cPartial++; partC.add(lab + ' ' + rg.min.toFixed(2) + '~' + rg.max.toFixed(2) + '（漸層部分區域<' + need + '）', el); }
  }
  // 4. 溢出：整頁可橫捲，或文字／按鈕被視窗邊緣切掉（body overflow-x:hidden 時整頁寬度看不出來）
  const sw = document.documentElement.scrollWidth; const wide = bag(); const clipped = bag(); let clippedN = 0;
  if (sw > vw + 1) for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > vw + 1 && r.width > 0 && wide.size() < 5 && visible(el)) wide.add(label(el) + ' right=' + Math.round(r.right), el); }
  const animated = new Set(); try { for (const an of document.getAnimations()) if (an.effect && an.effect.target) animated.add(an.effect.target); } catch (e) {}
  for (const el of new Set([...textEls, ...tapEls])) {
    const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) continue;
    const cutRight = r.left < cw - 1 && r.right > cw + 1, cutLeft = r.right > 1 && r.left < -1;
    if (!cutRight && !cutLeft) continue;
    let skip = false;
    for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      if (animated.has(a)) { skip = true; break; } // 跑馬燈等動畫中的元素
      if (a === el) continue;
      const s = getComputedStyle(a);
      if (/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1) { skip = true; break; } // 可橫捲容器
      if (/(hidden|clip)/.test(s.overflowX)) { const ar = a.getBoundingClientRect(); if (ar.left >= -1 && ar.right <= cw + 1) { skip = true; break; } } // 被視窗內的容器裁切，不是被螢幕邊緣切掉
      if (s.position === 'fixed') break;
    }
    if (skip) continue;
    clippedN++; mark(el, 'overflow'); clipped.add(label(el) + ' x=' + Math.round(r.left) + '..' + Math.round(r.right) + '／視窗 ' + cw, el);
  }
  // 5. 破圖：已載入完成但沒有像素（404、格式壞掉）
  let imgTotal = 0; const broken = bag(); let brokenN = 0;
  for (const img of document.images) {
    const src = img.currentSrc || img.getAttribute('src') || ''; if (!src) continue;
    const cs = getComputedStyle(img); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (img.loading === 'lazy' && !img.complete) continue;
    imgTotal++;
    if (img.complete && img.naturalWidth === 0) { brokenN++; mark(img, 'images'); broken.add(label(img) + ' ' + src.slice(0, 100), img); }
  }
  let media = 0; for (const el of document.querySelectorAll('img,canvas,svg,video')) if (visible(el)) media++;
  // 7. 無障礙（輕量版，對應 axe 的 critical／serious 常見項）：按鈕／連結沒有名稱、表單欄位沒有標籤、<html lang>、圖片沒有 alt、重複 id
  const named = (el) => { const t = (el.innerText || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
    if (t.trim()) return true; const lb = el.getAttribute('aria-labelledby'); if (lb && lb.split(/\\s+/).some((id) => (document.getElementById(id)?.textContent || '').trim())) return true;
    if ([...el.querySelectorAll('img[alt]')].some((i) => i.alt.trim())) return true; if ([...el.querySelectorAll('svg title')].some((x) => x.textContent.trim())) return true;
    if (el.tagName === 'INPUT') return !!(el.value || el.getAttribute('aria-label')); return false; };
  const noName = bag(), noLabel = bag(), noAlt = bag(); let noNameN = 0, noLabelN = 0, noAltN = 0;
  for (const el of tapEls) { if (el.matches('input,select,textarea')) continue; if (!named(el)) { noNameN++; mark(el, 'a11y'); noName.add(label(el), el); } }
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]),select,textarea')) {
    if (!visible(el)) continue;
    const ok = (el.labels && el.labels.length && [...el.labels].some((l) => l.textContent.trim())) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
    if (!ok) { noLabelN++; mark(el, 'a11y'); noLabel.add(label(el) + (el.placeholder ? '（只有 placeholder）' : ''), el); } }
  for (const img of document.images) { if (!visible(img) || img.closest('[aria-hidden="true"]')) continue; if (!img.hasAttribute('alt') && img.getAttribute('role') !== 'presentation') { noAltN++; noAlt.add(label(img) + ' ' + (img.getAttribute('src') || '').slice(0, 60), img); } }
  const ids = new Map(); for (const el of document.querySelectorAll('[id]')) ids.set(el.id, (ids.get(el.id) || 0) + 1);
  const dupIds = [...ids].filter(([k, n]) => k && n > 1).map(([k, n]) => k + ' ×' + n);
  const lang = document.documentElement.getAttribute('lang') || '';
  // 8. i18n：畫面上出現程式值（undefined、[object Object]、NaN）或沒翻到的字典鍵
  const bodyText = document.body ? document.body.innerText : '';
  const rawTok = (bodyText.match(/\\bundefined\\b|\\[object Object\\]|\\bNaN\\b|\\{\\{[^}]{1,40}\\}\\}|\\b[a-z][a-zA-Z0-9]+(?:\\.[a-z][a-zA-Z0-9_]+){2,}\\b/g) || []).filter((x) => !/^(www|https?)\\b|\\.(com|tw|app|js|ts|png|jpg|webp|html)$/i.test(x)).slice(0, 8);
  const han = (bodyText.match(/[\\u4e00-\\u9fff]/g) || []).length, letters = (bodyText.match(/[\\u4e00-\\u9fffA-Za-z\\u3040-\\u30ff\\uac00-\\ud7af]/g) || []).length;
  // 6. 可見錯誤字
  const errMatch = (bodyText.match(new RegExp(o.visibleErrorRe)) || [])[0] || null;
  window.__hcMarks = marks;
  return { tap: { total: tapTotal, small: smallN, under24, samples: small.list(8) },
    font: { chars, smallChars, share: chars ? smallChars / chars : 0, minPx: minPx === 99 ? null : minPx, tinyRuns: tiny.list(8), tinyCount: tinyN, tinyBy, sizes },
    a11y: { noName: noNameN, noLabel: noLabelN, noAlt: noAltN, dupIds: dupIds.length, lang, samples: [...noName.list(4), ...noLabel.list(3), ...noAlt.list(2), ...dupIds.slice(0, 2).map((x) => '重複 id ' + x)] },
    i18n: { lang, readingLang: document.documentElement.getAttribute('data-reading-lang'), rawTokens: rawTok, hanShare: letters ? Math.round(han / letters * 1000) / 1000 : 0 },
    marks: marks.length,
    contrast: { checked: cChecked, gradient: cGrad, unknown: Object.values(cUnknown).reduce((a, b) => a + b, 0), unknownBy: cUnknown, low: cLow, partial: cPartial, samples: lowC.list(8), partialSamples: partC.list(5) },
    overflow: { vw, cw, scrollWidth: sw, samples: wide.list(5), clipped: clippedN, clippedSamples: clipped.list(6) },
    images: { total: imgTotal, broken: brokenN, samples: broken.list(6) }, media, visibleError: errMatch,
    hc: window.__hc ? { shifts: window.__hc.shifts, lcp: window.__hc.lcp, longtasks: window.__hc.longtasks } : null };
})()`;
}
