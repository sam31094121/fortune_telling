const http = require('http');
function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', reject);
  });
}
(async () => {
  const home = await get('http://127.0.0.1:8888/');
  console.log('home', home.status, home.body.length);
  const cssUrls = [...home.body.matchAll(/\/_next\/static\/css\/[^"']+\.css/g)].map((m) => m[0]);
  console.log('css count', cssUrls.length);
  for (const u of cssUrls.slice(0, 6)) {
    const r = await get('http://127.0.0.1:8888' + u);
    const hit = /taiji-mobile-play-hint|michelin-mobile|stickiness fine-tune 2026-09-23c|-webkit-line-clamp:\s*3/.test(r.body);
    console.log(u, r.status, r.body.length, hit ? 'PATCH_HIT' : 'no');
  }
})();
