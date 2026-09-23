import fs from "fs";
import path from "path";
const t = fs.readFileSync(path.join(process.argv[2], "components", "TodayDirectionQuest.tsx"), "utf8");
const i = t.indexOf("setStreakDays(history.streak)");
console.log(t.slice(i, i + 1600));
