import fs from "fs";
import path from "path";

const root = process.argv[2];
const globals = path.join(root, "app", "globals.css");
let s = fs.readFileSync(globals, "utf8");

const markers = [
  "/* ===== taiji shell quiet 2026-09-23d",
  "/* ===== taiji shell quiet 2026-09-23e",
  "/* ===== taiji shell quiet 2026-09-23",
];
let start = -1;
for (const m of markers) {
  const i = s.indexOf(m);
  if (i >= 0) {
    start = i;
    break;
  }
}
if (start < 0) {
  // also try older marker text from first append
  start = s.indexOf("taiji shell quiet 2026-09-23d");
  if (start >= 0) start = s.lastIndexOf("/*", start);
}
if (start < 0) {
  console.log("APPEND_ONLY");
  start = s.length;
}

let before = s.slice(0, start).replace(/\s*$/, "");
let after = "";
if (start < s.length) {
  const media = s.indexOf("@media", start);
  if (media >= 0) {
    let depth = 0;
    let endIdx = -1;
    for (let i = s.indexOf("{", media); i < s.length; i++) {
      if (s[i] === "{") depth++;
      else if (s[i] === "}") {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    after = endIdx > 0 ? s.slice(endIdx).replace(/^\s*/, "") : "";
  }
}

const next = `

/* ===== taiji shell quiet 2026-09-23e — live TaijiSystem/level01 shell only; no height/order ===== */
@media (max-width: 900px), (pointer: coarse) {
  .home-first-screen-stack .home-top-brand-stage [class*="visualPulse"],
  .home-top-brand-stage [class*="visualPulse"] {
    opacity: 0 !important;
    animation: none !important;
  }
  .home-first-screen-stack .home-top-brand-stage [class*="energyVeil"],
  .home-top-brand-stage [class*="energyVeil"],
  .home-first-screen-stack .home-top-brand-stage [class*="journeyRing"],
  .home-top-brand-stage [class*="journeyRing"],
  .home-first-screen-stack .home-top-brand-stage [class*="completionHalo"],
  .home-top-brand-stage [class*="completionHalo"] {
    opacity: 0 !important;
    animation: none !important;
  }
  .home-first-screen-stack .home-top-brand-stage [class*="groundShadow"],
  .home-top-brand-stage [class*="groundShadow"] {
    opacity: 0.35 !important;
    filter: blur(2px) !important;
  }
  .home-first-screen-stack .home-top-brand-stage [class*="shadowGlow"],
  .home-top-brand-stage [class*="shadowGlow"] {
    opacity: 0.12 !important;
    animation: none !important;
  }
  .home-first-screen-stack .home-top-brand-stage [class*="particlePair"],
  .home-top-brand-stage [class*="particlePair"] {
    opacity: 0.08 !important;
  }
  .home-first-screen-stack .home-top-brand-stage [class*="chaseCounterLight"],
  .home-top-brand-stage [class*="chaseCounterLight"],
  .home-first-screen-stack .home-top-brand-stage [class*="chaseParticle"],
  .home-top-brand-stage [class*="chaseParticle"] {
    opacity: 0.18 !important;
    animation: none !important;
    box-shadow: none !important;
  }
  .home-first-screen-stack .home-top-brand-stage .taiji-mobile-play-hint,
  .home-top-brand-stage .taiji-mobile-play-hint {
    opacity: 0.55 !important;
  }
  .home-first-screen-stack .home-top-brand-stage .modal-evolution-rays,
  .home-top-brand-stage .modal-evolution-rays {
    opacity: 0.12 !important;
  }
  .home-first-screen-stack .home-top-brand-stage .taiji-celestial-mist,
  .home-first-screen-stack .home-top-brand-stage .taiji-celestial-wisp,
  .home-first-screen-stack .home-top-brand-stage .taiji-gold-waves,
  .home-top-brand-stage .taiji-celestial-mist,
  .home-top-brand-stage .taiji-celestial-wisp,
  .home-top-brand-stage .taiji-gold-waves {
    opacity: 0.1 !important;
  }
}
`;

fs.writeFileSync(globals, `${before}${next}${after ? `\n${after}` : "\n"}`, "utf8");
console.log(JSON.stringify({ ok: true, size: fs.statSync(globals).size, hasE: fs.readFileSync(globals, "utf8").includes("2026-09-23e") }));
