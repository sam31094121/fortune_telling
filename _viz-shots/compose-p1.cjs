const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/tmp/pw-dual-note/node_modules/playwright");

const OUT = path.join("C:/Users/DRAGON/Desktop/\u547d\u7406", "_viz-shots", "final5");

async function sideBySide(leftPath, rightPath, outPath, labelL, labelR) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const l = fs.readFileSync(leftPath).toString("base64");
  const r = fs.readFileSync(rightPath).toString("base64");
  const ext = path.extname(leftPath).slice(1) || "png";
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#111;color:#fcea86;font:14px/1.4 sans-serif">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px">
    <div><div style="padding:6px 8px">${labelL}</div><img id="a" src="data:image/${ext};base64,${l}" style="width:100%;display:block;background:#000"/></div>
    <div><div style="padding:6px 8px">${labelR}</div><img id="b" src="data:image/${ext};base64,${r}" style="width:100%;display:block;background:#000"/></div>
  </div></body></html>`);
  await page.waitForTimeout(200);
  const box = await page.evaluate(() => {
    const root = document.body.firstElementChild;
    const r = root.getBoundingClientRect();
    return { width: Math.ceil(r.width) + 16, height: Math.ceil(r.height) + 16 };
  });
  await page.setViewportSize({ width: Math.max(800, box.width), height: Math.max(400, box.height) });
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log("wrote", outPath, fs.statSync(outPath).size);
}

(async () => {
  for (const w of [390, 1280]) {
    await sideBySide(
      path.join(OUT, `p1-before-${w}-decree.png`),
      path.join(OUT, `p1-after-${w}-decree.png`),
      path.join(OUT, `p1-${w}-decree-compare.png`),
      `BEFORE ${w} — 舊`,
      `AFTER ${w} — 新`
    );
    await sideBySide(
      path.join(OUT, `p1-before-${w}-guide.png`),
      path.join(OUT, `p1-after-${w}-guide.png`),
      path.join(OUT, `p1-${w}-guide-compare.png`),
      `BEFORE ${w} guide`,
      `AFTER ${w} guide`
    );
  }
  // also 360 decree compare for evidence
  await sideBySide(
    path.join(OUT, `p1-before-360-decree.png`),
    path.join(OUT, `p1-after-360-decree.png`),
    path.join(OUT, `p1-360-decree-compare.png`),
    `BEFORE 360`,
    `AFTER 360`
  );
  console.log("DONE compose");
})().catch((e) => { console.error(e); process.exit(1); });
