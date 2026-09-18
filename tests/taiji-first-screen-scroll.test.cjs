const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('lib/taiji-journey-depth.ts', 'utf8');
const hook = fs.readFileSync('components/taiji/useTaijiFirstScreenScroll.ts', 'utf8');
const page = fs.readFileSync('app/page.tsx', 'utf8');
const shell = fs.readFileSync('components/taiji/TaijiTopShell3D.tsx', 'utf8');

if (!src.includes('export function shouldDriveTaijiFromPageScroll')) {
  throw new Error('page-scroll capture policy must live on the unique journey depth');
}
if (!hook.includes('window.addEventListener(\'wheel\'') || !hook.includes('touchmove')) {
  throw new Error('first-screen journey must listen on the page, not the taiji frame');
}
if (page.includes('data-taiji-scroll-theater') || shell.includes('TaijiScrollTheater')) {
  throw new Error('homepage layout must not grow a scroll theater');
}

function shouldDriveTaijiFromPageScroll(pageScrollY, depth, intent) {
  if (!Number.isFinite(pageScrollY) || pageScrollY > 8) return false;
  if (intent === 'deeper') return depth < 24;
  return depth > 1;
}

assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 1, 'deeper'), true);
assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 23.9, 'deeper'), true);
assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 24, 'deeper'), false);
assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 24, 'shallower'), true);
assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 1, 'shallower'), false);
assert.strictEqual(shouldDriveTaijiFromPageScroll(120, 12, 'deeper'), false);
assert.strictEqual(shouldDriveTaijiFromPageScroll(120, 24, 'shallower'), false);

console.log('taiji-first-screen-scroll ok');
