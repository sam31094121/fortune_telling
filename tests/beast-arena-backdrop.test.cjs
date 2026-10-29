const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('components/battlefield/BattleArena.module.css', 'utf8');
const block = css.match(/\.arena::after\s*\{([^}]+)\}/)[1];
const scale = Number(block.match(/center\s*\/\s*auto\s+(\d+)%/)[1]) / 100;
assert.match(block, /inset:\s*-20%/);
assert.match(block, /opacity:\s*0\.055/);
for (const [width, height] of [[640,216],[390,220],[320,180],[1280,440]]) {
  const diameter = height * 1.4 * scale;
  assert.ok(diameter < height && diameter < width, `taiji circle fits the ${width}x${height} arena rather than becoming cropped slabs`);
}
assert.match(css, /\.elementStrike\[data-skill='true'\]::before\s*\{\s*width:\s*96px; height:\s*96px/);
console.log('PASS: ambient taiji fits shallow arenas; skill projectile remains unchanged');
