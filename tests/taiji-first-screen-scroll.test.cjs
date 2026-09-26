const fs = require('fs');
const assert = require('assert');
const ts = require('typescript');
const vm = require('vm');

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

function load(source, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }, ...globals });
  return module.exports;
}
const journey = load(src);
const { shouldDriveTaijiFromPageScroll } = journey;
const baseline = JSON.parse(fs.readFileSync('reports/taiji-lock/LEVEL_02_TO_24_BASELINE.json', 'utf8'));
for (const [name, value] of Object.entries(baseline.timingConfig)) {
  assert.strictEqual(journey[name], value, `protected constant ${name}`);
}
for (const [name, value] of Object.entries(baseline.stateConfig)) {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(journey[name])), value, `protected state ${name}`);
}

assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 1, 'deeper'), true);
assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 23.9, 'deeper'), true);
assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 24, 'deeper'), false);
assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 24, 'shallower'), true);
assert.strictEqual(shouldDriveTaijiFromPageScroll(0, 1, 'shallower'), false);
assert.strictEqual(shouldDriveTaijiFromPageScroll(120, 12, 'deeper'), false);
assert.strictEqual(shouldDriveTaijiFromPageScroll(120, 24, 'shallower'), false);
assert.strictEqual(shouldDriveTaijiFromPageScroll(8, 12, 'deeper'), true);
assert.strictEqual(shouldDriveTaijiFromPageScroll(8.01, 12, 'deeper'), false);
assert.strictEqual(shouldDriveTaijiFromPageScroll(NaN, 12, 'deeper'), false);

// Execute the production hook and its registered handlers, not a duplicate policy.
const handlers = new Map();
const options = new Map();
let cleanup;
class Element { constructor(tagName = 'DIV') { this.tagName = tagName; } }
const window = {
  scrollY: 0,
  addEventListener(name, handler, opts) { handlers.set(name, handler); options.set(name, opts); },
  removeEventListener(name, handler) { assert.strictEqual(handlers.get(name), handler); handlers.delete(name); },
};
const ref = { current: journey.createTaijiJourneyState() };
load(hook, { react: { useEffect: fn => { cleanup = fn(); } }, '@/lib/taiji-journey-depth': journey },
  { window, document: { documentElement: { scrollTop: 0 } }, HTMLElement: Element }
).useTaijiFirstScreenScroll(ref);
function event(name, props) {
  const e = { target: new Element(), prevented: false, preventDefault() { this.prevented = true; }, ...props };
  handlers.get(name)(e);
  return e;
}
function swipe(from, to) {
  event('touchstart', { touches: [{ clientY: from }] });
  const result = event('touchmove', { touches: [{ clientY: to }] });
  event('touchend', {});
  return result;
}
assert.strictEqual(options.get('touchmove').passive, false);
assert.strictEqual(swipe(100, 90).prevented, true);
assert.strictEqual(ref.current.target, 1.2);
journey.jumpJourney(ref.current, 24);
assert.strictEqual(swipe(100, 0).prevented, false);
assert.strictEqual(ref.current.target, 24);
assert.strictEqual(swipe(100, 200).prevented, true);
assert.strictEqual(ref.current.target, 23.78);
for (let step = 0; step < 4; step++) swipe(100, 200);
for (let frame = 0; frame < 200; frame++) journey.integrateJourney(ref.current, 1 / 60);
assert.strictEqual(journey.layerFromDepth(ref.current.current), 23, 'reverse swipe returns to previous visible layer');
journey.jumpJourney(ref.current, 1);
assert.strictEqual(swipe(100, 200).prevented, false);
assert.strictEqual(ref.current.target, 1);
journey.jumpJourney(ref.current, 12);
window.scrollY = 120;
for (const to of [0, 200]) assert.strictEqual(swipe(100, to).prevented, false);
assert.strictEqual(event('wheel', { deltaY: 100, deltaMode: 0 }).prevented, false);
assert.strictEqual(ref.current.target, 12);
window.scrollY = 0;
assert.strictEqual(event('wheel', { deltaY: -100, deltaMode: 0 }).prevented, true);
assert.strictEqual(ref.current.target, 11.78);
assert.strictEqual(event('wheel', { deltaY: 100, ctrlKey: true }).prevented, false);
assert.strictEqual(event('wheel', { deltaY: 100, target: new Element('INPUT') }).prevented, false);
event('touchstart', { touches: [{ clientY: 100 }, { clientY: 120 }] });
assert.strictEqual(event('touchmove', { touches: [{ clientY: 0 }] }).prevented, false);
journey.jumpJourney(ref.current, 23.99);
swipe(100, 0);
assert.strictEqual(ref.current.target, 24);
journey.jumpJourney(ref.current, 1.01);
swipe(100, 200);
assert.strictEqual(ref.current.target, 1);
cleanup();
assert.strictEqual(handlers.size, 0);

load(hook, { react: { useEffect: fn => { cleanup = fn(); } }, '@/lib/taiji-journey-depth': journey },
  { window, document: { documentElement: { scrollTop: 0 } }, HTMLElement: Element }
).useTaijiFirstScreenScroll(ref, false);
assert.strictEqual(handlers.size, 0, 'paused page input registers no listeners');

const pinch = fs.readFileSync('components/taiji/useTaijiPinch.ts', 'utf8');
load(pinch, { react: { useEffect: fn => { cleanup = fn(); } }, '@/lib/taiji-journey-depth': journey })
  .useTaijiPinch({ current: window }, ref);
assert.strictEqual(handlers.has('wheel'), false);
assert.strictEqual(handlers.has('touchmove'), false);
journey.jumpJourney(ref.current, 1);
const pointer = (name, id, x) => event(name, { pointerType: 'touch', pointerId: id, clientX: x, clientY: 0 });
pointer('pointerdown', 1, 0);
pointer('pointermove', 1, 10);
assert.strictEqual(ref.current.target, 1, 'single finger cannot advance depth');
pointer('pointerdown', 2, 110);
pointer('pointermove', 2, 210);
assert.strictEqual(ref.current.target, 1 + journey.TAIJI_PINCH_DEPTH_GAIN, 'spreading two fingers enlarges');
pointer('pointermove', 2, 60);
assert.strictEqual(ref.current.target, 1, 'pinching inward clamps at first layer');
pointer('pointercancel', 2, 60);
pointer('pointermove', 1, 100);
assert.strictEqual(ref.current.target, 1, 'cancelled pinch stops changing depth');
cleanup();
assert.strictEqual(handlers.size, 0);

console.log('taiji-first-screen-scroll ok');
