import fs from "fs";
import path from "path";
const t = fs.readFileSync(path.join(process.argv[2], "components", "TodayDirectionQuest.tsx"), "utf8");
for (const name of ["QUEST_HISTORY_KEY", "QUEST_STORAGE_KEY", "yesterdayKey", "todayKey"]) {
  const re = new RegExp(name + "[\\s\\S]{0,120}");
  const m = t.match(re);
  console.log("---", name);
  console.log(m ? m[0] : "missing");
}
