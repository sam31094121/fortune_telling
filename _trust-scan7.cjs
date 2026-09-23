const fs = require('fs');
const s = fs.readFileSync('C:/Users/DRAGON/Desktop/命理/app/page.tsx', 'utf8');
const i = s.indexOf('home-feature-tier-secondary order-4');
console.log(s.slice(i-120, i+2200));
