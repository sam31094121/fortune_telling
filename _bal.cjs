const fs = require('fs');
const bak = fs.readFileSync('app/page.tsx.bak-trust34', 'utf8');
const pulse = bak.indexOf('href="#home-trust-strip"');
const aEnd = bak.indexOf('</a>', pulse);
console.log(JSON.stringify(bak.slice(aEnd, aEnd + 200)));
// count open/close around home return - rough balance of divs from return(
const page = fs.readFileSync('app/page.tsx', 'utf8');
function balance(src, label) {
  // crude: count <div and </div> ignoring strings is hard; just count tags
  const open = (src.match(/<div\b/g) || []).length;
  const close = (src.match(/<\/div>/g) || []).length;
  console.log(label, { open, close, diff: open - close });
}
balance(bak, 'bak');
balance(page, 'page');
