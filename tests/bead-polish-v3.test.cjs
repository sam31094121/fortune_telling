// 寶珠精修 v3：靜態檢查（不改卡片數值、不改引擎傷害；新數值都在 config）。
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const rd = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const cfg = rd('lib/beast-game/match3/bead-visual-config.ts');
const link = rd('components/battlefield/bead/BeadLink.tsx');
const css = rd('components/battlefield/bead/BeadPolish.module.css');
const q = rd('components/battlefield/bead/useBannerQueue.ts');
const board = rd('components/battlefield/Match3Board.tsx');

test('飽和度降低到約 30、光澤更低調', () => {
  const m = cfg.match(/BODY_MIX_PCT = (\d+)/);
  assert.ok(m && +m[1] >= 26 && +m[1] <= 34);
  assert.match(css, /@keyframes bpShimmer \{ 0%, 100% \{ opacity: \.2; \} 50% \{ opacity: \.32; \} \}/);
});
test('跟手尾線走 rAF + ref，不經 React state', () => {
  assert.match(link, /requestAnimationFrame\(paint\)/);
  assert.match(link, /data-testid="link-tail"/);
  assert.match(link, /passive: true/);
  assert.doesNotMatch(link, /useState/);
});
test('徽章離手指：偏移量在 config，靠上緣改側邊', () => {
  assert.match(cfg, /badgeOffsetY: (\d+)/);
  assert.ok(+cfg.match(/badgeOffsetY: (\d+)/)[1] >= 44);
  assert.match(link, /LINK_MOTION\.badgeFlipTopPx/);
});
test('分級過渡：標籤交叉淡化、顏色過渡、尊重減少動態', () => {
  assert.match(link, /TIERS\.map/);
  assert.match(css, /\.tierLbl \{ transition: opacity/);
  const rm = css.slice(css.indexOf('prefers-reduced-motion'));
  assert.match(rm, /\.tierPulse/);
  assert.match(rm, /\.badgePos[^}]*transition: none/);
});
test('橫幅排隊：五珠技與魔珠依序、不重疊；BeadFx 小字不疊', () => {
  assert.match(q, /holdWhenQueuedMs/);
  assert.match(board, /useBannerQueue\(\)/);
  assert.match(board, /\n\s+if \(res\.magicSpawn\) showBanner\(/);
  assert.match(css, /\.lux \[data-testid="skill5-banner"\] \{ display: none; \}/);
});
test('沒有新色碼（v3 區塊只用 var／color-mix）', () => {
  const v3 = css.slice(css.indexOf('v3 精修'));
  assert.doesNotMatch(v3, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(link, /#[0-9a-fA-F]{3,8}\b/);
});