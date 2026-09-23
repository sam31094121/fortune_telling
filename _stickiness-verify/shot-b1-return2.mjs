import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const root = process.argv[2];
const outDir = path.join(root, "_stickiness-verify");
fs.mkdirSync(outDir, { recursive: true });

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

async function prep(page, saved) {
  await page.addInitScript(
    ({ history, saved, hKey, sKey }) => {
      localStorage.setItem(hKey, JSON.stringify(history));
      if (saved) localStorage.setItem(sKey, JSON.stringify(saved));
      else localStorage.removeItem(sKey);
    },
    {
      history: HISTORY,
      saved,
      hKey: "today-direction-quest-history-v1",
      sKey: "today-direction-quest-v1",
    }
  );
}

async function measure(page) {
  return page.evaluate(() => {
    const note = document.querySelector('[class*="returnNote"]');
    const chip = document.querySelector('[class*="streakChip"]');
    const primary = [...document.querySelectorAll("button,a")].find((el) =>
      /開始|我完成了/.test(el.textContent || "")
    );
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom) };
    };
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const n = box(note);
    const p = box(primary);
    return {
      noteText: note?.textContent?.trim() || null,
      chipText: chip?.textContent?.trim() || null,
      note: n,
      chip: box(chip),
      primary: primary ? { ...p, text: primary.textContent.trim() } : null,
      noteColor: cs(note)?.color || null,
      noteBorder: cs(note)?.borderTopColor || null,
      noteBg: cs(note)?.backgroundColor || null,
      noteRadius: cs(note)?.borderRadius || null,
      chipColor: cs(chip)?.color || null,
      overlapPrimary:
        n && p ? !(n.bottom < p.y - 4 || n.y > p.bottom + 4) : false,
      primaryInView: p ? p.bottom <= 820 && p.y >= 0 : false,
      bodySnippet: document.body.innerText.slice(0, 400),
    };
  });
}

const browser = await chromium.launch({ headless: true, channel: "chrome" });

async function shot(name, saved) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await prep(page, saved);
  await page.goto("http://127.0.0.1:8888/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3500);
  const quest = page.locator('[class*="returnNote"], [class*="streakChip"], [class*="primaryButton"]').first();
  await quest.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  const info = await measure(page);
  await page.close();
  return { file, info };
}

const tensionSaved = {
  date: todayKey(),
  stage: "tension",
  areaId: "self",
  pathId: null,
  completed: false,
};
const checkinSaved = {
  date: todayKey(),
  stage: "checkin",
  areaId: "self",
  pathId: "path-1",
  completed: false,
};

const tension = await shot("15-b1-return-tension.png", tensionSaved);
const checkin = await shot("15-b1-return-checkin.png", checkinSaved);
console.log(JSON.stringify({ today: todayKey(), yesterday: yesterdayKey(), tension, checkin }, null, 2));
await browser.close();
