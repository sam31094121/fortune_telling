const { chromium } = require("C:/Users/DRAGON/Desktop/命理/scripts/card-preview/node_modules/playwright");
const fs = require("fs");
const path = require("path");
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "C:/Users/DRAGON/Desktop/命理/_viz-shots/commit2";
const XFER = "C:/Users/DRAGON/bead-card-xfer/ghost-asura-48/commit2";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(XFER, { recursive: true });

async function run(width) {
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
  const report = { width, ok: false, overflowX: null, pinnedCount: null, ageBadgeVisible: null, nowVsAction: null, decreeBodies: null, errors: [] };
  page.on("pageerror", (e) => report.errors.push(String(e)));
  try {
    await page.goto("http://127.0.0.1:8888/ghost-asura", { waitUntil: "domcontentloaded", timeout: 90000 });
    const hideNext = async () => page.evaluate(() => {
      document.querySelectorAll("nextjs-portal,[data-nextjs-toast],[data-next-badge],#__next-build-watcher").forEach((e) => e.remove());
      let st = document.getElementById("hide-next-dev");
      if (!st) { st = document.createElement("style"); st.id = "hide-next-dev"; document.documentElement.appendChild(st); }
      st.textContent = "nextjs-portal,[data-nextjs-toast],[data-next-badge],#__next-build-watcher{display:none!important}";
    });
    await hideNext();
    await page.getByRole("button", { name: /我自己/ }).first().click();
    const nameEl = page.locator('input').filter({ has: page.locator('xpath=ancestor::*[@data-field="name" or contains(@class,"name")]') }).first();
    // try fill name if field exists
    const nameInput = page.locator('[data-field="name"] input, input[placeholder*="姓名"]').first();
    if (await nameInput.count()) { await nameInput.fill("阿勝"); }
    await page.locator('[data-field="birthDate"] input[aria-label="民國年"]').fill("63");
    await page.locator('[data-field="birthDate"] input[aria-label="月份"]').fill("6");
    await page.locator('[data-field="birthDate"] input[aria-label="日期"]').fill("28");
    await page.getByRole("button", { name: /^男性/ }).click();
    await page.getByRole("button", { name: /我知道出生時辰/ }).click();
    await sleep(400);
    await page.locator("button").filter({ hasText: /^\s*酉時/ }).first().click();
    await page.getByRole("button", { name: /開啟命魂戰局/ }).click();
    await page.waitForSelector("[data-asura-age-here], [data-asura-timeline-decree], [data-asura-pinned-summary]", { timeout: 120000 });
    await sleep(2800);
    await hideNext();
    report.overflowX = await page.evaluate((w) => document.documentElement.scrollWidth > w + 1, width);
    report.pinnedCount = await page.locator("[data-asura-pinned-summary]").count();
    report.pinnedText = await page.locator("[data-asura-pinned-summary]").first().innerText().catch(() => null);
    report.ageBadgeVisible = await page.evaluate(() => {
      const walk = (root) => {
        const out = [];
        const it = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT);
        let n; while ((n = it.nextNode())) {
          const t = (n.textContent || "").trim();
          if (!t.includes("18 歲禁忌")) continue;
          const s = getComputedStyle(n);
          if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") continue;
          if (n.offsetParent === null && s.position !== "fixed") continue;
          out.push(t.slice(0, 40));
        }
        return out;
      };
      return walk(document.body);
    });
    const headlines = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("[data-asura-age-segment] h2, [data-asura-age-segment] h3, [data-asura-age-segment] [class*=headline], [data-asura-age-segment] strong, [data-asura-timeline-decree] *"));
      const texts = Array.from(document.querySelectorAll("h1,h2,h3,h4,[class*=headline],[class*=Headline],[data-asura-age-segment] *"))
        .map((n) => (n.childNodes.length && [...n.childNodes].every(c => c.nodeType===3 || (c.nodeType===1 && getComputedStyle(c).display!=='none')) ? (n.textContent||"").trim() : ""))
        .filter(Boolean);
      const bodyText = document.body.innerText || "";
      return {
        hasNow: /\n現在\n/.test(bodyText) || bodyText.includes("現在｜") || [...document.querySelectorAll("*")].some(el => el.childElementCount===0 && el.textContent.trim()==="現在"),
        hasActionToday: bodyText.includes("今天就做這一件"),
        hasActionNow: bodyText.includes("現在就做"),
        decreeTitle: bodyText.includes("千人千面戰神令"),
        bodies: {
          opening: bodyText.includes("一步一步走實的路"),
          sandbox: bodyText.includes("刀還沒開鋒"),
          tactics: bodyText.includes("才叫上戰場"),
          closing: bodyText.includes("跟著鼓點走"),
          oldOpening: bodyText.includes("夯實"),
          oldSandbox: bodyText.includes("刃還沒開過鋒"),
        },
        pinnedDup: (bodyText.match(/正走在/g) || []).length,
      };
    });
    report.nowVsAction = headlines;
    report.decreeBodies = headlines.bodies;
    const shot = path.join(OUT, `commit2-${width}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    fs.copyFileSync(shot, path.join(XFER, `commit2-${width}.png`));
    const full = path.join(OUT, `commit2-${width}-full.png`);
    await page.screenshot({ path: full, fullPage: true });
    fs.copyFileSync(full, path.join(XFER, `commit2-${width}-full.png`));
    report.ok = true;
  } catch (e) {
    report.errors.push(String(e && e.stack || e));
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, `commit2-${width}.json`), JSON.stringify(report, null, 2), "utf8");
  fs.copyFileSync(path.join(OUT, `commit2-${width}.json`), path.join(XFER, `commit2-${width}.json`));
  console.log(JSON.stringify(report, null, 2));
}

(async () => { await run(390); await run(1280); })().catch((e) => { console.error(e); process.exit(1); });