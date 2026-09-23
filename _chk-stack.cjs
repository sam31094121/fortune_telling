const fs = require("fs");
const p = fs.readFileSync("app/page.tsx", "utf8");
const start = p.indexOf('<div className="home-first-screen-stack">');
if (start < 0) { console.log("no stack"); process.exit(0); }
// find matching close by scanning from start
let i = start + '<div className="home-first-screen-stack">'.length;
let depth = 1;
while (i < p.length && depth > 0) {
  const nextOpen = p.indexOf("<div", i);
  const nextClose = p.indexOf("</div>", i);
  if (nextClose < 0) break;
  if (nextOpen >= 0 && nextOpen < nextClose) {
    // check if it's a real open tag not </div
    depth++;
    i = nextOpen + 4;
  } else {
    depth--;
    i = nextClose + 6;
  }
}
console.log("closed at", i, "depth", depth);
console.log(p.slice(i - 120, i + 80));
