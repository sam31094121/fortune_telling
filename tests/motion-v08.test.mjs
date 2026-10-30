// v0.8 動效組測試：node --test tests/motion-v08.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const FILES = [
  'lib/beast-game/element-palette.ts',
  'lib/beast-game/motion-demo-config.ts',
  'components/motion/BeadFx.tsx',
  'components/motion/BeadFx.module.css',
  'app/beast-game/motion-preview/page.tsx',
  'app/beast-game/motion-preview/MotionPreview.tsx',
  'app/beast-game/motion-preview/MotionPreview.module.css',
];

const tsToUrl = (file, replace = (x) => x) => {
  const out = replace(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText);
  return 'data:text/javascript;base64,' + Buffer.from(out).toString('base64');
};
const paletteUrl = tsToUrl('lib/beast-game/element-palette.ts');
async function loadPalette() { return import(paletteUrl); }
async function loadConfig() { return import(tsToUrl('lib/beast-game/motion-demo-config.ts', (x) => x.replace("'./element-palette'", JSON.stringify(paletteUrl)))); }

test('palette colours are exact', async () => {
  const p = await loadPalette();
  assert.deepEqual(p.ELEMENT_PALETTE, { AIR: '#54d9ad', SPACE: '#bd97ff', WATER: '#68b9ff', FIRE: '#ff747a', EARTH: '#efca77' });
  assert.deepEqual(p.ELEMENT_LABEL, { AIR: '風', SPACE: '空', WATER: '水', FIRE: '火', EARTH: '地' });
});

test('visual power clamps at 10 (12 looks like 10), no cap at 3/4/5/6', async () => {
  const p = await loadPalette();
  assert.equal(p.MOTION_POWER_CAP, 10);
  for (const [n, want] of [[3, 3], [4, 4], [6, 6], [7, 7], [8, 8], [10, 10], [12, 10], [99, 10]]) assert.equal(p.effectivePower(n), want, `count ${n}`);
  assert.equal(p.powerRatio(12), p.powerRatio(10));
  assert.equal(p.powerRatio(10), 1);
  assert.ok(p.powerRatio(8) > p.powerRatio(6) && p.powerRatio(6) > p.powerRatio(4));
  assert.ok(p.cascadeScale(3) > p.cascadeScale(2) && p.cascadeScale(2) > p.cascadeScale(1));
});

test('magic bead visuals are disabled', async () => {
  const p = await loadPalette();
  assert.equal(p.MAGIC_BEAD_VISUALS_ENABLED, false);
  for (const f of FILES) assert.ok(!/MAGIC_BEAD_VISUALS_ENABLED\s*=\s*true|magicOrb/i.test(read(f)), f);
});

test('no old cards or demo cards; FX uses no image assets; cards only via official registry', () => {
  const bannedAll = /BeastLegacyGame|legacy|PREVIEW_CARDS|cards\/beasts|FrameV1Tile|BeastCardTile|demoCards|\.(png|jpe?g|webp|gif|mp4)\b|next\/image/i;
  for (const f of FILES) assert.ok(!bannedAll.test(read(f)), `${f} references an old/demo card or a raw asset`);
  for (const f of FILES.filter((x) => x.includes('BeadFx') || x.endsWith('.css'))) assert.ok(!/<img|url\(/i.test(read(f)), `${f} uses an image`);
  const page = read('app/beast-game/motion-preview/MotionPreview.tsx');
  assert.match(page, /import \{ getCard, playableCards \} from '@\/lib\/beast-game\/registry'/);
  assert.match(page, /officialPool/);
});

test('12-chain: normal attack 10, magicPower 12; magic needs 4+', async () => {
  const p = await loadPalette();
  assert.equal(p.effectivePower(12), 10);
  assert.equal(p.magicPowerFor(12), 12);
  assert.equal(p.magicPowerFor(4), 4);
  assert.equal(p.magicPowerFor(5), 5);
  assert.equal(p.magicPowerFor(3), 0);
  assert.ok(p.magicGlow(12) > p.magicGlow(6) && p.magicGlow(6) > p.magicGlow(4));
});

test('五珠技: exactly 5 only', async () => {
  const p = await loadPalette();
  assert.equal(p.skill5For(5), true);
  assert.equal(p.skill5For(4), false);
  assert.equal(p.skill5For(6), false);
  assert.equal(p.skill5For(3), false);
});

test('demo config defaults: min(N,10)xbase, magicPower x base, 5-chain fills energy', async () => {
  const c = await loadConfig();
  const b = c.MOTION_DEMO_CONFIG.base;
  assert.equal(c.demoHit(3).total, 3 * b);
  assert.equal(c.demoHit(12).normal, 10 * b);
  assert.equal(c.demoHit(12, 12).magic, 12 * b);
  assert.equal(c.demoHit(12, 12).total, 22 * b);
  assert.equal(c.demoHit(5).fillEnergy, true);
  assert.equal(c.demoHit(5).energy, c.MOTION_DEMO_CONFIG.energyMax);
  assert.equal(c.demoHit(4).fillEnergy, false);
  assert.equal(c.demoHit(6).fillEnergy, false);
});

test('eligible=false plays the clear, skips projectile, shows no-attack cue', () => {
  const src = read('components/motion/BeadFx.tsx');
  assert.match(src, /\{b\.eligible && \(\s*<div className=\{s\.gustX\}/);
  assert.match(src, /\{b\.eligible && <span className=\{s\.warp\}/);
  assert.match(src, /!b\.eligible && <NoAttack/);
  assert.match(src, /className=\{s\.ribbon\}/); // 清除效果不受 eligible 影響
  assert.match(src, /className=\{s\.voidRing\}/);
  assert.match(src, /prefers-reduced-motion/);
});

test('animations use transform/opacity only', () => {
  const css = read('components/motion/BeadFx.module.css');
  const frames = css.match(/@keyframes[^{]+\{([\s\S]*?\}\s*)\}/g) ?? [];
  assert.ok(frames.length >= 8);
  for (const k of frames) {
    const props = [...k.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    for (const pr of props) assert.ok(pr === 'transform' || pr === 'opacity', `${pr} in ${k.slice(0, 40)}`);
  }
});

test('events without magic/magicPower/skill5 normalise to plain FX', async () => {
  const p = await loadPalette();
  const n = p.normalizeBeadEvent({ element: 'AIR', count: 4, cascadeStep: 1, eligible: true });
  assert.equal(n.magic, false); assert.equal(n.magicPower, 0); assert.equal(n.skill5, false); assert.equal(n.count, 4);
  const m = p.normalizeBeadEvent({ element: 'SPACE', count: 5, magic: true });
  assert.equal(m.magicPower, 0); assert.equal(m.cascadeStep, 1); assert.equal(m.eligible, true);
  assert.equal(p.normalizeBeadEvent({ element: 'AIR', count: 3, magicPower: NaN }).magicPower, 0);
  const src = read('components/motion/BeadFx.tsx');
  assert.match(src, /magic\?: boolean/); assert.match(src, /magicPower\?: number/); assert.match(src, /skill5\?: boolean/);
  assert.match(src, /normalizeBeadEvent\(ev\)/);
  assert.match(src, /try \{ cb\(it\); \} catch/);
});

test('team: selected same-element card attacks, others get share; none = no attack; skill5/magic same rule', async () => {
  const c = await loadConfig();
  const C = c.MOTION_DEMO_CONFIG;
  assert.equal(C.sameElementShare, 0.5); assert.equal(C.teamSize, 5);
  const team = [{ id: 'a', element: 'AIR' }, { id: 'b', element: 'AIR' }, { id: 'c', element: 'FIRE' }, { id: 'd', element: 'AIR' }, { id: 'e', element: 'WATER' }];
  assert.equal(c.attackerFor(team, 'AIR', {}), 0);
  assert.equal(c.attackerFor(team, 'AIR', { AIR: 3 }), 3);
  assert.equal(c.attackerFor(team, 'AIR', { AIR: 2 }), 0); // 選到非同元素格無效
  assert.equal(c.attackerFor(team, 'SPACE', {}), -1);
  const e0 = [0, 0, 0, 0, 0];
  const g = c.energyGains(team, 'AIR', { AIR: 1 }, 3, e0);
  const full = c.demoHit(3).energy;
  assert.deepEqual(g, [Math.floor(full * .5), full, 0, Math.floor(full * .5), 0]);
  assert.deepEqual(c.energyGains(team, 'SPACE', {}, 6, e0), e0);
  const s5 = c.energyGains(team, 'AIR', {}, 5, [30, 0, 0, 0, 0]);
  assert.equal(s5[0], C.energyMax - 30); // 沒選中 → 第一張補滿
  assert.equal(c.energyGains(team, 'AIR', { AIR: 3 }, 5, e0)[3], C.energyMax);
  assert.deepEqual(c.coverage(team, ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH']), { AIR: 3, SPACE: 0, WATER: 1, FIRE: 1, EARTH: 0 });
  const mp = read('app/beast-game/motion-preview/MotionPreview.tsx');
  assert.match(mp, /data-testid="start-battle"/);
  assert.match(mp, /chosen\.length === CFG\.teamSize && <button/);
  assert.match(mp, /no-attacker-warning/);
  assert.match(mp, /eligible: eligibleToggle && attackerOf\(element\) >= 0/);
});
