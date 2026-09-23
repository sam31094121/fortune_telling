const fs = require('fs');
const http = require('http');

function get(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: 8888, path, timeout: 20000 }, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; if (b.length > 2_000_000) req.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, len: b.length, body: b }));
    });
    req.on('error', (e) => resolve({ error: String(e) }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

(async () => {
  const page = fs.readFileSync('app/page.tsx', 'utf8');
  const q = page.indexOf('<TodayDirectionQuest');
  const receipt = page.indexOf('<HomeTrustReceipt');
  const sticky = page.indexOf('<HomeStickyJourneyPanel');
  const taiji = page.indexOf('data-home-slot="taiji-auxiliary"');
  const more = /useState\(false\)/.test(page.match(/showMoreFeatures[\s\S]{0,80}/)?.[0] || '');
  console.log('ORDER', { q, receipt, sticky, taiji, ok: q < receipt && receipt < sticky && sticky < taiji });
  console.log('moreCollapsedDefault', more);

  const quest = fs.readFileSync('components/TodayDirectionQuest.tsx', 'utf8');
  console.log('takeaway', quest.includes('data-quest-takeaway="card"'));
  console.log('honestyLink', quest.includes('href="/trust"'));
  console.log('noHardVipPass', !/VIP.*過關|開 VIP 才|加 LINE 才/.test(quest));

  const trust = fs.readFileSync('app/trust/page.tsx', 'utf8');
  console.log('trustSections', ['我們會做的事','我們不算','資料在哪裡'].every(s => trust.includes(s)));

  for (const p of ['/', '/trust']) {
    const r = await get(p);
    if (r.error) { console.log(p, r); continue; }
    const hasReceipt = (r.body || '').includes('信任收據') || (r.body || '').includes('home-trust-receipt') || (r.body || '').includes('TrustReceipt');
    const hasTrustTitle = (r.body || '').includes('誠信說明') || (r.body || '').includes('算什麼');
    const hasErr = /Application error|Unhandled Runtime|Module not found|Failed to compile/i.test(r.body || '');
    console.log('HTTP', p, { status: r.status, len: r.len, hasReceipt, hasTrustTitle, hasErr });
  }
})();
