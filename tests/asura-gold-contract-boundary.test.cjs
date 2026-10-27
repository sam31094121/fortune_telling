const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const { goldWordingViewFor } = load('lib/ghost-asura-gold-wording.ts');
const { ASURA_FORBIDDEN_TERMS } = load('lib/asura-display-alias.ts');
const { validateGoldWording, scanGoldWording } = require('./helpers/asura-gold-contract.cjs');
const scan = (label, text) => ASURA_FORBIDDEN_TERMS.filter(t => text.includes(t)).map(t => `${label}:${t}`);
test('Oct 24 gold contract is exact; the exception cannot hide arbitrary or wrong-person content', () => {
  for (const birth of [
    { birthDate:'1974-06-28',birthTime:'18:00',gender:'male' },
    { birthDate:'1974-07-02',birthTime:'03:30',gender:'female' },
    { birthDate:'1974-06-28',timeUnknown:true,gender:'male' },
  ]) {
    const value = goldWordingViewFor({ ...birth, timezone:'Asia/Taipei' }, birth.timeUnknown === true);
    validateGoldWording(value, birth);
    assert.deepEqual(scanGoldWording(value, birth, scan), []);
    for (const field of ['label','text','basis']) {
      assert.throws(() => scanGoldWording({ ...value, [field]: String(value[field])+'八字' }, birth, scan));
    }
    assert.throws(() => validateGoldWording({ ...value, extra:'八字' }, birth));
    assert.throws(() => validateGoldWording({ ...value, basis:null }, birth));
  }
  assert(scan('other field','時辰').length > 0, 'old global restriction remains active');
  const known={birthDate:'1974-06-28',birthTime:'18:00',gender:'male'};
  const wrong=goldWordingViewFor({...known,birthDate:'1990-01-01',timezone:'Asia/Taipei'},false);
  assert.throws(() => validateGoldWording(wrong,known),'another customer must not be accepted');
});
