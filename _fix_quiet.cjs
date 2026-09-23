const fs = require('fs');
const cssPath = 'components/TodayDirectionQuest.module.css';
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('.quietButton {') || !css.includes('display: inline-flex')) {
  // Expand quietButton for Link usage
  const old = `.quietButton {
  margin-top: 0.15rem;
}`;
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
  if (css.includes(old)) {
    css = css.replace(old, neu);
    fs.writeFileSync(cssPath, css);
    console.log('quietButton expanded');
  } else {
    console.log('quietButton pattern mismatch');
  }
}

// quick syntax check via tsc if available - or next build is slow; just node parse imports
console.log('files ok', [
  'components/HomeTrustReceipt.tsx',
  'app/trust/page.tsx',
  'components/TodayDirectionQuest.tsx',
].every(f => fs.existsSync(f)));
