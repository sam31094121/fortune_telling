/**
 * 首頁箴言修圖守門（規則檔：docs/技能戰鬥檔案/鬼魅阿修羅/首頁箴言修圖規則.md）
 * 文字不改、字型家族不改、動畫只動 transform／opacity、動畫數有上限。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}

for (const t of ['順天而行，', '感恩的心', '逆天而行', '米田共']) {
  check(`文字未改：${t}`, page.includes(t));
}

const start = css.indexOf('/* HOME_TOP_ASURA_RETOUCH_V1 */');
const end = css.indexOf('/* END_HOME_TOP_ASURA_RETOUCH_V1 */');
check('修圖區塊存在', start >= 0 && end > start);
const block = start >= 0 && end > start ? css.slice(start, end) : '';

check('不改字型家族', !/font-family/.test(block));
check('區塊內無 mix-blend-mode screen／multiply', !/mix-blend-mode:\s*(screen|multiply)/.test(block));

const kf = [...block.matchAll(/@keyframes\s+(home-asura-[\w-]+)\s*\{([\s\S]*?)\n\}/g)];
check('自家 keyframes 存在', kf.length >= 4);
for (const [, name, body] of kf) {
  const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
  const bad = props.filter((p) => !['opacity', 'transform'].includes(p));
  check(`${name} 只動 transform／opacity`, bad.length === 0);
}

const anims = [...block.matchAll(/\banimation:\s*([^;]+);/g)]
  .map((m) => m[1].trim())
  .filter((v) => v !== 'none' && v !== 'none !important');
check(`同時動畫數 ≤ 6（實為 ${anims.length}）`, anims.length <= 6);

for (const a of anims) {
  const names = a.split(',').length;
  check(`單元素單動畫：${a.split(' ')[0]}`, names === 1);
}

if (failed) {
  console.log(`\n${failed} 項失敗`);
  process.exit(1);
}
console.log('\n全部通過');
