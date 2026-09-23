const http = require('http');
http.get('http://127.0.0.1:8888/', (res) => {
  let b = '';
  res.on('data', (c) => (b += c));
  res.on('end', () => {
    const markers = {
      ward: b.search(/home-top-ward|逆天而行/),
      quest: b.search(/today-direction-quest|home-primary-quest|今日定向/),
      receipt: b.search(/信任收據|home-trust-receipt|data-home-slot=\"trust-receipt\"/),
      sticky: b.search(/今日主線|HomeStickyJourney|home-sticky-journey/),
      taiji: b.search(/taiji-auxiliary|data-home-slot=\"taiji-auxiliary\"/),
      moreCollapsed: /showMoreFeatures.{0,40}false/.test(b) || b.includes('更多探索'),
    };
    console.log(markers);
    const order = ['ward', 'quest', 'receipt', 'sticky', 'taiji']
      .map((k) => [k, markers[k]])
      .filter(([, i]) => i >= 0)
      .sort((a, b) => a[1] - b[1])
      .map(([k]) => k);
    console.log('sorted', order.join(' -> '));
    // snippet around receipt
    const i = markers.receipt;
    if (i >= 0) console.log('receipt snip', JSON.stringify(b.slice(i - 80, i + 120)));
  });
});
