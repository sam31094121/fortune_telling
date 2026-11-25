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

export function startFixture({ deadPort } = {}) {
  if (!deadPort) throw new Error('startFixture 需要一個沒有人在聽的 deadPort');
  const homeLinks = FIXTURE_CARDS.cards.map((c) => `<a class="home-feature-launch" href="${c.href}" style="display:block">${c.name}</a>`).join('');
  const routes = {
    '/': () => page(`<h1>假首頁</h1>${homeLinks}`),
    '/ok': () => page('<h1>正常頁</h1><p>這一頁字夠大、對比夠、沒有錯誤。</p><button>按鈕</button>'),
    '/empty': () => page(''),
    '/grad': () => page('<h1>漸層底的標題</h1><p class="ok">淺色字在深色漸層上，對比足夠。</p><p class="low">深灰字在深色漸層上，對比不足。</p><p class="gt"><span>漸層字</span></p>', {
      style: 'body{background:radial-gradient(circle at top, rgba(79,53,218,.25), transparent 35%), radial-gradient(circle at bottom, rgba(188,161,101,.12), transparent 30%), #0b0b1a;color:#eee} .low{color:#333} .gt{background:linear-gradient(90deg,#fff,#ffd);-webkit-background-clip:text;background-clip:text;color:transparent}' }),
    '/clip': () => page('<h1>被切掉</h1><p class="wide">這一行很長而且不換行，會超出手機畫面右緣，在 body overflow-x:hidden 下客戶看不到後半段。</p><div class="scroller"><span class="track">可以左右滑的容器裡的長內容不算被切掉，這裡也是一段很長很長很長的文字</span></div>', {
      style: 'html,body{overflow-x:hidden} .wide{white-space:nowrap;width:max-content} .scroller{overflow-x:auto;width:100%} .track{white-space:nowrap;display:inline-block}' }),
    '/writes-only': () => page('<h1>只有被攔的寫入</h1><p>進頁會送一筆統計 POST。</p>', {
      script: `fetch('/api/view',{method:'POST'}).catch((e)=>console.error('view failed', String(e)));` }),
    '/writes-and-fail': () => page('<h1>被攔寫入＋真的連線失敗</h1><p>統計 POST 會被唯讀模式攔下；另一個 GET 連到沒開的埠，是真的失敗。</p>', {
      script: `fetch('/api/view',{method:'POST'}).catch((e)=>console.error('view failed', String(e)));
setTimeout(()=>fetch('http://127.0.0.1:${deadPort}/data').catch((e)=>console.error('data failed', String(e))), 150);` }),
    '/bad-img': () => page('<h1>壞圖</h1><p>一張 200 但內容不是圖片的檔案，一張正常小圖。</p><img src="/garbage.png" width="40" height="40" alt="壞"><img src="/ok.png" width="40" height="40" alt="好">'),
  };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"wrote":true}'); }
    if (u.pathname === '/err500') { res.writeHead(500, { 'content-type': 'text/html' }); return res.end('<html><body><h1>oops</h1><p>伺服器壞了</p></body></html>'); }
    if (u.pathname === '/garbage.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end('not really a png'); }
    if (u.pathname === '/ok.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(PNG_1PX); }
    const r = routes[u.pathname];
    if (!r) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('nf'); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(r());
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) })));
}
