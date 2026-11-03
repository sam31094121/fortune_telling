const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module: mod, exports: mod.exports, console, ...globals }, { filename: file });
  return mod.exports;
}

async function audioCheck() {
  const scripts = [], timers = new Map(), created = [];
  let nextTimer = 1;
  const window = {};
  const api = load('lib/ghost-asura-audio.ts', { window,
    document: { createElement: () => ({ remove() { this.removed = true; } }), head: { appendChild: (script) => scripts.push(script) } },
    setTimeout: (callback) => { const id = nextTimer++; timers.set(id, callback); return id; }, clearTimeout: (id) => timers.delete(id),
  });
  const pending = api.initializeAudio();
  assert.strictEqual(api.initializeAudio(), pending);
  assert.equal(scripts.length, 1, 'concurrent initialization adds only one script');
  window.Howl = class {
    constructor(config) { this.config = config; this.plays = 0; this.stops = 0; this.unloads = 0; created.push(this); }
    play() { this.plays++; }
    stop() { this.stops++; }
    unload() { this.unloads++; }
  };
  scripts[0].onload();
  await pending;
  assert.equal(scripts[0].removed, true);
  for (let i = 0; i < 40; i++) api.playCardRevealSound();
  assert.equal(created.length, 1, 'same effect reuses audio resource');
  assert.equal(created[0].config.autoplay, false, 'explicit play must not duplicate autoplay');
  assert.equal(created[0].plays, 40);
  for (let i = 0; i < 30; i++) api.playImpressionGlowSound(i);
  assert.equal(timers.size, 30);
  api.cleanupAudio();
  assert.equal(timers.size, 0, 'old result sound timers cancelled');
  assert.equal(created[0].unloads, 1);
  assert.equal(created[0].stops, 1);
  api.cleanupAudio();
  assert.equal(created[0].unloads, 1, 'cleanup idempotent');
  api.playCardRevealSound();
  assert.equal(created.length, 2, 'new result can play after cleanup without another script');
  await api.initializeAudio();
  assert.equal(scripts.length, 1);
  api.cleanupAudio();
}

function particleEnvironment() {
  let now = 0, nextFrame = 1, draws = 0;
  const frames = new Map(), listeners = new Set(), observers = [];
  const ctx = { clearRect() {}, save() {}, restore() {}, beginPath() {}, arc() { draws++; }, fill() {} };
  const document = { hidden: false, createElement: () => ({ style: {}, parentElement: null, width: 0, height: 0, getContext: () => ctx, remove() { this.parentElement = null; } }),
    addEventListener: (_name, fn) => listeners.add(fn), removeEventListener: (_name, fn) => listeners.delete(fn),
  };
  const container = { style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 740 }), appendChild(canvas) { canvas.parentElement = this; } };
  const api = load('lib/ghost-asura-particles.ts', { document, performance: { now: () => now },
    ResizeObserver: class { constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } },
    requestAnimationFrame: (fn) => { const id = nextFrame++; frames.set(id, fn); return id; }, cancelAnimationFrame: (id) => frames.delete(id),
  });
  return { api, container, frames, listeners, observers, document, get draws() { return draws; }, get now() { return now; },
    frame(ms) { now += ms; const batch = [...frames.values()]; frames.clear(); for (const fn of batch) fn(now); },
    visibility(hidden) { document.hidden = hidden; for (const fn of listeners) fn(); },
  };
}

function particleCheck() {
  const durations = [];
  for (const fps of [60, 20]) {
    const e = particleEnvironment();
    const system = e.api.initializeParticleSystem(e.container);
    system.createShockwave(100, 100);
    for (let i = 0; e.frames.size && i < 150; i++) { assert.equal(e.frames.size, 1); e.frame(1000 / fps); }
    assert.equal(e.frames.size, 0, 'no idle animation loop');
    durations.push(e.now);
    assert.ok(e.draws > 0, 'effect retained');
    e.api.cleanupParticleSystem();
    assert.equal(e.listeners.size, 0);
    assert.ok(e.observers.every((observer) => observer.disconnected));
  }
  assert.ok(Math.abs(durations[0] - durations[1]) <= 60, `life duration should not triple at20fps: ${durations}`);
  const e = particleEnvironment();
  const old = e.api.initializeParticleSystem(e.container);
  old.createShockwave(100, 100);
  e.frame(100);
  e.visibility(true);
  assert.equal(e.frames.size, 0, 'hidden page does not keep animation scheduled');
  e.frame(60_000);
  e.visibility(false);
  assert.equal(e.frames.size, 1);
  e.frame(16);
  assert.ok(e.frames.size, 'background elapsed time does not instantly erase paused effect');
  e.api.cleanupParticleSystem();
  assert.equal(e.frames.size, 0);
  old.createShockwave(100, 100);
  assert.equal(e.frames.size, 0, 'late old-result callbacks cannot revive destroyed canvas');
  for (let i = 0; i < 15; i++) {
    const system = e.api.initializeParticleSystem(e.container);
    system.createShockwave(10, 10);
    e.api.cleanupParticleSystem();
  }
  assert.equal(e.frames.size, 0);
  assert.equal(e.listeners.size, 0);
  assert.ok(e.observers.every((observer) => observer.disconnected));
  console.log(`PASS particles duration60/20fps ${durations.map((value) => Math.round(value)).join('/')}ms; hidden/destroy/reentry cleanup`);
}

audioCheck().then(() => { particleCheck(); console.log('PASS audio one script/resource per effect, single play, pending callback cleanup and reuse'); }).catch((error) => { console.error(error); process.exitCode = 1; });
