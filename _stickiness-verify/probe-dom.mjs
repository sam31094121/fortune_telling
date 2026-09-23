import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto("http://127.0.0.1:8888/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const stage = document.querySelector(".home-top-brand-stage");
  if (!stage) return { err: "no stage" };
  const all = [...stage.querySelectorAll("*")];
  const interesting = all
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      cls: el.className && String(el.className),
      op: getComputedStyle(el).opacity,
      anim: getComputedStyle(el).animationName,
    }))
    .filter(x => x.cls && /taiji|ray|mist|wisp|wave|fog|particle|celestial|shell|energy|glow|orbit/i.test(x.cls))
    .slice(0, 80);
  return {
    stageHTML: stage.innerHTML.slice(0, 2500),
    interesting,
    childCount: stage.children.length,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
