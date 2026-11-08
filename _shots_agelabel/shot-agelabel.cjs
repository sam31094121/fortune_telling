const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const outDir = "C:/tmp/asura-pika-agelabel-shots";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const magick = "magick";

function sideBySide(left, right, dest) {
  execFileSync(magick, [left, right, "+append", dest], { stdio: "inherit" });
}

async function fillAndSubmit(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:8888/ghost-asura", { waitUntil: "networkidle", timeout: 90000 });
  // hide Next.js dev indicator
  await page.addStyleTag({ content: `
    *,*::before,*::after{animation:none!important;transition:none!important}
    [data-nextjs-toast],[data-next-badge-root],#__next-build-watcher,nextjs-portal{display:none!important}
  ` });
  await page.getByRole("button", { name: "我自己" }).first().click();
  await page.locator('input[type="text"]').first().fill("測試");
  await page.locator('input[aria-label="民國年"]').fill("1974");
  await page.locator('input[aria-label="月份"]').fill("6");
  await page.locator('input[aria-label="日期"]').fill("28");
  await page.getByRole("button", { name: /男性/ }).click();
  await page.getByRole("button", { name: /我知道出生時辰/ }).click();
  await page.waitForTimeout(400);
  await page.locator("button").filter({ hasText: /^酉/ }).first().click();
  await page.getByRole("button", { name: /開啟命魂戰局/ }).click();
  await page.waitForSelector("[data-asura-age-timeline]", { timeout: 120000 });
  await page.waitForTimeout(800);
}

async function metrics(page, width) {
  return page.evaluate((width) => {
    const ages = [...document.querySelectorAll("[class*=progressAge], [class*=progressAge]")].map((el) => ({
      text: (el.textContent || "").trim(),
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      clipped: el.scrollWidth > el.clientWidth + 1,
      whiteSpace: getComputedStyle(el).whiteSpace,
      overflow: getComputedStyle(el).overflow,
      maxWidth: getComputedStyle(el).maxWidth,
      fontSize: getComputedStyle(el).fontSize,
    }));
    // also try by structure: progress list under here bar
    const progressItems = [...document.querySelectorAll("[data-asura-age-here] ~ * [class*=progressItem], [class*=progressItem]")].slice(0, 12);
    const fromItems = progressItems.map((it) => {
      const age = it.querySelector("[class*=progressAge]");
      return age ? (age.textContent || "").trim() : null;
    }).filter(Boolean);
    let maxRight = 0;
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > maxRight) maxRight = r.right;
    });
    return {
      width,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      maxChildRight: Math.round(maxRight),
      overflowX: document.documentElement.scrollWidth > width + 1 || document.body.scrollWidth > width + 1,
      progressAgeSamples: ages.slice(0, 8),
      progressAgeTexts: fromItems.length ? fromItems : ages.map((a) => a.text),
      anyClipped: ages.some((a) => a.clipped),
      anyEllipsisOnly: ages.some((a) => a.text === "約…" || a.text.endsWith("…") && a.text.length <= 4),
    };
  }, width);
}

async function shoot(page, sel, file) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await el.screenshot({ path: path.join(outDir, file) });
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const report = {};
  for (const [w, h, dpr] of [[360, 800, 2], [390, 844, 2], [1280, 900, 1]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await fillAndSubmit(page);
    report[w] = await metrics(page, w);

    // guide / here bar region (includes dots + age labels)
    const guideSel = "[data-asura-age-here]";
    // Prefer a parent that includes progress dots
    const guideParent = await page.evaluate(() => {
      const here = document.querySelector("[data-asura-age-here]");
      if (!here) return null;
      const root = here.closest("[data-asura-age-timeline]") || here.parentElement;
      return true;
    });
    // screenshot timeline top including here + progress
    await page.locator("[data-asura-age-timeline]").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    // Capture a clip around guide+progress by evaluating bounding boxes
    const box = await page.evaluate(() => {
      const here = document.querySelector("[data-asura-age-here]");
      const progress = document.querySelector("[class*=progress]") || document.querySelector("ul[class*=progress]");
      const timeline = document.querySelector("[data-asura-age-timeline]");
      const nodes = [here, progress].filter(Boolean);
      if (!nodes.length && timeline) {
        const r = timeline.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: Math.min(280, r.height) };
      }
      let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
        maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom);
      }
      // pad
      minX = Math.max(0, minX - 8); minY = Math.max(0, minY - 8);
      maxX = Math.min(window.innerWidth, maxX + 8); maxY = Math.min(window.innerHeight, maxY + 12);
      // if progress is below here but off-screen, scroll
      return { x: minX, y: minY, width: Math.max(40, maxX - minX), height: Math.max(40, maxY - minY) };
    });
    // Ensure progress ages are in view: scroll here into view then take larger clip
    await page.locator("[data-asura-age-here]").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const clip = await page.evaluate(() => {
      const here = document.querySelector("[data-asura-age-here]");
      const timeline = document.querySelector("[data-asura-age-timeline]");
      // find progress list near here
      let progress = null;
      if (timeline) {
        progress = timeline.querySelector("[class*=\"progress \"], [class^=progress], ul");
        // more precise: element whose children have progressAge
        const cands = [...timeline.querySelectorAll("*")].filter((el) =>
          [...el.children].some((c) => (c.className || "").toString().includes("progressItem"))
        );
        if (cands[0]) progress = cands[0];
      }
      const parts = [here, progress].filter(Boolean);
      let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
      for (const n of parts) {
        const r = n.getBoundingClientRect();
        minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
        maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom);
      }
      if (!isFinite(minX)) {
        const r = timeline.getBoundingClientRect();
        return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(window.innerWidth, r.width), height: 260 };
      }
      minX = Math.max(0, minX - 6);
      minY = Math.max(0, minY - 6);
      maxX = Math.min(window.innerWidth, maxX + 6);
      maxY = Math.min(window.innerHeight, maxY + 10);
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    });
    await page.screenshot({
      path: path.join(outDir, `pika-agelabel-${w}-guide-after.png`),
      clip: { x: Math.floor(clip.x), y: Math.floor(clip.y), width: Math.ceil(clip.width), height: Math.ceil(clip.height) },
    });

    await shoot(page, "[data-asura-timeline-decree]", `pika-agelabel-${w}-decree-after.png`);
    await shoot(page, "[data-asura-age-timeline]", `pika-agelabel-${w}-allsegs-after.png`);

    await page.close();
  }
  fs.writeFileSync(path.join(outDir, "pika-agelabel-metrics.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
