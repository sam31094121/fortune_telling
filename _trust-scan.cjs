const fs = require('fs');
const s = fs.readFileSync('C:/Users/DRAGON/Desktop/命理/app/page.tsx', 'utf8');
let idx = 0, n = 0;
const cards = [];
while ((idx = s.indexOf('home-feature-launch', idx)) !== -1 && n < 25) {
  const chunk = s.slice(Math.max(0, idx - 400), idx + 2800);
  const href = (chunk.match(/href="([^"]+)"/) || [])[1] || '?';
  const h2m = chunk.match(/<h2[^>]*>[\s\S]*?<span>([^<]+)<\/span>/) || chunk.match(/<h2[^>]*>\s*([^<\n]+)/);
  const h2 = (h2m && h2m[1] || '').replace(/\s+/g, ' ').trim();
  const pm = chunk.match(/<p className="mt-1[^"]*">([^<]+)/);
  const p1 = (pm && pm[1] || '').replace(/\s+/g, ' ').trim();
  const cta = (chunk.match(/>(立即[^<]{0,24}|開始[^<]{0,24}|開啟[^<]{0,24}|抽出[^<]{0,24}|查看[^<]{0,24}|觸碰[^<]{0,24}|打開[^<]{0,24}|生成[^<]{0,24}|進入[^<]{0,24})</) || [])[0] || '';
  const trust = ['免費', '免填', '秒', '資料', '進度', '不蒐集', '可跳過', '匿名', '免登', '不用登'].filter((t) => chunk.includes(t));
  cards.push({ n, href, h2: h2.slice(0, 40), p1: p1.slice(0, 100), cta: cta.slice(0, 40), trust: trust.join('|') || 'none' });
  idx += 20;
  n++;
}
console.log(JSON.stringify(cards, null, 2));

// TodayDirectionQuest trust bits
const q = 'C:/Users/DRAGON/Desktop/命理/components/TodayDirectionQuest.tsx';
if (fs.existsSync(q)) {
  const qs = fs.readFileSync(q, 'utf8');
  console.log('quest has 免費', qs.includes('免費'), '90', qs.includes('90'), '免填', qs.includes('免填'));
  const m = qs.match(/免費[\s\S]{0,80}|90\s*秒[\s\S]{0,40}|免填[\s\S]{0,40}/g);
  console.log(m && m.slice(0, 8));
}
