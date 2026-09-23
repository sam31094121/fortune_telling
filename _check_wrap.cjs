const fs = require('fs');
const page = fs.readFileSync('app/page.tsx', 'utf8');
const q = page.indexOf('第三段：手機首屏');
console.log('BEFORE\n', page.slice(q - 900, q));
// Also check backup for original wrapper structure
const bak = fs.readFileSync('app/page.tsx.bak-trust34', 'utf8');
const s = bak.indexOf('id="home-top-empty-shell-card"');
console.log('\nBAK BEFORE SHELL\n', bak.slice(s - 500, s + 100));
const pulse = bak.indexOf('href="#home-trust-strip"');
console.log('\nBAK PULSE REGION\n', bak.slice(pulse - 200, pulse + 450));
