const fs = require("fs");
const path = require("path");
const root = "C:/Users/DRAGON/Desktop/命理";

// 1) Component
const compDir = path.join(root, "components");
const compPath = path.join(compDir, "HomeTrustEvidence.tsx");
const comp = `/** 首頁神秘入口旁的可核對信任標（費用／時間或資料／登入）— 不寫假人數 */
export default function HomeTrustEvidence({
  items,
  label = "可核對承諾",
}: {
  items: readonly string[];
  label?: string;
}) {
  if (!items.length) return null;
  return (
    <ul className="home-trust-evidence" aria-label={label}>
      {items.map((item) => (
        <li key={item} className="home-trust-evidence__chip">
          {item}
        </li>
      ))}
    </ul>
  );
}
`;
fs.writeFileSync(compPath, comp, "utf8");
console.log("wrote", compPath);

// 2) CSS append if missing
const cssPath = path.join(root, "app/globals.css");
let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* ===== trust-evidence 2026-09-23 michelin ===== */";
if (!css.includes(marker)) {
  css += `

${marker}
.home-trust-evidence {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.4rem;
  margin: 0.55rem 0 0.65rem;
  padding: 0;
  list-style: none;
  width: 100%;
}
.home-trust-evidence__chip {
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(226, 232, 240, 0.22);
  background: rgba(2, 6, 23, 0.45);
  color: rgba(226, 232, 240, 0.88);
  font-size: 0.62rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  line-height: 1.2;
  white-space: nowrap;
}
@media (max-width: 900px), (pointer: coarse) {
  .home-trust-evidence {
    margin-top: 0.45rem;
    margin-bottom: 0.55rem;
  }
  .home-trust-evidence__chip {
    font-size: 0.6rem;
    padding: 0.2rem 0.5rem;
  }
}
`;
  fs.writeFileSync(cssPath, css, "utf8");
  console.log("css appended");
} else {
  console.log("css skip");
}

// 3) Import in page.tsx
const pagePath = path.join(root, "app/page.tsx");
let page = fs.readFileSync(pagePath, "utf8");
if (!page.includes("HomeTrustEvidence")) {
  // insert after first import block line that looks good
  if (page.includes('from "@/components/TodayDirectionQuest"')) {
    page = page.replace(
      'from "@/components/TodayDirectionQuest";',
      'from "@/components/TodayDirectionQuest";\nimport HomeTrustEvidence from "@/components/HomeTrustEvidence";'
    );
  } else if (page.includes("from '@/components/TodayDirectionQuest'")) {
    page = page.replace(
      "from '@/components/TodayDirectionQuest';",
      "from '@/components/TodayDirectionQuest';\nimport HomeTrustEvidence from '@/components/HomeTrustEvidence';"
    );
  } else {
    // fallback: after first import
    page = page.replace(
      /^import .+$/m,
      (m) => `${m}\nimport HomeTrustEvidence from "@/components/HomeTrustEvidence";`
    );
  }
}

function insertBeforeCta(src, ctaNeedle, evidenceJsx) {
  if (src.includes(evidenceJsx.slice(0, 40)) && src.includes("HomeTrustEvidence")) {
    // more precise: if this exact items already near needle
  }
  const idx = src.indexOf(ctaNeedle);
  if (idx < 0) {
    console.log("MISS CTA", ctaNeedle.slice(0, 80));
    return src;
  }
  // don't double-insert
  const windowStart = Math.max(0, idx - 220);
  const before = src.slice(windowStart, idx);
  if (before.includes("HomeTrustEvidence")) {
    console.log("skip exists", ctaNeedle.slice(0, 60));
    return src;
  }
  return src.slice(0, idx) + evidenceJsx + src.slice(idx);
}

const inserts = [
  [
    `<div className="home-feature-cta relative flex items-center gap-2 rounded-xl border border-rose-100/45 bg-rose-200/12 px-5 py-3 text-xs font-bold text-rose-50 transition group-hover:bg-rose-200/22">
                <span>抽出我的心動月份</span>`,
    `<HomeTrustEvidence items={["免費", "一抽即見", "免登入"]} />
            `,
  ],
  [
    `<div className="home-feature-cta flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-5 py-3 text-xs font-bold text-cyan-200 transition group-hover:bg-cyan-500/25">
              <span>立即開始</span>`,
    `<HomeTrustEvidence items={["免費", "約 30 秒", "只需數字"]} />
            `,
  ],
  [
    `<div className="home-feature-cta flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 px-5 py-3 text-xs font-bold text-rose-200 transition group-hover:bg-rose-500/25">
              <span>立即開啟配對</span>`,
    `<HomeTrustEvidence items={["免費試算", "需兩人資料", "免登入"]} />
            `,
  ],
  [
    `<div className="home-feature-cta home-music-cta flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-950/30 px-5 py-3 text-xs font-bold text-violet-200 transition group-hover:bg-violet-500/25">`,
    `<HomeTrustEvidence items={["免費生成", "依生辰", "可重聽"]} />
            `,
  ],
  [
    `<div className="home-feature-cta flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-5 py-3 text-xs font-bold text-amber-200 transition group-hover:bg-amber-500/25">
              <span>開啟姓名決策</span>`,
    `<HomeTrustEvidence items={["免費", "需姓名", "免登入"]} />
            `,
  ],
  [
    `<div className="home-feature-cta flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-5 py-3 text-xs font-bold text-emerald-200 transition group-hover:bg-emerald-500/25">
              <span>{'立即開啟命盤'}</span>`,
    `<HomeTrustEvidence items={["需生辰", "正統排盤", "免登入"]} />
            `,
  ],
  [
    `<div className="home-feature-cta flex items-center gap-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/30 px-5 py-3 text-xs font-bold text-fuchsia-100 transition group-hover:bg-fuchsia-500/20">`,
    `<HomeTrustEvidence items={["免費", "需生日", "約 20 秒"]} />
            `,
  ],
  [
    `<div className="home-feature-cta relative flex items-center gap-2 rounded-xl border border-amber-200/40 bg-amber-300/15 px-5 py-3 text-xs font-bold text-amber-50 transition group-hover:bg-amber-300/25">
              <span>查看 60 種神獸</span>`,
    `<HomeTrustEvidence items={["免費瀏覽", "60 種可看", "先看再玩"]} />
            `,
  ],
  [
    `<div className="home-feature-cta relative flex items-center gap-2 rounded-xl border border-violet-200/40 bg-violet-300/15 px-5 py-3 text-xs font-bold text-violet-50 transition group-hover:bg-violet-300/25">`,
    `<HomeTrustEvidence items={["免費體驗", "可旋轉", "非付費牆"]} />
            `,
  ],
];

// ziwei CTA - find unique
const ziweiCtaIdx = page.indexOf("易經紫微斗數");
let ziweiCtaBlock = null;
if (ziweiCtaIdx >= 0) {
  const slice = page.slice(ziweiCtaIdx, ziweiCtaIdx + 1800);
  const m = slice.match(/<div className="home-feature-cta[\s\S]*?<\/div>/);
  if (m) {
    inserts.push([
      m[0].slice(0, Math.min(m[0].length, 220)),
      `<HomeTrustEvidence items={["需生辰", "看長期方向", "免登入"]} />
            `,
    ]);
  } else {
    console.log("ziwei cta not regex matched, trying span");
  }
}

for (const [needle, jsx] of inserts) {
  page = insertBeforeCta(page, needle, jsx);
}

fs.writeFileSync(pagePath, page, "utf8");
console.log("page written", page.length, "HomeTrustEvidence count", (page.match(/HomeTrustEvidence/g) || []).length);

// 4) TarotEntryCard
const tarotPath = path.join(root, "features/tarot/components/TarotEntryCard.tsx");
let tarot = fs.readFileSync(tarotPath, "utf8");
if (!tarot.includes("HomeTrustEvidence")) {
  tarot = tarot.replace(
    `import Link from 'next/link';`,
    `import Link from 'next/link';\nimport HomeTrustEvidence from '@/components/HomeTrustEvidence';`
  );
  if (!tarot.includes("HomeTrustEvidence")) {
    tarot = tarot.replace(
      `import Link from "next/link";`,
      `import Link from "next/link";\nimport HomeTrustEvidence from "@/components/HomeTrustEvidence";`
    );
  }
  const tNeedle = `<div className="tarot-entry-cta home-feature-cta relative flex items-center gap-2 rounded-xl border border-cyan-200/45 bg-cyan-950/30 px-5 py-3 text-xs font-bold text-cyan-50 transition group-hover:bg-cyan-300/20">`;
  if (tarot.includes(tNeedle) && !tarot.includes('items={["免費"')) {
    tarot = tarot.replace(
      tNeedle,
      `<HomeTrustEvidence items={["免費", "親手抽牌", "免登入"]} />\n      ` + tNeedle
    );
  }
  fs.writeFileSync(tarotPath, tarot, "utf8");
  console.log("tarot patched", (tarot.match(/HomeTrustEvidence/g) || []).length);
} else {
  console.log("tarot skip");
}

console.log("done");
