const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/beast-game/beast-rig.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: mod, exports: mod.exports });
const rig = mod.exports;
const impact = rig.RIG_IMPACT_MS / rig.RIG_STRIKE_MS;
assert.equal(rig.RIG_STRIKE_MS, 1500, 'presentation duration contract unchanged');
assert.equal(rig.RIG_IMPACT_MS, 1120, 'hit/audio contract unchanged');
const eps = 1e-6;
for (const [name, style] of Object.entries(rig.RIG_STYLES)) {
  for (const t of [rig.RIG_PHASES.run[0], rig.RIG_PHASES.attack[0], impact, rig.RIG_PHASES.recover[0]]) {
    const a = rig.strikeFrame(t - eps, style), b = rig.strikeFrame(t + eps, style);
    for (const value of ['scale', 'squash', 'tilt']) assert.ok(Math.abs(a[value] - b[value]) < 0.002, `${name}: no ${value} jump at ${t}`);
    assert.ok(Math.abs(a.travel.hop - b.travel.hop) < 0.002, `${name}: no impact height teleport at ${t}`);
  }
  const livingStyle = { ...style, articulation: style.articulation ?? 0.8 };
  const before = rig.livingPose(impact - 0.04, livingStyle);
  const contact = rig.livingPose(impact, livingStyle);
  assert.ok(before.jaw > 0.15, `${name}: beak/jaw open during approach`);
  assert.ok(contact.jaw < 0.001, `${name}: beak/jaw shuts at actual hit`);
  for (const dt of [0.005, 0.02, 0.03]) {
    const held = rig.livingPose(impact + dt, livingStyle);
    assert.ok(held.jaw < 0.001, `${name}: maintains bite grip instead of immediately reopening`);
    assert.ok(Math.abs(held.headThrust - contact.headThrust) < 0.001, `${name}: head holds before pulling`);
  }
  for (const t of [rig.RIG_PHASES.anticipate[1], rig.RIG_PHASES.attack[0], rig.RIG_PHASES.recover[0], 0.88, 0.9, 0.95]) {
    const a = rig.livingPose(t - eps, livingStyle), b = rig.livingPose(t + eps, livingStyle);
    for (const field of ['headPitch', 'headThrust', 'jaw', 'clawSwing']) assert.ok(Math.abs(a[field] - b[field]) < 0.002, `${name}: joint ${field} continuous at ${t}`);
  }
  for (const t of [0.13, 0.27, 0.58, 0.78]) {
    for (const u of [0.2, 0.6, 0.9]) assert.ok(Math.abs(rig.bodyWave(t - eps, u, style) - rig.bodyWave(t + eps, u, style)) < 0.002, `${name}: no mesh wave snap at ${t}`);
  }
  for (let i = 0; i <= 1500; i++) {
    const t = i / 1500;
    const frame = rig.strikeFrame(t, style);
    assert.equal(rig.livingPose(t, livingStyle).headPitch, 0, `${name}: no head nod/downward peck, advance on attack axis`);
    assert.equal(rig.bitePull(t)[1], 0, `${name}: bite pull has no cross-axis drop`);
    if (style.morphology === 'feline') assert.ok(rig.livingPose(t, livingStyle).clawSwing <= 0.46 * livingStyle.articulation + 1e-9, 'feline forepaw does not over-fold at the wrist');
    if (style.morphology === 'avian') {
      const pose = rig.livingPose(t, livingStyle);
      assert.ok(pose.clawSwing <= 0.42 * livingStyle.articulation + 1e-9, 'avian talon braces without mammal-sized forelimb swing');
      assert.ok(pose.headThrust <= 0.095 * livingStyle.articulation + 1e-9, 'avian beak grip does not overextend the slender neck');
    }
    if (style.morphology === 'armored') {
      const pose = rig.livingPose(t, livingStyle);
      assert.equal(frame.squash, 1, 'tortoise shell never compresses or rebounds like soft rubber');
      assert.ok(frame.travel.hop <= 0.045 + 1e-9, 'armored body keeps a low, heavy trajectory');
      assert.ok(pose.headThrust <= 0.055 * livingStyle.articulation + 1e-9, 'snake neck thrust stays bounded instead of elastic elongation');
      assert.ok(pose.clawSwing <= 0.2 * livingStyle.articulation + 1e-9, 'tortoise forelimb braces without mammal-sized swiping');
      if (t >= rig.RIG_PHASES.leap[0] && t < rig.RIG_PHASES.attack[0]) assert.ok(Math.abs(pose.hind[0] * pose.hind[1]) < 1e-12, 'one rear foot supports while the other lifts');
      if (t >= rig.RIG_PHASES.attack[0]) assert.ok(pose.hind.every(v => v === 0), 'both rear feet brace while biting instead of paddling');
    }
    const cam = rig.cameraFrame(t, style);
    assert.ok([frame.scale, frame.alpha, frame.travel.hop, cam.zoom, cam.shakeX, cam.shakeY].every(Number.isFinite));
    assert.ok(Math.abs(cam.shakeX) < 7 && Math.abs(cam.shakeY) < 4, `${name}: readable, bounded camera recoil`);
    if (t < impact) assert.equal(rig.rendFrame(t, style).power, 0, 'no tear before real impact');
  }
  assert.equal(rig.rendFrame(1, style).power, 0, 'no leftover shards after settling');
  if (['feline', 'armored', 'serpentine'].includes(style.morphology)) {
    for (const t of [0.27, 596 / 1500, 0.45, 0.48, 0.5, 0.52, 0.55, 0.58, 0.7]) {
      const layers = rig.strikeFrame(t, style).layers;
      assert.equal(layers.length, 1, 'grounded body holds one articulated silhouette, no incompatible gathered whole-body pose');
      assert.equal(layers[0].frame, 'pounce-open', 'head remains forward across the reported 596–750ms reversal');
    }
  }
  if (['feline', 'armored', 'avian', 'serpentine'].includes(style.morphology)) {
    for (const t of [impact, 0.8, 1250 / 1500, 0.88]) {
      const layers = rig.strikeFrame(t, style).layers;
      assert.equal(layers.length, 1, 'grounded body holds a single matched closed-mouth silhouette');
      assert.equal(layers[0].frame, 'bite-close', 'actual closed-mouth art, not just jaw metadata');
    }
  }
}
for (const t of [0, 0.5, impact, impact + 0.03, 0.95, 1]) assert.equal(rig.bitePull(t).some(v => Math.abs(v) > 1e-10), false, 'no pulling before grip or after release');
assert.ok(rig.bitePull(0.88)[0] > 0.1, 'one readable pull after the hold');
assert.equal(rig.bodyWave(0.4, 0.7, { ...rig.RIG_STYLES.qinglong, morphology: 'armored' }), 0, 'shell stays rigid');
assert.equal(rig.bodyWave(0.4, 0.2, { ...rig.RIG_STYLES.qinglong, morphology: 'avian' }), 0, 'bird head does not snake-wave');
// Verify actual transformed mouth positions, not only travel.progress: the old
// side-shift moved a left-facing tiger right even while progress increased.
const stageMod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/battlefield/BeastRigStage.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { module: stageMod, exports: stageMod.exports, require: id => id === '@/lib/beast-game/beast-rig' ? rig : require(id) });
const { placeRig, alignRigContact } = stageMod.exports;
for (const creature of Object.values(rig.BEAST_RIGS)) {
const metadata = JSON.parse(fs.readFileSync(`public/beast-game/rig/${creature.dir}/manifest.json`, 'utf8')).frames;
for (const [fromX, toX] of [[195, 195], [150, 225], [225, 150]]) {
  const geometry = { arenaWidth: 390, from: { cx: fromX, top: 620, width: 70, height: 100 }, to: { cx: toX, top: 140, width: 96, height: 134 } };
  let previous = null;
  for (let ms = 596; ms <= 900; ms++) {
    const t = ms / 1500, f = rig.strikeFrame(t, creature.style);
    const points = f.layers.map(layer => {
    const spec = creature.frames.find(entry => entry.id === layer.frame);
    const meta = metadata.find(entry => entry.id === layer.frame);
    const aspect = meta.width / meta.height;
    const contact = spec.contact ?? [spec.anchors.head[0] - 0.1, spec.anchors.jaw[1]];
    const p = alignRigContact(placeRig(geometry, f, creature.style.size), f, spec, aspect, t, geometry, creature);
    const d = spec.anchors ? rig.meshDisplace(...contact, aspect, spec.anchors, rig.livingPose(t, creature.style), t, creature.style) : [0, 0];
    const dh = p.unit * spec.norm, sign = p.mirror ? -1 : 1;
    const lx = ((contact[0] - 0.5) * dh * aspect + d[0] * dh) * sign;
    const ly = ((contact[1] - 0.92) * dh + d[1] * dh) * f.squash;
    const angle = p.rotation * sign;
    return { point: [p.x + lx * Math.cos(angle) - ly * Math.sin(angle), p.y + lx * Math.sin(angle) + ly * Math.cos(angle)], sign, angle };
    });
    const { point, sign, angle } = points[0];
    for (const other of points) assert.ok(Math.hypot(other.point[0] - point[0], other.point[1] - point[1]) < 0.01, `${creature.dir}: active pose layers share a world contact instead of jumping during crossfade at ${ms}ms`);
    if (previous) {
      const dx = point[0] - previous[0], dy = point[1] - previous[1];
      assert.ok(dx * -sign >= -1e-7, `${creature.dir}: mouth never drifts behind facing direction at ${ms}ms, ${fromX}->${toX}`);
      assert.ok(dx * -sign * Math.cos(angle) + dy * -sign * Math.sin(angle) >= -1e-7, `${creature.dir}: world mouth velocity projects forward along the head axis at ${ms}ms (${fromX}->${toX}, dx=${dx}, dy=${dy})`);
    }
    previous = point;
  }
}
}
console.log('PASS: four guardian forward world contacts across pose changes, continuous joints, impact closure, bite hold, bounded recoil, unchanged hit timing');
