import fs from "fs";
import path from "path";

const root = process.argv[2];
const cssPath = path.join(root, "components", "TodayDirectionQuest.module.css");
let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* ===== B1 return visual 2026-09-23f — returnNote/streakChip only ===== */";
if (css.includes(marker)) {
  console.log(JSON.stringify({ ok: true, skipped: true }));
  process.exit(0);
}

const block = `

${marker}
/* 回訪提示：一眼可讀、暗底青／金、不搶主 CTA；不動流程 */
.returnNote {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0.55rem 0 0;
  padding: 0.55rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.28);
  background:
    linear-gradient(180deg, rgba(8, 47, 73, 0.42), rgba(2, 6, 23, 0.55));
  color: rgba(186, 230, 253, 0.94);
  font-size: 0.8rem;
  font-weight: 750;
  line-height: 1.45;
  letter-spacing: 0.01em;
  text-align: center;
  text-wrap: balance;
  box-shadow:
    inset 0 1px 0 rgba(165, 243, 252, 0.08),
    0 6px 18px rgba(2, 6, 23, 0.28);
}

.intro .returnNote {
  margin: 0.4rem 0 0;
  color: rgba(186, 230, 253, 0.94);
  font-size: 0.8rem;
  line-height: 1.45;
}

.streakChip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0.4rem auto 0;
  padding: 0.22rem 0.62rem;
  border-radius: 999px;
  border: 1px solid rgba(251, 191, 36, 0.4);
  background: rgba(120, 53, 15, 0.28);
  color: #fde68a;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1.2;
  box-shadow: inset 0 1px 0 rgba(253, 230, 138, 0.12);
}

@media (max-width: 900px), (pointer: coarse) {
  .returnNote {
    margin-top: 0.45rem;
    padding: 0.5rem 0.7rem;
    font-size: 0.78rem;
    line-height: 1.4;
  }
  .streakChip {
    margin-top: 0.32rem;
    font-size: 0.68rem;
  }
  /* tension／area 階段：提示貼進度條下，壓縮垂直佔位，避免擠主選項 */
  .progressBlock + .returnNote,
  .questHead + .returnNote {
    margin-top: 0.4rem;
  }
}
`;

fs.writeFileSync(cssPath, css.replace(/\s*$/, "") + block + "\n", "utf8");
console.log(JSON.stringify({ ok: true, skipped: false, size: fs.statSync(cssPath).size, has: fs.readFileSync(cssPath, "utf8").includes(marker) }));
