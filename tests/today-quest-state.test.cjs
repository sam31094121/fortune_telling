const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const path = require('node:path');
// Execute the production helpers, not a duplicate of the restore algorithm.
const filename = path.resolve('lib/today-quest-state.ts');
const mod = new Module(filename, module);
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { restoreQuestState: restore, previousQuestLabel: label, localDateKey } = mod.exports;
// Read real path IDs from the component's config so test fixtures stay aligned.
const source = fs.readFileSync('components/TodayDirectionQuest.tsx', 'utf8');
const config = source.slice(source.indexOf('const QUEST_AREAS:'), source.indexOf('const STAGE_NUMBER:'));
const configModule = new Module(filename + '.config', module);
configModule._compile(ts.transpileModule(config + '\nexports.areas = QUEST_AREAS;', {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename + '.config');
const areas = configModule.exports.areas;
const now = new Date(2026, 8, 24, 12);
const base = { date: '2026-09-24', stage: 'action', areaId: 'self', pathId: 'self-priority', completed: false, actionMode: 'check' };
let count = 0;
function test(name, run) { run(); count++; console.log('PASS', name); }
test('first visit / corrupt storage uses no fabricated state', () => {
  for (const value of [null, undefined, {}, [], 'broken', { ...base, date: '2026-02-30' }, { ...base, date: '2026-09-25' }, { ...base, pathId: 'missing' }, { ...base, completed: 'true' }]) assert.equal(restore(value, areas, now), null);
});
test('same-day unfinished action and path retained', () => {
  const s = restore(base, areas, now);
  assert.equal(s.stage, 'action'); assert.equal(s.pathId, base.pathId); assert.equal(s.outcome, 'unknown');
});
test('completed action returns with actual context, no award today', () => {
  const s = restore({ ...base, date: '2026-09-23', stage: 'reward', completed: true, outcome: 'done' }, areas, now);
  assert.equal(s.stage, 'checkin'); assert.equal(s.completed, false);
  assert.deepEqual(s.returnContext, { date: '2026-09-23', areaId: 'self', pathId: 'self-priority', smaller: false, outcome: 'done' });
});
test('started is not completed and smaller survives check/reward', () => {
  const s = restore({ ...base, date: '2026-09-23', stage: 'reward', completed: true, outcome: 'started', smaller: true }, areas, now);
  assert.equal(s.returnContext.outcome, 'started'); assert.equal(s.returnContext.smaller, true);
});
test('unfinished cross-day action resumes without awarding completion', () => {
  const s = restore({ ...base, date: '2026-09-20', smaller: true }, areas, now);
  assert.equal(s.stage, 'action'); assert.equal(s.completed, false); assert.equal(s.smaller, true);
});
test('previous award does not complete a new unfinished path', () => {
  assert.equal(restore({ ...base, date: '2026-09-23', completed: true }, areas, now).stage, 'action');
});
test('yesterday / older / local calendar boundary', () => {
  assert.equal(label('2026-09-23', now), '昨天'); assert.equal(label('2026-09-20', now), '上次');
  assert.equal(label('2026-08-31', new Date(2026, 8, 1, 0, 1)), '昨天');
  assert.equal(localDateKey(new Date(2026, 8, 24, 0, 1)), '2026-09-24');
});
test('mount read -> write -> reload retains original action date', () => {
  const first = restore({ ...base, date: '2026-09-20', stage: 'reward', completed: true, outcome: 'started', smaller: true }, areas, now);
  const second = restore(JSON.parse(JSON.stringify(first)), areas, now);
  const third = restore(second, areas, new Date(2026, 8, 26, 12));
  assert.deepEqual(first.returnContext, second.returnContext); assert.deepEqual(second.returnContext, third.returnContext);
  assert.equal(third.stage, 'checkin'); assert.equal(label(third.returnContext.date, now), '上次');
});
test('legacy reward does not invent done outcome', () => {
  const s = restore({ ...base, date: '2026-09-23', stage: 'reward', completed: true, actionMode: 'smaller' }, areas, now);
  assert.equal(s.returnContext.outcome, 'unknown'); assert.equal(s.returnContext.smaller, true);
});
test('legacy checkin without saved path remains usable', () => {
  const s = restore({ ...base, stage: 'checkin', areaId: null, pathId: null, completed: true }, areas, now);
  assert.equal(s.stage, 'checkin'); assert.equal(s.returnContext, null);
});
test('invalid context discarded without breaking valid current state', () => {
  assert.equal(restore({ ...base, returnContext: { date: 'bad' } }, areas, now).returnContext, null);
});
test('UI uses production restore, hydration write guard, one start CTA and explicit outcomes', () => {
  assert.ok(source.includes('restoreQuestState(input, QUEST_AREAS)'));
  assert.ok(source.includes('if (!hydrated) return;'));
  assert.equal((source.match(/data-quest-action="start"/g) || []).length, 1);
  assert.ok(source.includes('找到今天的一步'));
  assert.ok(source.includes("completeQuest('started')")); assert.ok(source.includes("completeQuest('done')"));
  assert.ok(source.includes('smaller ? path.smallerAction : path.action'));
});
console.log(`${count} tests passed`);
