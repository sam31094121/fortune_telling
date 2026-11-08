const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/tmp/pw-dual-note/node_modules/playwright");
const ROOT = "C:/Users/DRAGON/Desktop/\u547d\u7406";
const BASE = "http://localhost:8888";
function loadEnvLocal() {
  const text = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}
(async () => {
  const env = loadEnvLocal();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "zh-TW" });
  if (env.DUAL_CHART_PASSWORD) {
    await context.request.post(BASE + "/api/dual-chart/session", { headers: { Origin: BASE }, data: { password: env.DUAL_CHART_PASSWORD } });
  }
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "/ghost-asura", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.addStyleTag({ content: "nextjs-portal,#__next-build-watcher,[data-nextjs-toast]{display:none!important}" });
  await page.getByRole("button", { name: "\u570b\u66c6\u751f\u65e5", exact: true }).click();
  await page.getByRole("textbox", { name: "\u6c11\u570b\u5e74" }).fill("1974");
  await page.getByRole("textbox", { name: "\u6708\u4efd" }).fill("6");
  await page.getByRole("textbox", { name: "\u65e5\u671f" }).fill("28");
  await page.getByRole("button", { name: /^\u7537\u6027/ }).click();
  await page.getByRole("button", { name: /\u6211\u77e5\u9053\u51fa\u751f\u6642\u8fb0/ }).click();
  await page.waitForTimeout(350);
  await page.locator("button").filter({ hasText: /^\u9149/ }).first().click();
  await page.getByRole("button", { name: /\u958b\u555f\u547d\u9b42\u6230\u5c40/ }).click();
  await page.waitForSelector("[data-asura-age-timeline]", { timeout: 90000 });
  // open current segment
  const cur = page.locator('[data-asura-age-segment][data-current="true"] button[aria-expanded="false"]').first();
  if (await cur.count()) await cur.click();
  await page.waitForTimeout(400);
  // peel once if available
  const peel = page.locator('[data-asura-age-segment][data-opened="true"] button', { hasText: /\u770b\u4e0b\u4e00/ }).first();
  if (await peel.count()) await peel.click();
  await page.waitForTimeout(200);
  const m = await page.evaluate(() => {
    const bridge = document.querySelector("[data-asura-age-bridge]");
    const bcs = bridge ? getComputedStyle(bridge) : null;
    const source = document.querySelector("[class*=peelSource]");
    const scs = source ? getComputedStyle(source) : null;
    const prog = document.querySelector("[class*=peelProgress]");
    const pcs = prog ? getComputedStyle(prog) : null;
    return {
      overflowX: document.documentElement.scrollWidth > 391,
      bridge: bcs ? { fontSize: bcs.fontSize, fontWeight: bcs.fontWeight, text: bridge.textContent.trim().slice(0, 50) } : null,
      source: scs ? { fontSize: scs.fontSize, text: source.textContent.trim().slice(0, 40) } : null,
      progress: pcs ? { fontSize: pcs.fontSize, text: prog.textContent.trim() } : null,
    };
  });
  fs.writeFileSync(path.join(ROOT, "_viz-shots/final5/p1-after-390-type-metrics.json"), JSON.stringify(m, null, 2));
  console.log(JSON.stringify(m, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
