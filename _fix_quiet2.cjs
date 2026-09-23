const fs = require('fs');
const cssPath = 'components/TodayDirectionQuest.module.css';
let css = fs.readFileSync(cssPath, 'utf8');
const idx = css.indexOf('.quietButton');
console.log('at', idx);
console.log(JSON.stringify(css.slice(idx, idx + 80)));

// Force-replace quietButton block: from .quietButton { to next .class {
const m = css.match(/\.quietButton\s*\{[^}]*\}/);
if (m) {
  const neu = `.quietButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.35rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.45);
  color: rgba(226, 232, 240, 0.95);
  font-size: 0.72rem;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}`;
  css = css.replace(m[0], neu);
  fs.writeFileSync(cssPath, css);
  console.log('quietButton updated');
} else {
  console.log('no quietButton block');
}

console.log({
  receipt: fs.existsSync('components/HomeTrustReceipt.tsx'),
  trust: fs.existsSync('app/trust/page.tsx'),
  quest: fs.existsSync('components/TodayDirectionQuest.tsx'),
});
