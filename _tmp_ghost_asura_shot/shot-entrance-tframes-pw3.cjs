const { chromium } = require("C:/Users/DRAGON/Desktop/命理/scripts/card-preview/node_modules/playwright");
const fs = require("fs"); const path = require("path");
const OUT = "C:/Users/DRAGON/Desktop/命理/_tmp_ghost_asura_shot/final5";
const XFER = "C:/Users/DRAGON/bead-card-xfer/ghost-asura-48/final5";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  await page.goto("http://localhost:8888/ghost-asura", { waitUntil: "domcontentloaded", timeout: 90000 });
  const hideNext = () => page.evaluate(() => {
    document.querySelectorAll("nextjs-portal,[data-nextjs-toast],[data-next-badge],#__next-build-watcher").forEach(e=>e.remove());
    document.querySelectorAll("body *").forEach((el) => {
      const s = getComputedStyle(el); if (s.position !== "fixed") return;
      const r = el.getBoundingClientRect();
      if (r.width>8 && r.width<90 && r.height>8 && r.height<90 && r.left<90 && r.bottom>innerHeight-90 && (el.textContent||"").trim().length<=3)
        el.style.setProperty("display","none","important");
    });
    let st=document.getElementById("hide-next-dev"); if(!st){st=document.createElement("style");st.id="hide-next-dev";document.documentElement.appendChild(st);} 
    st.textContent="nextjs-portal,[data-nextjs-toast],[data-next-badge],#__next-build-watcher{display:none!important}";
    return true;
  });
  await hideNext();
  await page.getByRole("button", { name: /我自己/ }).first().click();
  await page.locator('[data-field="birthDate"] input[aria-label="民國年"]').fill("63");
  await page.locator('[data-field="birthDate"] input[aria-label="月份"]').fill("6");
  await page.locator('[data-field="birthDate"] input[aria-label="日期"]').fill("28");
  await page.getByRole("button", { name: /^男性/ }).click();
  await page.getByRole("button", { name: /我知道出生時辰/ }).click();
  await sleep(400);
  await page.locator("button").filter({ hasText: /^\s*酉時/ }).first().click();
  await page.getByRole("button", { name: /開啟命魂戰局/ }).click();
  await page.waitForSelector("[data-asura-age-here]", { timeout: 120000 });
  await sleep(2500);
  await hideNext();
  await page.evaluate(() => {
    const cur = document.querySelector('[data-asura-age-segment][data-current="true"]') || document.querySelector("[data-asura-age-here]");
    if (cur) cur.scrollIntoView({ block: "start", behavior: "instant" });
    window.scrollBy(0, -8);
  });

  const restart = () => page.evaluate(() => {
    const sels = ["[data-asura-age-here]","[data-asura-age-viewer]","[data-asura-decree-viewer]","[data-asura-timeline-decree] [class*=visualCard]","[data-asura-timeline-decree] [class*=visualMarkSeal]","[class*=motionSegment]","[data-asura-age-peel-hint]","[class*=motionBridge]","[data-asura-age-bridge]","[class*=motionLine]"];
    const nodes=[]; for (const s of sels) document.querySelectorAll(s).forEach(n=>nodes.push(n));
    for (const n of nodes){ n.style.animation="none"; n.style.opacity="0"; }
    void document.body.offsetWidth;
    for (const n of nodes){ n.style.animation=""; n.style.opacity=""; void n.offsetWidth; n.style.animation="none"; void n.offsetWidth; n.style.animation=""; }
    return performance.now();
  });
  const freezeAt = async (ms) => {
    await restart();
    await sleep(ms);
    // freeze all animations at this moment so screenshot time doesn't advance state
    await page.evaluate(() => {
      document.querySelectorAll("*").forEach((el) => {
        const s = getComputedStyle(el);
        if (s.animationName && s.animationName !== "none") el.style.animationPlayState = "paused";
      });
    });
  };
  const measure = (label) => page.evaluate((label) => {
    const bridges=[...document.querySelectorAll("[data-asura-age-bridge],[class*=motionBridge]")].slice(0,2).map(el=>({op:+(+getComputedStyle(el).opacity).toFixed(3),delay:getComputedStyle(el).animationDelay,text:(el.innerText||"").replace(/\s+/g," ").slice(0,40)}));
    const cur=document.querySelector('[data-asura-age-segment][data-current="true"]');
    const segs=[...document.querySelectorAll("[class*=motionSegment]")].slice(0,6).map((el)=>+(+getComputedStyle(el).opacity).toFixed(3));
    return {label, overflowX:document.documentElement.scrollWidth>391, bridgeMaxOp:bridges.reduce((m,b)=>Math.max(m,b.op),0), bridge0:bridges[0]||null, curSegOp:cur?+(+getComputedStyle(cur).opacity).toFixed(3):null, segOps:segs, nextBadge:!!(document.querySelector("nextjs-portal")||document.querySelector("[data-next-badge]"))};
  }, label);
  const save = async (name) => { const p=path.join(OUT,name); await page.screenshot({path:p}); fs.copyFileSync(p,path.join(XFER,name)); return fs.statSync(p).size; };

  const metrics = { frames: {} };
  for (const [name, ms] of [["motion-390-t0.png", 0], ["motion-390-t180.png", 180], ["motion-390-t500.png", 500]]) {
    await freezeAt(ms);
    const key = name.replace("motion-390-","").replace(".png","");
    metrics.frames[key] = await measure(key);
    await save(name);
    // unpause for next restart cleanliness
    await page.evaluate(() => document.querySelectorAll("*").forEach(el => { if (el.style.animationPlayState === "paused") el.style.animationPlayState = ""; }));
  }
  fs.writeFileSync(path.join(OUT,"motion-390-tframes-metrics.json"), JSON.stringify(metrics,null,2));
  fs.copyFileSync(path.join(OUT,"motion-390-tframes-metrics.json"), path.join(XFER,"motion-390-tframes-metrics.json"));
  console.log(JSON.stringify(metrics,null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
