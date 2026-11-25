/**
 * 最早插入 <head> 的腳本：
 * 1) 首頁 LCP 圖用 document.write 掛 preload（比事後 insert 更早被 preload scanner 看到）。
 * 2) 第一次手勢同步建立／resume 共用 AudioContext，並開始抓 BGM，不等 window.load。
 */
export const HOME_LCP_PRELOAD_SCRIPT = `(function(){
  try {
    var path = location.pathname || '/';
    if ((path === '/' || path === '') && !document.querySelector('link[data-home-lcp]')) {
      document.write('<link rel="preload" as="image" href="/home-entry/xinyuehu-environment-ai-v1.thumb.webp" fetchpriority="high" data-home-lcp="1">');
    }
  } catch (e) {}
})();`;

export const SITE_AUDIO_BOOT_SCRIPT = `(function(){
  if (window.__siteAudioBoot) return;
  window.__siteAudioBoot = true;
  window.__siteAudioFetch = window.__siteAudioFetch || {};
  var ASURA = '/sfx/asura-owl-distant-v3.mp3';
  function want(){
    try {
      // 首頁背景音已停掛（8ea4abc6），只有阿修羅頁進頁就播；其他頁不先抓 1.9MB 首頁配音。
      return (location.pathname || '').indexOf('/ghost-asura') === 0 ? ASURA : null;
    } catch (e) { return null; }
  }
  function boot(){
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (C && !window.__siteAudioCtx) {
        window.__siteAudioCtx = new C();
      }
      var ctx = window.__siteAudioCtx;
      if (ctx && ctx.resume) ctx.resume();
      var src = want();
      if (src && !window.__siteAudioFetch[src]) {
        var opts = { priority: 'high' };
        try {
          window.__siteAudioFetch[src] = fetch(src, opts).then(function(r){ return r.ok ? r.arrayBuffer() : Promise.reject(); });
        } catch (e2) {
          window.__siteAudioFetch[src] = fetch(src).then(function(r){ return r.ok ? r.arrayBuffer() : Promise.reject(); });
        }
      }
    } catch (e) {}
  }
  ['pointerdown','pointerup','touchend','click','keydown'].forEach(function(t){
    window.addEventListener(t, boot, { capture: true, passive: true });
  });
})();`;
