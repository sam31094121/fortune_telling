const fs = require("fs");
const path = require("path");
const claim = "重試領卡";
const notIn = "尚未入庫";
const turns = "beast-game/turns";
const roots = ["app/beast-game", "components", "lib/beast-game", "features"];
const out = [];
function walk(d) {
  let ents;
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (/node_modules|\.next/.test(p)) continue;
      walk(p);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      const t = fs.readFileSync(p, "utf8");
      const flags = [];
      if (t.includes(turns)) flags.push("turns");
      if (t.includes(claim)) flags.push("claimRetry");
      if (t.includes(notIn)) flags.push("notIngested");
      if (t.includes("requestId")) flags.push("requestId");
      if (t.includes("stake-duel")) flags.push("stakeDuel");
      if (t.includes("revision")) flags.push("revision");
      if (flags.length && (flags.includes("turns") || flags.includes("claimRetry") || flags.includes("notIngested") || flags.includes("stakeDuel"))) {
        out.push(p.replace(/\\/g, "/") + " [" + flags.join(",") + "]");
      }
    }
  }
}
for (const r of roots) walk(r);
fs.mkdirSync("logs", { recursive: true });
fs.writeFileSync("logs/p0-clients.txt", out.join("\n"), "utf8");
console.log("count", out.length);