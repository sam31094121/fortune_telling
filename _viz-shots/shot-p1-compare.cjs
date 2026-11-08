const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/tmp/pw-dual-note/node_modules/playwright");

const ROOT = "C:/Users/DRAGON/Desktop/\u547d\u7406";
const BASE = "http://localhost:8888";
const OUT = path.join(ROOT, "_viz-shots", "final5");
fs.mkdirSync(OUT, { recursive: true });

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

async function fillAndSubmit(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "/ghost-asura", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.addStyleTag({ content: "#__next-build-watcher,nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay],#__next-build-indicator{display:none!important;visibility:hidden!important;opacity:0!important}" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "\u570b\u66c6\u751f\u65e5", exact: true }).click();
  await page.getByRole("textbox", { name: "\u6c11\u570b\u5e74" }).fill("1974");
  await page.getByRole("textbox", { name: "\u6708\u4efd" }).fill("6");
  await page.getByRole("textbox", { name: "\u65e5\u671f" }).fill("28");
  await page.getByRole("button", { name: /^\u7537\u6027/ }).click();
  await page.getByRole("button", { name: /\u6211\u77e5\u9053\u51fa\u751f\u6642\u8fb0/ }).click();
  await page.waitForTimeout(350);
  await page.locator("button").filter({ hasText: /^\u9149/ }).first().click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: /\u958b\u555f\u547d\u9b42\u6230\u5c40/ }).click();
  await page.getByText("\u5343\u4eba\u5343\u9762\u6230\u795e\u4ee4", { exact: false }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(800);
}

async function shoot(tag, width, height) {
  const env = loadEnvLocal();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: width <= 420 ? 2 : 1,
    locale: "zh-TW",
  });
  try {
    if (env.DUAL_CHART_PASSWORD) {
      const login = await context.request.post(BASE + "/api/dual-chart/session", {
        headers: { Origin: BASE },
        data: { password: env.DUAL_CHART_PASSWORD },
      });
      if (!login.ok()) throw new Error("login_failed " + login.status());
    }
    const page = await context.newPage();
    await fillAndSubmit(page);
    const decree = page.locator("[data-asura-timeline-decree]").first();
    await decree.waitFor({ timeout: 30000 });
    await decree.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const decreePath = path.join(OUT, `p1-${tag}-${width}-decree.png`);
    await decree.screenshot({ path: decreePath });

    const guide = page.locator("[data-asura-age-here]").first();
    if (await guide.count()) {
      await guide.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await guide.screenshot({ path: path.join(OUT, `p1-${tag}-${width}-guide.png`) });
    }

    const metrics = await page.evaluate((w) => {
      const labels = [...document.querySelectorAll("[data-asura-decree-anchor]")].map((b) => {
        const label = b.querySelector("[class*=visualBadgeLabel],[class*=decreeMarkerLabel]");
        const cs = label ? getComputedStyle(label) : null;
        return {
          text: ((label || b).textContent || "").trim(),
          fontSize: cs?.fontSize || null,
          opacity: cs?.opacity || null,
        };
      });
      const bridges = [...document.querySelectorAll("[data-asura-age-bridge]")].slice(0, 3).map((el) => {
        const cs = getComputedStyle(el);
        return { fontSize: cs.fontSize, fontWeight: cs.fontWeight, text: el.textContent.trim().slice(0, 40) };
      });
      const sources = [...document.querySelectorAll("[class*=peelSource]")].slice(0, 2).map((el) => getComputedStyle(el).fontSize);
      const progress = [...document.querySelectorAll("[class*=peelProgress]")].slice(0, 2).map((el) => getComputedStyle(el).fontSize);
      const dots = [...document.querySelectorAll("[class*=progressItem]")].map((li) => ({
        aria: li.querySelector("button")?.getAttribute("aria-label") || "",
        ageText: (li.querySelector("[class*=progressAge]")?.textContent || "").trim(),
      }));
      const card = document.querySelector("[data-asura-timeline-card]");
      const cardCs = card ? getComputedStyle(card) : null;
      return {
        overflowX: document.documentElement.scrollWidth > w + 1,
        docSW: document.documentElement.scrollWidth,
        labels,
        bridges,
        sources,
        progress,
        dots,
        cardBoxShadow: cardCs?.boxShadow || null,
        cardBorder: cardCs?.border || null,
      };
    }, width);
    fs.writeFileSync(path.join(OUT, `p1-${tag}-${width}-metrics.json`), JSON.stringify(metrics, null, 2));
    console.log("OK", tag, width, "ox", metrics.overflowX, "labels", JSON.stringify(metrics.labels), "dotsAges", metrics.dots.map(d => d.ageText));
  } finally {
    await browser.close().catch(() => {});
  }
}

(async () => {
  const tag = process.argv[2] || "before";
  for (const [w, h] of [[360, 800], [390, 844], [1280, 900]]) {
    await shoot(tag, w, h);
  }
  console.log("DONE", tag);
})().catch((e) => { console.error("ERR", e.stack || e); process.exit(1); });
