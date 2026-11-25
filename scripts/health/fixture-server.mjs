// 迷你假網站：給 tests/health-toolkit.test.mjs 做 10 秒內的端到端測試（不碰正式程式、不需建置）。
// 每一頁對應一種健康檢查應該抓到（或不該誤抓）的情境。
import http from 'node:http';

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
const page = (body, { style = '', script = '' } = {}) => `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;font:16px/1.5 sans-serif;background:#fff;color:#111} button,a{display:inline-block;min-width:48px;min-height:48px;font-size:16px} ${style}</style></head><body>${body}${script ? `<script>${script}</script>` : ''}</body></html>`;

export const FIXTURE_CARDS = {
  home: { n: 0, id: 'home', href: '/', name: '首頁' },
  cards: [
    { n: 1, id: 'ok', href: '/ok', name: '正常頁' },
    { n: 2, id: 'empty', href: '/empty', name: '空白頁' },
    { n: 3, id: 'err500', href: '/err500', name: '500 頁' },
    { n: 4, id: 'grad', href: '/grad', name: '漸層底' },
    { n: 5, id: 'clip', href: '/clip', name: '被切掉' },
    { n: 6, id: 'writes-only', href: '/writes-only', name: '只有被攔的寫入' },
    { n: 7, id: 'writes-and-fail', href: '/writes-and-fail', name: '被攔寫入＋真的連線失敗' },
    { n: 8, id: 'bad-img', href: '/bad-img', name: '壞圖' },
  ],
};
// 進階情境（不放進首頁卡片清單，個別測試用 --cards EXTRA_CARDS --only …）
export const EXTRA_CARDS = {
  home: FIXTURE_CARDS.home,
  cards: [
    ...FIXTURE_CARDS.cards,
    { n: 20, id: 'writes-all', href: '/writes-all', name: '各種寫入' },
    { n: 21, id: 'ok2', href: '/ok2', name: '正常頁二' },
    { n: 22, id: 'late-banner', href: '/late-banner', name: '晚到錯誤條' },
    { n: 23, id: 'colors', href: '/colors', name: 'oklch／color-mix' },
    { n: 24, id: 'a11y', href: '/a11y', name: '無障礙缺漏' },
    { n: 25, id: 'i18n-ok', href: '/i18n-ok', name: '五語正常' },
    { n: 26, id: 'i18n-bad', href: '/i18n-bad', name: '英文外露 undefined' },
    { n: 27, id: 'rm-blank', href: '/rm-blank', name: '減少動態變空白' },
    { n: 28, id: 'lazy-shift', href: '/lazy-shift', name: '捲到底才跳' },
    { n: 29, id: 'desk-small', href: '/desk-small', name: '桌機小字小鈕' },
    { n: 30, id: 'canvas-only', href: '/canvas-only', name: '只有畫布' },
  ],
};
const LANG_JS = `const L=(()=>{try{return localStorage.getItem('interface-reading-language-v1')||'zh-Hant'}catch(e){return 'zh-Hant'}})();document.documentElement.lang=L;`;

// 「真的連線失敗」用 /drop：伺服器直接切斷連線（net::ERR_EMPTY_RESPONSE），Linux／Windows 都會立刻失敗。
// （連到沒開的埠在 Windows 要等約 2 秒才 ECONNREFUSED，會超過測試的觀察時間。）
export function startFixture() {
  const homeLinks = FIXTURE_CARDS.cards.map((c) => `<a class="home-feature-launch" href="${c.href}" style="display:block">${c.name}</a>`).join('');
  const routes = {
    '/': () => page(`<h1>假首頁</h1>${homeLinks}<div style="height:4000px">（往下還很長，給早滑檢查用）</div>`),
    '/ok': () => page('<h1>正常頁</h1><p>這一頁字夠大、對比夠、沒有錯誤。</p><button>按鈕</button>'),
    '/empty': () => page(''),
    '/grad': () => page('<h1>漸層底的標題</h1><p class="ok">淺色字在深色漸層上，對比足夠。</p><p class="low">深灰字在深色漸層上，對比不足。</p><p class="gt"><span>漸層字</span></p>', {
      style: 'body{background:radial-gradient(circle at top, rgba(79,53,218,.25), transparent 35%), radial-gradient(circle at bottom, rgba(188,161,101,.12), transparent 30%), #0b0b1a;color:#eee} .low{color:#333} .gt{background:linear-gradient(90deg,#fff,#ffd);-webkit-background-clip:text;background-clip:text;color:transparent}' }),
    '/clip': () => page('<h1>被切掉</h1><p class="wide">這一行很長而且不換行，會超出手機畫面右緣，在 body overflow-x:hidden 下客戶看不到後半段。</p><div class="scroller"><span class="track">可以左右滑的容器裡的長內容不算被切掉，這裡也是一段很長很長很長的文字</span></div>', {
      style: 'html,body{overflow-x:hidden} .wide{white-space:nowrap;width:max-content} .scroller{overflow-x:auto;width:100%} .track{white-space:nowrap;display:inline-block}' }),
    '/writes-only': () => page('<h1>只有被攔的寫入</h1><p>進頁會送一筆統計 POST。</p>', {
      script: `fetch('/api/view',{method:'POST'}).catch((e)=>console.error('view failed', String(e)));` }),
    '/writes-and-fail': () => page('<h1>被攔寫入＋真的連線失敗</h1><p>統計 POST 會被唯讀模式攔下；另一個 GET 被伺服器切斷連線，是真的失敗。</p>', {
      script: `fetch('/api/view',{method:'POST'}).catch((e)=>console.error('view failed', String(e)));
setTimeout(()=>fetch('/drop').catch((e)=>console.error('data failed', String(e))), 150);` }),
    '/writes-all': () => page(`<h1>各種寫入</h1><p>sendBeacon、XHR PUT、worker POST、跨站 iframe POST、表單 POST，唯讀模式都不能送到伺服器。</p><script src="/cached.js"></script><iframe src="http://localhost:${port()}/frame" width="10" height="10" title="x"></iframe><form id="f" method="post" action="/form"></form>`, {
      script: `navigator.sendBeacon('/beacon','x'); const x=new XMLHttpRequest(); x.open('PUT','/xhr'); x.send('1'); new Worker('/w.js'); fetch('/api/view',{method:'POST'}).catch(()=>{}); setTimeout(()=>document.getElementById('f').submit(),300);` }),
    '/canvas-only': () => page('<canvas width="300" height="300"></canvas>', { script: "const c=document.querySelector('canvas').getContext('2d');c.fillStyle='#08c';c.fillRect(0,0,300,300);" }),
    '/ok2': () => page('<h1>正常頁二</h1><p>同一支快取腳本，第二頁不應再向伺服器拿。</p><script src="/cached.js"></script>'),
    '/frame': () => '<!doctype html><html lang="zh-TW"><body><script>fetch("/f-post",{method:"POST"}).catch(()=>{})</script></body></html>',
    '/late-banner': () => page('<main><h1>晚到錯誤條</h1><p>1.8 秒後才去拿資料，再 1.5 秒失敗，才在最上面插入錯誤條。</p></main>', {
      script: `setTimeout(()=>fetch('/slow?ms=1500').then(()=>{const b=document.createElement('div');b.textContent='載入失敗，請稍後再試';b.style.cssText='height:80px;background:#fee;color:#900;font-size:16px';document.body.prepend(b);}),1800);` }),
    '/colors': () => page('<div class="bg"><p class="lo">oklch 深灰字在 color-mix 深底上</p><p class="hi">oklch 淺字在 color-mix 深底上</p></div><div style="opacity:0"><p style="font-size:9px;color:#eee">祖先透明的極小淺色字不該被算進字級與對比</p></div>', {
      style: '.bg{background-color:color-mix(in srgb, black 90%, white);padding:8px} .lo{color:oklch(0.3 0 0)} .hi{color:oklch(0.97 0 0)}' }),
    '/a11y': () => page('<h1>無障礙缺漏</h1><button class="icon"><svg width="20" height="20"><circle cx="10" cy="10" r="8"/></svg></button><input id="q" placeholder="搜尋"><img src="/ok.png" width="40" height="40"><label for="name">名字</label><input id="name">', { script: '' }),
    '/i18n-ok': () => page('<h1 id="t">你好</h1><p id="p">這一頁五種語言都正常。</p>', { script: LANG_JS + `if(L==='en'){t.textContent='Hello';p.textContent='All five languages are fine.'}` }),
    '/i18n-bad': () => page('<h1 id="t">價格</h1><p id="p">每月 100 元</p>', { script: LANG_JS + `if(L==='en'){t.textContent='Price';p.textContent='Monthly: '+undefined}` }),
    '/rm-blank': () => page('<main id="m"><h1>減少動態</h1><p>開了減少動態就整頁空白（曾經發生過的 P1）。</p></main>', { script: LANG_JS + `if(matchMedia('(prefers-reduced-motion: reduce)').matches) document.getElementById('m').style.display='none';` }),
    '/lazy-shift': () => page('<h1>捲到底才跳</h1>' + Array.from({ length: 40 }, (_, i) => `<p>第 ${i + 1} 段內容，讓頁面夠長可以捲動。</p>`).join('') + '<div id="end"></div><p>最後一段</p>', {
      script: LANG_JS + `new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){o.disconnect();const d=document.createElement('div');d.style.height='300px';d.textContent='晚到的大區塊';document.querySelectorAll('p')[30].before(d);}}).observe(document.getElementById('end'));` }),
    '/desk-small': () => page('<h1>桌機小字小鈕</h1><p class="s">這一段是 13px 的正文文字，手機標準會說太小，桌機提案值 12px 以上則可以接受。這一段是 13px 的正文文字，手機標準會說太小。</p><button class="b">按鈕一</button> <button class="b">按鈕二</button>', {
      style: '.s{font-size:13px} button.b{min-width:30px;min-height:30px;height:30px;font-size:14px;padding:0 6px}', script: LANG_JS }),
    '/bad-img': () => page('<h1>壞圖</h1><p>一張 200 但內容不是圖片的檔案，一張正常小圖。</p><img src="/garbage.png" width="40" height="40" alt="壞"><img src="/ok.png" width="40" height="40" alt="好">'),
  };
  const writes = [], hits = {};
  const port = () => server.address().port;
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    hits[u.pathname] = (hits[u.pathname] || 0) + 1;
    if (req.method !== 'GET' && req.method !== 'HEAD') { writes.push(`${req.method} ${u.pathname}`); res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"wrote":true}'); }
    if (u.pathname === '/cached.js') { res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=3600' }); return res.end('window.__cached = 1;'); }
    if (u.pathname === '/w.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end("fetch('/w-post',{method:'POST',body:'x'}).catch(()=>{})"); }
    if (u.pathname === '/slow') { return setTimeout(() => { res.writeHead(503, { 'content-type': 'text/plain' }); res.end('busy'); }, Math.min(5000, Number(u.searchParams.get('ms')) || 1000)); }
    if (u.pathname === '/drop') { req.socket.destroy(); return; }
    if (u.pathname === '/err500') { res.writeHead(500, { 'content-type': 'text/html' }); return res.end('<html><body><h1>oops</h1><p>伺服器壞了</p></body></html>'); }
    if (u.pathname === '/garbage.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end('not really a png'); }
    if (u.pathname === '/ok.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(PNG_1PX); }
    const r = routes[u.pathname];
    if (!r) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('nf'); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(r());
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ base: `http://127.0.0.1:${server.address().port}`, writes, hits, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) })));
}
