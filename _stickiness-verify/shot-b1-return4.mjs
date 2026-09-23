import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const root = process.argv[2];
const outDir = path.join(root, "_stickiness-verify");
const src = fs.readFileSync(path.join(root, "components", "TodayDirectionQuest.tsx"), "utf8");
const hKey = src.match(/QUEST_HISTORY_KEY = '([^']+)'/)[1];
const sKey = src.match(/QUEST_STORAGE_KEY = '([^']+)'/)[1];

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function yesterdayKey() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const HISTORY = { streak: 3, lastCompletedDate: yesterdayKey(), totalDays: 5 };

async function shot(name, saved) {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.addInitScript(
    ({ history, saved, hKey, sKey }) => {
      localStorage.setItem(hKey, JSON.stringify(history));
      localStorage.setItem(sKey, JSON.stringify(saved));
    },
    { history: HISTORY, saved, hKey, sKey }
  );
  await page.goto("http://127.0.0.1:8888/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(4000);
  // Prefer scrolling the quest module into view
  const quest = page.locator('[class*="TodayDirectionQuest_quest"], [class*="quest"]').first();
  await quest.scrollIntoViewIfNeeded().catch(() => {});
  await page.getByText("昨天的進度還在").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.getByText("我完成了").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  const info = await page.evaluate(() => {
    const pick = (re) =>
      [...document.querySelectorAll("p,button,span")].find((el) => re.test((el.textContent || "").trim()));
    const note = pick(/昨天的進度還在|昨天的風寶珠還在/);
    const chip = pick(/^已連續 \d+ 天$/);
    const primary = pick(/^我完成了$|^開始→$|^開始$/);
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: el.textContent.trim(),
        y: Math.round(r.y),
        h: Math.round(r.height),
        bottom: Math.round(r.bottom),
        color: cs.color,
        border: cs.borderTopColor,
        bg: cs.backgroundImage !== "none" ? "gradient" : cs.backgroundColor,
        radius: cs.borderRadius,
        padding: cs.padding,
        className: String(el.className).slice(0, 80),
      };
    };
    const n = box(note);
    const p = box(primary);
    return {
      note: n,
      chip: box(chip),
      primary: p,
      overlap: !!(n && p && !(n.bottom < p.y - 4 || n.y > p.bottom + 4)),
      primaryInView: !!(p && p.bottom <= 820 && p.y >= 0),
      stageHints: [...document.querySelectorAll("h2,h3,p,button")]
        .map((el) => el.textContent.trim())
        .filter((t) => /我完成了|我有前進|哪一句|昨天|已連續|開始→/.test(t))
        .slice(0, 12),
    };
  });
  await browser.close();
  return { file, info };
}

const tension = await shot("15-b1-return-tension.png", {
  date: yesterdayKey(),
  stage: "tension",
  areaId: "self",
  pathId: null,
  completed: false,
});
const checkin = await shot("15-b1-return-checkin.png", {
  date: yesterdayKey(),
  stage: "action",
  areaId: "self",
  pathId: "path-1",
  completed: true,
});
console.log(JSON.stringify({ hKey, sKey, today: todayKey(), yesterday: yesterdayKey(), tension, checkin }, null, 2));