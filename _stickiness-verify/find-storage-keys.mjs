import fs from "fs";
import path from "path";
const root = process.argv[2];
const t = fs.readFileSync(path.join(root, "components", "TodayDirectionQuest.tsx"), "utf8");
const keys = [...t.matchAll(/localStorage\.(?:get|set)Item\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
console.log([...new Set(keys)].join("\n"));
const lines = t.split(/\n/);
lines.forEach((l, i) => {
  if (/localStorage|streak|returnNote|loadHistory|saveHistory/.test(l)) {
    console.log(String(i + 1) + ":" + l.trim().slice(0, 180));
  }
});
