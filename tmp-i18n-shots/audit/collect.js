// Shared in-page collector (string, injected via page.evaluate). Read-only.
module.exports = `(() => {
  const picker = document.querySelector('section[aria-label="Language"]');
  const skip = el => !el || (picker && picker.contains(el)) || el.closest('script,style,noscript,template');
  let text = document.body ? document.body.innerText : '';
  if (picker && picker.innerText) text = text.split(picker.innerText).join('\\n');
  const firstScreen = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.replace(/\\s+/g, ' ').trim(); if (!t) continue;
    const el = n.parentElement; if (skip(el)) continue;
    const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const ok = [...r.getClientRects()].some(x => x.width > 0 && x.height > 0 && x.bottom > 0 && x.top < innerHeight && x.right > 0 && x.left < innerWidth);
    if (ok) firstScreen.push(t);
  }
  const attrs = [];
  for (const el of document.querySelectorAll('[placeholder],[aria-label],[title],[alt]')) {
    if (skip(el)) continue;
    for (const a of ['placeholder', 'aria-label', 'title', 'alt']) { const v = el.getAttribute(a); if (v && /[\\u3400-\\u9fff]/.test(v)) attrs.push(a + '=' + v); }
  }
  return { url: location.pathname, title: document.title, scrollY: Math.round(scrollY), height: document.documentElement.scrollHeight, text, firstScreen, attrs: [...new Set(attrs)], lang: localStorage.getItem('interface-reading-language-v1') };
})()`;
