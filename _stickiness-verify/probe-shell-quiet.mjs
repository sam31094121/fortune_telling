import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto("http://127.0.0.1:8888/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(2800);
const info = await page.evaluate(() => {
  const style = (el) => (el ? getComputedStyle(el) : null);
  const rays = document.querySelector(".home-top-brand-stage .modal-evolution-rays") || document.querySelector(".modal-evolution-rays");
  const mist = document.querySelector(".home-top-brand-stage .taiji-celestial-mist") || document.querySelector(".taiji-celestial-mist");
  const wisp3 = document.querySelector(".taiji-celestial-wisp--three");
  const waves = document.querySelector(".taiji-gold-waves");
  const start = [...document.querySelectorAll("button,a,[role=button]")].find(el => (el.textContent||"").includes("開始"));
  const startBox = start ? start.getBoundingClientRect() : null;
  const rayEls = rays ? [...rays.querySelectorAll(".modal-energy-ray")] : [];
  return {
    hasStack: !!document.querySelector(".home-first-screen-stack"),
    hasStage: !!document.querySelector(".home-top-brand-stage"),
    rayOp: rays ? style(rays).opacity : null,
    mistOp: mist ? style(mist).opacity : null,
    wavesOp: waves ? style(waves).opacity : null,
    wisp3Display: wisp3 ? style(wisp3).display : "absent",
    rayTotal: rayEls.length,
    rayVisible: rayEls.filter(el => getComputedStyle(el).display !== "none").length,
    startInView: startBox ? startBox.bottom <= 820 : false,
    startY: startBox ? Math.round(startBox.y) : null,
    classSamples: {
      rays: rays ? rays.className : null,
      mist: mist ? mist.className : null,
    }
  };
});
await page.screenshot({ path: out, fullPage: false });
console.log(JSON.stringify({ ...info, shot: out }));
await browser.close();
