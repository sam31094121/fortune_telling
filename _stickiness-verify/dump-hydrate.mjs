import fs from "fs";
import path from "path";
const t = fs.readFileSync(path.join(process.argv[2], "components", "TodayDirectionQuest.tsx"), "utf8");
const start = t.indexOf("type QuestHistory");
console.log(t.slice(start, start + 500));
console.log("---hydrate---");
const h = t.indexOf("function loadHistory");
console.log(t.slice(h, h + 700));
console.log("---useEffect---");
const u = t.indexOf("useEffect(() => {");
// find the one with QUEST_HISTORY
const idx = t.indexOf("QUEST_HISTORY_KEY");
console.log(t.slice(idx - 50, idx + 1200));
console.log("---SavedQuestState---");
const s = t.indexOf("type SavedQuestState");
console.log(t.slice(s, s + 450));
