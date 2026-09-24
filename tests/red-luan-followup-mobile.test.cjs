const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('lib/red-luan-followup.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const reminder = { name: 'Test', startsOn: '2027-01-01', endsOn: '2027-01-31', monthLine: 'Test month', typeHeadline: '', daysAway: 1, topCandidate: '', url: 'https://example.test/red-luan-heartbeat' };
function load(navigator) {
  const state = { clicks: 0, revoked: 0, timers: [] };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, navigator, Blob, File, Error, URLSearchParams,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => state.revoked++ },
    document: {
      createElement: () => ({ click: () => state.clicks++, remove() {} }),
      body: { appendChild() {} },
    },
    setTimeout: (fn, delay) => state.timers.push({ fn, delay }),
  });
  return { api: module.exports, state };
}
(async () => {
  let shared;
  const supported = load({ canShare: () => true, share: async data => { shared = data; } });
  assert.equal(await supported.api.exportRedLuanReminder(reminder), 'calendar-shared');
  assert.equal(shared.files[0].type, 'text/calendar');
  assert.match(await shared.files[0].text(), /BEGIN:VCALENDAR/);
  assert.equal(supported.state.clicks, 0);

  const unavailable = load({ canShare: () => false });
  const draft = new URL(unavailable.api.redLuanCalendarDraft({ startsOn: '2027-01-01', endsOn: '2027-01-31', monthLine: 'Private interpretation', kind: 'BOTH' }, '2027-01-10'));
  assert.equal(draft.hostname, 'calendar.google.com');
  assert.equal(draft.searchParams.get('dates'), '20270111/20270112');
  assert.ok(!draft.href.includes('Private'));
  assert.equal(await unavailable.api.exportRedLuanReminder(reminder), 'reminded');
  assert.equal(unavailable.state.clicks, 1);
  assert.equal(unavailable.state.revoked, 0, 'download URL must outlive the click');
  assert.ok(unavailable.state.timers[0].delay > 0);
  unavailable.state.timers[0].fn();
  assert.equal(unavailable.state.revoked, 1);

  const abort = Object.assign(new Error('cancel'), { name: 'AbortError' });
  let copied = 0;
  const cancelled = load({ canShare: () => true, share: async () => { throw abort; }, clipboard: { writeText: async () => copied++ } });
  assert.equal(await cancelled.api.exportRedLuanReminder(reminder), 'cancelled');
  assert.equal(await cancelled.api.shareRedLuanReading(reminder), 'cancelled');
  assert.equal(cancelled.state.clicks, 0);
  assert.equal(copied, 0, 'cancelling must not silently copy private reading text');

  const blocked = load({ canShare: () => true, share: async () => { throw new Error('not supported'); }, clipboard: { writeText: async () => copied++ } });
  assert.equal(await blocked.api.exportRedLuanReminder(reminder), 'reminded');
  assert.equal(await blocked.api.shareRedLuanReading(reminder), 'copied');
  assert.equal(copied, 1);
  assert.equal(await load({}).api.shareRedLuanReading(reminder), 'failed');
  console.log('PASS: calendar file sharing, download fallback, deferred cleanup, cancellation and clipboard fallback');
})().catch(error => { console.error(error); process.exitCode = 1; });
