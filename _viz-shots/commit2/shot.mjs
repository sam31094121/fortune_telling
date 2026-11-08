const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "_viz-shots", "commit2");
fs.mkdirSync(OUT, { recursive: true });

async function shot(width, name) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const report = { width, ok: false, overflowX: null, pinnedCount: null, ageBadgeVisible: null, nowHeadline: null, actionHeadline: null, errors: [] };
  page.on("pageerror", (e) => report.errors.push(String(e)));

  try {
    await page.goto("http://127.0.0.1:8888/ghost-asura", { waitUntil: "networkidle" });
    // fill form if present
    const nameInput = page.locator('input[placeholder*="姓名"], input[aria-label*="姓名"], input').first();
    const hasForm = await page.locator("form.mega-friendly-form, form").first().count();
    if (hasForm) {
      const nameEl = page.locator("#asura-name, input[name='name'], input[placeholder*='姓名']").first();
      if (await nameEl.count()) await nameEl.fill("阿勝");
      // birth date - try common patterns
      const dateInput = page.locator('input[type="date"], input[placeholder*="日期"], input[placeholder*="出生"]').first();
      if (await dateInput.count()) {
        try { await dateInput.fill("1974-06-15"); } catch {}
      }
      // gender
      const male = page.getByText("男性", { exact: false }).first();
      if (await male.count()) { try { await male.click({ timeout: 2000 }); } catch {} }
      // submit
      const submit = page.getByRole("button", { name: /開始|送出|查看|算|進入/ }).first();
      if (await submit.count()) {
        await submit.click();
        await page.waitForTimeout(2500);
      }
    }

    // wait for card content
    await page.waitForTimeout(1500);
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    report.overflowX = overflowX;
    report.pinnedCount = await page.locator("[data-asura-pinned-summary]").count();
    report.ageBadgeVisible = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("*"));
      return nodes.some((n) => (n.textContent || "").includes("18 歲禁忌") && n.offsetParent !== null && getComputedStyle(n).display !== "none" && getComputedStyle(n).visibility !== "hidden");
    });
    // headlines for 現在 vs 現在就做 / 今天就做
    const headlines = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll("h1,h2,h3,h4,p,span,strong")).map((n) => (n.textContent || "").trim()).filter(Boolean);
      return {
        now: texts.find((t) => t === "現在" || t.startsWith("現在｜") || /^現在$/.test(t)) || texts.find((t) => t.includes("現在") && !t.includes("現在就做") && !t.includes("今天就做")) || null,
        action: texts.find((t) => t.includes("今天就做這一件") || t.includes("現在就做")) || null,
        sample: texts.filter((t) => t.includes("現在") || t.includes("今天就做")).slice(0, 12),
      };
    });
    report.nowHeadline = headlines.now;
    report.actionHeadline = headlines.action;
    report.headlineSamples = headlines.sample;
    report.hasDecree = await page.evaluate(() => (document.body.innerText || "").includes("千人千面戰神令") || (document.body.innerText || "").includes("戰神令"));
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
    // also first-screen full page top
    await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true });
    report.ok = true;
  } catch (e) {
    report.errors.push(String(e && e.stack || e));
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

(async () => {
  await shot(390, "390");
  await shot(1280, "1280");
})().catch((e) => { console.error(e); process.exit(1); });
