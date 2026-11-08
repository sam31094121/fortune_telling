const fs = require('fs');
const path = require('path');

function write(p, s) {
  fs.writeFileSync(p, s, 'utf8');
}

// ---------- GhostAsuraPageClient.tsx ----------
{
  const p = 'app/ghost-asura/GhostAsuraPageClient.tsx';
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes("startTransition")) {
    t = t.replace(
      "import { useEffect, useRef, useState, type CSSProperties } from 'react';",
      "import { startTransition, useEffect, useRef, useState, type CSSProperties } from 'react';"
    );
  }
  // setResult via startTransition (keep API/body unchanged)
  t = t.replace(
    "      setVoiceBody(submittedInput);\n      setResult(data.data ?? null);",
    "      setVoiceBody(submittedInput);\n      startTransition(() => {\n        setResult(data.data ?? null);\n      });"
  );
  // Drop inline entrance animation — CSS module owns final/flicker-safe state
  t = t.replace(
    /className=\{styles\.asuraCardReveal\}\s*\n\s*style=\{\{\s*\n\s*animation: `asuraCardReveal 1\.2s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\) forwards`,\s*\n\s*\}\}\s*\n\s*>/,
    "className={styles.asuraCardReveal}\n                >"
  );
  write(p, t);
  console.log('patched PageClient', t.includes('startTransition(() => {'), !t.includes('asuraCardReveal 1.2s'));
}

// ---------- GhostAsuraCard.tsx ----------
{
  const p = 'features/ghost-asura/components/GhostAsuraCard.tsx';
  let t = fs.readFileSync(p, 'utf8');
  // helper after 'use client'
  if (!t.includes('function asuraScrollBehavior')) {
    t = t.replace(
      "'use client';\n\n\nimport { Fragment, useEffect, useMemo, useRef, useState,",
      `'use client';\n\n/** Mobile or reduced-motion: instant scroll (perf). Desktop may smooth. */\nfunction asuraScrollBehavior(): ScrollBehavior {\n  if (typeof window === 'undefined') return 'auto';\n  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'auto';\n  if (window.matchMedia('(max-width: 420px)').matches) return 'auto';\n  return 'smooth';\n}\n\nimport { Fragment, useEffect, useMemo, useRef, useState,`
    );
  }
  // replace scroll behaviors
  t = t.replace(
    /behavior: reduce \? 'auto' : 'smooth'/g,
    "behavior: asuraScrollBehavior()"
  );
  // remove unused reduce locals only where they become unused — keep reduce if still used; if only for behavior, simplify
  // After replace, some `const reduce = ...` may be unused. Clean the known blocks carefully.
  t = t.replace(
    /const reduce = window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches;\n      heading\.scrollIntoView\(\{ block: 'nearest', inline: 'nearest', behavior: asuraScrollBehavior\(\) \}\);/,
    "heading.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: asuraScrollBehavior() });"
  );
  t = t.replace(
    /const reduce = window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches;\n    card\.scrollIntoView\(\{ block: fits \? 'center' : 'start', inline: 'nearest', behavior: asuraScrollBehavior\(\) \}\);/,
    "card.scrollIntoView({ block: fits ? 'center' : 'start', inline: 'nearest', behavior: asuraScrollBehavior() });"
  );
  t = t.replace(
    /const reduce = window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches;\n      el\.scrollIntoView\(\{ behavior: asuraScrollBehavior\(\), block: 'start' \}\);/,
    "el.scrollIntoView({ behavior: asuraScrollBehavior(), block: 'start' });"
  );
  t = t.replace(
    /const reduce = window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches;\n    window\.requestAnimationFrame\(\(\) => \{\n      el\.scrollIntoView\(\{ behavior: asuraScrollBehavior\(\), block: 'start' \}\);\n    \}\);/,
    "window.requestAnimationFrame(() => {\n      el.scrollIntoView({ behavior: asuraScrollBehavior(), block: 'start' });\n    });"
  );

  // Remove inline impression glow animations (CSS handles)
  t = t.replace(
    /style=\{\s*seal\.tone === 'awakened'\s*\?\s*\{\s*animation: 'asuraImpressionGlow 0\.8s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\) forwards',\s*animationDelay: `\$\{nextDelay\(\)\}ms`,\s*\}\s*:\s*\{\}\s*\}/g,
    "style={undefined}"
  );
  t = t.replace(
    /style=\{\s*item\.sealStatus === 'awakened'\s*\?\s*\{\s*animation: `asuraImpressionGlow 0\.8s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\) forwards`,\s*animationDelay: `\$\{getImpressionAnimationDelay\(\)\}ms`,\s*\}\s*:\s*\{\}\s*\}/g,
    "style={undefined}"
  );

  write(p, t);
  console.log('patched Card', t.includes('asuraScrollBehavior'), (t.match(/asuraScrollBehavior\(\)/g)||[]).length);
}

// ---------- AsuraAgeTimeline.tsx ----------
{
  const p = 'features/ghost-asura/components/AsuraAgeTimeline.tsx';
  let t = fs.readFileSync(p, 'utf8');
  t = t.replace(
    "import { Fragment, useEffect, useMemo, useState } from 'react';",
    "import { Fragment, startTransition, useEffect, useMemo, useState } from 'react';"
  );
  if (!t.includes('function asuraScrollBehavior')) {
    t = t.replace(
      "import motion from './AsuraAgeTimeline.motion.module.css';\n",
      `import motion from './AsuraAgeTimeline.motion.module.css';\n\n/** Mobile or reduced-motion: instant scroll (perf). */\nfunction asuraScrollBehavior(): ScrollBehavior {\n  if (typeof window === 'undefined') return 'auto';\n  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'auto';\n  if (window.matchMedia('(max-width: 420px)').matches) return 'auto';\n  return 'smooth';\n}\n`
    );
  }

  // state for deferred extras
  if (!t.includes('extrasReady')) {
    t = t.replace(
      "  const [bootstrapped, setBootstrapped] = useState(false);\n\n  useEffect(() => {\n    if (!segments || bootstrapped) return;",
      `  const [bootstrapped, setBootstrapped] = useState(false);\n  /** First paint: 戰神令旁時間軸只掛「現在段」；其餘段 idle 後再掛，砍開卡 longtask。 */\n  const [extrasReady, setExtrasReady] = useState(false);\n\n  useEffect(() => {\n    if (!segments || bootstrapped) return;`
    );
    t = t.replace(
      "  }, [segments, currentIndex, bootstrapped]);\n\n  useEffect(() => {\n    if (!focusRequest || !segments) return;",
      `  }, [segments, currentIndex, bootstrapped]);\n\n  useEffect(() => {\n    if (!segments) return;\n    setExtrasReady(false);\n    let cancelled = false;\n    const enable = () => {\n      if (!cancelled) setExtrasReady(true);\n    };\n    let idleId: number | undefined;\n    let timeoutId: number | undefined;\n    const w = window as Window & {\n      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;\n      cancelIdleCallback?: (id: number) => void;\n    };\n    if (typeof w.requestIdleCallback === 'function') {\n      idleId = w.requestIdleCallback(enable, { timeout: 450 });\n    } else {\n      timeoutId = window.setTimeout(enable, 50);\n    }\n    return () => {\n      cancelled = true;\n      if (idleId != null && typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(idleId);\n      if (timeoutId != null) window.clearTimeout(timeoutId);\n    };\n  }, [segments]);\n\n  useEffect(() => {\n    if (!focusRequest || !segments) return;`
    );
  }

  // focus peelLevels + scroll
  t = t.replace(
    "    if (focusRequest.peelTo) {\n      setPeelLevels((prev) => {\n        const next = { ...prev };\n        const seg = segments[target];\n        const depths = Array.isArray(seg.depth) ? seg.depth : [];\n        const lineIndexes =\n          typeof focusRequest.lineIndex === 'number'\n            ? [focusRequest.lineIndex]\n            : seg.lines.map((_, i) => i);\n        for (const li of lineIndexes) {\n          const layers = listAvailableLayers(depths[li]);\n          next[`${target}-${li}`] = peelLevelForTarget(layers, focusRequest.peelTo);\n        }\n        return next;\n      });\n    }\n\n    const reduce =\n      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n    const run = () => {\n      const el = document.querySelector(`[data-asura-age-seg-index=\"${target}\"]`) as HTMLElement | null;\n      if (!el) return;\n      el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });\n    };\n    window.setTimeout(run, reduce ? 0 : 40);",
    "    if (focusRequest.peelTo) {\n      startTransition(() => {\n        setPeelLevels((prev) => {\n          const next = { ...prev };\n          const seg = segments[target];\n          const depths = Array.isArray(seg.depth) ? seg.depth : [];\n          const lineIndexes =\n            typeof focusRequest.lineIndex === 'number'\n              ? [focusRequest.lineIndex]\n              : seg.lines.map((_, i) => i);\n          for (const li of lineIndexes) {\n            const layers = listAvailableLayers(depths[li]);\n            next[`${target}-${li}`] = peelLevelForTarget(layers, focusRequest.peelTo);\n          }\n          return next;\n        });\n      });\n    }\n\n    setExtrasReady(true);\n    const run = () => {\n      const el = document.querySelector(`[data-asura-age-seg-index=\"${target}\"]`) as HTMLElement | null;\n      if (!el) return;\n      el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: asuraScrollBehavior() });\n    };\n    window.setTimeout(run, asuraScrollBehavior() === 'auto' ? 0 : 40);"
  );

  t = t.replace(
    "  const openSegment = (index: number) => {\n    if (index < 0 || index >= segments.length) return;\n    setOpenedIndex(index);\n    setVisited((prev) => (prev[index] ? prev : { ...prev, [index]: true }));\n    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n    const el = document.querySelector(`[data-asura-age-seg-index=\"${index}\"]`) as HTMLElement | null;\n    if (el) el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });\n  };\n\n  const peelOnce = (segIndex: number, lineIndex: number, max: number) => {\n    const key = `${segIndex}-${lineIndex}`;\n    setPeelLevels((prev) => {\n      const cur = prev[key] ?? 0;\n      if (cur >= max) return prev;\n      return { ...prev, [key]: cur + 1 };\n    });\n  };",
    "  const openSegment = (index: number) => {\n    if (index < 0 || index >= segments.length) return;\n    if (!extrasReady) setExtrasReady(true);\n    setOpenedIndex(index);\n    setVisited((prev) => (prev[index] ? prev : { ...prev, [index]: true }));\n    const el = document.querySelector(`[data-asura-age-seg-index=\"${index}\"]`) as HTMLElement | null;\n    if (el) el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: asuraScrollBehavior() });\n  };\n\n  const peelOnce = (segIndex: number, lineIndex: number, max: number) => {\n    const key = `${segIndex}-${lineIndex}`;\n    startTransition(() => {\n      setPeelLevels((prev) => {\n        const cur = prev[key] ?? 0;\n        if (cur >= max) return prev;\n        return { ...prev, [key]: cur + 1 };\n      });\n    });\n  };"
  );

  // Defer full segment bodies: wrap map callback start
  // Insert after `const isLast = index === segments.length - 1;`
  if (!t.includes('mountFullSegment')) {
    t = t.replace(
      "          const isLast = index === segments.length - 1;\n\n          return (\n            <Fragment key={key}>\n            <article",
      `          const isLast = index === segments.length - 1;\n          const mountFullSegment = extrasReady || index === currentIndex || index === openedIndex;\n\n          if (!mountFullSegment) {\n            return (\n              <Fragment key={key}>\n                <article\n                  id={\`asura-age-seg-\${index}\`}\n                  className={segmentClass}\n                  data-asura-age-segment={segment.tense}\n                  data-asura-age-seg-index={index}\n                  data-current={segment.isCurrent ? 'true' : undefined}\n                  data-asura-deferred=\"true\"\n                >\n                  <button\n                    type=\"button\"\n                    className={styles.collapsedHit}\n                    onClick={() => openSegment(index)}\n                    aria-expanded={false}\n                  >\n                    <span className={styles.tense}>{segment.tense}</span>\n                    <span className={styles.age}>{segment.ageLabel}</span>\n                    <span className={styles.collapsedHint}>點開這段</span>\n                  </button>\n                </article>\n              </Fragment>\n            );\n          }\n\n          return (\n            <Fragment key={key}>\n            <article`
    );
  }

  write(p, t);
  console.log('patched Timeline', t.includes('extrasReady'), t.includes('startTransition'), t.includes('mountFullSegment'));
}

console.log('ALL_DONE');
