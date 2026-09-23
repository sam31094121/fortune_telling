import { chromium } from 'playwright';

function yday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const out = 'C:/Users/DRAGON/Desktop/命理/_stickiness-verify';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

// Case A: mid-progress yesterday
await page.addInitScript(({ y, hist }) => {
  localStorage.setItem('today-direction-quest-v1', JSON.stringify({
    date: y,
    stage: 'tension',
    areaId: 'self',
    pathId: null,
    completed: false,
    actionMode: 'ready',
  }));
  localStorage.setItem('today-direction-quest-history-v1', JSON.stringify(hist));
}, { y: yday(), hist: { streak: 2, lastCompletedDate: yday(), totalDays: 2 } });

await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
const a = await page.evaluate(() => {
  const note = document.querySelector('.returnNote, [class*="returnNote"]')?.textContent?.trim() || '';
  const title = document.querySelector('#today-direction-quest h2')?.textContent?.trim() || '';
  const body = document.querySelector('#today-direction-quest')?.innerText?.slice(0, 400) || '';
  return { note, title, hasContinue: body.includes('昨天的進度還在') || note.includes('昨天的進度還在'), bodySnippet: body };
});
await page.screenshot({ path: out + '/13-b1-resume.png', fullPage: false });
console.log('CASE_A', JSON.stringify(a));

await browser.close();

// Case B: completed yesterday -> checkin
const browser2 = await chromium.launch({ headless: true });
const page2 = await browser2.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page2.addInitScript(({ y, hist }) => {
  localStorage.setItem('today-direction-quest-v1', JSON.stringify({
    date: y,
    stage: 'reward',
    areaId: 'self',
    pathId: 'self-priority',
    completed: true,
    actionMode: 'ready',
  }));
  localStorage.setItem('today-direction-quest-history-v1', JSON.stringify(hist));
}, { y: yday(), hist: { streak: 3, lastCompletedDate: yday(), totalDays: 3 } });
await page2.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page2.waitForTimeout(2500);
const b = await page2.evaluate(() => {
  const root = document.querySelector('#today-direction-quest');
  const text = root?.innerText || '';
  return {
    hasCheckin: text.includes('風寶珠還在') || text.includes('記得你') || text.includes('我做到了') || text.includes('我有前進'),
    hasStreak: text.includes('連續'),
    snippet: text.slice(0, 500),
  };
});
await page2.screenshot({ path: out + '/14-b1-checkin.png', fullPage: false });
console.log('CASE_B', JSON.stringify(b));
await browser2.close();
