const fs = require("fs");
const path = require("path");
const dir = process.argv[2];
const url = process.argv[3] || "https://heaven-earth-humanity-pair.vercel.app/";
(async () => {
  let browser, page, mode;
  try {
    const pup = require("puppeteer");
    browser = await pup.launch({
      headless: "new",
      args: ["--no-sandbox", "--window-size=390,844"],
    });
    page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
    mode = "puppeteer";
  } catch (e1) {
    const pw = require("playwright");
    browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    page = await context.newPage();
    mode = "playwright";
  }
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  });
  await page.waitForTimeout(2800);
  await page.screenshot({ path: path.join(dir, "01-fold.png") });
  await page.evaluate(() => window.scrollBy(0, 720));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(dir, "02-mid.png") });
  await page.evaluate(() => window.scrollBy(0, 1100));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(dir, "03-lower.png") });
  const handle = await page.$("button.home-feature-more-toggle");
  if (handle) {
    await handle.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(dir, "04-more.png") });
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(dir, "05-bottom.png") });
  const body = await page.evaluate(() => document.body.innerText.slice(0, 5000));
  fs.writeFileSync(path.join(dir, "visible-text.txt"), body, "utf8");
  await browser.close();
  console.log(mode + "_OK");
})().catch((e) => {
  console.error(String(e && e.stack || e));
  process.exit(1);
});
