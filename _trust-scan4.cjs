const fs = require('fs');
const s = fs.readFileSync('C:/Users/DRAGON/Desktop/命理/app/page.tsx', 'utf8');
for (const k of ['紫微','/ziwei','tarot','古老塔羅','觸碰','home-feature-tier-primary']) {
  let i = 0, c = 0;
  while ((i = s.indexOf(k, i)) !== -1 && c < 5) {
    console.log(k, '@', i, JSON.stringify(s.slice(i, i+100)));
    i += k.length; c++;
  }
}
// list order classes
const orders = [...s.matchAll(/home-feature-tier-(primary|secondary|explore)[^"]*order-(\d+)/g)];
console.log('orders', orders.map(m => m[0].slice(0,80)+' '+m[2]));
