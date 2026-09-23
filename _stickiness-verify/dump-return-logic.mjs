import fs from "fs";
import path from "path";
const t = fs.readFileSync(path.join(process.argv[2], "components", "TodayDirectionQuest.tsx"), "utf8");
const i = t.indexOf("setStreakDays(history.streak)");
console.log(t.slice(i - 80, i + 900));
console.log("---- stages ----");
const m = t.match(/type QuestStage = [\s\S]*?;/);
console.log(m ? m[0] : "no");
