// Run with: npx tsx tests/ghost-asura-conversation.test.mjs
// Same server-only test-loader boundary as ghost-asura-customer-output.test.mjs.
import assert from 'node:assert/strict';
import Module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asura-conversation-'));
fs.writeFileSync(path.join(stubDir, 'index.js'), 'module.exports = {};');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...rest) {
  if (request === 'server-only') return path.join(stubDir, 'index.js');
  return originalResolve.call(this, request, ...rest);
};
try {
  const { buildAsuraConversation, conversationBasis, conversationFromDisplay } = await import('../lib/server/asura-conversation.ts');
  const { computeGhostAsuraDisplay, normalizeAsuraInput } = await import('../lib/server/ghost-asura-display.ts');
  const { calculateDualChart } = await import('../lib/dual-chart.ts');
  const { buildAsuraThreeCoreVoice } = await import('../lib/server/asura-three-core-voice.ts');
  const { POST } = await import('../app/api/ghost-asura/conversation/route.ts');
  const now = new Date('2026-11-03T04:00:00Z');
  const birthInput = { birthDate: '1974-06-28', birthTime: '18:00', gender: 'male' };
  const display = computeGhostAsuraDisplay(birthInput, now);
  // Homepage submits BirthProfile plus the selected identity, not the skill-page type.
  const homepage = { name: '測試來賓甲', birthDate: '1990-05-20', gender: 'male', birthTime: '14:00', birthHourBranch: 'wei', timeUnknown: false, identityTarget: 'guest', calendarType: 'solar', timezone: 'Asia/Taipei', targetDate: '2026-10-01' };
  for (const person of [homepage, { ...homepage, name: '測試本人乙', identityTarget: 'self', birthTime: '23:30', birthHourBranch: 'zi' }]) {
    const original = computeGhostAsuraDisplay(person, now);
    assert.equal(normalizeAsuraInput(person).identityTarget, person.identityTarget);
    assert.equal(normalizeAsuraInput(person).targetDate, person.targetDate);
    assert.equal(normalizeAsuraInput(person).name, person.name);
    for (const [topic, key] of [['past', 'hits'], ['present', 'pillars'], ['future', 'verdict']]) {
      const source = original.sections.find((item) => item.key === key);
      const reply = buildAsuraConversation(person, topic, 'summary', now);
      if (source.narrative) assert.equal(reply.answer, source.narrative, 'homepage name/identity/hour/target must retain the original result wording');
      assert.deepEqual(buildAsuraConversation(person, topic, 'why', now).basis, conversationBasis(original, source));
    }
  }
  assert.throws(() => buildAsuraConversation({ ...homepage, birthHourBranch: 'unknown', timeUnknown: true }, 'present', 'summary', now), /時辰/);
  const first = buildAsuraConversation(birthInput, 'present', 'summary', now);
  assert.equal(first.status, 'READY');
  assert.deepEqual(first.step, { number: 1, total: 3, label: '結論', complete: false });
  assert.equal(first.options[0].id, 'intent:why');
  assert.ok(!first.options.some((option) => ['intent:summary', 'intent:action', 'topic:present'].includes(option.id)));
  const section = display.sections.find((item) => item.key === 'pillars');
  for (const piece of first.answer.split('\n\n')) assert.ok(JSON.stringify(section).includes(JSON.stringify(piece).slice(1, -1)), 'answer only from actual same-input section');
  assert.deepEqual(first, buildAsuraConversation({ ...birthInput, display: { sections: [{ narrative: 'fake reply' }] }, verified: true, answer: 'fake reply' }, 'present', 'summary', now));
  const changed = { ...birthInput, birthDate: '1990-05-20', birthTime: '14:00', gender: 'female' };
  buildAsuraConversation(changed, 'past', 'why', now);
  assert.deepEqual(first, buildAsuraConversation(birthInput, 'present', 'summary', now), 'no previous-person conversational memory');
  const input = normalizeAsuraInput(birthInput);
  const { hourAssumed, identityTarget, targetDate, ...engine } = input;
  const voice = buildAsuraThreeCoreVoice(calculateDualChart(engine), display, { hourAssumed: false });
  const basis = buildAsuraConversation(birthInput, 'present', 'why', now);
  assert.equal(basis.step.number, 2);
  assert.equal(basis.step.label, '依據');
  assert.equal(basis.options[0].id, 'intent:action');
  assert.deepEqual(basis.basis, conversationBasis(display, section));
  for (const item of basis.basis) {
    assert.ok(display.columns.some((column) => column.heading === item.columnLabel && column.seals.some((seal) => seal.name === item.name)));
    assert.ok(basis.answer.includes(item.name));
  }
  const withoutReferences = structuredClone(display);
  for (const item of withoutReferences.sections) delete item.guidance;
  const noBasis = conversationFromDisplay(withoutReferences, 'present', 'why', voice);
  assert.equal(noBasis.status, 'UNAVAILABLE');
  assert.deepEqual(noBasis.basis, []);
  assert.ok(noBasis.answer.includes('沒有可對應'));
  assert.ok(noBasis.options.some((option) => option.id === 'intent:action'));
  const mismatchedReferences = structuredClone(display);
  const badSection = mismatchedReferences.sections.find((item) => item.key === 'pillars');
  badSection.guidance = { related: [{ id: 'not-a-real-id', columnKey: 'year', name: display.columns[0].seals[0]?.name || '同名印記', ageText: '' }] };
  assert.deepEqual(conversationBasis(mismatchedReferences, badSection), [], 'same display name does not prove a stable ID');
  const sample = display.columns.flatMap((column) => column.seals.map((seal) => ({ column, seal }))).find(({ seal }) => section.items.some((item) => item.id === seal.id));
  if (sample) {
    const linkedSection = { ...section, guidance: { related: [{ columnKey: sample.column.key, id: sample.seal.id, name: 'stale label', ageText: '' }] } };
    const linked = conversationBasis(display, linkedSection);
    assert.equal(linked.length, 1);
    assert.equal(linked[0].name, sample.seal.name, 'actual current card label wins over stale reference label');
    const removed = structuredClone(display);
    removed.columns.find((column) => column.key === sample.column.key).seals = [];
    assert.deepEqual(conversationBasis(removed, linkedSection), [], 'removed target cannot cite a different card');
  }
  const action = buildAsuraConversation(birthInput, 'future', 'action', now);
  assert.deepEqual(action.step, { number: 3, total: 3, label: '行動', complete: true });
  assert.ok(action.options.every((option) => option.id.startsWith('topic:') && option.id !== 'topic:future'), 'completed flow has only explicit other-topic restart');
  assert.equal(action.answer, voice.lines.find((line) => line.label === '斷語').text);
  assert.ok(action.scopeNote.includes(voice.note));
  assert.ok(action.scopeNote.includes('不是特定時段'));
  if (section.narrative) assert.equal(first.answer, section.narrative, 'summary must not duplicate narrative with blocks');
  if (display.alert) assert.ok(first.scopeNote.includes(display.alert));
  assert.throws(() => buildAsuraConversation({ ...birthInput, timeUnknown: true }, 'present', 'summary', now), /時辰/);
  const minor = buildAsuraConversation({ ...birthInput, birthDate: '2020-01-01' }, 'future', 'action', now);
  assert.equal(minor.status, 'UNAVAILABLE');
  assert.equal(minor.options.length, 0);
  const req = (body, origin = 'http://localhost') => new Request('http://localhost/api/ghost-asura/conversation', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = { birthInput, topic: 'present', intent: 'summary' };
  const response = await POST(req(payload));
  const homepageResponse = await POST(req({ ...payload, birthInput: homepage }));
  assert.equal(homepageResponse.status, 200, 'actual homepage submitted profile accepted');
  assert.deepEqual(await homepageResponse.json(), buildAsuraConversation(homepage, 'present', 'summary'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.equal(result.status, 'READY');
  assert.equal(result.birthInput, undefined);
  assert.equal(result.audit, undefined);
  assert.equal((await POST(req(payload, 'http://elsewhere.test'))).status, 403);
  assert.equal((await POST(req({ ...payload, topic: 'relationship' }))).status, 400);
  assert.equal((await POST(req({ ...payload, intent: 'make-up-answer' }))).status, 400);
  assert.equal((await POST(req({ ...payload, topic: ['present'] }))).status, 400);
  assert.equal((await POST(req({ ...payload, intent: ['summary'] }))).status, 400);
  assert.equal((await POST(req({ ...payload, birthInput: { ...birthInput, gender: ['male'] } }))).status, 400);
  assert.equal((await POST(req({ ...payload, birthInput: { ...birthInput, birthTime: 1800, birthHourBranch: 'you' } }))).status, 400);
  for (const invalid of [{ ...birthInput, birthTime: '' }, { ...birthInput, timeUnknown: true }, { ...birthInput, birthTimeKnown: false }, { ...birthInput, birthHourBranch: 'unknown' }]) assert.equal((await POST(req({ ...payload, birthInput: invalid }))).status, 422);
  assert.equal((await POST(req({ ...payload, birthInput: { birthDate: birthInput.birthDate, birthTime: birthInput.birthTime } }))).status, 400);
  assert.equal((await POST(req({ ...payload, junk: 'x'.repeat(2100) }))).status, 400);
  assert.equal((await POST(req({ ...payload, birthInput: { ...birthInput, birthTime: '25:80' } }))).status, 400);
  for (const unsupported of [{ calendarType: 'lunar' }, { timezone: 'UTC' }]) assert.equal((await POST(req({ ...payload, birthInput: { ...birthInput, ...unsupported } }))).status, 400);
  const { checkAPIRateLimit } = await import('../lib/dual-chart-auth.ts');
  const limited = req(payload);
  limited.headers.set('x-forwarded-for', 'conversation-rate-test');
  for (let i = 0; i < 10; i++) checkAPIRateLimit(limited);
  const blocked = await POST(limited);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('retry-after'));
  const people = [birthInput, changed, { birthDate: '1968-09-02', birthTime: '00:30', gender: 'female' }];
  const topicKeys = { past: 'hits', present: 'pillars', future: 'verdict' };
  const initial = new Map();
  let confirmedBasis = 0;
  for (const person of people) {
    const actual = computeGhostAsuraDisplay(person, now);
    const { hourAssumed, identityTarget, targetDate, ...engine } = normalizeAsuraInput(person);
    const actualVoice = buildAsuraThreeCoreVoice(calculateDualChart(engine), actual, { hourAssumed: false });
    for (const topic of Object.keys(topicKeys)) {
      const actualSection = actual.sections.find((item) => item.key === topicKeys[topic]);
      for (const intent of ['summary', 'why', 'action']) {
        const output = buildAsuraConversation(person, topic, intent, now);
        initial.set(`${person.birthDate}|${topic}|${intent}`, output);
        assert.equal(output.step.number, ['summary', 'why', 'action'].indexOf(intent) + 1);
        assert.ok(output.scopeNote.includes(actual.scopeNote));
        if (actual.alert) assert.ok(output.scopeNote.includes(actual.alert));
        if (intent === 'action') {
          assert.equal(output.answer, actualVoice.lines.find((line) => line.label === '斷語').text);
          assert.ok(output.scopeNote.includes('不是特定時段'));
        } else if (intent === 'why') {
          for (const item of output.basis) {
            const matching = actualSection.guidance.related.some((ref) => {
              const col = actual.columns.find((column) => column.key === ref.columnKey);
              const seal = col?.seals.find((seal) => seal.id === ref.id);
              const entry = actualSection.items.find((entry) => entry.id === ref.id);
              return col && seal && entry && col.heading === item.columnLabel && seal.name === item.name
                && [entry.plain, entry.text, seal.meaning, seal.declaration].includes(item.text);
            });
            assert.ok(matching, 'every cited basis must match this person, topic, stable reference and original text');
            confirmedBasis++;
          }
          assert.equal(output.status, output.basis.length ? 'READY' : 'UNAVAILABLE');
          if (!output.basis.length) assert.ok(output.answer.includes('沒有可對應'));
        } else if (output.status === 'READY') {
          const sources = [actualSection.narrative, actualSection.lead, ...(actualSection.blocks ?? []).map((block) => block.text)];
          assert.ok(sources.includes(output.answer) || output.answer.split('\n\n').every((part) => sources.includes(part)));
        }
      }
    }
  }
  assert.ok(confirmedBasis > 0, 'multi-person audit must exercise actual positive basis references');
  for (const person of [...people].reverse()) for (const topic of Object.keys(topicKeys)) for (const intent of ['summary', 'why', 'action']) {
    assert.deepEqual(buildAsuraConversation(person, topic, intent, now), initial.get(`${person.birthDate}|${topic}|${intent}`), 'interleaved person/topic requests cannot leak previous context');
  }
  console.log(`PASS 3 adults × 3 topics × 3 steps, repeated in reverse order; ${confirmedBasis} exact current-result basis references`);
  console.log('PASS Asura conversation real backend: exact section/advice provenance, spoof ignored, repeat/change/repeat, age gate, unknown time, origin and bounded protocol');
} finally {
  Module._resolveFilename = originalResolve;
  fs.rmSync(stubDir, { recursive: true, force: true });
}
