// 在瀏覽器裡執行的量測程式（以字串注入，不修改任何頁面程式）。
import { parseColor, blendOver, relLuminance, contrastRatio, isLargeText, gradientStops, contrastRange } from './lib.mjs';

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
  const tick = () => { if (H.ys.length < 3000) { H.ys.push([Math.round(performance.now()), Math.round(scrollY)]); requestAnimationFrame(tick); } };
  requestAnimationFrame(tick);
})();`;

const COLOR_FNS = [parseColor, blendOver, relLuminance, contrastRatio, isLargeText, gradientStops, contrastRange].map((f) => f.toString()).join('\n');

// 收集一頁的靜態量測：內容量、點擊目標、字級、對比、溢出／裁切、破圖、可見錯誤字。
export function metricsScript(opts) {
  return `(() => { ${COLOR_FNS}
  const o = ${JSON.stringify(opts)};
  const vw = innerWidth, cw = document.documentElement.clientWidth || innerWidth;
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    if (el.closest('[aria-hidden="true"],[inert]')) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = (el) => { const r = el.getBoundingClientRect(); const t = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('alt') || el.value || '').replace(/\\s+/g, ' ').trim().slice(0, 16);
    return el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' "' + t + '" @' + Math.round(r.left) + ',' + Math.round(r.top + scrollY); };
  // 同一元素文字重複出現時合併計數，報告不再出現三筆一樣的樣本
  const bag = () => { const m = new Map(); return { add: (k) => m.set(k, (m.get(k) || 0) + 1), size: () => m.size, list: (n) => [...m].slice(0, n).map(([k, c]) => c > 1 ? k + ' ×' + c : k) }; };
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
    if (r.width < o.tapMinPx || r.height < o.tapMinPx) { smallN++; if (r.width < 24 || r.height < 24) under24++; small.add(label(el).replace(/ @.*/, '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  }
  // 2/3. 字級與對比（逐個文字節點）
  const sizes = {}; let chars = 0, smallChars = 0, minPx = 99; const tiny = bag(); let tinyN = 0;
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
    if (px < o.fontHardMinPx && text.length >= 4) { tinyN++; tiny.add(label(el).replace(/ @.*/, '') + ' ' + px + 'px'); }
    if (seen.has(el) || seen.size > 3000) continue; seen.add(el);
    let fg = parseColor(cs.color); if (!fg) { cUnknown.fg++; continue; }
    if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') { cUnknown['gradient-text']++; continue; }
    fg = { ...fg, a: fg.a * Number(cs.opacity || 1) };
    const fill = parseColor(cs.webkitTextFillColor); if (fill && fill.a === 0 && fg.a > 0) fg = { ...fg, a: 0 };
    // 由文字往上收背景層（每個元素：背景圖在上、背景色在下），遇到不透明純色就停。
    const layers = []; let unknown = null, opaque = null, grad = false;
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      // 祖先用 background-clip:text 做漸層字：那層背景是「字的顏色」不是底色，無法用底色判定
      if (s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text') { unknown = 'gradient-text'; break; }
      if (s.backgroundImage && s.backgroundImage !== 'none') { const g = gradientStops(s.backgroundImage); if (!g.ok) { unknown = g.reason; break; } if (g.colors.length) { layers.push(g.colors); grad = true; } }
      const c = parseColor(s.backgroundColor);
      if (!c && s.backgroundColor && !/^(transparent|rgba\\(0, 0, 0, 0\\))$/.test(s.backgroundColor)) { unknown = 'color-fn'; break; }
      if (c && c.a > 0) { if (c.a >= 1) { opaque = c; break; } layers.push([c]); }
    }
    if (!unknown && fg.a === 0) unknown = 'fg'; // 透明字（多半是漸層字或刻意隱藏），不判
    if (unknown) { cUnknown[unknown] = (cUnknown[unknown] || 0) + 1; continue; }
    const rg = contrastRange(fg, layers, opaque); cChecked++; if (grad) cGrad++;
    const need = isLargeText(px, cs.fontWeight) ? o.contrastLarge : o.contrastNormal;
    const lab = label(el).replace(/ @.*/, '');
    if (rg.max < need) { cLow++; lowC.add(lab + ' ' + rg.max.toFixed(2) + '<' + need + (grad ? '（漸層底）' : '')); }
    else if (rg.min < need) { cPartial++; partC.add(lab + ' ' + rg.min.toFixed(2) + '~' + rg.max.toFixed(2) + '（漸層部分區域<' + need + '）'); }
  }
  // 4. 溢出：整頁可橫捲，或文字／按鈕被視窗邊緣切掉（body overflow-x:hidden 時整頁寬度看不出來）
  const sw = document.documentElement.scrollWidth; const wide = bag(); const clipped = bag(); let clippedN = 0;
  if (sw > vw + 1) for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > vw + 1 && r.width > 0 && wide.size() < 5 && visible(el)) wide.add(label(el) + ' right=' + Math.round(r.right)); }
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
    clippedN++; clipped.add(label(el) + ' x=' + Math.round(r.left) + '..' + Math.round(r.right) + '／視窗 ' + cw);
  }
  // 5. 破圖：已載入完成但沒有像素（404、格式壞掉）
  let imgTotal = 0; const broken = bag(); let brokenN = 0;
  for (const img of document.images) {
    const src = img.currentSrc || img.getAttribute('src') || ''; if (!src) continue;
    const cs = getComputedStyle(img); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (img.loading === 'lazy' && !img.complete) continue;
    imgTotal++;
    if (img.complete && img.naturalWidth === 0) { brokenN++; broken.add(label(img) + ' ' + src.slice(0, 100)); }
  }
  let media = 0; for (const el of document.querySelectorAll('img,canvas,svg,video')) if (visible(el)) media++;
  // 6. 可見錯誤字
  const txt = document.body ? document.body.innerText : '';
  const errMatch = (txt.match(new RegExp(o.visibleErrorRe)) || [])[0] || null;
  return { tap: { total: tapTotal, small: smallN, under24, samples: small.list(8) },
    font: { chars, smallChars, share: chars ? smallChars / chars : 0, minPx: minPx === 99 ? null : minPx, tinyRuns: tiny.list(8), tinyCount: tinyN, sizes },
    contrast: { checked: cChecked, gradient: cGrad, unknown: Object.values(cUnknown).reduce((a, b) => a + b, 0), unknownBy: cUnknown, low: cLow, partial: cPartial, samples: lowC.list(8), partialSamples: partC.list(5) },
    overflow: { vw, cw, scrollWidth: sw, samples: wide.list(5), clipped: clippedN, clippedSamples: clipped.list(6) },
    images: { total: imgTotal, broken: brokenN, samples: broken.list(6) }, media, visibleError: errMatch,
    hc: window.__hc ? { shifts: window.__hc.shifts, lcp: window.__hc.lcp } : null };
})()`;
}
