const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const outDir = "C:/Users/DRAGON/Desktop/命理/_shots_agelabel";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
fs.mkdirSync(outDir, { recursive: true });

async function fillAndSubmit(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:8888/ghost-asura", { waitUntil: "networkidle", timeout: 90000 });
  await page.addStyleTag({ content: `
    *,*::before,*::after{animation:none!important;transition:none!important}
    [data-nextjs-toast],[data-next-badge-root],#__next-build-watcher,nextjs-portal{display:none!important}
  `});
  await page.getByRole("button", { name: "我自己" }).first().click();
  await page.locator('input[type="text"]').first().fill("測試");
  await page.locator('input[aria-label="民國年"]').fill("1974");
  await page.locator('input[aria-label="月份"]').fill("6");
  await page.locator('input[aria-label="日期"]').fill("28");
  await page.getByRole("button", { name: /男性/ }).click();
  await page.getByRole("button", { name: /我知道出生時辰/ }).click();
  await page.waitForTimeout(300);
  await page.locator("button").filter({ hasText: /^酉/ }).first().click();
  await page.getByRole("button", { name: /開啟命魂戰局/ }).click();
  await page.waitForSelector("[data-asura-age-timeline]", { timeout: 120000 });
  await page.waitForTimeout(500);
}

async function metrics(page, width) {
  return page.evaluate((width) => {
    const items = [...document.querySelectorAll('[class*="progressItem"]')];
    const ages = items.map((it) => {
      const el = it.querySelector('[class*="progressAge"]');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const ir = it.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || "").trim(),
        itemW: Math.round(ir.width),
        ageW: Math.round(r.width),
        ageH: Math.round(r.height),
        maxW: cs.maxWidth,
        whiteSpace: cs.whiteSpace,
        fontSize: cs.fontSize,
        lines: Math.round(r.height / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25)),
      };
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
      ages,
      anyEllipsisOnly: ages.some((a) => a.text === "約…" || (a.text.endsWith("…") && a.text.length <= 4)),
      allFull: ages.every((a) => /約虛歲\s*\d/.test(a.text)),
    };
  }, width);
}

async function shootGuide(page, file) {
  await page.locator("[data-asura-age-here]").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const clip = await page.evaluate(() => {
    const here = document.querySelector("[data-asura-age-here]");
    const timeline = document.querySelector("[data-asura-age-timeline]");
    let progress = null;
    if (timeline) {
      const cands = [...timeline.querySelectorAll("*")].filter((el) =>
        [...el.children].some((c) => String(c.className || "").includes("progressItem"))
      );
      progress = cands[0] || null;
    }
    const parts = [here, progress].filter(Boolean);
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const n of parts) {
      const r = n.getBoundingClientRect();
      minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom);
    }
    minX = Math.max(0, minX - 6); minY = Math.max(0, minY - 6);
    maxX = Math.min(window.innerWidth, maxX + 6);
    maxY = Math.min(window.innerHeight, maxY + 10);
    return { x: minX, y: minY, width: Math.max(40, maxX - minX), height: Math.max(40, maxY - minY) };
  });
  await page.screenshot({
    path: path.join(outDir, file),
    clip: { x: Math.floor(clip.x), y: Math.floor(clip.y), width: Math.ceil(clip.width), height: Math.ceil(clip.height) },
  });
}

async function shootEl(page, sel, file) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await el.screenshot({ path: path.join(outDir, file) });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const report = {};
  for (const [w, h, dpr] of [[360, 800, 2], [390, 844, 2], [1280, 900, 1]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await fillAndSubmit(page);
    report[w] = await metrics(page, w);
    await shootGuide(page, `pika-agelabel-${w}-guide-after.png`);
    await shootEl(page, "[data-asura-timeline-decree]", `pika-agelabel-${w}-decree-after.png`);
    await shootEl(page, "[data-asura-age-timeline]", `pika-agelabel-${w}-allsegs-after.png`);
    await page.close();
  }
  fs.writeFileSync(path.join(outDir, "pika-agelabel-metrics.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
