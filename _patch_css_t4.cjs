const fs = require('fs');
const cssPath = 'components/TodayDirectionQuest.module.css';
let css = fs.readFileSync(cssPath, 'utf8');
const bak = cssPath + '.bak-trust34';
if (!fs.existsSync(bak)) fs.writeFileSync(bak, css);

if (!css.includes('.takeawayCard')) {
  css += `

/* 第四段：結果可帶走卡片 */
.takeawayCard {
  margin: 0.85rem 0 0.35rem;
  padding: 0.9rem 0.95rem;
  border-radius: 1rem;
  border: 1px solid rgba(251, 191, 36, 0.28);
  background: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.78));
  text-align: left;
  box-shadow: 0 10px 28px rgba(2, 6, 23, 0.28);
}

.takeawayMeta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(253, 230, 138, 0.92);
}

.takeawayTitle {
  margin: 0.45rem 0 0;
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1.35;
  color: #f8fafc;
}

.takeawayReflection {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
  color: rgba(226, 232, 240, 0.92);
}

.takeawayAction {
  margin-top: 0.7rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.takeawayAction span {
  display: block;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: rgba(165, 243, 252, 0.9);
}

.takeawayAction strong {
  display: block;
  margin-top: 0.28rem;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.5;
  color: #ecfeff;
}
`;
  fs.writeFileSync(cssPath, css);
  console.log('CSS_ADDED');
} else {
  console.log('CSS_ALREADY');
}

// Soft global CSS for trust receipt / taiji aux if globals exist
const candidates = ['app/globals.css', 'styles/globals.css', 'app/page.module.css'];
for (const f of candidates) {
  if (fs.existsSync(f)) console.log('found', f, fs.statSync(f).size);
}
