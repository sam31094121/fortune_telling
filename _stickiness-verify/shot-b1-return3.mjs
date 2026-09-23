import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const root = process.argv[2];
const outDir = path.join(root, "_stickiness-verify");
fs.mkdirSync(outDir, { recursive: true });

// Read exact keys from source to avoid typos
const src = fs.readFileSync(path.join(root, "components", "TodayDirectionQuest.tsx"), "utf8");
const hKey = src.match(/QUEST_HISTORY_KEY = '([^']+)'/)[1];
const sKey = src.match(/QUEST_STORAGE_KEY = '([^']+)'/)[1];
console.log({ hKey, sKey });

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function yesterdayKey() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const HISTORY = {
  streak: 3,
  lastCompletedDate: yesterdayKey(),
  totalDays: 5,
};

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
  // scroll to quest card center-ish
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("p,button,h2")].find((n) => /昨天|我完成了|哪一句|開始/.test(n.textContent || ""));
    el?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(500);
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  const info = await page.evaluate(() => {
    const byText = (re) => [...document.querySelectorAll("p,button,span,div")].find((el) => re.test((el.textContent || "").trim()) && (el.textContent || "").trim().length < 80);
    const note = byText(/昨天的進度還在|昨天的風寶珠還在|已連續 \d+ 天。昨天/);
    const chip = byText(/^已連續 \d+ 天$/);
    const primary = byText(/^我完成了$|^開始/);
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
        bg: cs.backgroundColor,
        radius: cs.borderRadius,
        className: el.className,
      };
    };
    const n = box(note);
    const p = box(primary);
    return {
      note: n,
      chip: box(chip),
      primary: p,
      overlap: n && p ? !(n.bottom < p.y - 4 || n.y > p.bottom + 4) : false,
      primaryInView: p ? p.bottom <= 820 && p.y >= 0 : false,
    };
  });
  await browser.close();
  return { file, info };
}

const tensionSaved = {
  date: yesterdayKey(),
  stage: "tension",
  areaId: "self",
  pathId: null,
  completed: false,
};
const checkinSaved = {
  date: yesterdayKey(),
  stage: "reward",
  areaId: "self",
  pathId: "path-1",
  completed: true,
};

const tension = await shot("15-b1-return-tension.png", tensionSaved);
const checkin = await shot("15-b1-return-checkin.png", checkinSaved);
console.log(JSON.stringify({ today: todayKey(), yesterday: yesterdayKey(), tension, checkin }, null, 2));