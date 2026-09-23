import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto("http://127.0.0.1:8888/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(3200);
const info = await page.evaluate(() => {
  const pick = (sub) => document.querySelector(`.home-top-brand-stage [class*="${sub}"]`) || document.querySelector(`[class*="${sub}"]`);
  const op = (el) => (el ? getComputedStyle(el).opacity : null);
  const start = [...document.querySelectorAll("button,a,[role=button]")].find((el) => (el.textContent || "").includes("開始"));
  const box = start ? start.getBoundingClientRect() : null;
  return {
    visualPulse: op(pick("visualPulse")),
    energyVeil: op(pick("energyVeil")),
    groundShadow: op(pick("groundShadow")),
    shadowGlow: op(pick("shadowGlow")),
    particlePair: op(pick("particlePair")),
    chaseCounterLight: op(pick("chaseCounterLight")),
    stageClass: document.querySelector(".home-top-brand-stage")?.className || null,
    startY: box ? Math.round(box.y) : null,
    startInView: box ? box.bottom <= 820 : false,
  };
});
await page.screenshot({ path: out, fullPage: false });
console.log(JSON.stringify({ ...info, shot: out }));
await browser.close();
