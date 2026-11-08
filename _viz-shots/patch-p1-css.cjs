const fs = require("fs");

function patchTimeline() {
  const tl = "features/ghost-asura/components/AsuraAgeTimeline.module.css";
  let css = fs.readFileSync(tl, "utf8");
  if (!css.includes(".progressAge")) {
    const insertAfter = ".progressItem {\n  margin: 0;\n  padding: 0;\n}";
    const block = `.progressItem {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 3.6em;
}

.progressAge {
  display: block;
  max-width: 100%;
  min-width: 0;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

.progressItem:has(.dotCurrent) .progressAge {
  color: #efddb5;
  font-weight: 700;
}`;
    if (!css.includes(insertAfter)) throw new Error("progressItem block missing");
    css = css.replace(insertAfter, block);
  }
  if (!css.includes("/* P1 type hierarchy 2026-11-06 */")) {
    css += `

/* P1 type hierarchy 2026-11-06 */
.bridge {
  font-weight: 600;
  font-size: 13px;
  opacity: 1;
}
.peelSource,
.peelProgress {
  font-size: 12px;
  opacity: 1;
}
@media (max-width: 420px) {
  .bridge {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.65;
  }
  .peelSource,
  .peelProgress {
    font-size: 12px;
  }
  .progressAge {
    font-size: 9px;
    max-width: 3.2em;
  }
  .progress {
    gap: 4px 6px;
  }
}
`;
  }
  fs.writeFileSync(tl, css);
  console.log("timeline ok", css.includes(".progressAge"));
}

function patchVisual() {
  const vis = "features/ghost-asura/components/GhostAsuraCard.visual.module.css";
  let v = fs.readFileSync(vis, "utf8");

  v = v.replace(
    /\.visualBadgeLabel \{\n  grid-area: label;\n  min-width: 0;\n  max-width: 100%;\n  font-size: 12px;\n  font-weight: 600;\n  line-height: 1.35;\n  letter-spacing: 0.02em;\n  opacity: 0\.88;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n\}/,
    `.visualBadgeLabel {
  grid-area: label;
  min-width: 0;
  max-width: 100%;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.02em;
  opacity: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}`
  );

  v = v.replace(
    /\.visualBadgeLabel \{\n    font-size: 11px;\n    \/\* ~16 CJK @ 390: keep one line, ellipsis \*\/\n    max-width: 100%;\n  \}/,
    `.visualBadgeLabel {
    font-size: 13px;
    opacity: 1;
    /* ~16 CJK @ 390: keep one line, ellipsis */
    max-width: 100%;
  }`
  );

  v = v.replace(
    /\.visualBadgeCurrent \{\n  border-color: rgba\(255, 214, 102, 0\.9\);\n  background: linear-gradient\(180deg, rgba\(255, 196, 64, 0\.28\), rgba\(248, 199, 88, 0\.08\)\);\n  box-shadow: 0 0 18px rgba\(255, 196, 64, 0\.35\);\n\}/,
    `.visualBadgeCurrent {
  border-color: rgba(255, 214, 102, 0.9);
  background: linear-gradient(180deg, rgba(255, 196, 64, 0.28), rgba(248, 199, 88, 0.08));
  /* directional depth only — no full-ring glow (卡面修圖手法 #2) */
  box-shadow:
    inset 0 1px 0 rgba(252, 234, 134, 0.55),
    4px 8px 16px rgba(0, 0, 0, 0.28);
}`
  );

  if (!v.includes("/* P1 gold border + top-edge sheen")) {
    v += `

/* P1 gold border + top-edge sheen 2026-11-06
 * 卡面修圖手法: (1) unified light TL→BR (2) no full-ring glow
 * (3) proportional in-frame (4) verify 360/390/1280
 */
.visualCard {
  border: 1px solid rgba(248, 199, 88, 0.48);
  background:
    linear-gradient(165deg, rgba(252, 234, 134, 0.06) 0%, transparent 38%),
    linear-gradient(165deg, #24231f 0%, #1a1916 100%);
  /* directional depth BR only — NOT a ring */
  box-shadow:
    inset 0 1px 0 rgba(252, 234, 134, 0.55),
    6px 10px 22px rgba(0, 0, 0, 0.32);
}

/* Top-edge contact highlight: gold line bright, fades down */
.visualCard::after {
  content: "";
  position: absolute;
  left: 8%;
  right: 8%;
  top: 0;
  height: 2px;
  pointer-events: none;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(252, 234, 134, 0.15) 12%,
    rgba(252, 234, 134, 0.85) 50%,
    rgba(252, 234, 134, 0.15) 88%,
    transparent 100%
  );
  box-shadow: 0 4px 10px rgba(252, 234, 134, 0.18);
  z-index: 2;
  opacity: 0.95;
}

/* Refine existing ::before vignette to same TL→BR light */
.visualCard::before {
  background: linear-gradient(
    165deg,
    rgba(252, 234, 134, 0.1) 0%,
    transparent 40%,
    rgba(0, 0, 0, 0.22) 100%
  );
}

.visualCardCurrent {
  border-color: rgba(252, 234, 134, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(252, 234, 134, 0.7),
    6px 12px 24px rgba(0, 0, 0, 0.34);
}

.visualCardCurrent::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 243, 176, 0.25) 10%,
    rgba(255, 243, 176, 0.95) 50%,
    rgba(255, 243, 176, 0.25) 90%,
    transparent 100%
  );
  box-shadow: 0 5px 12px rgba(252, 234, 134, 0.28);
}

@media (max-width: 420px) {
  .visualCard {
    box-shadow:
      inset 0 1px 0 rgba(252, 234, 134, 0.5),
      4px 8px 16px rgba(0, 0, 0, 0.3);
  }
  .visualCard::after {
    left: 6%;
    right: 6%;
    height: 1.5px;
  }
}
`;
  }
  fs.writeFileSync(vis, v);
  console.log("visual ok", /font-size: 13px/.test(v) && v.includes("opacity: 1") && v.includes("P1 gold border"));
}

function patchBase() {
  const base = "features/ghost-asura/components/GhostAsuraCard.module.css";
  let b = fs.readFileSync(base, "utf8");
  if (!b.includes("/* P1 decree card gold hierarchy")) {
    b += `

/* P1 decree card gold hierarchy + top sheen handoff to visual module 2026-11-06 */
.timelineDecreeCard {
  border: 1px solid rgba(248, 199, 88, 0.48);
  box-shadow: none;
  overflow: hidden;
}
`;
    fs.writeFileSync(base, b);
    console.log("base ok");
  } else {
    console.log("base already");
  }
}

patchTimeline();
patchVisual();
patchBase();
