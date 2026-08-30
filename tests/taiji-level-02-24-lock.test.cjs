const { createHash } = require('crypto');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const baseline = JSON.parse(readFileSync(join(root, 'reports/taiji-lock/LEVEL_02_TO_24_BASELINE.json'), 'utf8'));

function sha256(file) {
  return createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
}

function mustInclude(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`LEVEL_02-24 lock failed (${label}): missing ${marker}`);
  }
}

const mismatches = [];
for (const [file, expected] of Object.entries(baseline.fileHashes)) {
  if (!existsSync(join(root, file))) {
    mismatches.push(`${file} missing`);
    continue;
  }
  const actual = sha256(file);
  if (actual !== expected) mismatches.push(`${file} hash changed`);
  const source = readFileSync(join(root, file), 'utf8');
  for (const token of baseline.interactionConfig.forbiddenLevel01Imports) {
    if (source.includes(token)) mismatches.push(`${file} imported LEVEL_01 token ${token}`);
  }
}

if (mismatches.length > 0) {
  throw new Error(`LEVEL_02-24 configuration unchanged failed:\n${mismatches.join('\n')}`);
}

const taijiSystem = readFileSync(join(root, 'components/TaijiSystem.tsx'), 'utf8');
const journey = readFileSync(join(root, 'lib/taiji-journey-depth.ts'), 'utf8');
const sound = readFileSync(join(root, 'lib/taiji24-sound-engine.ts'), 'utf8');

for (const marker of baseline.sourceMarkers.VARIATION_24_FORMULA) mustInclude(taijiSystem, marker, 'VARIATION_24');
for (const marker of baseline.sourceMarkers.LAYER_02_24_MOTION) mustInclude(taijiSystem, marker, 'L02-24 motion');
for (const marker of baseline.sourceMarkers.HEALTH_MARKERS) mustInclude(taijiSystem, marker, 'health');

mustInclude(taijiSystem, 'else if (separate)', 'level 01 gate must not replace layer 2-24 rotation');
mustInclude(taijiSystem, 'level01Drive', 'level 01 adapter must stay gated');

for (const [key, value] of Object.entries(baseline.timingConfig)) {
  mustInclude(journey, `${key} = ${value}`, `timing ${key}`);
}

mustInclude(journey, 'fadeStart: 4.05', 'macro fadeStart');
mustInclude(journey, 'liangyiStart: 1.12', 'macro liangyiStart');
mustInclude(journey, 'quantum: { enter: 3.9, full: 4.95, exitStart: 10.65, exitEnd: 12.05 }', 'quantum band');
mustInclude(journey, 'abyss: { enter: 20.15, full: 21.15, exitStart: 24.6, exitEnd: 25 }', 'abyss band');
mustInclude(sound, 'frequency: 116.54, duration: 1.95', 'layer 02 sound');
mustInclude(sound, 'frequency: 523.25, duration: 0.18', 'layer 24 sound');

if (!existsSync(join(root, baseline.assetHash.taijiPng))) {
  throw new Error('LEVEL_02-24 asset hash failed: public/taiji.png missing');
}

console.log('Taiji Level 02-24 Regression Lock passed');
