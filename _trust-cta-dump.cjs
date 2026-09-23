const fs = require("fs");
const s = fs.readFileSync("C:/Users/DRAGON/Desktop/命理/app/page.tsx", "utf8");
const re = /home-feature-cta[\s\S]{0,200}/g;
let m; let n=0;
while ((m = re.exec(s)) && n < 20) {
  console.log("---", n, JSON.stringify(m[0].slice(0,180)));
  n++;
}
console.log("evidence markers", (s.match(/HomeTrustEvidence/g)||[]).length);
console.log("import ok", s.includes('HomeTrustEvidence from'));
