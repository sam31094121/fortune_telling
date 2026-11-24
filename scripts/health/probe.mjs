// 在瀏覽器裡執行的量測程式（以字串注入，不修改任何頁面程式）。
import { parseColor, blendOver, relLuminance, contrastRatio, isLargeText } from './lib.mjs';

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

const COLOR_FNS = [parseColor, blendOver, relLuminance, contrastRatio, isLargeText].map((f) => f.toString()).join('\n');

// 收集一頁的靜態量測：點擊目標、字級、對比、溢出、可見錯誤字。
export function metricsScript(opts) {
  return `(() => { ${COLOR_FNS}
  const o = ${JSON.stringify(opts)};
  const vw = innerWidth;
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    if (el.closest('[aria-hidden="true"],[inert]')) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = (el) => (el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' "' + (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 16) + '"');
  // 1. 點擊目標
  const TAP = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=radio],[onclick]';
  const small = []; let tapTotal = 0, under24 = 0;
  for (const el of document.querySelectorAll(TAP)) {
    if (!visible(el) || el.disabled) continue;
    const cs = getComputedStyle(el);
    if (cs.pointerEvents === 'none') continue;
    // 句中文字連結屬 WCAG 2.5.8 例外
    if (el.tagName === 'A' && cs.display === 'inline' && el.parentElement && (el.parentElement.innerText || '').length > (el.innerText || '').length + 20) continue;
    const r = el.getBoundingClientRect(); tapTotal++;
    if (r.width < o.tapMinPx || r.height < o.tapMinPx) { if (r.width < 24 || r.height < 24) under24++; small.push(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  }
  // 2/3. 字級與對比（逐個文字節點）
  const sizes = {}; let chars = 0, smallChars = 0, minPx = 99; const tinyRuns = [];
  const lowC = []; let cChecked = 0, cUnknown = 0; const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue.replace(/\\s+/g, ''); if (!text) continue;
    const el = n.parentElement; if (!el) continue;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE'].includes(el.tagName) || !visible(el)) continue;
    const cs = getComputedStyle(el); const px = parseFloat(cs.fontSize);
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || (cs.position === 'absolute' && el.getBoundingClientRect().width <= 1)) continue; // 螢幕閱讀器專用
    chars += text.length; sizes[Math.round(px)] = (sizes[Math.round(px)] || 0) + text.length; if (px < minPx) minPx = px;
    if (px < o.fontMinBodyPx) smallChars += text.length;
    if (px < o.fontHardMinPx && text.length >= 4 && tinyRuns.length < 20) tinyRuns.push(label(el) + ' ' + px + 'px');
    if (seen.has(el) || seen.size > 3000) continue; seen.add(el);
    let fg = parseColor(cs.color); if (!fg) continue;
    fg = { ...fg, a: fg.a * Number(cs.opacity || 1) };
    const layers = []; let unknown = false, opaque = false;
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.backgroundImage && s.backgroundImage !== 'none') { unknown = true; break; }
      const c = parseColor(s.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) { opaque = true; break; } }
    }
    if (unknown) { cUnknown++; continue; }
    let base = opaque ? { ...layers[layers.length - 1] } : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - (opaque ? 2 : 1); i >= 0; i--) base = blendOver(layers[i], base);
    const ratio = contrastRatio(blendOver(fg, base), base); cChecked++;
    const need = isLargeText(px, cs.fontWeight) ? o.contrastLarge : o.contrastNormal;
    if (ratio < need && lowC.length < 200) lowC.push(label(el) + ' ' + ratio.toFixed(2) + '<' + need);
  }
  // 4. 溢出
  const sw = document.documentElement.scrollWidth; const wide = [];
  if (sw > vw + 1) for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > vw + 1 && r.width > 0 && wide.length < 5 && visible(el)) wide.push(label(el) + ' right=' + Math.round(r.right)); }
  // 5. 可見錯誤字
  const txt = document.body ? document.body.innerText : '';
  const errMatch = (txt.match(new RegExp(o.visibleErrorRe)) || [])[0] || null;
  return { tap: { total: tapTotal, small: small.length, under24, samples: small.slice(0, 8) },
    font: { chars, smallChars, share: chars ? smallChars / chars : 0, minPx: minPx === 99 ? null : minPx, tinyRuns: tinyRuns.slice(0, 8), sizes },
    contrast: { checked: cChecked, unknown: cUnknown, low: lowC.length, samples: lowC.slice(0, 8) },
    overflow: { vw, scrollWidth: sw, samples: wide }, visibleError: errMatch,
    hc: window.__hc ? { shifts: window.__hc.shifts, lcp: window.__hc.lcp } : null };
})()`;
}
