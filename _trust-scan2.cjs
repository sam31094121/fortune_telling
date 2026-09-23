const fs = require('fs');
const s = fs.readFileSync('C:/Users/DRAGON/Desktop/命理/app/page.tsx', 'utf8');
// find all Link href near home-feature
const re = /<Link\s*\n?\s*href="([^"]+)"[\s\S]{0,300}?className="([^"]*home-feature[^"]*)"/g;
let m; const rows=[];
while ((m = re.exec(s))) {
  rows.push({ href: m[1], cls: m[2].slice(0, 80), at: m.index });
}
console.log('links', rows.length);
rows.forEach((r,i)=>console.log(i, r.href, r.cls));

// sample one full card ending CTA span
function cardAround(href) {
  const i = s.indexOf(`href="${href}"`);
  if (i < 0) return;
  const chunk = s.slice(i, i + 3500);
  const cta = chunk.match(/rounded-full[^>]*>[\s\S]{0,80}?<\/(?:span|div)>/);
  console.log('\n====', href);
  console.log(chunk.slice(0, 200).replace(/\s+/g,' '));
  if (cta) console.log('CTA-ish:', cta[0].replace(/\s+/g,' ').slice(0,160));
  // last 400 chars of card before </Link>
  const end = chunk.indexOf('</Link>');
  console.log('end:', chunk.slice(Math.max(0,end-350), end).replace(/\s+/g,' '));
}
['/red-luan-heartbeat','/tarot','/numerology','/match','/music','/nameology','/bazi','/zodiac','/star-beasts','/3D'].forEach(cardAround);
