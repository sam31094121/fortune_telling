// Source-level pure regression; no shared build output or browser is required.
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const old = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);

const C=require('../lib/beast-game/match3/skill-capabilities.ts'),R=require('../lib/beast-game/registry.ts'),S=require('../cards/skills/index.ts');
const before=JSON.stringify({cards:R.playableCards(),skills:S.SKILLS}),inventory=C.orbSkillCapabilityInventory();
assert.equal(inventory.length,60);assert.equal(inventory.flatMap(c=>c.skills).length,95);assert.equal(new Set(inventory.flatMap(c=>c.skills.map(s=>s.id))).size,25);
for(const card of R.playableCards()){
 const row=C.orbCardSkillCapabilities(card.id);assert.equal(row.genericEnergyAttack.status,'active');assert.equal(row.genericEnergyAttack.ratio,2);assert.deepEqual(row.skills.map(s=>s.id),[...card.skills,...card.passive]);
 row.skills.forEach((s,i)=>{const original=S.getSkill(s.id);assert.equal(s.status,'not_connected');assert.equal(s.name,original.name);assert.equal(s.description,original.description);assert.equal(s.trigger,original.trigger);assert.equal(s.version,original.version);assert.equal(s.usesPerBattle,original.usesPerBattle??null);assert.equal(s.slot,i>=card.skills.length?'passive':i===0?'first':'additional');assert.deepEqual(s.effects.map(e=>e.spec),original.effects);for(const e of s.effects){assert.equal(e.status,e.decision?'mode_mapping_required':'not_connected');if(e.spec.type==='DRAW')assert.equal(e.decision,'draw_without_deck');if(e.spec.type==='BUFF_SPEED')assert.equal(e.decision,'speed_without_initiative');}});
}
assert.equal(C.orbCardSkillCapabilities('missing'),null);assert.equal(C.orbSkillCapability('missing','first').status,'source_missing');
inventory[0].skills[0].effects[0].spec.value=999999;assert.equal(JSON.stringify({cards:R.playableCards(),skills:S.SKILLS}),before,'inventory does not expose mutable effect specs');
console.log('PASS 60-card/95-reference exact source inventory, all slots/passives, missing source, pending mode mappings, no combat mutation');
