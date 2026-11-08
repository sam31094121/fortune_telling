const fs = require('fs');

// Fix GhostAsuraCard: move helper after imports; clean style={undefined}; drop unused nextDelay
{
  let t = fs.readFileSync('features/ghost-asura/components/GhostAsuraCard.tsx', 'utf8');
  const helper =
    "/** Mobile or reduced-motion: instant scroll (perf). Desktop may smooth. */\n" +
    "function asuraScrollBehavior(): ScrollBehavior {\n" +
    "  if (typeof window === 'undefined') return 'auto';\n" +
    "  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'auto';\n" +
    "  if (window.matchMedia('(max-width: 420px)').matches) return 'auto';\n" +
    "  return 'smooth';\n" +
    "}\n\n";

  // remove any existing helper (before or after imports)
  t = t.replace(
    /\n?\/\*\* Mobile or reduced-motion: instant scroll \(perf\)\. Desktop may smooth\. \*\/\nfunction asuraScrollBehavior\(\): ScrollBehavior \{\n(?:.|\n)*?\n\}\n\n/,
    "\n"
  );
  t = t.replace(
    "import { AsuraAgeTimeline, type AsuraAgeFocusRequest } from './AsuraAgeTimeline';\n",
    "import { AsuraAgeTimeline, type AsuraAgeFocusRequest } from './AsuraAgeTimeline';\n\n" + helper
  );
  t = t.replace(/\s*style=\{undefined\}/g, "");

  const nextDelayCalls = (t.match(/\bnextDelay\(/g) || []).length;
  console.log("nextDelayCalls", nextDelayCalls);
  if (nextDelayCalls === 0) {
    t = t.replace(
      /\n\s*const nextDelay = \(\) => baseDelay \+ glowIndex\+\+ \* animationConfig\.impressionGlow\.staggerDelay;/,
      ""
    );
    if ((t.match(/\bglowIndex\b/g) || []).length <= 1) {
      t = t.replace(/\n\s*let glowIndex = 0;/, "");
    }
    // multi-line baseDelay
    t = t.replace(
      /\n\s*const baseDelay =\n\s*animationConfig\.cardReveal\.delay \+\n\s*animationConfig\.cardReveal\.duration \+\n\s*animationConfig\.impressionGlow\.delay;/,
      ""
    );
  }

  fs.writeFileSync("features/ghost-asura/components/GhostAsuraCard.tsx", t, "utf8");
  console.log(
    "helper after imports",
    t.indexOf("function asuraScrollBehavior") > t.indexOf("from './AsuraAgeTimeline'")
  );
  console.log("style undefined left", t.includes("style={undefined}"));
}

// Fix timeline deferred placeholder
{
  let t = fs.readFileSync("features/ghost-asura/components/AsuraAgeTimeline.tsx", "utf8");
  if (t.includes("collapsedHint") || t.includes("styles.age}")) {
    t = t.replace(
      /<span className=\{styles\.tense\}>\{segment\.tense\}<\/span>\s*<span className=\{styles\.age\}>\{segment\.ageLabel\}<\/span>\s*<span className=\{styles\.collapsedHint\}>[\s\S]*?<\/span>/,
      "<span className={styles.lineSurface}>{segment.lines[0] ?? segment.ageLabel}</span>\n" +
        "                    <span className={styles.collapsedMeta}>\n" +
        "                      <span className={styles.ageLabel}>{segment.ageLabel}</span>\n" +
        "                      <span className={styles.tense}>{segment.tense}</span>\n" +
        "                    </span>"
    );
    // ensure aria-label on deferred button
    t = t.replace(
      /data-asura-deferred="true"\n\s*>\n\s*<button\n\s*type="button"\n\s*className=\{styles\.collapsedHit\}\n\s*onClick=\{\(\) => openSegment\(index\)\}\n\s*aria-expanded=\{false\}\n\s*>/,
      'data-asura-deferred="true"\n                >\n                  <button\n                    type="button"\n                    className={styles.collapsedHit}\n                    onClick={() => openSegment(index)}\n                    aria-expanded={false}\n                    aria-label={segment.ageLabel + "・" + segment.tense}\n                  >'
    );
  }
  fs.writeFileSync("features/ghost-asura/components/AsuraAgeTimeline.tsx", t, "utf8");
  console.log(
    "timeline collapsedHint",
    t.includes("collapsedHint"),
    "deferred",
    t.includes("data-asura-deferred")
  );
}
