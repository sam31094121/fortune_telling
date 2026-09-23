const fs = require("fs");
const path = "C:/Users/DRAGON/Desktop/命理/app/page.tsx";
let s = fs.readFileSync(path, "utf8");

const rules = [
  { key: "border-rose-500/40 bg-rose-950/30", items: ["免費試算", "需兩人資料", "免登入"] },
  { key: "home-music-cta", items: ["免費生成", "依生辰", "可重聽"] },
  { key: "border-amber-500/40 bg-amber-950/30", items: ["免費", "需姓名", "免登入"] },
  { key: "border-cyan-500/40 bg-cyan-950/30", items: ["免費", "約 30 秒", "只需數字"] },
  { key: "border-indigo-500/40 bg-indigo-950/30", items: ["需生辰", "看長期方向", "免登入"] },
  { key: "border-emerald-500/40 bg-emerald-950/30", items: ["需生辰", "正統排盤", "免登入"] },
  { key: "border-fuchsia-400/40 bg-fuchsia-950/30", items: ["免費", "需生日", "約 20 秒"] },
  { key: "border-rose-100/45 bg-rose-200/12", items: ["免費", "一抽即見", "免登入"] },
  { key: "border-amber-200/40 bg-amber-300/15", items: ["免費瀏覽", "60 種可看", "先看再玩"] },
  { key: "border-violet-200/40 bg-violet-300/15", items: ["免費體驗", "可旋轉", "非付費牆"] },
];

function insertBeforeDiv(src, key, items) {
  const marker = `items={${JSON.stringify(items)}}`;
  // find home-feature-cta ... key
  const idx = src.indexOf(key);
  if (idx < 0) { console.log("missing key", key); return src; }
  // walk back to <div className="home-feature-cta
  const divStart = src.lastIndexOf("<div", idx);
  if (divStart < 0) { console.log("no div", key); return src; }
  const classChunk = src.slice(divStart, idx + key.length);
  if (!classChunk.includes("home-feature-cta")) {
    console.log("not cta context", key);
    return src;
  }
  const lookback = src.slice(Math.max(0, divStart - 260), divStart);
  if (lookback.includes("HomeTrustEvidence")) {
    console.log("exists", key);
    return src;
  }
  const jsx = `<HomeTrustEvidence items={${JSON.stringify(items)}} />\n            `;
  console.log("insert", key, items.join("/"));
  return src.slice(0, divStart) + jsx + src.slice(divStart);
}

for (const r of rules) s = insertBeforeDiv(s, r.key, r.items);
fs.writeFileSync(path, s, "utf8");
console.log("total HomeTrustEvidence", (s.match(/<HomeTrustEvidence/g)||[]).length);
