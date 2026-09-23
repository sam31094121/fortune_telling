const fs = require('fs');
const s = fs.readFileSync('C:/Users/DRAGON/Desktop/命理/app/page.tsx', 'utf8');
const targets = ['/red-luan-heartbeat','/numerology','/match','/music','/nameology','/bazi','/zodiac','/star-beasts','/3D','/tarot'];
for (const href of targets) {
  const needle = `href="${href}"`;
  let from = 0; let found = 0;
  while ((from = s.indexOf(needle, from)) !== -1 && found < 2) {
    // only home-feature-launch nearby
    const window = s.slice(from, from + 500);
    if (!window.includes('home-feature-launch') && href !== '/music') { from += needle.length; continue; }
    const end = s.indexOf('</Link>', from);
    const chunk = s.slice(from, end > from ? end : from + 4000);
    console.log('\n########', href, 'len', chunk.length);
    // print lines with 拆開有禮 or home-feature-cta or description p
    const lines = chunk.split(/\n/).filter(l => /home-feature-cta|拆開有禮|mt-1 text|font-serif text|立即|開啟|抽出|查看|生成|觸碰/.test(l));
    console.log(lines.slice(0, 12).join('\n'));
    // show 80 chars before home-feature-cta
    const c = chunk.indexOf('home-feature-cta');
    if (c >= 0) console.log('BEFORE CTA:\n', chunk.slice(Math.max(0,c-180), c+120));
    from = end > 0 ? end + 7 : from + needle.length;
    found++;
  }
}
// check tarot / ancient
for (const k of ['塔羅','觸碰抽牌','古老']) {
  const i = s.indexOf(k);
  console.log('key', k, i);
  if (i>=0) console.log(s.slice(i-120, i+200).replace(/\s+/g,' '));
}
