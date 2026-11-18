// 文字出框稽核：在瀏覽器 Console（建議用手機寬度 360px）貼上執行，
// 一次列出整頁所有「文字超出容器／超出螢幕」的元素，不必再用肉眼一個個檢查。
// 用法：開 DevTools → 切 360px → 貼這段 → 看回傳的陣列（空陣列＝沒有出框）。
(() => {
  const out = [];
  const vw = document.documentElement.clientWidth;
  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.position === 'fixed') return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const label = el.textContent.trim().slice(0, 14);
    const p = el.parentElement;
    const pr = p.getBoundingClientRect();
    if (hasText && (r.right > pr.right + 1 || r.left < pr.left - 1) && getComputedStyle(p).overflow === 'visible')
      out.push(['超出父容器', label, Math.round(r.right - pr.right) + 'px']);
    if (hasText && el.clientWidth > 0 && cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 1)
      out.push(['內容比自己寬', label, el.scrollWidth - el.clientWidth + 'px']);
    if (r.right > vw + 1) out.push(['超出螢幕', label, Math.round(r.right - vw) + 'px']);
  });
  return out;
})();
