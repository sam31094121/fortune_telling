const fs = require('fs');
const path = require('path');

const root = 'C:/Users/DRAGON/Desktop/\u547d\u7406';
const pagePath = path.join(root, 'app', 'page.tsx');
const cssPath = path.join(root, 'app', 'globals.css');
const questPath = path.join(root, 'components', 'TodayDirectionQuest.tsx');
const questCssPath = path.join(root, 'components', 'TodayDirectionQuest.module.css');

function mustInclude(hay, needle, label) {
  if (!hay.includes(needle)) throw new Error('Missing expected string for ' + label + ': ' + needle.slice(0, 80));
}

let page = fs.readFileSync(pagePath, 'utf8');
const pageOrig = page;

// --- Gate3: VipGrowthUnlockCard copy ---
mustInclude(page, "完成一張探索只算通過一道關卡；八關全部完成前，五顆寶珠一律封印。", 'gate3-headline');
page = page.replace(
  "完成一張探索只算通過一道關卡；八關全部完成前，五顆寶珠一律封印。",
  "完成一關就會亮一格進度；八關走完前，五顆寶珠先封著，明天回來進度還在。"
);
mustInclude(page, "封印中", 'gate3-status');
page = page.replace(
  "const statusText = done ? '已收下' : isNext ? '可獲取' : '封印中';",
  "const statusText = done ? '已收下' : isNext ? '可獲取' : '尚未走完';"
);

// footer / treasure style lines if present
page = page.replace(
  "不是很多功能一起丟給你，而是先完成這一張，讓進度被記住。",
  "進度記在這台裝置上。先完成眼前這一關；明天打開同一頁就能接下一關。"
);

// soften remainingText pattern if cold seal language remains
page = page.replace(
  /距離第一顆寶珠解封還差 \$\{remaining\} 關。/g,
  "還差 ${remaining} 關；同一裝置下次打開會接續。"
);

// --- Gate1: unhide HomeStickyJourneyPanel ---
mustInclude(page, 'function HomeStickyJourneyPanel', 'sticky-fn');
const stickyHidden = '<section className="hidden" aria-label="今日清楚下一步" aria-hidden="true">';
if (!page.includes(stickyHidden)) {
  // try alternate labels
  const m = page.match(/<section className="hidden"[^>]*aria-label="[^"]*"[^>]*aria-hidden="true">/);
  if (!m) throw new Error('Could not find hidden sticky section');
  page = page.replace(m[0], '<section className="home-sticky-journey" aria-label="今日主線進度">');
} else {
  page = page.replace(stickyHidden, '<section className="home-sticky-journey" aria-label="今日主線進度">');
}

page = page.replace(
  '<p className="home-sticky-journey__compact-kicker">今日下一步</p>',
  '<p className="home-sticky-journey__compact-kicker">今日主線</p>'
);

// Update sticky subtitle lines
page = page.replace(
  /<p>\{\s*unlocked\s*\?\s*`已完成 \$\{safeCompleted\}\/\$\{safeTotal\}`\s*:\s*`已完成 \$\{safeCompleted\}\/\$\{safeTotal\}`\s*\}<\/p>/,
  '<p>{unlocked ? `已通過 ${safeCompleted}/${safeTotal} 關 · 成長中心已開放` : `已通過 ${safeCompleted}/${safeTotal} 關 · 走完會記入成長中心`}</p>'
);

// --- Gate1: feature stack collapse state ---
mustInclude(page, 'const [growthJustUnlocked, setGrowthJustUnlocked] = useState(false);', 'state-anchor');
if (!page.includes('showMoreFeatures')) {
  page = page.replace(
    'const [growthJustUnlocked, setGrowthJustUnlocked] = useState(false);',
    "const [growthJustUnlocked, setGrowthJustUnlocked] = useState(false);\n  const [showMoreFeatures, setShowMoreFeatures] = useState(false);"
  );
}

mustInclude(page, 'className="home-feature-stack flex w-full flex-col gap-3 sm:gap-4"', 'feature-stack');
page = page.replace(
  'className="home-feature-stack flex w-full flex-col gap-3 sm:gap-4"',
  'className={`home-feature-stack flex w-full flex-col gap-3 sm:gap-4 ${showMoreFeatures ? \'home-feature-stack--expanded\' : \'home-feature-stack--collapsed\'}`}'
);

// Insert toggle button after explore label
const exploreLabel = '<p className="home-feature-section-label home-feature-section-label--explore">繼續探索</p>';
mustInclude(page, exploreLabel, 'explore-label');
if (!page.includes('home-feature-more-toggle')) {
  page = page.replace(
    exploreLabel,
    exploreLabel + `\n          <button\n            type="button"\n            className="home-feature-more-toggle"\n            aria-expanded={showMoreFeatures}\n            onClick={() => setShowMoreFeatures((v) => !v)}\n          >\n            {showMoreFeatures ? '收合更多探索' : '更多探索（可稍後）'}\n          </button>`
  );
}

if (page === pageOrig) throw new Error('page.tsx unchanged unexpectedly');
fs.writeFileSync(pagePath, page, 'utf8');
console.log('page.tsx updated', page.length - pageOrig.length, 'bytes delta');

// --- Quest bridge line ---
let quest = fs.readFileSync(questPath, 'utf8');
const questOrig = quest;
if (!quest.includes('home-quest-growth-bridge')) {
  // insert near intro lead / returnPromise
  if (quest.includes('每天一件事，明天回來繼續；進度會幫你留著。')) {
    quest = quest.replace(
      '每天一件事，明天回來繼續；進度會幫你留著。',
      '每天一件事，明天回來繼續；進度會幫你留著。</p>\n            <p className={styles.growthBridge} data-bridge="home-quest-growth-bridge">走完這一關，進度會記入成長中心'
    );
    // fix if we broke tags - the replace above assumes the string is inside <p>...</p>
    // Better approach: add after returnPromise paragraph
  }
  // Safer: append after returnPromise paragraph closing
  quest = fs.readFileSync(questPath, 'utf8');
  if (!quest.includes('home-quest-growth-bridge')) {
    const needle = '<p className={styles.returnPromise}>每天一件事，明天回來繼續；進度會幫你留著。</p>';
    if (!quest.includes(needle)) {
      // find returnPromise line more loosely
      const m = quest.match(/<p className=\{styles\.returnPromise\}>[^<]+<\/p>/);
      if (!m) throw new Error('returnPromise paragraph not found');
      quest = quest.replace(
        m[0],
        m[0] + '\n            <p className={styles.growthBridge} data-bridge="home-quest-growth-bridge">走完這一關，進度會記入成長中心</p>'
      );
    } else {
      quest = quest.replace(
        needle,
        needle + '\n            <p className={styles.growthBridge} data-bridge="home-quest-growth-bridge">走完這一關，進度會記入成長中心</p>'
      );
    }
  }
  fs.writeFileSync(questPath, quest, 'utf8');
  console.log('TodayDirectionQuest.tsx updated');
} else {
  console.log('quest bridge already present');
}

let questCss = fs.readFileSync(questCssPath, 'utf8');
if (!questCss.includes('.growthBridge')) {
  questCss += `\n\n/* gate1 bridge 2026-09-23 */\n.growthBridge {\n  margin: 0.55rem 0 0;\n  color: rgba(165, 243, 252, 0.88);\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.04em;\n  line-height: 1.55;\n}\n`;
  fs.writeFileSync(questCssPath, questCss, 'utf8');
  console.log('quest css updated');
}

// --- globals.css append ---
let css = fs.readFileSync(cssPath, 'utf8');
const MARKER = '/* ===== gate1-gate3 stickiness 2026-09-23 ===== */';
if (!css.includes(MARKER)) {
  css += `\n\n${MARKER}\n.home-sticky-journey {\n  display: block;\n  width: 100%;\n  max-width: 440px;\n  margin: 0.15rem auto 0.85rem;\n  padding: 0.9rem 1rem;\n  border-radius: 1.15rem;\n  border: 1px solid rgba(125, 211, 252, 0.28);\n  background:\n    radial-gradient(circle at 12% 0%, rgba(34, 211, 238, 0.16), transparent 42%),\n    rgba(2, 6, 23, 0.72);\n  box-shadow: 0 12px 36px rgba(2, 6, 23, 0.28);\n}\n.home-sticky-journey__compact-grid {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.75rem;\n}\n.home-sticky-journey__compact-kicker {\n  margin: 0;\n  font-size: 0.62rem;\n  font-weight: 850;\n  letter-spacing: 0.16em;\n  color: rgba(253, 230, 138, 0.9);\n  text-transform: none;\n}\n.home-sticky-journey__compact-copy h2 {\n  margin: 0.2rem 0 0;\n  font-size: 1.05rem;\n  font-weight: 850;\n  color: rgba(248, 250, 252, 0.96);\n}\n.home-sticky-journey__compact-copy p {\n  margin: 0.25rem 0 0;\n  font-size: 0.72rem;\n  font-weight: 650;\n  color: rgba(186, 230, 253, 0.88);\n}\n.home-sticky-journey__cta,\n.home-sticky-journey__compact-action a,\n.home-sticky-journey__compact-action button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 2.4rem;\n  padding: 0.55rem 0.95rem;\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.45);\n  background: rgb(103, 232, 249);\n  color: rgb(2, 6, 23);\n  font-size: 0.78rem;\n  font-weight: 850;\n  white-space: nowrap;\n}\n\n.home-feature-more-toggle {\n  display: none;\n  order: 3;\n  width: 100%;\n  min-height: 2.55rem;\n  margin: 0.1rem 0 0.15rem;\n  border-radius: 999px;\n  border: 1px solid rgba(148, 163, 184, 0.35);\n  background: rgba(15, 23, 42, 0.72);\n  color: rgba(226, 232, 240, 0.92);\n  font-size: 0.78rem;\n  font-weight: 800;\n  letter-spacing: 0.06em;\n}\n\n@media (max-width: 900px), (pointer: coarse) {\n  .home-feature-more-toggle { display: inline-flex; align-items: center; justify-content: center; }\n  .home-feature-stack--collapsed .home-feature-section-label--secondary,\n  .home-feature-stack--collapsed .home-feature-section-label--explore,\n  .home-feature-stack--collapsed .home-feature-tier-secondary,\n  .home-feature-stack--collapsed .home-feature-tier-explore {\n    display: none !important;\n  }\n  .home-feature-stack--collapsed .home-feature-tier-explore {\n    opacity: 0.82;\n  }\n}\n\n@media (min-width: 901px) and (pointer: fine) {\n  .home-feature-more-toggle { display: none !important; }\n  .home-feature-stack--collapsed .home-feature-section-label--secondary,\n  .home-feature-stack--collapsed .home-feature-section-label--explore,\n  .home-feature-stack--collapsed .home-feature-tier-secondary,\n  .home-feature-stack--collapsed .home-feature-tier-explore {\n    display: revert;\n  }\n}\n\n@media (max-width: 900px), (pointer: coarse) {\n  .home-feature-tier-explore {\n    opacity: 0.9;\n    filter: saturate(0.92);\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('globals.css appended');
} else {
  console.log('globals.css marker already present');
}

// verify markers
const verify = fs.readFileSync(pagePath, 'utf8');
const checks = {
  stickyVisible: verify.includes('className="home-sticky-journey"'),
  stickyNotHiddenAria: !verify.includes('aria-label="今日清楚下一步" aria-hidden="true"'),
  moreToggle: verify.includes('home-feature-more-toggle'),
  collapsedClass: verify.includes('home-feature-stack--collapsed'),
  gate3Headline: verify.includes('明天回來進度還在'),
  gate3Status: verify.includes("'尚未走完'"),
  gate3Footer: verify.includes('進度記在這台裝置上'),
  showMoreState: verify.includes('showMoreFeatures'),
};
console.log('VERIFY', checks);
if (Object.values(checks).some(v => !v)) {
  console.error('Some checks failed');
  process.exit(2);
}
console.log('APPLY_OK');
